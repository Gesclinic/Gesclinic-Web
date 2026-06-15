import React from 'react';
import {
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
} from 'recharts';
import { Card } from '@/components/ui/card';
import { AUDIT_ACTION_LABELS } from '@/lib/auditApi';

/**
 * Gera dados de tendência por dia
 */
function generateTrendData(logs) {
  const dataByDay = {};

  logs.forEach(log => {
    const date = new Date(log.created_at).toLocaleDateString('pt-BR');
    if (!dataByDay[date]) {
      dataByDay[date] = { date, CREATED: 0, UPDATED: 0, DELETED: 0 };
    }
    dataByDay[date][log.action_type]++;
  });

  return Object.values(dataByDay).sort((a, b) => {
    const [dayA, monthA, yearA] = a.date.split('/');
    const [dayB, monthB, yearB] = b.date.split('/');
    const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
    const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
    return dateA - dateB;
  });
}

/**
 * Gera dados de distribuição por tipo de ação
 */
function generateActionDistribution(logs) {
  const distribution = { CREATED: 0, UPDATED: 0, DELETED: 0 };

  logs.forEach(log => {
    distribution[log.action_type]++;
  });

  return Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(([action, count]) => ({
      name: AUDIT_ACTION_LABELS[action],
      value: count,
      color: {
        CREATED: '#10b981',
        UPDATED: '#3b82f6',
        DELETED: '#ef4444',
      }[action],
    }));
}

export function AuditTrendChart({ logs }) {
  if (!logs || logs.length === 0) {
    return null;
  }

  const trendData = generateTrendData(logs);
  const distributionData = generateActionDistribution(logs);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Tendência por Dia */}
      {trendData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Tendência de Ações (por dia)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => value}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="CREATED"
                name={AUDIT_ACTION_LABELS.CREATED}
                fill="#10b981"
                stackId="a"
              />
              <Bar
                dataKey="UPDATED"
                name={AUDIT_ACTION_LABELS.UPDATED}
                fill="#3b82f6"
                stackId="a"
              />
              <Bar
                dataKey="DELETED"
                name={AUDIT_ACTION_LABELS.DELETED}
                fill="#ef4444"
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Distribuição por Tipo de Ação */}
      {distributionData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Distribuição de Ações</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
