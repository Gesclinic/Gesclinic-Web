import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { getFeeChangesByClinic } from '@/lib/processorFeeValidations';
import { supabase } from '@/lib/customSupabaseClient';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  format,
  startOfMonth,
  endOfMonth,
  subDays,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  Activity,
  Download,
  Filter,
  BarChart3,
  AlertCircle,
  Mail,
} from 'lucide-react';

// Import F.2-F.5 components
import AuditHeatmapPanel from './components/AuditHeatmapPanel';
import AuditTrendsPanel from './components/AuditTrendsPanel';
import AnomalyDetectionPanel from './components/AnomalyDetectionPanel';
import AuditEmailReportsPanel from './components/AuditEmailReportsPanel';

export default function AuditoryAnalyticsDashboard() {
  const { clinicId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // 7, 30, 90
  const [activeTab, setActiveTab] = useState('overview'); // overview, heatmap, trends, anomalies, email
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  // Data states
  const [kpis, setKpis] = useState({
    totalChanges: 0,
    createActions: 0,
    updateActions: 0,
    deleteActions: 0,
    uniqueUsers: 0,
    uniqueProcessors: 0,
    avgChangesPerDay: 0,
  });

  const [trendsData, setTrendsData] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [processorActivity, setProcessorActivity] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [clinicId, period]);

  const loadDashboardData = async () => {
    if (!clinicId) return;

    try {
      setLoading(true);
      const days = parseInt(period);

      // Fetch audit logs
      const { data: auditLogs, error } = await supabase
        .from('fee_audit_log')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('changed_at', subDays(new Date(), days).toISOString())
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Calculate KPIs
      calculateKPIs(auditLogs);

      // Generate trends
      generateTrendData(auditLogs);

      // Generate user activity
      generateUserActivity(auditLogs);

      // Generate processor activity
      generateProcessorActivity(auditLogs);

      // Generate heatmap
      generateHeatmap(auditLogs);

      // Detect anomalies
      detectAnomalies(auditLogs);
    } catch (err) {
      console.error('Erro ao carregar dashboard de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (logs) => {
    const actions = logs.reduce(
      (acc, log) => {
        acc.total++;
        if (log.action === 'create') acc.creates++;
        else if (log.action === 'update') acc.updates++;
        else if (log.action === 'delete') acc.deletes++;
        return acc;
      },
      { total: 0, creates: 0, updates: 0, deletes: 0 }
    );

    const uniqueUsers = new Set(logs.map((l) => l.changed_by)).size;
    const uniqueProcessors = new Set(
      logs.map((l) => JSON.parse(l.old_values || '{}').card_processor_id)
    ).size;

    const daysInPeriod = parseInt(period);
    const avgPerDay = logs.length / daysInPeriod;

    setKpis({
      totalChanges: actions.total,
      createActions: actions.creates,
      updateActions: actions.updates,
      deleteActions: actions.deletes,
      uniqueUsers,
      uniqueProcessors,
      avgChangesPerDay: avgPerDay.toFixed(1),
    });
  };

  const generateTrendData = (logs) => {
    const byDate = {};

    logs.forEach((log) => {
      const date = format(parseISO(log.changed_at), 'dd/MM', { locale: ptBR });
      if (!byDate[date]) {
        byDate[date] = {
          date,
          creates: 0,
          updates: 0,
          deletes: 0,
          total: 0,
        };
      }
      byDate[date][log.action]++;
      byDate[date].total++;
    });

    const trends = Object.values(byDate).sort(
      (a, b) =>
        new Date(b.date.split('/').reverse().join('-')) -
        new Date(a.date.split('/').reverse().join('-'))
    );

    setTrendsData(trends);
  };

  const generateUserActivity = (logs) => {
    const byUser = {};

    logs.forEach((log) => {
      if (!byUser[log.changed_by]) {
        byUser[log.changed_by] = { user: log.changed_by, count: 0 };
      }
      byUser[log.changed_by].count++;
    });

    setUserActivity(Object.values(byUser).sort((a, b) => b.count - a.count));
  };

  const generateProcessorActivity = (logs) => {
    const byProcessor = {};

    logs.forEach((log) => {
      const oldValues = JSON.parse(log.old_values || '{}');
      const newValues = JSON.parse(log.new_values || '{}');
      const processor =
        oldValues.card_processor_id ||
        newValues.card_processor_id ||
        'Unknown';

      if (!byProcessor[processor]) {
        byProcessor[processor] = { processor, count: 0 };
      }
      byProcessor[processor].count++;
    });

    setProcessorActivity(
      Object.values(byProcessor).sort((a, b) => b.count - a.count)
    );
  };

  const generateHeatmap = (logs) => {
    const matrix = {};

    logs.forEach((log) => {
      const user = log.changed_by?.substring(0, 8) || 'Unknown';
      const hour = format(parseISO(log.changed_at), 'HH', { locale: ptBR });

      const key = `${user}-${hour}`;
      matrix[key] = (matrix[key] || 0) + 1;
    });

    const heatmapArray = Object.entries(matrix).map(([key, count]) => {
      const [user, hour] = key.split('-');
      return { user, hour: parseInt(hour), count };
    });

    setHeatmapData(heatmapArray);
  };

  const detectAnomalies = (logs) => {
    const anomaliesList = [];

    // Detect: Multiple changes in short time
    const byMinute = {};
    logs.forEach((log) => {
      const minute = format(parseISO(log.changed_at), 'HH:mm', {
        locale: ptBR,
      });
      byMinute[minute] = (byMinute[minute] || 0) + 1;
    });

    Object.entries(byMinute).forEach(([minute, count]) => {
      if (count > 10) {
        anomaliesList.push({
          type: 'high_frequency',
          severity: 'warning',
          message: `${count} mudanças em ${minute} (verificar atividade em massa)`,
          timestamp: minute,
        });
      }
    });

    // Detect: Reversions
    const reversions = logs.filter(
      (log) => log.action === 'revert' || log.change_reason?.includes('reverter')
    );

    if (reversions.length > 5) {
      anomaliesList.push({
        type: 'high_reversions',
        severity: 'info',
        message: `${reversions.length} reversões detectadas (possível validação inadequada)`,
        timestamp: format(new Date(), 'HH:mm'),
      });
    }

    // Detect: Delete operations
    const deletes = logs.filter((log) => log.action === 'delete');
    if (deletes.length > 0) {
      anomaliesList.push({
        type: 'deletions',
        severity: 'critical',
        message: `${deletes.length} operações DELETE realizadas (requer aprovação)`,
        timestamp: format(new Date(), 'HH:mm'),
      });
    }

    setAnomalies(anomaliesList);
  };

  const handlePeriodChange = (days) => {
    setPeriod(days);
  };

  const exportAuditReport = async () => {
    try {
      const { data: logs } = await supabase
        .from('fee_audit_log')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('changed_at', { ascending: false });

      const csv = [
        ['Data', 'Usuário', 'Ação', 'Processadora', 'Marca', 'Taxa', 'Motivo'].join(
          ','
        ),
        ...logs.map((log) => {
          const newValues = JSON.parse(log.new_values || '{}');
          return [
            format(parseISO(log.changed_at), 'dd/MM/yyyy HH:mm:ss'),
            log.changed_by,
            log.action.toUpperCase(),
            newValues.card_processor_id || '-',
            newValues.card_brand || '-',
            (newValues.fee_percent || 0).toFixed(2) + '%',
            log.change_reason || '-',
          ].join(',');
        }),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria-taxas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Auditoria de Taxas - Analytics
          </h1>
          <p className="text-gray-600 mt-2">Análise completa com 5 dashboards</p>
        </div>

        <div className="flex gap-2">
          {[
            { label: '7 dias', value: '7' },
            { label: '30 dias', value: '30' },
            { label: '90 dias', value: '90' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`px-4 py-2 rounded font-medium transition ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}

          <button
            onClick={exportAuditReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow border-b border-gray-200 overflow-x-auto">
        <div className="flex">
          {[
            { id: 'overview', label: '📊 Visão Geral' },
            { id: 'heatmap', label: '🔥 Heatmap' },
            { id: 'trends', label: '📈 Tendências' },
            { id: 'anomalies', label: '⚠️ Anomalias' },
            { id: 'email', label: '📧 Email' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Overview */}
      {activeTab === 'overview' && (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total de Mudanças',
            value: kpis.totalChanges,
            icon: Activity,
            color: 'blue',
          },
          {
            label: 'Usuários Ativos',
            value: kpis.uniqueUsers,
            icon: Users,
            color: 'purple',
          },
          {
            label: 'Processadoras',
            value: kpis.uniqueProcessors,
            icon: TrendingUp,
            color: 'green',
          },
          {
            label: 'Média/Dia',
            value: kpis.avgChangesPerDay,
            icon: AlertTriangle,
            color: 'yellow',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={`bg-white p-6 rounded-lg shadow border-l-4 border-${kpi.color}-500`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">{kpi.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {kpi.value}
                </p>
              </div>
              <kpi.icon className={`w-8 h-8 text-${kpi.color}-500 opacity-50`} />
            </div>
          </div>
        ))}
        </div>

        {/* Action Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Criações',
            value: kpis.createActions,
            bg: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-300',
          },
          {
            label: 'Atualizações',
            value: kpis.updateActions,
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-300',
          },
          {
            label: 'Deleções',
            value: kpis.deleteActions,
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-300',
          },
        ].map((action, idx) => (
          <div
            key={idx}
            className={`${action.bg} border-2 ${action.border} p-6 rounded-lg text-center`}
          >
            <p className={`text-sm font-medium ${action.text}`}>{action.label}</p>
            <p className={`text-4xl font-bold ${action.text} mt-2`}>
              {action.value}
            </p>
          </div>
        ))}
      </div>

      {/* Anomalies Alert */}
      {anomalies.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h3 className="font-semibold text-red-900 mb-3">⚠️ Anomalias Detectadas</h3>
          <div className="space-y-2">
            {anomalies.map((anomaly, idx) => (
              <div
                key={idx}
                className={`text-sm ${
                  anomaly.severity === 'critical'
                    ? 'text-red-800'
                    : anomaly.severity === 'warning'
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}
              >
                • {anomaly.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tendência de Mudanças
          </h3>
          {trendsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="creates" fill="#10b981" name="Criações" />
                <Bar dataKey="updates" fill="#3b82f6" name="Atualizações" />
                <Bar dataKey="deletes" fill="#ef4444" name="Deleções" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Sem dados para o período
            </div>
          )}
        </div>

        {/* User Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Atividade por Usuário
          </h3>
          {userActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={userActivity.slice(0, 10)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="user"
                  type="category"
                  width={80}
                  fontSize={12}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Sem dados de usuário
            </div>
          )}
        </div>
      </div>

      {/* Processor Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Atividade por Processadora
        </h3>
        {processorActivity.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processorActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="processor" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Sem dados de processadora
          </div>
        )}
      </div>
      </div>
      )}

      {/* F.2: Heatmap Tab */}
      {activeTab === 'heatmap' && <AuditHeatmapPanel />}

      {/* F.3: Trends Tab */}
      {activeTab === 'trends' && <AuditTrendsPanel />}

      {/* F.4: Anomalies Tab */}
      {activeTab === 'anomalies' && <AnomalyDetectionPanel />}

      {/* F.5: Email Tab */}
      {activeTab === 'email' && <AuditEmailReportsPanel />}
    </div>
  );
}
