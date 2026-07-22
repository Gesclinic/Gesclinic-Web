import React from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Table2 } from 'lucide-react';

export default function OperationalCashFlowTable({
  model,
  renderedRows,
  searchedVisibleRows,
  visibleColumnCount,
  densityHeaderClass,
  densityCellClass,
  showTotalColumn,
  expandedRows,
  toggleRow,
  openDrilldown,
  getRowIcon,
  getRowVariation,
  getRowPercent,
  getRowParticipation,
  rowClass,
  rowTypographyClass,
  valueClass,
  formatCurrency,
  formatPercentValue,
}) {
  return (
    <>
      <div className="max-h-[68vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className={`sticky left-0 z-40 min-w-[390px] border-b border-slate-200 bg-slate-100 px-3 ${densityHeaderClass} text-left font-bold dark:border-slate-700 dark:bg-slate-800`}>Descricao</th>
              {model.months.map((month) => (
                <th key={month} className={`min-w-[105px] border-b border-slate-200 px-3 ${densityHeaderClass} text-right font-bold dark:border-slate-700`}>
                  {model.periodLabels[month] || month}
                </th>
              ))}
              {showTotalColumn ? <th className={`min-w-[120px] border-b border-slate-200 bg-slate-200 px-3 ${densityHeaderClass} text-right font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50`}>Total</th> : null}
              <th className={`min-w-[82px] border-b border-slate-200 px-3 ${densityHeaderClass} text-right font-bold dark:border-slate-700`}>%</th>
              <th className={`min-w-[118px] border-b border-slate-200 px-3 ${densityHeaderClass} text-right font-bold dark:border-slate-700`}>Variação</th>
              <th className={`sticky right-0 z-20 min-w-[104px] border-b border-slate-200 bg-slate-200 px-3 ${densityHeaderClass} text-right font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50`}>Participação</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.length === 1 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={visibleColumnCount}>
                  Sem movimentos para montar a visão operacional no período.
                </td>
              </tr>
            ) : searchedVisibleRows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={visibleColumnCount}>
                  Nenhuma linha encontrada para a busca aplicada.
                </td>
              </tr>
            ) : renderedRows.map((row) => {
              const variation = getRowVariation(row);
              const rowPercent = getRowPercent(row);
              const participation = getRowParticipation(row);
              return (
                <tr key={row.key} className={`${rowClass(row)} border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/70`}>
                  <td className={`${rowClass(row)} sticky left-0 z-10 border-r border-slate-100 px-3 ${densityCellClass} align-top dark:border-slate-800`} style={{ paddingLeft: `${12 + row.level * 18}px` }}>
                    <div className={`flex items-start gap-2 leading-5 ${rowTypographyClass(row)}`}>
                      {row.hasChildren ? (
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleRow(row);
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            event.stopPropagation();
                            toggleRow(row);
                          }}
                          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                          aria-label={expandedRows.has(row.key) ? `Recolher ${row.label}` : `Expandir ${row.label}`}
                        >
                          {expandedRows.has(row.key) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <span className="h-5 w-5 shrink-0" />
                      )}
                      {getRowIcon(row) ? <span className="mt-0.5 shrink-0" aria-hidden="true">{getRowIcon(row)}</span> : null}
                      <button
                        type="button"
                        onClick={() => openDrilldown(row)}
                        className={`inline-flex items-start gap-1.5 text-left ${rowTypographyClass(row)} underline-offset-2 hover:text-blue-900 hover:underline dark:hover:text-blue-200`}
                        title="Abrir detalhamento financeiro"
                      >
                        <span>{row.label}</span>
                        {row.actionPath || row.source ? <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
                      </button>
                    </div>
                    {row.meta || row.statusLabel || row.warning ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1 pl-7 text-[10px] font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">
                        {row.statusLabel ? (
                          <span className={`rounded border px-1.5 py-0.5 ${row.warning ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/70 dark:bg-orange-950/50 dark:text-orange-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {row.statusLabel}
                          </span>
                        ) : null}
                        {row.warning ? <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-orange-700 dark:border-orange-700/70 dark:bg-orange-950/50 dark:text-orange-200">{row.warning}</span> : null}
                        {row.meta ? <span className="normal-case text-slate-500 dark:text-slate-400">{row.meta}</span> : null}
                      </div>
                    ) : null}
                  </td>
                  {model.months.map((month) => {
                    const value = row.values[month] || 0;
                    return (
                      <td key={month} className={`border-l border-slate-50 px-3 ${densityCellClass} text-right font-mono dark:border-slate-800 ${valueClass(value, row)}`}>
                        {value === 0 && !row.isBalanceStock ? '-' : formatCurrency(value)}
                      </td>
                    );
                  })}
                  {showTotalColumn ? (
                    <td className={`${rowClass(row)} border-l border-slate-200 px-3 ${densityCellClass} text-right font-mono font-bold dark:border-slate-700 ${valueClass(row.values.total, row)}`}>
                      {row.values.total === 0 && !row.isBalanceStock ? '-' : formatCurrency(row.values.total)}
                    </td>
                  ) : null}
                  <td className={`border-l border-slate-50 px-3 ${densityCellClass} text-right font-mono dark:border-slate-800 ${valueClass(row.values.total, row)}`}>{formatPercentValue(rowPercent)}</td>
                  <td className={`border-l border-slate-50 px-3 ${densityCellClass} text-right font-mono dark:border-slate-800 ${valueClass(variation, row)}`}>{variation === null || variation === 0 ? '-' : formatCurrency(variation)}</td>
                  <td className={`${rowClass(row)} sticky right-0 z-10 border-l border-slate-200 px-3 ${densityCellClass} text-right font-mono font-bold dark:border-slate-700 ${valueClass(row.values.total, row)}`}>{formatPercentValue(participation)}</td>
                </tr>
              );
            })}
            {searchedVisibleRows.length > renderedRows.length ? (
              <tr>
                <td className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400" colSpan={visibleColumnCount}>
                  Exibindo {renderedRows.length} de {searchedVisibleRows.length} linhas. Use a pesquisa para localizar e expandir automaticamente um item específico.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><Table2 className="h-3.5 w-3.5" /> Base: contas a receber, contas a pagar e lançamentos financeiros.</span>
        <span>Linhas sem conta vinculada usam classificação inferida; “Sem classificação” fica para movimentos sem conta e sem categoria.</span>
      </div>
    </>
  );
}
