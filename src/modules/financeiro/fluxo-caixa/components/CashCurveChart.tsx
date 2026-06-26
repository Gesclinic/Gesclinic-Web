/**
 * 📈 CashCurveChart — Curva de Caixa com Recharts
 * Linha temporal + saldo acumulado + entradas/saídas diárias
 */
import React, { useMemo } from 'react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface ChartPoint {
  date: string;
  entradas: number;
  saidas: number;
  saldoAcumulado: number;
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-800 mb-2">{fmtDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

interface Props {
  data: ChartPoint[];
  loading?: boolean;
}

export default function CashCurveChart({ data, loading }: Props) {
  const sliced = useMemo(() => {
    // Limit to 90 days for readability; aggregate weekly for longer horizons
    if (data.length <= 90) return data;
    const aggregated: ChartPoint[] = [];
    for (let i = 0; i < data.length; i += 7) {
      const week = data.slice(i, i + 7);
      aggregated.push({
        date: week[0].date,
        entradas: week.reduce((s, d) => s + d.entradas, 0),
        saidas: week.reduce((s, d) => s + d.saidas, 0),
        saldoAcumulado: week[week.length - 1].saldoAcumulado,
      });
    }
    return aggregated;
  }, [data]);

  if (loading) {
    return <div className="h-72 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Sem dados para o período selecionado.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-800">Curva de Caixa Projetada</p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={sliced} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fmtCurrency}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(name) => <span className="text-slate-600">{name}</span>}
          />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
          <Bar dataKey="entradas" name="Entradas" fill="#10b981" opacity={0.7} radius={[2, 2, 0, 0]} />
          <Bar dataKey="saidas" name="Saídas" fill="#f43f5e" opacity={0.7} radius={[2, 2, 0, 0]} />
          <Area
            type="monotone"
            dataKey="saldoAcumulado"
            name="Saldo Acumulado"
            stroke="#3b82f6"
            fill="#dbeafe"
            strokeWidth={2.5}
            fillOpacity={0.35}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
