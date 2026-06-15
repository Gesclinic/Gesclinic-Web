import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Trash2, AlertTriangle, BarChart3, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAlerts, resolveAlert, dismissAlert, getAlertStats } from '@/lib/alertsApi';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

/**
 * AlertCenter.jsx
 * Central de alertas com lista, filtros e ações
 */
const AlertCenter = () => {
  const { clinicId } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: null,
    severity: null,
    limit: 50,
    offset: 0
  });
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());

  // Cores por severidade
  const severityColors = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e'
  };

  const severityTextColors = {
    CRITICAL: 'text-red-600',
    HIGH: 'text-orange-600',
    MEDIUM: 'text-yellow-600',
    LOW: 'text-green-600'
  };

  const severityBgColors = {
    CRITICAL: 'bg-red-100',
    HIGH: 'bg-orange-100',
    MEDIUM: 'bg-yellow-100',
    LOW: 'bg-green-100'
  };

  // Carrega alertas
  const loadAlerts = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const data = await getAlerts(clinicId, filters);
      setAlerts(data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega estatísticas
  const loadStats = async () => {
    if (!clinicId) return;
    try {
      const data = await getAlertStats(clinicId);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadStats();
  }, [clinicId, filters]);

  // Resolve alerta
  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
      loadStats();
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  // Descarta alerta
  const handleDismiss = async (alertId) => {
    try {
      await dismissAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
      loadStats();
    } catch (error) {
      console.error('Erro ao descartar alerta:', error);
    }
  };

  // Toggle seleção
  const handleToggleSelect = (alertId) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  // Resolve múltiplos
  const handleResolveSelected = async () => {
    try {
      await Promise.all(Array.from(selectedAlerts).map(id => resolveAlert(id)));
      setAlerts(alerts.filter(a => !selectedAlerts.has(a.id)));
      setSelectedAlerts(new Set());
      loadStats();
    } catch (error) {
      console.error('Erro ao resolver múltiplos:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertCircle className="w-8 h-8 text-red-500" />
          Central de Alertas
        </h1>
        <p className="text-gray-500 mt-1">Monitore e gerencie todos os alertas da sua clínica</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.byType.delinquency || 0}</div>
                <p className="text-sm text-gray-500 mt-1">Inadimplência</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.byType.repayment_late || 0}</div>
                <p className="text-sm text-gray-500 mt-1">Repasses Atrasados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats.byType.goal_missed || 0}</div>
                <p className="text-sm text-gray-500 mt-1">Metas Não Atingidas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-700">{stats.activeCount}</div>
                <p className="text-sm text-gray-500 mt-1">Total Ativo</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico de Distribuição */}
      {stats && stats.byType && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Distribuição de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(stats.byType).map(([name, value]) => ({
                    name: name.replace('_', ' '),
                    value
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#f97316" />
                  <Cell fill="#eab308" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <Filter className="w-5 h-5 text-gray-400" />
        <select
          value={filters.type || ''}
          onChange={(e) => setFilters({ ...filters, type: e.target.value || null, offset: 0 })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Todos os Tipos</option>
          <option value="delinquency">Inadimplência</option>
          <option value="repayment_late">Repasses Atrasados</option>
          <option value="goal_missed">Metas Não Atingidas</option>
          <option value="low_cashflow">Fluxo de Caixa Baixo</option>
        </select>
        <select
          value={filters.severity || ''}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value || null, offset: 0 })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Todas as Severidades</option>
          <option value="CRITICAL">Crítico</option>
          <option value="HIGH">Alto</option>
          <option value="MEDIUM">Médio</option>
          <option value="LOW">Baixo</option>
        </select>
        {selectedAlerts.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolveSelected}
            className="ml-auto"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Resolver ({selectedAlerts.size})
          </Button>
        )}
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Carregando alertas...</p>
            </CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Nenhum alerta ativo 🎉</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map(alert => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.severity === 'CRITICAL' ? 'border-l-red-500' :
              alert.severity === 'HIGH' ? 'border-l-orange-500' :
              alert.severity === 'MEDIUM' ? 'border-l-yellow-500' :
              'border-l-green-500'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedAlerts.has(alert.id)}
                    onChange={() => handleToggleSelect(alert.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {alert.severity === 'CRITICAL' ? <AlertTriangle className="w-5 h-5 text-red-600" /> :
                       alert.severity === 'HIGH' ? <AlertCircle className="w-5 h-5 text-orange-600" /> :
                       <AlertCircle className="w-5 h-5 text-yellow-600" />}
                      <h3 className="font-semibold">{alert.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${severityBgColors[alert.severity]} ${severityTextColors[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(alert.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolver
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {alerts.length === filters.limit && (
        <div className="flex justify-center gap-2">
          {filters.offset > 0 && (
            <Button
              variant="outline"
              onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
            >
              ← Anterior
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
          >
            Próxima →
          </Button>
        </div>
      )}
    </div>
  );
};

export default AlertCenter;
