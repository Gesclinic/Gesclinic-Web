import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { MANAGEMENT_TREE_BY_KEY } from './constants';

function StatBlock({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-100',
    red: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-700/70 dark:bg-rose-950/50 dark:text-rose-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-700/70 dark:bg-blue-950/50 dark:text-blue-100',
  };

  return (
    <div className={`min-h-[56px] rounded-lg border px-3 py-2 shadow-sm ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-0.5">
        <p className="text-base font-bold tracking-normal">{value}</p>
        {hint ? <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function OperationalCashFlowDrilldownDrawer({
  row,
  onClose,
  onAdjust,
  formatCurrency,
  formatSourceLabel,
  firstFriendlyDetail,
  firstMeaningful,
  isMeaningfulText,
}) {
  if (!row) return null;

  const source = row.source || {};
  const raw = source.raw || {};
  const groupKey = String(row.groupKey || '').replace(/^section:/, '');
  const dreSection = MANAGEMENT_TREE_BY_KEY.get(groupKey);
  const dreLabel = firstFriendlyDetail(raw.dre_name, raw.result_center_name, raw.cost_center_name)
    || (dreSection ? `${dreSection.code ? `${dreSection.code} ` : ''}${dreSection.label}` : '');
  const payableLabel = firstFriendlyDetail(
    source.documentNumber ? `NF ${source.documentNumber}` : '',
    raw.nf_number ? `NF ${raw.nf_number}` : '',
    raw.invoice_number ? `NF ${raw.invoice_number}` : '',
    source.description,
    raw.description,
  );
  const receivableLabel = firstFriendlyDetail(
    source.documentNumber ? `Documento ${source.documentNumber}` : '',
    raw.invoice_number ? `Documento ${raw.invoice_number}` : '',
    source.description,
    raw.description,
  );
  const cashFlowLabel = firstFriendlyDetail(
    source.financialAccountName,
    raw.financial_account_name,
    raw.account_name,
    raw.bank_account_name,
    raw.cash_drawer_name,
    raw.drawer_name,
  );
  const fields = [
    ['Resumo Financeiro', row.values?.total !== undefined ? formatCurrency(row.values.total) : '-'],
    ['Paciente', firstMeaningful(source.patientName, raw.patient_name, raw.paciente_name)],
    ['Convênio', firstMeaningful(source.payerName, raw.convenio_name, raw.insurance_name)],
    ['Profissional', firstMeaningful(source.professionalName, raw.professional_name, raw.profissional_name)],
    ['Procedimento', firstMeaningful(source.serviceName, raw.service_name, raw.procedure_name, row.label)],
    ['Agenda', firstMeaningful(raw.appointment_id, raw.agenda_id, raw.appointments?.id)],
    ['Nota Fiscal', firstMeaningful(source.documentNumber, raw.nf_number, raw.invoice_number)],
    ['Conta a receber', source.originModule === 'accounts_receivable' ? receivableLabel : firstFriendlyDetail(raw.receivable_name, raw.ar_invoice_number)],
    ['Conta a pagar', source.originModule === 'accounts_payable' ? payableLabel : firstFriendlyDetail(raw.payable_name, raw.ap_bill_number)],
    ['Fluxo de caixa', cashFlowLabel],
    ['Repasse', firstMeaningful(raw.medical_transfer_id, raw.repasse_id)],
    ['DRE', dreLabel],
    ['Histórico', firstMeaningful(source.description, raw.notes, row.meta)],
    ['Auditoria', firstMeaningful(raw.audit_id, raw.created_by, raw.updated_by, source.statusLabel)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar detalhamento" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Detalhamento financeiro</p>
              <h3 className="mt-1 text-base font-bold text-slate-950 dark:text-white">{row.label}</h3>
              {row.meta ? <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{row.meta}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {row.actionPath ? (
                <button type="button" onClick={() => onAdjust(row)} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">Ajustar lançamento</button>
              ) : null}
              <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Fechar</button>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <StatBlock icon={TrendingUp} label="Total" value={formatCurrency(row.values?.total || 0)} tone={row.tone === 'negative' ? 'red' : row.tone === 'balance' ? 'blue' : 'green'} />
            <StatBlock icon={BarChart3} label="Origem" value={formatSourceLabel(source.originModule || row.nodeKind || 'Árvore')} tone="slate" />
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700">
            {fields.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[150px_1fr] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</span>
                <span className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{isMeaningfulText(value) ? String(value) : '-'}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
