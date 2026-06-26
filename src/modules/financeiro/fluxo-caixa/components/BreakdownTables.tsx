/**
 * 🏥 BreakdownTables — Projeção por Convênio, Médico e Centro de Custo
 */
import React, { useState } from 'react';
import type { ConvenioBreakdown, DoctorBreakdown, CostCenterBreakdown } from '../services/projectionEngine';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function SectionTable<T extends { itemCount: number }>({
  title,
  data,
  valueKey,
  nameKey,
  valueLabel,
  color,
}: {
  title: string;
  data: T[];
  valueKey: keyof T;
  nameKey: keyof T;
  valueLabel: string;
  color: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? data : data.slice(0, 5);
  const total = data.reduce((s, d) => s + Number(d[valueKey] || 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <span className="text-xs text-slate-500">{data.length} itens • {fmt(total)}</span>
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Sem dados no período.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-1.5 text-left font-semibold text-slate-600">{String(nameKey)}</th>
                  <th className="pb-1.5 text-right font-semibold text-slate-600">{valueLabel}</th>
                  <th className="pb-1.5 text-right font-semibold text-slate-600">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const val = Number(row[valueKey] || 0);
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700">{String(row[nameKey] || '—')}</td>
                      <td className="py-2 text-right font-semibold">
                        <span className={color}>{fmt(val)}</span>
                        <span className="ml-1 text-slate-400">({pct.toFixed(0)}%)</span>
                      </td>
                      <td className="py-2 text-right text-slate-500">{row.itemCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              {expanded ? 'Ver menos' : `Ver todos (${data.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface Props {
  byConvenio: ConvenioBreakdown[];
  byDoctor: DoctorBreakdown[];
  byCostCenter: CostCenterBreakdown[];
  loading?: boolean;
}

export default function BreakdownTables({ byConvenio, byDoctor, byCostCenter, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SectionTable
        title="📋 Por Convênio"
        data={byConvenio}
        nameKey="name"
        valueKey="expectedInflow"
        valueLabel="Entrada Prevista"
        color="text-emerald-700"
      />
      <SectionTable
        title="👨‍⚕️ Por Médico (Repasse)"
        data={byDoctor}
        nameKey="name"
        valueKey="expectedRepasse"
        valueLabel="Repasse Previsto"
        color="text-orange-700"
      />
      <SectionTable
        title="🏢 Por Centro de Custo"
        data={byCostCenter}
        nameKey="name"
        valueKey="expectedOutflow"
        valueLabel="Saída Prevista"
        color="text-red-700"
      />
    </div>
  );
}
