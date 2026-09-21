import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import {
  ensureReceivableForGuide,
  loadFaturamentoOperationalData,
  markGuidesAsBilled,
  normalizeBillingGuideStatus,
  registerFaturamentoScheduledJobs,
  subscribeFaturamentoRealtime,
} from '@/lib/faturamentoOperationalApi';

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateKey(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function monthKey(value) {
  return String(value || new Date().toISOString()).slice(0, 7);
}

function metricValue(row) {
  return Number(row?.net_value || row?.amount || row?.valor || row?.gross_amount || 0);
}

function statusLabel(status) {
  const labels = {
    a_faturar: 'A faturar',
    em_faturamento: 'Em auditoria',
    faturado: 'Em lote',
    enviado: 'Enviado',
    recebido: 'Recebido',
    glosado: 'Glosado',
  };
  return labels[status] || status || 'A faturar';
}

function MetricCard({ label, value, hint, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && <Icon className="h-5 w-5 text-slate-500" />}
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleBars({ title, rows, valueKey = 'value' }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>}
        {rows.slice(0, 8).map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm"><span>{row.label}</span><span className="font-mono">{currency(row[valueKey])}</span></div>
            <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{ width: `${Math.max(4, (Number(row[valueKey] || 0) / max) * 100)}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DataTable({ columns, rows, emptyText = 'Nenhum registro encontrado.' }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 text-left font-medium">{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">{emptyText}</td></tr>}
          {rows.map((row, index) => (
            <tr key={row.id || index} className="border-t hover:bg-muted/30">
              {columns.map((column) => <td key={column.key} className="px-3 py-2 align-top">{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildProductionRows(receivables) {
  return receivables.map((row) => ({
    id: row.id,
    medico: row.professional_name || row.professional_id || 'Sem medico',
    especialidade: row.specialty_name || 'Sem especialidade',
    unidade: row.unit_name || 'Sem unidade',
    convenio: row.payer_name || 'Particular',
    procedimento: row.procedure_name || row.service_description || row.description || 'Procedimento',
    competencia: monthKey(row.competency_date || row.invoice_date || row.due_date || row.created_at),
    quantidade: row.metadata?.billing_event?.quantity || 1,
    produzido: metricValue(row),
    faturado: ['billed', 'received', 'partial', 'glossed'].includes(String(row.status || '').toLowerCase()) ? metricValue(row) : 0,
    recebido: Number(row.received_value || row.paid_total || 0),
    glosado: Number(row.glosa_value || 0),
  }));
}

function buildBillableRows(guides, receivables) {
  const guideRows = guides.map((guide) => ({
    id: `guide-${guide.id}`,
    raw: guide,
    type: 'guide',
    paciente: guide.paciente_nome || 'Paciente',
    convenio: guide.convenio || 'Particular',
    medico: guide.profissional || 'Sem medico',
    procedimentos: guide.codigo_cbhpm || guide.tipo_guia || 'Guia',
    valor: Number(guide.valor || 0),
    competencia: monthKey(guide.data_criacao),
    status: statusLabel(normalizeBillingGuideStatus(guide.status)),
  }));
  const receivableRows = receivables.map((row) => ({
    id: `receivable-${row.id}`,
    raw: row,
    type: 'receivable',
    paciente: row.patient_name || row.payer_name || 'Paciente',
    convenio: row.payer_name || 'Particular',
    medico: row.professional_name || row.professional_id || 'Sem medico',
    procedimentos: row.procedure_name || row.service_description || row.description || 'Procedimento',
    valor: metricValue(row),
    competencia: monthKey(row.competency_date || row.invoice_date || row.due_date),
    status: statusLabel(row.status === 'received' ? 'recebido' : row.status === 'glossed' ? 'glosado' : 'em_faturamento'),
  }));
  return [...guideRows, ...receivableRows].sort((a, b) => b.competencia.localeCompare(a.competencia));
}

function forecastRows(receivables) {
  const windows = [30, 60, 90, 180];
  const today = new Date();
  return windows.map((days) => {
    const end = new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = receivables.filter((row) => {
      const due = dateKey(row.due_date || row.competency_date);
      return due <= end && !['received', 'canceled'].includes(String(row.status || '').toLowerCase());
    });
    const faturada = rows.reduce((sum, row) => sum + metricValue(row), 0);
    const glosa = rows.reduce((sum, row) => sum + Number(row.glosa_value || 0), 0);
    return {
      label: `${days} dias`,
      faturada,
      prevista: Math.max(0, faturada - glosa),
      provavel: Math.max(0, faturada - glosa) * 0.85,
      glosa,
      recurso: glosa * 0.35,
    };
  });
}

function intelligenceRows(glosas, receivables) {
  const map = new Map();
  for (const glosa of glosas) {
    const key = glosa.reason || glosa.glosa_type || 'Glosa recorrente';
    const current = map.get(key) || { label: key, count: 0, value: 0 };
    current.count += 1;
    current.value += Number(glosa.glosa_amount || 0);
    map.set(key, current);
  }
  return Array.from(map.values()).map((row) => ({
    ...row,
    probability: Math.min(95, Math.round((row.count / Math.max(receivables.length, 1)) * 100 + 35)),
    suggestion: row.label.toLowerCase().includes('tuss') ? 'Revisar codigo TUSS antes do envio' : 'Revisar guia e anexos antes de montar lote',
  })).sort((a, b) => b.probability - a.probability);
}

const pageConfig = {
  producao: { title: 'Producao Assistencial', subtitle: 'Producao por medico, especialidade, unidade, convenio e procedimento.', icon: TrendingUp },
  atendimentos: { title: 'Atendimentos Faturaveis', subtitle: 'Fila operacional do ciclo de receita.', icon: Workflow },
  convenios: { title: 'Faturamento Convenios', subtitle: 'Painel por operadora e performance de recebimento.', icon: Building2 },
  auditoria: { title: 'Auditoria de Faturamento', subtitle: 'Pendencias automaticas por criticidade.', icon: ShieldCheck },
  forecast: { title: 'Forecast Financeiro', subtitle: 'Previsao de recebimentos futuros para Financeiro consumir.', icon: CalendarClock },
  inteligencia: { title: 'Inteligencia Operacional', subtitle: 'IA anti-glosa, motor de regras e robo de faturamento.', icon: Bot },
  pendencias: { title: 'Central de Pendencias', subtitle: 'Fila unica de guias, glosas, recursos, recebimentos e integracoes.', icon: AlertTriangle },
};

export default function FaturamentoEnterprisePage({ page = 'producao' }) {
  const config = pageConfig[page] || pageConfig.producao;
  const Icon = config.icon;
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ guides: [], receivables: [], glosas: [], submissions: [], snapshot: null });
  const [filters, setFilters] = useState({ competencia: '', medico: '', convenio: '', unidade: '', especialidade: '' });
  const [actionId, setActionId] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  const loadData = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      setData(await loadFaturamentoOperationalData(clinicId));
    } catch (error) {
      toast({ title: 'Erro ao carregar faturamento', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return undefined;
    return subscribeFaturamentoRealtime(clinicId, () => {
      loadData();
    });
  }, [clinicId]);

  const productionRows = useMemo(() => buildProductionRows(data.receivables || []).filter((row) => {
    return (!filters.competencia || row.competencia.includes(filters.competencia))
      && (!filters.medico || row.medico.toLowerCase().includes(filters.medico.toLowerCase()))
      && (!filters.convenio || row.convenio.toLowerCase().includes(filters.convenio.toLowerCase()))
      && (!filters.unidade || row.unidade.toLowerCase().includes(filters.unidade.toLowerCase()))
      && (!filters.especialidade || row.especialidade.toLowerCase().includes(filters.especialidade.toLowerCase()));
  }), [data.receivables, filters]);

  const billableRows = useMemo(() => buildBillableRows(data.guides || [], data.receivables || []), [data.guides, data.receivables]);
  const intelligence = useMemo(() => intelligenceRows(data.glosas || [], data.receivables || []), [data.glosas, data.receivables]);
  const snapshot = data.snapshot || {};
  const forecast = snapshot.forecast || forecastRows(data.receivables || []);
  const audit = snapshot.audit || {};

  const handleBillGuide = async (row) => {
    setActionId(row.id);
    try {
      if (row.type === 'guide') {
        await markGuidesAsBilled(clinicId, [row.raw]);
      } else {
        await ensureReceivableForGuide(clinicId, row.raw);
      }
      toast({ title: 'Faturamento sincronizado', description: 'Titulo garantido em Contas a Receber.' });
      await loadData();
    } catch (error) {
      toast({ title: 'Erro ao faturar', description: error.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleRegisterJobs = async () => {
    setJobsLoading(true);
    try {
      await registerFaturamentoScheduledJobs(clinicId);
      toast({ title: 'Jobs de faturamento registrados', description: '01h validar, 02h lotes, 03h XML, 04h retornos e 05h recebiveis.' });
    } catch (error) {
      toast({ title: 'Erro ao registrar jobs', description: error.message, variant: 'destructive' });
    } finally {
      setJobsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md border bg-white p-2"><Icon className="h-5 w-5 text-blue-700" /></div>
          <div><h1 className="text-2xl font-bold text-foreground">{config.title}</h1><p className="text-sm text-muted-foreground">{config.subtitle}</p></div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Atualizar</Button>
      </div>

      {page === 'producao' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input placeholder="Competencia" value={filters.competencia} onChange={(event) => setFilters({ ...filters, competencia: event.target.value })} />
            <Input placeholder="Medico" value={filters.medico} onChange={(event) => setFilters({ ...filters, medico: event.target.value })} />
            <Input placeholder="Convenio" value={filters.convenio} onChange={(event) => setFilters({ ...filters, convenio: event.target.value })} />
            <Input placeholder="Unidade" value={filters.unidade} onChange={(event) => setFilters({ ...filters, unidade: event.target.value })} />
            <Input placeholder="Especialidade" value={filters.especialidade} onChange={(event) => setFilters({ ...filters, especialidade: event.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Producao consolidada" value={currency(productionRows.reduce((sum, row) => sum + row.produzido, 0))} icon={TrendingUp} />
            <MetricCard label="Valor faturado" value={currency(productionRows.reduce((sum, row) => sum + row.faturado, 0))} />
            <MetricCard label="Valor recebido" value={currency(productionRows.reduce((sum, row) => sum + row.recebido, 0))} />
            <MetricCard label="Valor glosado" value={currency(productionRows.reduce((sum, row) => sum + row.glosado, 0))} />
          </div>
          <DataTable columns={[
            { key: 'medico', label: 'Medico' }, { key: 'especialidade', label: 'Especialidade' }, { key: 'unidade', label: 'Unidade' }, { key: 'convenio', label: 'Convenio' }, { key: 'procedimento', label: 'Procedimento' }, { key: 'quantidade', label: 'Qtd.' }, { key: 'produzido', label: 'Produzido', render: (row) => currency(row.produzido) }, { key: 'faturado', label: 'Faturado', render: (row) => currency(row.faturado) }, { key: 'recebido', label: 'Recebido', render: (row) => currency(row.recebido) }, { key: 'glosado', label: 'Glosado', render: (row) => currency(row.glosado) },
          ]} rows={productionRows} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><SimpleBars title="Ranking de medicos" rows={snapshot.production?.byDoctor || []} /><SimpleBars title="Ranking de especialidades" rows={snapshot.production?.bySpecialty || []} /></div>
        </div>
      )}

      {page === 'atendimentos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {(snapshot.workflow || []).map((item) => <MetricCard key={item.step} label={item.label} value={item.count} hint={currency(item.value)} icon={Workflow} />)}
          </div>
          <DataTable columns={[
            { key: 'paciente', label: 'Paciente' }, { key: 'convenio', label: 'Convenio' }, { key: 'medico', label: 'Medico' }, { key: 'procedimentos', label: 'Procedimentos' }, { key: 'valor', label: 'Valor', render: (row) => currency(row.valor) }, { key: 'competencia', label: 'Competencia' }, { key: 'status', label: 'Status' },
            { key: 'acoes', label: 'Acoes', render: (row) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => navigate('/clinica/faturamento/auditoria')}>Auditar</Button><Button size="sm" disabled={actionId === row.id} onClick={() => handleBillGuide(row)}>Faturar</Button><Button size="sm" variant="outline" onClick={() => navigate('/clinica/faturamento/guias')}>Gerar guia</Button><Button size="sm" variant="outline" onClick={() => navigate('/clinica/faturamento/lotes')}>Gerar lote</Button></div> },
          ]} rows={billableRows} />
        </div>
      )}

      {page === 'convenios' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Operadoras" value={snapshot.convenio?.byPayer?.length || 0} icon={Building2} /><MetricCard label="Produzido/Faturado" value={currency(snapshot.convenio?.total)} /><MetricCard label="Guias recebidas" value={snapshot.convenio?.receivedGuides || 0} /><MetricCard label="Guias glosadas" value={snapshot.convenio?.glossedGuides || 0} /></div>
          <SimpleBars title="Producao por convenio" rows={snapshot.convenio?.byPayer || []} />
        </div>
      )}

      {page === 'auditoria' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AuditCard title="Pendencias Criticas" icon={AlertTriangle} rows={[...(audit.inconsistentBilling || []), ...(audit.divergentRevenue || [])]} />
          <AuditCard title="Pendencias Altas" icon={FileSearch} rows={audit.proceduresWithoutTuss || []} />
          <AuditCard title="Pendencias Medias" icon={ClipboardCheck} rows={audit.invalidGuides || []} />
          <AuditCard title="Pendencias Baixas" icon={ShieldCheck} rows={audit.doctorsWithoutRepasse || []} />
        </div>
      )}

      {page === 'forecast' && (
        <DataTable columns={[
          { key: 'label', label: 'Projecao' }, { key: 'guideRevenue', label: 'Guias', render: (row) => currency(row.guideRevenue ?? row.prevista) }, { key: 'billedRevenue', label: 'Receita faturada', render: (row) => currency(row.billedRevenue ?? row.faturada) }, { key: 'expectedRevenue', label: 'Receita prevista', render: (row) => currency(row.expectedRevenue ?? row.prevista) }, { key: 'cashflowImpact', label: 'Impacto caixa', render: (row) => currency(row.cashflowImpact ?? row.provavel) }, { key: 'glosaRevenue', label: 'Em glosa', render: (row) => currency(row.glosaRevenue ?? row.glosa) }, { key: 'recoveredRevenue', label: 'Recuperada', render: (row) => currency(row.recoveredRevenue ?? row.recurso) },
        ]} rows={forecast} />
      )}

      {page === 'inteligencia' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4"><MetricCard label="IA Anti-Glosa" value={`${intelligence[0]?.probability || 0}%`} hint={intelligence[0]?.label || 'Sem historico'} icon={Bot} /><MetricCard label="Motor de regras" value={`${data.rules?.length || 0}`} hint="appointment_payer_rules" icon={ShieldCheck} /><MetricCard label="Robo de faturamento" value="Orquestrado" hint="Atendimento > guia > recebivel" icon={Workflow} /><Button onClick={handleRegisterJobs} disabled={jobsLoading} className="h-full min-h-[72px] gap-2">{jobsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}Registrar jobs</Button></div>
          <DataTable columns={[{ key: 'label', label: 'Risco' }, { key: 'count', label: 'Frequencia' }, { key: 'probability', label: 'Probabilidade', render: (row) => `${row.probability}%` }, { key: 'suggestion', label: 'Sugestao automatica' }]} rows={intelligence} />
          <DataTable columns={[{ key: 'code', label: 'Alerta' }, { key: 'severity', label: 'Risco' }, { key: 'payer_name', label: 'Operadora' }, { key: 'message', label: 'Prevencao' }]} rows={snapshot.audit?.antiGlosaAlerts || []} />
        </div>
      )}

      {page === 'pendencias' && (
        <DataTable columns={[
          { key: 'tipo', label: 'Tipo' }, { key: 'descricao', label: 'Descricao' }, { key: 'origem', label: 'Origem' }, { key: 'acao', label: 'Acao', render: (row) => <Button size="sm" variant="outline" onClick={() => navigate(row.path)}>Abrir <ArrowRight className="ml-1 h-3 w-3" /></Button> },
        ]} rows={[
          ...(audit.inconsistentBilling || []).map((row) => ({ id: `inc-${row.id}`, tipo: 'Falha de integracao', descricao: row.numero_guia || row.id, origem: 'Guias', path: '/clinica/faturamento/lotes' })),
          ...(audit.proceduresWithoutTuss || []).map((row) => ({ id: `tuss-${row.id}`, tipo: 'Auditoria', descricao: row.description || row.procedure_name || 'Procedimento sem TUSS', origem: 'Recebiveis', path: '/clinica/faturamento/auditoria' })),
          ...(data.glosas || []).map((row) => ({ id: `glosa-${row.id}`, tipo: 'Glosa', descricao: row.reason || row.glosa_type || 'Glosa aberta', origem: 'Retornos', path: '/clinica/faturamento/retornos' })),
        ]} />
      )}
    </div>
  );
}

function AuditCard({ title, rows, icon: Icon }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" />{title} ({rows.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pendencia.</p>}
        {rows.slice(0, 10).map((row, index) => <div key={row.id || index} className="rounded-md border p-3 text-sm">{row.description || row.procedure_name || row.numero_guia || row.id}</div>)}
      </CardContent>
    </Card>
  );
}
