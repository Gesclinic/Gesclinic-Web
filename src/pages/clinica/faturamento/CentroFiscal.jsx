import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Banknote,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileCog,
  FileSearch,
  FileText,
  History,
  Layers3,
  Link2,
  Loader2,
  Lock,
  Mail,
  NotebookTabs,
  PlayCircle,
  ReceiptText,
  RefreshCcw,
  Send,
  ShieldCheck,
  SplitSquareVertical,
  UploadCloud,
  WalletCards,
} from 'lucide-react';
import PageLayout from '@/components/ui/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { emitFiscalInvoiceFromDraft, loadFiscalDraft } from '@/lib/fiscalCenterApi';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const STEPS = [
  { id: 'origem', title: 'Origem da Nota', icon: Link2 },
  { id: 'identificacao', title: 'Identificacao Fiscal', icon: FileCog },
  { id: 'prestador', title: 'Prestador', icon: Building2 },
  { id: 'tomador', title: 'Tomador', icon: BadgeCheck },
  { id: 'itens', title: 'Itens da Nota', icon: Layers3 },
  { id: 'tributacao', title: 'Tributacao Inteligente', icon: SplitSquareVertical },
  { id: 'financeiro', title: 'Financeiro', icon: WalletCards },
  { id: 'contabil', title: 'Integracao Contabil', icon: BookOpen },
  { id: 'observacoes', title: 'Observacoes e Anexos', icon: NotebookTabs },
  { id: 'resumo', title: 'Resumo Inteligente', icon: FileSearch },
  { id: 'linha-tempo', title: 'Linha do Tempo', icon: History },
  { id: 'acoes', title: 'Acoes Fiscais', icon: PlayCircle },
];

const ACTIONS = [
  { label: 'Salvar rascunho', icon: Archive, enabled: true },
  { label: 'Validar', icon: ShieldCheck, enabled: true },
  { label: 'Simular', icon: FileSearch, enabled: true },
  { label: 'Emitir', icon: Send, primary: true, enabled: true },
  { label: 'Cancelar', icon: AlertTriangle, enabled: true },
  { label: 'Substituir', icon: RefreshCcw, enabled: true },
  { label: 'Reprocessar', icon: Clock3, enabled: true },
  { label: 'Pre visualizar XML', icon: FileText, enabled: true },
  { label: 'Pre visualizar DANFSE', icon: ReceiptText, enabled: true },
  { label: 'Download XML', icon: Download, enabled: true },
  { label: 'Download PDF', icon: Download, enabled: true },
  { label: 'Enviar Email', icon: Mail, enabled: true },
  { label: 'Enviar WhatsApp', icon: Send, enabled: true },
  { label: 'Enviar Contabilidade', icon: UploadCloud, enabled: true },
  { label: 'Enviar SIEG', icon: UploadCloud, enabled: true },
  { label: 'Enviar Dominio', icon: UploadCloud, enabled: true },
  { label: 'Historico', icon: History, enabled: true },
  { label: 'Logs', icon: FileSearch, enabled: true },
  { label: 'Auditoria', icon: ShieldCheck, enabled: true },
];

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function LockedField({ label, item }) {
  const data = item && typeof item === 'object' && 'value' in item
    ? item
    : { value: item || '-', source: 'Sistema', locked: true };

  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {data.locked && <Lock className="h-3.5 w-3.5 text-slate-400" title={`Origem: ${data.source}`} />}
      </div>
      <p className="truncate text-sm font-semibold text-slate-900" title={String(data.value || '-')}>{data.value || '-'}</p>
      <p className="mt-1 text-[11px] text-slate-500">Origem: {data.source || 'Sistema'}</p>
    </div>
  );
}

function Section({ id, title, icon: Icon, active, children }) {
  return (
    <section id={id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Icon className={`h-4 w-4 ${active ? 'text-blue-700' : 'text-slate-500'}`} />
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function IntegrationPill({ label, active = true }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
      active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
    }`}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function CentroFiscal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clinicId: contextClinicId } = useClinicContext();
  const { user, clinicId: authClinicId } = useAuth();
  const clinicId = contextClinicId || authClinicId;
  const appointmentId = searchParams.get('appointmentId');
  const origin = searchParams.get('origin');
  const cameFromAgenda = origin === 'agenda' || Boolean(appointmentId);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emitResult, setEmitResult] = useState(null);
  const [activeStep, setActiveStep] = useState('origem');
  const [invoiceMode, setInvoiceMode] = useState('system');
  const [externalInvoiceNumber, setExternalInvoiceNumber] = useState('');
  const [editableTaker, setEditableTaker] = useState({});
  const [observations, setObservations] = useState({});
  const scheduledReturnDate = draft?.origin?.scheduledDate;
  const returnToAppointmentPath = appointmentId
    ? `/clinica/agenda?mode=edit&appointmentId=${encodeURIComponent(appointmentId)}${scheduledReturnDate ? `&appointmentDate=${encodeURIComponent(scheduledReturnDate)}` : ''}&appointmentTab=resumo`
    : '/clinica/agenda';

  const loadDraft = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadFiscalDraft({ clinicId, appointmentId });
      setDraft(data);
      setEditableTaker(data.taker || {});
      setObservations(data.observations || {});
    } catch (loadError) {
      console.error('Erro ao carregar Centro Fiscal:', loadError);
      setError(loadError.message || 'Erro ao carregar Centro Fiscal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinicId) {
      loadDraft();
    }
  }, [clinicId, appointmentId]);

  const validations = useMemo(() => {
    if (!draft) return [];
    return [
      { label: 'Origem assistencial localizada', ok: Boolean(draft.origin?.appointmentId) },
      { label: 'Prestador com CNPJ e IM', ok: Boolean(draft.provider?.cnpj?.value && draft.provider?.municipalRegistration?.value && draft.provider?.municipalRegistration?.value !== '-') },
      { label: 'Tomador identificado', ok: Boolean(editableTaker.name && editableTaker.document) },
      { label: 'Itens fiscais vinculados ao atendimento', ok: (draft.items || []).length > 0 },
      { label: 'Sem NF ativa duplicada no atendimento', ok: !draft.origin?.activeInvoiceBlock },
      { label: 'Plano financeiro preparado', ok: Boolean(draft.finance?.createReceivable) },
      { label: 'Contabilidade preparada para XML/PDF/SPED', ok: Boolean(draft.accounting) },
    ];
  }, [draft, editableTaker]);

  const canEmit = validations.length > 0 && validations.every((item) => item.ok) && !saving;

  const handleEmit = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    setEmitResult(null);
    try {
      const enrichedDraft = {
        ...draft,
        taker: editableTaker,
        observations,
      };
      const result = await emitFiscalInvoiceFromDraft({
        clinicId,
        draft: enrichedDraft,
        userId: user?.id,
        mode: invoiceMode,
        externalInvoiceNumber,
      });
      setEmitResult(result);
      await loadDraft();
    } catch (emitError) {
      console.error('Erro ao emitir NF:', emitError);
      setError(emitError.message || 'Erro ao emitir NF');
      alert(`Erro ao emitir NF: ${emitError.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Centro Fiscal" subtitle="Carregando dados fiscais integrados do atendimento.">
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (error && !draft) {
    return (
      <PageLayout title="Centro Fiscal" subtitle="Nao foi possivel carregar a estrutura fiscal.">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Centro Fiscal"
      subtitle="Emissao fiscal automatizada integrada ao atendimento, financeiro, contabilidade, repasse e auditoria."
      breadcrumbs={[
        { label: 'Clínica', path: '/clinica' },
        { label: 'Faturamento', path: '/clinica/faturamento' },
        { label: 'Centro Fiscal', path: '/clinica/faturamento/centro-fiscal' },
      ]}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>}
        {emitResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <p className="font-semibold">Documento fiscal gerado com sucesso.</p>
                  <p className="text-sm text-emerald-800">Financeiro, contas a receber e rastreabilidade foram atualizados pelo motor fiscal.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {cameFromAgenda && (
                  <Button type="button" onClick={() => navigate(returnToAppointmentPath)} className="bg-emerald-700 text-white hover:bg-emerald-800">
                    Voltar para o agendamento
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => navigate('/clinica/faturamento/notas-fiscais')}>
                  Ver notas fiscais
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">ERP Fiscal Inteligente</p>
              <h1 className="text-xl font-bold text-slate-950">Nota como consequencia do atendimento</h1>
              <p className="mt-1 text-sm text-slate-600">Todos os dados abaixo sao montados automaticamente a partir da Agenda, Financeiro, Convênio, Atendimento, Plano de Contas e configuracoes fiscais.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <IntegrationPill label="Agenda" />
              <IntegrationPill label="Financeiro" />
              <IntegrationPill label="Contabilidade" />
              <IntegrationPill label="Repasse" />
              <IntegrationPill label="XML/PDF/SPED" active={false} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">Etapas</p>
              <div className="space-y-1">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const active = activeStep === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        setActiveStep(step.id);
                        document.getElementById(step.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold">{index + 1}</span>
                      <Icon className="h-4 w-4" />
                      <span className="min-w-0 flex-1 truncate">{step.title}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">Validacoes</p>
              <div className="space-y-2">
                {validations.map((item) => (
                  <div key={item.label} className="flex items-start gap-2 text-xs">
                    {item.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />}
                    <span className={item.ok ? 'text-slate-700' : 'font-semibold text-amber-800'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-4">
            <Section id="origem" title="Origem da Nota" icon={Link2} active={activeStep === 'origem'}>
              <div className="grid gap-3 md:grid-cols-3">
                <LockedField label="Origem" item={{ value: draft.origin?.type, source: 'Agenda/Faturamento', locked: true }} />
                <LockedField label="Atendimento" item={{ value: draft.origin?.appointmentId || '-', source: 'Agenda', locked: true }} />
                <LockedField label="Convênio/Particular" item={{ value: draft.taker?.payer || 'Particular', source: 'Cadastro financeiro', locked: true }} />
                <LockedField label="Profissional" item={{ value: draft.items?.[0]?.professional || '-', source: 'Atendimento', locked: true }} />
                <LockedField label="Plano de contas" item={{ value: draft.finance?.chartAccount, source: 'Financeiro', locked: true }} />
                <LockedField label="Centro de custo" item={{ value: draft.finance?.costCenter, source: 'Financeiro', locked: true }} />
              </div>
            </Section>

            <Section id="identificacao" title="Identificacao Fiscal" icon={FileCog} active={activeStep === 'identificacao'}>
              <div className="grid gap-3 md:grid-cols-4">
                {Object.entries(draft.fiscalIdentification || {}).map(([key, value]) => (
                  <LockedField key={key} label={key} item={value} />
                ))}
              </div>
            </Section>

            <Section id="prestador" title="Prestador" icon={Building2} active={activeStep === 'prestador'}>
              <div className="grid gap-3 md:grid-cols-4">
                {Object.entries(draft.provider || {}).map(([key, value]) => (
                  <LockedField key={key} label={key} item={value} />
                ))}
              </div>
            </Section>

            <Section id="tomador" title="Tomador" icon={BadgeCheck} active={activeStep === 'tomador'}>
              <div className="grid gap-3 md:grid-cols-3">
                {Object.entries(editableTaker || {}).map(([key, value]) => (
                  <label key={key} className="block rounded border border-slate-200 bg-white p-3">
                    <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{key}</span>
                    <Input
                      value={value || ''}
                      onChange={(event) => setEditableTaker((prev) => ({ ...prev, [key]: event.target.value }))}
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">Editavel somente nesta nota</span>
                  </label>
                ))}
              </div>
            </Section>

            <Section id="itens" title="Itens da Nota" icon={Layers3} active={activeStep === 'itens'}>
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="min-w-[1200px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      {['Descricao', 'Municipal', 'NBS', 'TUSS', 'CBHPM', 'Qtd', 'Unitario', 'Desconto', 'Total', 'Profissional', 'Convênio', 'Repasse', 'Centro custo', 'Origem'].map((header) => (
                        <th key={header} className="px-3 py-2 font-bold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.items || []).map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-900">{item.description}</td>
                        <td className="px-3 py-2">{item.municipalCode || '-'}</td>
                        <td className="px-3 py-2">{item.nbsCode || '-'}</td>
                        <td className="px-3 py-2">{item.tussCode || '-'}</td>
                        <td className="px-3 py-2">{item.cbhpmCode || '-'}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatCurrency(item.unitValue)}</td>
                        <td className="px-3 py-2">{formatCurrency(item.discount)}</td>
                        <td className="px-3 py-2 font-bold">{formatCurrency(item.total)}</td>
                        <td className="px-3 py-2">{item.professional || '-'}</td>
                        <td className="px-3 py-2">{item.payer || '-'}</td>
                        <td className="px-3 py-2">{formatCurrency(item.repasse)}</td>
                        <td className="px-3 py-2">{item.costCenter || '-'}</td>
                        <td className="px-3 py-2">{item.origin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="tributacao" title="Tributacao Inteligente" icon={SplitSquareVertical} active={activeStep === 'tributacao'}>
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Valor Bruto</span><b>{formatCurrency(draft.taxes?.gross)}</b></div>
                    <div className="flex justify-between"><span>Desconto</span><b>-{formatCurrency(draft.taxes?.discount)}</b></div>
                    <div className="flex justify-between"><span>Acréscimos</span><b>{formatCurrency(draft.taxes?.additions)}</b></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2"><span>Base Tributável</span><b>{formatCurrency(draft.taxes?.taxableBase)}</b></div>
                    <div className="flex justify-between"><span>Retenções</span><b>-{formatCurrency(draft.taxes?.retentionTotal)}</b></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base text-emerald-700"><span>Líquido Fiscal</span><b>{formatCurrency(draft.taxes?.net)}</b></div>
                  </div>
                </div>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr><th className="px-3 py-2">Tributo</th><th>Base</th><th>Aliquota</th><th>Valor</th><th>Incidencia</th><th>Responsavel</th></tr>
                    </thead>
                    <tbody>
                      {(draft.taxes?.taxes || []).map((tax) => (
                        <tr key={tax.key} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold">{tax.label}</td>
                          <td>{formatCurrency(tax.base)}</td>
                          <td>{Number(tax.rate || 0).toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 })}</td>
                          <td>{formatCurrency(tax.amount)}</td>
                          <td>{tax.incidence}</td>
                          <td>{tax.responsible}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>

            <Section id="financeiro" title="Financeiro" icon={WalletCards} active={activeStep === 'financeiro'}>
              <div className="grid gap-3 md:grid-cols-3">
                {['createReceivable', 'createPayment', 'updateCashFlow', 'updateDailyCash', 'updateOperatorCash', 'updateGeneralCash', 'updateDre', 'updateRepasse', 'updateProduction', 'updateDashboards'].map((key) => (
                  <IntegrationPill key={key} label={key} active={draft.finance?.[key]} />
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <LockedField label="Plano Contabil" item={{ value: draft.finance?.chartAccount, source: 'Plano de Contas', locked: true }} />
                <LockedField label="Centro de Custo" item={{ value: draft.finance?.costCenter, source: 'Centro de Custos', locked: true }} />
                <LockedField label="Conta Financeira" item={{ value: draft.finance?.financialAccount, source: 'Contas financeiras', locked: true }} />
              </div>
            </Section>

            <Section id="contabil" title="Integracao Contabil" icon={BookOpen} active={activeStep === 'contabil'}>
              <div className="grid gap-3 md:grid-cols-4">
                {Object.entries(draft.accounting || {}).map(([key, value]) => (
                  <LockedField key={key} label={key} item={{ value, source: 'Motor contabil/fiscal', locked: true }} />
                ))}
              </div>
            </Section>

            <Section id="observacoes" title="Observacoes, Historico e Anexos" icon={NotebookTabs} active={activeStep === 'observacoes'}>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(observations).map(([key, value]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{key}</span>
                    <Textarea value={value || ''} onChange={(event) => setObservations((prev) => ({ ...prev, [key]: event.target.value }))} rows={3} />
                  </label>
                ))}
              </div>
            </Section>

            <Section id="resumo" title="Resumo Inteligente" icon={FileSearch} active={activeStep === 'resumo'}>
              <div className="grid gap-3 md:grid-cols-5">
                <LockedField label="Financeiro" item={{ value: formatCurrency(draft.finance?.netValue), source: 'Financeiro', locked: true }} />
                <LockedField label="Fiscal" item={{ value: formatCurrency(draft.finance?.fiscalNetValue), source: 'Tributacao', locked: true }} />
                <LockedField label="Operacional" item={{ value: `${draft.items?.length || 0} item(ns)`, source: 'Atendimento', locked: true }} />
                <LockedField label="Contabil" item={{ value: draft.accounting?.journal, source: 'Contabilidade', locked: true }} />
                <LockedField label="Repasse" item={{ value: draft.finance?.updateRepasse ? 'Automatico' : 'Pendente', source: 'Repasse medico', locked: true }} />
              </div>
            </Section>

            <Section id="linha-tempo" title="Linha do Tempo" icon={History} active={activeStep === 'linha-tempo'}>
              <div className="space-y-3">
                {(draft.timeline || []).map((event, index) => (
                  <div key={`${event.label}-${index}`} className="flex gap-3 rounded border border-slate-200 bg-white p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-800">{index + 1}</div>
                    <div>
                      <p className="font-semibold text-slate-900">{event.label}</p>
                      <p className="text-sm text-slate-600">{event.status}</p>
                      <p className="text-xs text-slate-500">Origem: {event.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="acoes" title="Acoes" icon={PlayCircle} active={activeStep === 'acoes'}>
              <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInvoiceMode('system')}
                  className={`rounded-md border p-3 text-left ${invoiceMode === 'system' ? 'border-blue-500 bg-white text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <b>Gerar pelo sistema</b>
                  <span className="mt-1 block text-xs">Gera NF, financeiro, XML/PDF e rastreabilidade integrada.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceMode('external')}
                  className={`rounded-md border p-3 text-left ${invoiceMode === 'external' ? 'border-orange-500 bg-white text-orange-900' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <b>NF emitida fora</b>
                  <span className="mt-1 block text-xs">Vincula NF externa sem gerar duplicidade financeira.</span>
                </button>
              </div>
              {invoiceMode === 'external' && (
                <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <label className="text-sm font-semibold text-orange-900">Numero da NF externa</label>
                  <Input className="mt-2 bg-white" value={externalInvoiceNumber} onChange={(event) => setExternalInvoiceNumber(event.target.value)} />
                </div>
              )}
              {draft.origin?.activeInvoiceBlock && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  Ja existe NF ativa vinculada a este atendimento. Cancele/substitua a NF existente antes de emitir outra.
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const isEmit = action.label === 'Emitir';
                  return (
                    <Button
                      key={action.label}
                      type="button"
                      variant={action.primary ? 'default' : 'outline'}
                      disabled={isEmit ? !canEmit : saving}
                      onClick={isEmit ? handleEmit : undefined}
                      className={action.primary ? 'bg-blue-700 text-white hover:bg-blue-800' : ''}
                    >
                      {saving && isEmit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </Section>
          </main>

          <aside className="space-y-3">
            <div className="sticky top-4 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">Painel lateral</p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex justify-between"><span>Bruto</span><b>{formatCurrency(draft.finance?.grossValue)}</b></div>
                  <div className="flex justify-between"><span>Desconto</span><b>-{formatCurrency(draft.finance?.discount)}</b></div>
                  <div className="flex justify-between"><span>Tributos</span><b>-{formatCurrency(draft.taxes?.retentionTotal)}</b></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base text-emerald-700"><span>Liquido</span><b>{formatCurrency(draft.finance?.fiscalNetValue)}</b></div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Automacao ao emitir</p>
                <div className="space-y-2 text-xs text-slate-700">
                  {['Buscar empresa/certificado', 'Buscar paciente/profissional', 'Buscar atendimento e procedimentos', 'Calcular impostos e retencoes', 'Gerar e validar XML', 'Transmitir e receber retorno', 'Criar contas a receber', 'Atualizar caixa, DRE e repasse', 'Registrar auditoria e historico'].map((label) => (
                    <div key={label} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{label}</div>
                  ))}
                </div>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/clinica/faturamento/dashboard')}>
                Voltar ao Faturamento
              </Button>
              {cameFromAgenda && (
                <Button type="button" className="w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => navigate(returnToAppointmentPath)}>
                  Voltar para o agendamento
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}
