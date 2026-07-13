import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCcw, RotateCcw, Search, ShieldCheck, XCircle } from 'lucide-react';
import PageLayout from '@/components/ui/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  approveFinancialReversalRequest,
  cancelFinancialReversalRequest,
  listFinancialReversalRequests,
  rejectFinancialReversalRequest,
} from '@/lib/financialReversalApi';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovadas' },
  { value: 'rejected', label: 'Rejeitadas' },
  { value: 'canceled', label: 'Canceladas' },
  { value: 'all', label: 'Todas' },
];

const STATUS_META = {
  pending: { label: 'Pendente', className: 'border-amber-200 bg-amber-50 text-amber-800', Icon: Clock3 },
  approved: { label: 'Aprovada', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 },
  rejected: { label: 'Rejeitada', className: 'border-rose-200 bg-rose-50 text-rose-800', Icon: XCircle },
  canceled: { label: 'Cancelada', className: 'border-slate-200 bg-slate-50 text-slate-700', Icon: XCircle },
};

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const RECEIVABLE_STATUS_LABELS = {
  received: 'Recebido',
  paid: 'Recebido',
  pending: 'Pendente',
  open: 'Em aberto',
  overdue: 'Vencido',
  canceled: 'Cancelado',
  cancelled: 'Cancelado',
  reversed: 'Estornado',
  estornado: 'Estornado',
};

function formatStatusLabel(value) {
  return RECEIVABLE_STATUS_LABELS[String(value || '').toLowerCase()] || value;
}

function getReason(item) {
  return item?.object_data?.reason || 'Motivo não informado';
}

function getReceivableIds(item) {
  return Array.isArray(item?.object_data?.receivable_ids) ? item.object_data.receivable_ids : [];
}

function getPatientName(item) {
  return item?.patient?.name || 'Paciente não identificado';
}

function getRequesterName(item) {
  return item?.requester?.full_name || item?.requester?.username || item?.requester?.email || 'Solicitante não identificado';
}

function getAppointmentDateTime(item) {
  const date = item?.appointment?.scheduled_date;
  const time = item?.appointment?.scheduled_time;
  if (!date && !time) return '-';
  const dateLabel = date ? new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR') : '-';
  return time ? `${dateLabel} às ${String(time).slice(0, 5)}` : dateLabel;
}

function getReceivablesSummary(item) {
  if (!item?.receivables?.length) {
    return `${getReceivableIds(item).length || 0} recebível(is)`;
  }

  return item.receivables
    .map((receivable) => [
      formatCurrency(receivable.net_value ?? receivable.amount),
      receivable.payment_method,
      formatStatusLabel(receivable.status),
    ].filter(Boolean).join(' - '))
    .join(' | ');
}

export default function SolicitacoesEstorno() {
  const { clinicId, user, currentRole } = useAuth();
  const { hasPermission } = usePermissions();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const canDecide = ['admin', 'gestor', 'financeiro'].includes(String(currentRole || '').toLowerCase())
    || hasPermission?.('financeiro.estorno', 'edit');

  useEffect(() => {
    if (!clinicId) return;
    loadRequests();
  }, [clinicId, status]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const rows = await listFinancialReversalRequests({ clinicId, status });
      setRequests(rows);
    } catch (error) {
      console.error('Erro ao carregar solicitações de estorno:', error);
      alert(`Erro ao carregar solicitações de estorno: ${error.message}`);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const term = normalizeText(search);
    if (!term) return requests;

    return requests.filter((item) => normalizeText([
      item.appointment_id,
      getPatientName(item),
      getRequesterName(item),
      getAppointmentDateTime(item),
      item.service?.name,
      item.performed_by,
      getReason(item),
      item.payment_method,
      item.request_status,
      ...getReceivableIds(item),
    ].join(' ')).includes(term));
  }, [requests, search]);

  const handleApprove = async (item) => {
    if (!canDecide) {
      alert('Seu perfil não possui permissão para aprovar estorno financeiro.');
      return;
    }

    const note = window.prompt('Observação da aprovação (opcional):') || '';
    const confirmed = window.confirm('Aprovar e executar o estorno financeiro deste atendimento agora?');
    if (!confirmed) return;

    try {
      setProcessingId(item.id);
      const result = await approveFinancialReversalRequest({
        requestId: item.id,
        clinicId,
        userId: user?.id,
        note,
      });
      const summary = (result.steps || []).map((step) => `- ${step.name}: ${step.status}`).join('\n');
      alert(`Estorno aprovado e executado.\n\n${summary}`);
      await loadRequests();
    } catch (error) {
      console.error('Erro ao aprovar estorno:', error);
      alert(`Erro ao aprovar estorno: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item) => {
    if (!canDecide) {
      alert('Seu perfil não possui permissão para rejeitar estorno financeiro.');
      return;
    }

    const note = window.prompt('Informe o motivo da rejeição:');
    if (!note?.trim()) {
      alert('Motivo da rejeição é obrigatório.');
      return;
    }

    try {
      setProcessingId(item.id);
      await rejectFinancialReversalRequest({
        requestId: item.id,
        clinicId,
        userId: user?.id,
        note: note.trim(),
      });
      alert('Solicitação de estorno rejeitada.');
      await loadRequests();
    } catch (error) {
      console.error('Erro ao rejeitar estorno:', error);
      alert(`Erro ao rejeitar estorno: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (item) => {
    const isRequester = item.performed_by === user?.id;
    if (!canDecide && !isRequester) {
      alert('Somente o solicitante ou um perfil autorizado pode cancelar esta solicitação de estorno financeiro.');
      return;
    }

    const note = window.prompt('Informe o motivo do cancelamento:');
    if (!note?.trim()) {
      alert('Motivo do cancelamento é obrigatório.');
      return;
    }

    try {
      setProcessingId(item.id);
      await cancelFinancialReversalRequest({
        requestId: item.id,
        clinicId,
        userId: user?.id,
        note: note.trim(),
      });
      alert('Solicitação de estorno cancelada.');
      await loadRequests();
    } catch (error) {
      console.error('Erro ao cancelar estorno:', error);
      alert(`Erro ao cancelar estorno: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter((item) => item.request_status === 'pending').length;

  return (
    <PageLayout
      title="Solicitações de Estorno"
      subtitle="Analise, aprove ou rejeite pedidos de estorno financeiro dos atendimentos."
      breadcrumbs={[
        { label: 'Clínica', path: '/clinica' },
        { label: 'Financeiro', path: '/clinica/financeiro' },
        { label: 'Solicitações de Estorno', path: '/clinica/financeiro/solicitacoes-estorno' },
      ]}
    >
      <div className="space-y-4">
        <Card className="border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={status === option.value ? 'default' : 'outline'}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="relative min-w-0 lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por paciente, atendimento, motivo ou forma"
                className="pl-9"
              />
            </div>
          </div>
        </Card>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Pendentes na visão atual</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{pendingCount}</p>
          </Card>
          <Card className="border-slate-200 p-4">
            <p className="text-sm text-slate-500">Itens filtrados</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{filteredRequests.length}</p>
          </Card>
          <Card className="border-slate-200 p-4">
            <p className="text-sm text-slate-500">Permissão atual</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4" />
              {canDecide ? 'Pode aprovar/rejeitar' : 'Somente visualização'}
            </p>
          </Card>
        </div>

        <Card className="border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Fila de solicitações</h2>
              <p className="text-sm text-slate-500">Cada decisão gera novo evento de auditoria.</p>
            </div>
            <Button variant="outline" onClick={loadRequests} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando solicitações...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Nenhuma solicitação encontrada.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((item) => {
                const meta = STATUS_META[item.request_status] || STATUS_META.pending;
                const StatusIcon = meta.Icon;
                const isProcessing = processingId === item.id;
                const canCancelRequest = canDecide || item.performed_by === user?.id;

                return (
                  <div key={item.id} className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={meta.className}>
                            <StatusIcon className="mr-1 h-3.5 w-3.5" />
                            {meta.label}
                          </Badge>
                          <Badge variant="outline" className="border-slate-200 text-slate-700">
                            {formatCurrency(item.amount)}
                          </Badge>
                          <span className="text-xs text-slate-500">Solicitado em {formatDateTime(item.performed_at)}</span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-900">{getPatientName(item)}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Atendimento em {getAppointmentDateTime(item)}
                            {item.service?.name ? ` • ${item.service.name}` : ''}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{getReason(item)}</p>
                        </div>

                        <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                          <span>Solicitante: {getRequesterName(item)}</span>
                          <span>Forma: {item.payment_method || '-'}</span>
                          <span>Recebíveis: {getReceivablesSummary(item)}</span>
                          <span>Solicitação: aguardando decisão</span>
                        </div>

                        {item.resolution && (
                          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            Decidido em {formatDateTime(item.resolution.performed_at)} por {item.resolution.performed_by || '-'}.
                            {item.resolution.object_data?.note ? ` Observação: ${item.resolution.object_data.note}` : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {item.request_status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              className="border-slate-300 text-slate-700 hover:bg-slate-50"
                              disabled={!canCancelRequest || isProcessing}
                              onClick={() => handleCancel(item)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </Button>
                            <Button
                              variant="outline"
                              className="border-rose-300 text-rose-700 hover:bg-rose-50"
                              disabled={!canDecide || isProcessing}
                              onClick={() => handleReject(item)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Rejeitar
                            </Button>
                            <Button
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={!canDecide || isProcessing}
                              onClick={() => handleApprove(item)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Aprovar e Estornar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
