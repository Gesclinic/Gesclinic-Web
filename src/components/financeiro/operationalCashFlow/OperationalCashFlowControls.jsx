import React from 'react';
import { ChevronDown, ChevronRight, Columns3, Search } from 'lucide-react';
import {
  DISPLAY_OPTIONS,
  PERIODICITY_OPTIONS,
  SCENARIO_OPTIONS,
} from './constants';

function CompactSelect({ label, value, options, onChange }) {
  return (
    <label className="flex h-8 min-w-[132px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-6 min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px] font-bold text-slate-900 outline-none focus:ring-0 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function OperationalCashFlowControls({
  tablePeriodicity,
  onPeriodicityChange,
  tableScenario,
  onScenarioChange,
  tableDisplay,
  onDisplayChange,
  viewDepth,
  onDepthChange,
  showDateControls,
  dateStart,
  dateEnd,
  onDateStartChange,
  onDateEndChange,
  formatDateMask,
  normalizedDateStart,
  normalizedDateEnd,
  onDateRangeChange,
  onApplyDateRange,
  onClearDateRange,
  rowSearch,
  onRowSearchChange,
  quickTreeFilter,
  onQuickTreeFilterChange,
  layoutOptions,
  onLayoutOptionChange,
  onExpandAll,
  onExpandCurrentLevel,
  onCollapseAll,
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900/60">
      <CompactSelect label="Visão" value={tablePeriodicity} options={PERIODICITY_OPTIONS} onChange={onPeriodicityChange} />
      <CompactSelect label="Cenário" value={tableScenario} options={SCENARIO_OPTIONS} onChange={onScenarioChange} />
      <CompactSelect label="Exibir" value={tableDisplay} options={DISPLAY_OPTIONS} onChange={onDisplayChange} />
      <CompactSelect
        label="Nível"
        value={viewDepth}
        options={[
          { value: 'groups', label: 'Resumo' },
          { value: 'accounts', label: 'Contas' },
          { value: 'details', label: 'Detalhes' },
        ]}
        onChange={onDepthChange}
      />
      {showDateControls ? (
        <div className="min-w-0 flex-[0.9_1_172px] rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-0.5 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Período</p>
          <div className="grid gap-1">
            <div className="grid grid-cols-2 gap-1">
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                aria-label="Data inicial"
                maxLength={10}
                value={dateStart}
                onChange={(event) => onDateStartChange(formatDateMask(event.target.value))}
                className="h-6 w-full min-w-0 rounded-md border border-slate-300 bg-white px-1.5 text-[10px] font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                aria-label="Data final"
                maxLength={10}
                value={dateEnd}
                onChange={(event) => onDateEndChange(formatDateMask(event.target.value))}
                className="h-6 w-full min-w-0 rounded-md border border-slate-300 bg-white px-1.5 text-[10px] font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={onApplyDateRange}
                disabled={!normalizedDateStart || !normalizedDateEnd || !onDateRangeChange}
                className="inline-flex h-6 w-full items-center justify-center rounded-md border border-blue-600 bg-blue-600 px-2 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={onClearDateRange}
                disabled={!dateStart && !dateEnd}
                className="inline-flex h-6 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white dark:disabled:text-slate-500"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <label className="relative min-w-[210px] flex-[1_1_260px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={rowSearch}
          onChange={(event) => onRowSearchChange(event.target.value)}
          placeholder="Buscar na arvore operacional"
          className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
      </label>
      <div className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900">
        {[
          ['all', 'Todos'],
          ['attendance', 'Atendimentos'],
          ['realized-expenses', 'Despesas realizadas'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onQuickTreeFilterChange(value)}
            className={`h-6 rounded px-2 text-[10px] font-semibold ${quickTreeFilter === value ? 'bg-slate-900 text-white dark:bg-blue-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900">
        <Columns3 className="h-3.5 w-3.5 text-slate-400" />
        <span className="h-6 rounded bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white dark:bg-blue-500">Colunas gerenciais</span>
      </div>
      <div className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900">
        {[
          ['comfortable', 'Normal'],
          ['compact', 'Compacto'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onLayoutOptionChange('density', value)}
            className={`h-6 rounded px-2 text-[10px] font-semibold ${layoutOptions.density === value ? 'bg-slate-900 text-white dark:bg-blue-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={onExpandAll}
          className="inline-flex h-6 items-center justify-center gap-1 rounded px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Expandir
        </button>
        <button
          type="button"
          onClick={onExpandCurrentLevel}
          className="inline-flex h-6 items-center justify-center gap-1 rounded px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Columns3 className="h-3.5 w-3.5" />
          Nível atual
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="inline-flex h-6 items-center justify-center gap-1 rounded px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          Recolher
        </button>
      </div>
    </div>
  );
}
