import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard Widget para exibir resumo de auditoria na página inicial
 * Mostra: alertas críticos, estatísticas do período, gráfico de atividades
 */
export function AuditDashboardWidget({ logs = [] }) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, critical: 0 });

  useEffect(() => {
    if (!logs || logs.length === 0) return;

    // Calcular estatísticas
    const now = new Date();
    const today = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayLogs = logs.filter(log => new Date(log.created_at) > today).length;
    const weekLogs = logs.filter(log => new Date(log.created_at) > week).length;
    const deletions = logs.filter(log => log.action_type === 'DELETED').length;

    setStats({
      today: todayLogs,
      week: weekLogs,
      critical: deletions,
    });

    // Simular alertas (últimas deleções)
    const criticalAlerts = logs
      .filter(log => log.action_type === 'DELETED')
      .slice(0, 3)
      .map(log => ({
        id: log.id,
        type: 'DELETION',
        message: `${log.patient?.name || 'Agendamento'} foi deletado`,
        time: new Date(log.created_at),
      }));

    setAlerts(criticalAlerts);
  }, [logs]);

  // Gráfico simples de atividades
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const count = logs.filter(
      log => new Date(log.created_at).toDateString() === date.toDateString()
    ).length;
    return { date: date.toLocaleDateString('pt-BR', { weekday: 'short' }), count };
  });

  const maxCount = Math.max(...last7Days.map(d => d.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">📊 Auditoria de Agendamentos</h3>
        <Button
          size="sm"
          onClick={() => navigate('/clinica/auditoria')}
          className="text-xs"
        >
          Ver Detalhes →
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="text-xs text-blue-700 font-semibold">Hoje</div>
          <div className="text-2xl font-bold text-blue-900">{stats.today}</div>
          <div className="text-xs text-blue-600 mt-1">ações</div>
        </Card>

        <Card className="p-3 bg-green-50 border-green-200">
          <div className="text-xs text-green-700 font-semibold">Esta Semana</div>
          <div className="text-2xl font-bold text-green-900">{stats.week}</div>
          <div className="text-xs text-green-600 mt-1">ações</div>
        </Card>

        <Card className="p-3 bg-red-50 border-red-200">
          <div className="text-xs text-red-700 font-semibold">Críticos</div>
          <div className="text-2xl font-bold text-red-900">{stats.critical}</div>
          <div className="text-xs text-red-600 mt-1">deleções</div>
        </Card>
      </div>

      {/* Mini Chart - Últimos 7 dias */}
      <Card className="p-3">
        <div className="text-xs font-semibold mb-3">📈 Atividades (Últimos 7 dias)</div>
        <div className="flex items-end justify-between gap-1 h-16">
          {last7Days.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style={{ height: `${(day.count / maxCount) * 60}px` }}
                title={`${day.date}: ${day.count} ações`}
              ></div>
              <div className="text-xs text-gray-600">{day.date}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Latest Alerts */}
      {alerts.length > 0 && (
        <Card className="p-3 border-red-200 bg-red-50">
          <div className="text-xs font-semibold text-red-800 mb-2">⚠️ Últimos Alertas Críticos</div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="text-xs text-red-700 border-l-2 border-red-400 pl-2">
                <div className="font-semibold">🗑️ {alert.message}</div>
                <div className="text-xs text-red-600">
                  {alert.time.toLocaleString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {alerts.length === 0 && stats.critical === 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center text-xs text-green-700 font-semibold">
          ✓ Nenhum evento crítico detectado
        </div>
      )}
    </div>
  );
}
