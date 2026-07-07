import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { enrichAppointmentsWithPrices } from '@/lib/servicePricesApi';
import { useToast } from '@/hooks/useToast';
import PageLayout from '@/components/ui/PageLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const STATUS_OPTIONS = [
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'autorizados', label: 'Autorizados' },
  { value: 'rejeitados', label: 'Rejeitados' },
  { value: 'todos', label: 'Todos' },
];

const SORT_OPTIONS = [
  { value: 'requested_desc', label: 'Solicitacao mais recente' },
  { value: 'requested_asc', label: 'Solicitacao mais antiga' },
  { value: 'discount_desc', label: 'Maior desconto' },
  { value: 'date_desc', label: 'Data do atendimento' },
  { value: 'patient_asc', label: 'Paciente A-Z' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value || 0),
  );

const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('pt-BR');
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitialDateRange = () => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 30);

  return {
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  };
};

const getDiscountAmount = (item) => {
  if (item?.discount_rejected_at) {
    return Number(item.discount_rejected_amount || item.discount || 0);
  }
  return Number(item?.discount || 0);
};

const getNetAmount = (item) => {
  const gross = Number(item?.value || 0);
  return item?.discount_rejected_at ? gross : gross - getDiscountAmount(item);
};

const getStatus = (item) => {
  if (item?.discount_authorized_by) {
    return 'autorizados';
  }
  if (item?.discount_rejected_at) {
    return 'rejeitados';
  }
  return 'pendentes';
};

const getPatientDisplayName = (item) =>
  item?.patient_name ||
  item?.patient?.name ||
  item?.patient?.full_name ||
  item?.patients?.name ||
  item?.patients?.full_name ||
  item?.lead_name ||
  'Paciente não informado';

const getStatusMeta = (status) => {
  const map = {
    pendentes: {
      label: 'Pendente',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      Icon: Clock3,
    },
    autorizados: {
      label: 'Autorizado',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      Icon: CheckCircle2,
    },
    rejeitados: {
      label: 'Rejeitado',
      className: 'border-rose-200 bg-rose-50 text-rose-800',
      Icon: XCircle,
    },
  };

  return map[status] || map.pendentes;
};

const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function AutorizacaoDescontos() {
  const { user, clinicId } = useAuth();
  const { toast } = useToast();

  const [descontos, setDescontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pendentes');
  const [expandedId, setExpandedId] = useState(null);
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('requested_desc');

  useEffect(() => {
    if (!clinicId) {
      return;
    }
    loadDescontos();
  }, [clinicId, dateRange.from, dateRange.to]);

  const loadDescontos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(
          `
          *,
          patient:patients!appointments_patient_id_fkey (id, name, full_name),
          professionals!professional_id (id, name),
          services (name),
          payers (name)
        `,
        )
        .eq('clinic_id', clinicId)
        .or('discount.gt.0,discount_rejected_at.not.is.null,discount_authorized_by.not.is.null')
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (dateRange.from) {
        query = query.gte('scheduled_date', dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte('scheduled_date', dateRange.to);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const rows = (data || []).filter(
        (item) => item.discount_requested_at || item.discount_authorized_by || item.discount_rejected_at,
      );
      const enrichedData = await enrichAppointmentsWithPrices(rows);
      setDescontos((enrichedData || []).map((item) => ({
        ...item,
        patient_name: getPatientDisplayName(item),
      })));
    } catch (error) {
      console.error('Erro ao carregar descontos:', error);
      setDescontos([]);
      toast({
        title: 'Erro',
        description: `Falha ao carregar descontos: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const autorizarDesconto = async (appointmentId, desconto) => {
    try {
      const now = new Date().toISOString();
      const operatorName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email;

      const { error } = await supabase
        .from('appointments')
        .update({
          discount_authorized_by: user.id,
          discount_authorized_by_name: operatorName || null,
          discount_authorized_at: now,
          discount_rejected_by: null,
          discount_rejected_by_name: null,
          discount_rejected_at: null,
          discount_rejected_amount: 0,
        })
        .eq('id', appointmentId)
        .eq('clinic_id', clinicId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Desconto autorizado',
        description: `Desconto de ${formatCurrency(desconto)} autorizado com sucesso.`,
        variant: 'success',
      });

      loadDescontos();
    } catch (error) {
      console.error('Erro ao autorizar desconto:', error);
      toast({ title: 'Erro', description: 'Falha ao autorizar desconto.', variant: 'destructive' });
    }
  };

  const rejeitarDesconto = async (appointmentId, desconto) => {
    try {
      const now = new Date().toISOString();
      const operatorName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email;

      const { error } = await supabase
        .from('appointments')
        .update({
          discount: 0,
          discount_authorized_by: null,
          discount_authorized_by_name: null,
          discount_authorized_at: null,
          discount_rejected_by: user.id,
          discount_rejected_by_name: operatorName || null,
          discount_rejected_at: now,
          discount_rejected_amount: desconto,
        })
        .eq('id', appointmentId)
        .eq('clinic_id', clinicId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Desconto rejeitado',
        description: `Desconto de ${formatCurrency(desconto)} rejeitado.`,
        variant: 'success',
      });

      loadDescontos();
    } catch (error) {
      console.error('Erro ao rejeitar desconto:', error);
      toast({ title: 'Erro', description: 'Falha ao rejeitar desconto.', variant: 'destructive' });
    }
  };

  const reasonOptions = useMemo(() => {
    const options = new Map();
    descontos.forEach((item) => {
      if (item.discount_reason) {
        options.set(item.discount_reason, getMotivo(item.discount_reason));
      }
    });
    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [descontos]);

  const filteredDescontos = useMemo(() => {
    const term = normalizeText(search);

    return descontos
      .filter((item) => {
        const status = getStatus(item);
        if (filterStatus !== 'todos' && status !== filterStatus) {
          return false;
        }

        if (reasonFilter !== 'todos' && item.discount_reason !== reasonFilter) {
          return false;
        }

        if (!term) {
          return true;
        }

        const searchable = normalizeText([
          getPatientDisplayName(item),
          item.professionals?.name,
          item.services?.name,
          item.payers?.name,
          item.discount_requested_by_name,
          item.discount_authorized_by_name,
          item.discount_rejected_by_name,
          item.discount_reason,
        ].join(' '));

        return searchable.includes(term);
      })
      .sort((a, b) => {
        if (sortBy === 'requested_asc') {
          return new Date(a.discount_requested_at || a.created_at || 0) - new Date(b.discount_requested_at || b.created_at || 0);
        }
        if (sortBy === 'discount_desc') {
          return getDiscountAmount(b) - getDiscountAmount(a);
        }
        if (sortBy === 'date_desc') {
          return `${b.scheduled_date || ''} ${b.scheduled_time || ''}`.localeCompare(`${a.scheduled_date || ''} ${a.scheduled_time || ''}`);
        }
        if (sortBy === 'patient_asc') {
          return getPatientDisplayName(a).localeCompare(getPatientDisplayName(b));
        }
        return new Date(b.discount_requested_at || b.created_at || 0) - new Date(a.discount_requested_at || a.created_at || 0);
      });
  }, [descontos, filterStatus, reasonFilter, search, sortBy]);

  const summary = useMemo(() => {
    const base = {
      pendentes: { count: 0, amount: 0 },
      autorizados: { count: 0, amount: 0 },
      rejeitados: { count: 0, amount: 0 },
      totalAmount: 0,
      oldestPending: null,
    };

    descontos.forEach((item) => {
      const status = getStatus(item);
      const amount = getDiscountAmount(item);
      base[status].count += 1;
      base[status].amount += amount;
      base.totalAmount += amount;

      if (status === 'pendentes' && item.discount_requested_at) {
        const requestedAt = new Date(item.discount_requested_at);
        if (!base.oldestPending || requestedAt < new Date(base.oldestPending.discount_requested_at)) {
          base.oldestPending = item;
        }
      }
    });

    return base;
  }, [descontos]);

  const clearFilters = () => {
    setFilterStatus('pendentes');
    setSearch('');
    setReasonFilter('todos');
    setSortBy('requested_desc');
    setDateRange(getInitialDateRange());
  };

  return (
    <PageLayout
      title="Autorização de Descontos"
      breadcrumbs={[
        { label: 'Financeiro', path: '/clinica/financeiro' },
        { label: 'Autorização de Descontos' },
      ]}
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Clock3}
            title="Pendentes"
            value={summary.pendentes.count}
            detail={formatCurrency(summary.pendentes.amount)}
            tone="amber"
          />
          <SummaryCard
            icon={CheckCircle2}
            title="Autorizados"
            value={summary.autorizados.count}
            detail={formatCurrency(summary.autorizados.amount)}
            tone="emerald"
          />
          <SummaryCard
            icon={XCircle}
            title="Rejeitados"
            value={summary.rejeitados.count}
            detail={formatCurrency(summary.rejeitados.amount)}
            tone="rose"
          />
          <SummaryCard
            icon={AlertTriangle}
            title="Mais antigo pendente"
            value={summary.oldestPending ? formatDate(summary.oldestPending.discount_requested_at) : '-'}
            detail={summary.oldestPending ? getPatientDisplayName(summary.oldestPending) : 'Sem pendências'}
            tone="slate"
          />
        </div>

        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto]">
            <div>
              <label className="text-xs font-semibold text-slate-600">Buscar</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Paciente, profissional, convênio, solicitante..."
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">De</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Até</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Motivo</label>
              <select
                value={reasonFilter}
                onChange={(event) => setReasonFilter(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos</option>
                {reasonOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" onClick={loadDescontos} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Recarregar
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={filterStatus === option.value ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(option.value)}
                  className="gap-2"
                >
                  {option.label}
                  <Badge variant="secondary" className="bg-white/80 text-slate-700">
                    {option.value === 'todos'
                      ? descontos.length
                      : summary[option.value]?.count || 0}
                  </Badge>
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            {filteredDescontos.length} de {descontos.length} solicitações no período
          </span>
          <span>Total filtrado: {formatCurrency(filteredDescontos.reduce((sum, item) => sum + getDiscountAmount(item), 0))}</span>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-slate-500">Carregando solicitações...</Card>
        ) : filteredDescontos.length === 0 ? (
          <Card className="p-10 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-700">Nenhuma solicitação encontrada</p>
            <p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou recarregue a lista.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDescontos.map((desconto) => (
              <DiscountRequestCard
                key={desconto.id}
                desconto={desconto}
                expanded={expandedId === desconto.id}
                onToggle={() => setExpandedId(expandedId === desconto.id ? null : desconto.id)}
                onApprove={autorizarDesconto}
                onReject={rejeitarDesconto}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function SummaryCard({ icon: Icon, title, value, detail, tone }) {
  const colors = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 truncate text-sm text-slate-600">{detail}</p>
        </div>
        <div className={`rounded-md border p-2 ${colors[tone] || colors.slate}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function DiscountRequestCard({ desconto, expanded, onToggle, onApprove, onReject }) {
  const status = getStatus(desconto);
  const statusMeta = getStatusMeta(status);
  const StatusIcon = statusMeta.Icon;
  const discountAmount = getDiscountAmount(desconto);
  const grossAmount = Number(desconto.value || 0);
  const netAmount = getNetAmount(desconto);
  const requestedBy = desconto.discount_requested_by_name || 'Solicitante não informado';
  const decidedBy = desconto.discount_authorized_by_name || desconto.discount_rejected_by_name;

  return (
    <Card className="overflow-hidden border-slate-200">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left hover:bg-slate-50">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-slate-900">
                {getPatientDisplayName(desconto)}
              </p>
              <Badge variant="outline" className={statusMeta.className}>
                <StatusIcon className="mr-1 h-3.5 w-3.5" />
                {statusMeta.label}
              </Badge>
              {desconto.discount_reason && (
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  {getMotivo(desconto.discount_reason)}
                </Badge>
              )}
            </div>

            <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <InfoLine icon={CalendarDays} label="Atendimento" value={`${formatDate(desconto.scheduled_date)} ${desconto.scheduled_time || ''}`} />
              <InfoLine icon={UserRound} label="Profissional" value={desconto.professionals?.name || 'Não informado'} />
              <InfoLine icon={ShieldCheck} label="Convênio" value={desconto.payers?.name || 'Particular'} />
              <InfoLine icon={Clock3} label="Solicitado" value={formatDateTime(desconto.discount_requested_at)} />
            </div>
          </div>

          <div className="grid min-w-[360px] grid-cols-3 gap-2 text-right">
            <AmountBlock label="Bruto" value={grossAmount} className="bg-slate-50" />
            <AmountBlock label="Desconto" value={discountAmount} className="bg-amber-50 text-amber-800" />
            <AmountBlock label="A receber" value={netAmount} className="bg-emerald-50 text-emerald-800" />
          </div>

          <div className="hidden pt-2 xl:block">
            {expanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <AuditPanel
              title="Solicitação"
              rows={[
                ['Solicitado por', requestedBy],
                ['Data/hora', formatDateTime(desconto.discount_requested_at)],
                ['Motivo', getMotivo(desconto.discount_reason)],
              ]}
            />
            <AuditPanel
              title="Atendimento"
              rows={[
                ['Serviço', desconto.services?.name || 'Serviço não informado'],
                ['Profissional', desconto.professionals?.name || 'Profissional não informado'],
                ['Convênio', desconto.payers?.name || 'Particular'],
              ]}
            />
            <AuditPanel
              title="Decisão"
              rows={[
                ['Responsável', decidedBy || 'Aguardando decisão'],
                ['Autorizado em', formatDateTime(desconto.discount_authorized_at)],
                ['Rejeitado em', formatDateTime(desconto.discount_rejected_at)],
              ]}
            />
          </div>

          {desconto.discount_observation && (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Observações</p>
              <p className="mt-1 text-sm text-slate-700">{desconto.discount_observation}</p>
            </div>
          )}

          {status === 'pendentes' && (
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onReject(desconto.id, discountAmount);
                }}
                className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="h-4 w-4" />
                Rejeitar
              </Button>
              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onApprove(desconto.id, discountAmount);
                }}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Autorizar Desconto
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
      <span className="flex-shrink-0 font-semibold text-slate-500">{label}:</span>
      <span className="truncate text-slate-700">{value}</span>
    </div>
  );
}

function AmountBlock({ label, value, className }) {
  return (
    <div className={`rounded-md px-3 py-2 ${className}`}>
      <p className="text-xs font-semibold uppercase opacity-75">{label}</p>
      <p className="mt-1 text-sm font-bold">{formatCurrency(value)}</p>
    </div>
  );
}

function AuditPanel({ title, rows }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="text-sm">
            <span className="font-semibold text-slate-600">{label}: </span>
            <span className="text-slate-800">{value || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getMotivo(reason) {
  const motivos = {
    promocao: 'Promoção',
    cortesia: 'Cortesia',
    fidelidade: 'Fidelidade',
    erro_calculo: 'Erro de Cálculo',
    dificuldade_financeira: 'Dificuldade Financeira',
    erro_sistema: 'Erro de Sistema',
    primeira_consulta: 'Primeira Consulta',
    indicacao: 'Indicação/Referência',
    desconto_grupo: 'Desconto Grupo/Pacote',
    cortesia_medica: 'Cortesia Médica/Profissional',
    cortesia_administrativo: 'Cortesia Administrativa',
    erro_cobranca: 'Erro de Cobrança/Faturamento',
    correcao_sistema: 'Correção de Sistema',
    ajuste_convenio: 'Ajuste Convênio',
    feriado: 'Feriado/Data Especial',
    agendamento_bloqueado: 'Liberação de Agendamento Bloqueado',
    cancelamento_anterior: 'Compensação Cancelamento Anterior',
    cortesia_outros: 'Cortesia Especial',
    outro: 'Outro',
    outros: 'Outros Motivos',
  };
  return motivos[reason] || reason || 'Sem motivo';
}
