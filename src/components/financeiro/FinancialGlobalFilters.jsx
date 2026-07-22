import React from 'react';
import { ChevronDown, Filter, RotateCcw, Search } from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '12m', label: '12 meses' },
  { value: 'custom', label: 'Customizado' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'open', label: 'Aberta' },
  { value: 'paid', label: 'Realizada' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Vencida' },
  { value: 'canceled', label: 'Cancelada' },
];

const FIELD_GROUPS = [
  [
    { key: 'bank', label: 'Banco' },
    { key: 'bankAccount', label: 'Conta Bancaria' },
    { key: 'financialAccount', label: 'Conta Financeira' },
    { key: 'chartAccount', label: 'Plano de Contas' },
  ],
  [
    { key: 'costCenter', label: 'Centro de Custo' },
    { key: 'category', label: 'Categoria' },
    { key: 'nature', label: 'Natureza' },
    { key: 'project', label: 'Projeto' },
  ],
  [
    { key: 'insurance', label: 'Convenio' },
    { key: 'professional', label: 'Profissional' },
    { key: 'patient', label: 'Paciente' },
    { key: 'supplier', label: 'Fornecedor' },
  ],
  [
    { key: 'receiptMethod', label: 'Forma Recebimento' },
    { key: 'paymentMethod', label: 'Forma Pagamento' },
    { key: 'user', label: 'Usuario' },
  ],
];

function formatDateMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBrazilDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day) return '';
  return isoDate;
}

function formatIsoToBrazil(value) {
  if (!value) return '';
  const [year, month, day] = String(value).split('T')[0].split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function TextFilter({ label, value, onChange }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="text"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />
    </label>
  );
}

export default function FinancialGlobalFilters({
  filters,
  clinic,
  accountingMode,
  onAccountingModeChange,
  onChange,
  onReset,
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [dateStart, setDateStart] = React.useState(formatIsoToBrazil(filters.startDate));
  const [dateEnd, setDateEnd] = React.useState(formatIsoToBrazil(filters.endDate));

  React.useEffect(() => {
    setDateStart(formatIsoToBrazil(filters.startDate));
    setDateEnd(formatIsoToBrazil(filters.endDate));
  }, [filters.startDate, filters.endDate]);

  const update = (key, value) => onChange({ ...filters, [key]: value });
  const parsedStart = parseBrazilDate(dateStart);
  const parsedEnd = parseBrazilDate(dateEnd);

  const applyDates = () => {
    onChange({
      ...filters,
      period: parsedStart && parsedEnd ? 'custom' : filters.period,
      startDate: parsedStart,
      endDate: parsedEnd,
    });
  };

  const activeAdvancedCount = FIELD_GROUPS.flat().filter((field) => filters[field.key]).length
    + (filters.status ? 1 : 0)
    + (filters.competence ? 1 : 0);

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          <div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">Filtros globais</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Compartilhados entre Visao Geral, Operacional, Fluxo Projetado e Analises.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            Avancados {activeAdvancedCount ? `(${activeAdvancedCount})` : ''}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
        <TextFilter label="Empresa" value={filters.company || clinic?.brand_name || clinic?.name || ''} onChange={(value) => update('company', value)} />
        <TextFilter label="Filial" value={filters.branch || clinic?.name || ''} onChange={(value) => update('branch', value)} />
        <TextFilter label="Competencia" value={filters.competence || ''} onChange={(value) => update('competence', value)} />
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Periodo</span>
          <select
            value={filters.period || '30d'}
            onChange={(event) => update('period', event.target.value)}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Data Inicial</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="dd/mm/aaaa"
            value={dateStart}
            onChange={(event) => setDateStart(formatDateMask(event.target.value))}
            onBlur={applyDates}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Data Final</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="dd/mm/aaaa"
            value={dateEnd}
            onChange={(event) => setDateEnd(formatDateMask(event.target.value))}
            onBlur={applyDates}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Regime</span>
        <button
          type="button"
          onClick={() => onAccountingModeChange('realized')}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${accountingMode === 'realized'
            ? 'border-blue-700 bg-blue-700 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Caixa
        </button>
        <button
          type="button"
          onClick={() => onAccountingModeChange('accrual')}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${accountingMode === 'accrual'
            ? 'border-emerald-700 bg-emerald-700 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Competencia
        </button>
        <div className="ml-auto flex min-w-[220px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Busca global"
            className="h-6 min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Situacao</span>
              <select
                value={filters.status || ''}
                onChange={(event) => update('status', event.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          {FIELD_GROUPS.map((group, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {group.map((field) => (
                <TextFilter key={field.key} label={field.label} value={filters[field.key] || ''} onChange={(value) => update(field.key, value)} />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}