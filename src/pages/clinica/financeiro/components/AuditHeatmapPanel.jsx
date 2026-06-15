import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, TrendingUp } from 'lucide-react';

/**
 * F.2: Heatmap de Auditorias
 * Visualiza atividade de auditoria por hora × usuário
 * Identifica padrões de acesso, horários picos, anomalias
 */
export default function AuditHeatmapPanel() {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState([]);
  const [hours, setHours] = useState([]);
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState(7); // dias
  const [maxValue, setMaxValue] = useState(0);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    loadHeatmapData();
  }, [clinicId, period]);

  const loadHeatmapData = async () => {
    if (!clinicId) return;

    try {
      setLoading(true);

      // Fetch audit logs
      const startDate = subDays(new Date(), period);
      const { data: logs, error } = await supabase
        .from('fee_audit_log')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('changed_at', startDate.toISOString())
        .order('changed_at', { ascending: true });

      if (error) throw error;

      // Build heatmap matrix
      const matrix = {};
      const uniqueHours = new Set();
      const uniqueUsers = new Set();
      let totalByHour = {};
      let totalByUser = {};

      logs.forEach((log) => {
        const hour = parseInt(format(parseISO(log.changed_at), 'HH'));
        const user = log.changed_by?.substring(0, 12) || 'Unknown';

        uniqueHours.add(hour);
        uniqueUsers.add(user);

        const key = `${hour}-${user}`;
        matrix[key] = (matrix[key] || 0) + 1;

        // Totais
        totalByHour[hour] = (totalByHour[hour] || 0) + 1;
        totalByUser[user] = (totalByUser[user] || 0) + 1;
      });

      // Converter para array
      const hoursArr = Array.from(uniqueHours).sort((a, b) => a - b);
      const usersArr = Array.from(uniqueUsers).sort();
      const max = Math.max(
        ...Object.values(matrix).map((v) => v || 0),
        1
      );

      // Heatmap data
      const heatmap = [];
      hoursArr.forEach((hour) => {
        usersArr.forEach((user) => {
          const key = `${hour}-${user}`;
          const count = matrix[key] || 0;
          heatmap.push({
            hour,
            user,
            count,
            intensity: max > 0 ? (count / max) * 100 : 0,
          });
        });
      });

      setHours(hoursArr);
      setUsers(usersArr);
      setHeatmapData(heatmap);
      setMaxValue(max);

      // Gerar insights
      generateInsights(totalByHour, totalByUser, logs);
    } catch (err) {
      console.error('Erro ao carregar heatmap:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (totalByHour, totalByUser, logs) => {
    const insightsList = [];

    // Peak hours
    const sortedHours = Object.entries(totalByHour)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (sortedHours.length > 0) {
      const peakHour = parseInt(sortedHours[0][0]);
      const count = sortedHours[0][1];
      insightsList.push({
        type: 'peak_hour',
        severity: 'info',
        message: `Horário pico: ${String(peakHour).padStart(2, '0')}:00 com ${count} mudanças`,
      });
    }

    // Most active user
    const sortedUsers = Object.entries(totalByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1);

    if (sortedUsers.length > 0) {
      const topUser = sortedUsers[0][0];
      const userCount = sortedUsers[0][1];
      insightsList.push({
        type: 'top_user',
        severity: 'info',
        message: `Usuário mais ativo: ${topUser} (${userCount} mudanças)`,
      });
    }

    // Off-hours activity (before 08:00 or after 18:00)
    const offHoursActivity = Object.entries(totalByHour)
      .filter(([hour]) => parseInt(hour) < 8 || parseInt(hour) > 18)
      .reduce((sum, [, count]) => sum + count, 0);

    if (offHoursActivity > 0) {
      insightsList.push({
        type: 'off_hours',
        severity: 'warning',
        message: `${offHoursActivity} mudanças fora do horário comercial (verificar)`,
      });
    }

    // Sunday activity
    const sundayActivity = logs.filter(
      (log) => new Date(parseISO(log.changed_at)).getDay() === 0
    );

    if (sundayActivity.length > 0) {
      insightsList.push({
        type: 'sunday_activity',
        severity: 'warning',
        message: `${sundayActivity.length} mudanças aos domingos (verificar urgência)`,
      });
    }

    setInsights(insightsList);
  };

  const getHeatmapColor = (intensity) => {
    // Escala de cores: azul (baixo) → verde → amarelo → vermelho (alto)
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 25) return 'bg-blue-200';
    if (intensity < 50) return 'bg-blue-400';
    if (intensity < 75) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  const getIntensityLabel = (intensity) => {
    if (intensity === 0) return '-';
    if (intensity < 25) return 'Baixo';
    if (intensity < 50) return 'Médio';
    if (intensity < 75) return 'Alto';
    return 'Crítico';
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando heatmap...</div>
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
            Heatmap de Atividade
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Hora × Usuário (últimos {period} dias)
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

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`flex gap-2 p-3 rounded text-sm ${
                insight.severity === 'warning'
                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{insight.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap Matrix */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Header row com horas */}
          <div className="flex">
            <div className="w-32 pt-8 font-semibold text-sm text-gray-700 px-2">
              Usuário
            </div>
            <div className="flex gap-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-700 text-center border-r border-gray-200"
                >
                  {String(hour).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap rows */}
          {users.map((user) => (
            <div key={user} className="flex">
              <div className="w-32 px-2 py-2 text-sm text-gray-700 border-r border-gray-200 truncate">
                {user}
              </div>
              <div className="flex gap-0">
                {hours.map((hour) => {
                  const cell = heatmapData.find(
                    (h) => h.hour === hour && h.user === user
                  );
                  const intensity = cell?.intensity || 0;
                  const count = cell?.count || 0;

                  return (
                    <div
                      key={`${hour}-${user}`}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold cursor-pointer transition hover:ring-2 hover:ring-blue-500 border-r border-b border-gray-200 ${getHeatmapColor(
                        intensity
                      )}`}
                      title={`${user} às ${String(hour).padStart(2, '0')}:00 - ${count} mudanças`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
        <span className="text-sm font-semibold text-gray-700">Legenda:</span>
        <div className="flex gap-4">
          {[
            { color: 'bg-gray-100', label: 'Sem dados' },
            { color: 'bg-blue-200', label: 'Baixo (1-25%)' },
            { color: 'bg-blue-400', label: 'Médio (25-50%)' },
            { color: 'bg-yellow-400', label: 'Alto (50-75%)' },
            { color: 'bg-red-500', label: 'Crítico (75%+)' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${item.color}`}></div>
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600 font-medium">Horas Ativas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{hours.length}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600 font-medium">Usuários</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600 font-medium">Max Mudanças/Célula</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{maxValue}</p>
        </div>
      </div>
    </div>
  );
}
