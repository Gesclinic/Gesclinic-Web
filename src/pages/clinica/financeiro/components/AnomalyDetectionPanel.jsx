import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, parseISO, subDays, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, TrendingUp, Shield, Zap } from 'lucide-react';

/**
 * F.4: Anomaly Detection Avançada
 * Detecta anomalias estatísticas em atividade de auditoria:
 * - Spike detection (desvio padrão > 2σ)
 * - Rate anomalies (mudanças muito rápidas)
 * - Pattern changes (mudança de padrão)
 * - User behavior changes (usuário em novo horário/frequência)
 */
export default function AnomalyDetectionPanel() {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [stats, setStats] = useState({
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
  });
  const [period, setPeriod] = useState(30); // dias

  useEffect(() => {
    detectAnomalies();
  }, [clinicId, period]);

  const detectAnomalies = async () => {
    if (!clinicId) return;

    try {
      setLoading(true);

      const startDate = subDays(new Date(), period);
      const { data: logs, error } = await supabase
        .from('fee_audit_log')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('changed_at', startDate.toISOString())
        .order('changed_at', { ascending: true });

      if (error) throw error;

      const foundAnomalies = [];

      // 1. SPIKE DETECTION - Desvio padrão
      foundAnomalies.push(...detectSpikes(logs));

      // 2. RATE ANOMALIES - Mudanças muito rápidas
      foundAnomalies.push(...detectRateAnomalies(logs));

      // 3. PATTERN CHANGES - Mudança de padrão
      foundAnomalies.push(...detectPatternChanges(logs));

      // 4. USER BEHAVIOR CHANGES
      foundAnomalies.push(...detectUserBehaviorChanges(logs));

      // 5. DELETE OPERATIONS
      foundAnomalies.push(...detectDeletionAnomalies(logs));

      // 6. OFF-HOURS ACTIVITY
      foundAnomalies.push(...detectOffHoursActivity(logs));

      // 7. REPETITIVE CHANGES (Same field changed multiple times in short period)
      foundAnomalies.push(...detectRepetitiveChanges(logs));

      // Sort by severity e timestamp
      const sorted = foundAnomalies.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      setAnomalies(sorted);

      // Calculate stats
      const stats = {
        criticalCount: sorted.filter((a) => a.severity === 'critical').length,
        warningCount: sorted.filter((a) => a.severity === 'warning').length,
        infoCount: sorted.filter((a) => a.severity === 'info').length,
      };
      setStats(stats);
    } catch (err) {
      console.error('Erro ao detectar anomalias:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Detectar spikes (desvio padrão > 2σ)
  const detectSpikes = (logs) => {
    const byHour = {};
    logs.forEach((log) => {
      const hour = parseInt(format(parseISO(log.changed_at), 'HH'));
      byHour[hour] = (byHour[hour] || 0) + 1;
    });

    const values = Object.values(byHour);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 2 * stdDev;

    const anomalies = [];
    Object.entries(byHour).forEach(([hour, count]) => {
      if (count > threshold) {
        anomalies.push({
          type: 'spike_detection',
          severity: count > threshold * 1.5 ? 'critical' : 'warning',
          title: `Spike de Atividade (${hour}:00)`,
          message: `${count} mudanças detectadas às ${hour}:00 (esperado: ~${mean.toFixed(0)})`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return anomalies;
  };

  // 2. Detectar rate anomalies (mudanças rápidas)
  const detectRateAnomalies = (logs) => {
    const anomalies = [];

    for (let i = 1; i < logs.length; i++) {
      const prev = parseISO(logs[i - 1].changed_at);
      const curr = parseISO(logs[i].changed_at);
      const diffMinutes = differenceInMinutes(curr, prev);

      // Se < 1 minuto entre mudanças, pode ser automatização
      if (diffMinutes === 0 && logs[i - 1].changed_by === logs[i].changed_by) {
        anomalies.push({
          type: 'rate_anomaly',
          severity: 'warning',
          title: 'Mudanças Muito Rápidas',
          message: `Usuário ${logs[i].changed_by?.substring(0, 8)} realizou múltiplas mudanças em < 1 minuto`,
          timestamp: logs[i].changed_at,
        });
        break; // Just report once
      }
    }

    return anomalies;
  };

  // 3. Detectar mudança de padrão
  const detectPatternChanges = (logs) => {
    const anomalies = [];

    if (logs.length < 10) return anomalies;

    // Split into first half and second half
    const mid = Math.floor(logs.length / 2);
    const firstHalf = logs.slice(0, mid);
    const secondHalf = logs.slice(mid);

    // Analyze actions
    const firstActions = {
      create: firstHalf.filter((l) => l.action === 'create').length,
      update: firstHalf.filter((l) => l.action === 'update').length,
      delete: firstHalf.filter((l) => l.action === 'delete').length,
    };

    const secondActions = {
      create: secondHalf.filter((l) => l.action === 'create').length,
      update: secondHalf.filter((l) => l.action === 'update').length,
      delete: secondHalf.filter((l) => l.action === 'delete').length,
    };

    // Check for shift
    const createShift = Math.abs(secondActions.create - firstActions.create);
    const updateShift = Math.abs(secondActions.update - firstActions.update);
    const deleteShift = Math.abs(secondActions.delete - firstActions.delete);

    if (createShift > 20 || updateShift > 20 || deleteShift > 5) {
      anomalies.push({
        type: 'pattern_change',
        severity: 'info',
        title: 'Mudança de Padrão Detectada',
        message: `Padrão de operações alterou no período recente (criar: ${createShift > 0 ? '+' : ''}${createShift})`,
        timestamp: new Date().toISOString(),
      });
    }

    return anomalies;
  };

  // 4. Detectar mudança de comportamento do usuário
  const detectUserBehaviorChanges = (logs) => {
    const anomalies = [];
    const userStats = {};

    logs.forEach((log) => {
      const user = log.changed_by;
      if (!userStats[user]) {
        userStats[user] = {
          count: 0,
          hours: new Set(),
          actions: {},
        };
      }
      userStats[user].count++;
      userStats[user].hours.add(parseInt(format(parseISO(log.changed_at), 'HH')));
      userStats[user].actions[log.action] = (userStats[user].actions[log.action] || 0) + 1;
    });

    // Check for users with unusual hours
    Object.entries(userStats).forEach(([user, data]) => {
      const hours = Array.from(data.hours);
      const offHours = hours.filter((h) => h < 8 || h > 18);

      if (offHours.length > 0 && data.count > 5) {
        anomalies.push({
          type: 'user_behavior',
          severity: 'warning',
          title: `Atividade Fora do Horário (${user?.substring(0, 8)})`,
          message: `Usuário ativo em ${offHours.length} horas fora do comercial (${offHours.join(', ')}:00)`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return anomalies;
  };

  // 5. Detectar operações DELETE
  const detectDeletionAnomalies = (logs) => {
    const anomalies = [];
    const deletes = logs.filter((l) => l.action === 'delete');

    if (deletes.length > 0) {
      anomalies.push({
        type: 'deletion',
        severity: deletes.length > 5 ? 'critical' : 'warning',
        title: `${deletes.length} Operações DELETE`,
        message: `${deletes.length} taxa(s) deletada(s) - Requer verificação imediata`,
        timestamp: deletes[deletes.length - 1].changed_at,
      });
    }

    return anomalies;
  };

  // 6. Detectar atividade fora do horário comercial
  const detectOffHoursActivity = (logs) => {
    const anomalies = [];
    const offHoursLogs = logs.filter((log) => {
      const hour = parseInt(format(parseISO(log.changed_at), 'HH'));
      return hour < 8 || hour > 18;
    });

    if (offHoursLogs.length > 10) {
      anomalies.push({
        type: 'off_hours',
        severity: 'info',
        title: `${offHoursLogs.length} Mudanças Fora do Horário`,
        message: `${offHoursLogs.length} mudanças registradas fora do horário comercial (08:00-18:00)`,
        timestamp: new Date().toISOString(),
      });
    }

    return anomalies;
  };

  // 7. Detectar mudanças repetitivas (mesmo campo várias vezes)
  const detectRepetitiveChanges = (logs) => {
    const anomalies = [];
    const fieldChanges = {};

    logs.forEach((log) => {
      const newValues = JSON.parse(log.new_values || '{}');
      Object.keys(newValues).forEach((field) => {
        const key = `${field}`;
        fieldChanges[key] = (fieldChanges[key] || 0) + 1;
      });
    });

    // If same field changed >15 times in period, it's repetitive
    Object.entries(fieldChanges).forEach(([field, count]) => {
      if (count > 15) {
        anomalies.push({
          type: 'repetitive',
          severity: 'info',
          title: `Campo Alterado Repetitivamente`,
          message: `Campo "${field}" foi alterado ${count} vezes (possível testes ou erro)`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return anomalies;
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'bg-red-50 border-red-300 text-red-900';
    if (severity === 'warning') return 'bg-yellow-50 border-yellow-300 text-yellow-900';
    return 'bg-blue-50 border-blue-300 text-blue-900';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return '🔴';
    if (severity === 'warning') return '🟡';
    return 'ℹ️';
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Analisando anomalias...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Detecção de Anomalias
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Análise estatística avançada
          </p>
        </div>

        <div className="flex gap-2">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                period === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border-2 border-red-300 p-4 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 mb-2" />
          <p className="text-2xl font-bold text-red-900">{stats.criticalCount}</p>
          <p className="text-xs text-red-700 font-medium">Críticas</p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg">
          <Zap className="w-5 h-5 text-yellow-600 mb-2" />
          <p className="text-2xl font-bold text-yellow-900">{stats.warningCount}</p>
          <p className="text-xs text-yellow-700 font-medium">Avisos</p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
          <Shield className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-blue-900">{stats.infoCount}</p>
          <p className="text-xs text-blue-700 font-medium">Informativos</p>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {anomalies.length > 0 ? (
          anomalies.map((anomaly, idx) => (
            <div
              key={idx}
              className={`border-l-4 p-4 rounded ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{getSeverityIcon(anomaly.severity)}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{anomaly.title}</h4>
                  <p className="text-sm mt-1">{anomaly.message}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {format(parseISO(anomaly.timestamp), 'dd/MM/yyyy HH:mm:ss', {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            ✅ Nenhuma anomalia detectada no período!
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Métodos de Detecção
        </h4>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>• <span className="font-medium">Spike Detection:</span> Desvio padrão {">"} 2σ</li>
          <li>• <span className="font-medium">Rate Anomalies:</span> Mudanças {"<"} 1 min</li>
          <li>• <span className="font-medium">Pattern Changes:</span> Alteração no padrão de ações</li>
          <li>• <span className="font-medium">User Behavior:</span> Atividade fora de padrão</li>
          <li>• <span className="font-medium">Deletions:</span> Operações DELETE</li>
          <li>• <span className="font-medium">Off-Hours:</span> Atividade ({"<"} 08h ou {">"} 18h)</li>
          <li>• <span className="font-medium">Repetitive:</span> Campo alterado {">"} 15x</li>
        </ul>
      </div>
    </div>
  );
}
