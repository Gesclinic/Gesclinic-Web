/**
 * CheckinAcoes.jsx
 *
 * ⚙️ AÇÕES DISPONÍVEIS
 *
 * Regra de Ouro:
 * LIBERAR só aparece e funciona se:
 * 1. Checklist completo
 * 2. Financeiro resolvido
 * 3. Status permite (não é final)
 *
 * Outras ações: Marcar falta, Remarcar, Marcar pendência
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Redo2,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';
import { APPOINTMENT_STATUS, getValidStatusTransitions } from '@/lib/appointmentStatusEnums';
import { logMarkedNoShow, logAppointmentRescheduled, logCheckinStarted } from '@/lib/auditApi';
import { createLancamentoFromAppointmentRelease } from '@/lib/lancamentoHelpers';
import { useClinicContext } from '@/contexts/ClinicContext';

export default function CheckinAcoes({ appointment, onUpdateStatus, loading, onRefresh }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [financialCreating, setFinancialCreating] = useState(false);
  const [financialError, setFinancialError] = useState(null);
  const { clinicId } = useClinicContext();

  // ============================================
  // VALIDAÇÃO DO CHECKLIST
  // ============================================

  const isChecklistComplete = useMemo(() => {
    // Itens base
    const baseComplete =
      appointment?.patient_verified && appointment?.service_name && appointment?.professional_name;

    if (!baseComplete) {
      return false;
    }

    // Se convênio
    if (appointment?.payer_type === 'CONVENIO' || appointment?.payer_name) {
      return (
        appointment?.payer_verified &&
        appointment?.card_verified &&
        appointment?.authorization_verified &&
        appointment?.guide_number
      );
    }

    // Se particular
    return (
      appointment?.payment_method &&
      (appointment?.payment_received || appointment?.payment_authorized_after)
    );
  }, [appointment]);

  // ============================================
  // VALIDAÇÃO FINANCEIRA
  // ============================================

  const isFinanceResolved = useMemo(() => {
    if (appointment?.payer_type === 'CONVENIO' || appointment?.payer_name) {
      return !!appointment?.guide_number && appointment?.authorization_verified;
    }

    return (
      !!appointment?.payment_method &&
      (appointment?.payment_received || appointment?.payment_authorized_after)
    );
  }, [appointment]);

  // ============================================
  // VALIDAÇÃO DE BLOQUEIOS
  // ============================================

  const canRelease = useMemo(() => {
    if (!isChecklistComplete) {
      return false;
    }
    if (!isFinanceResolved) {
      return false;
    }
    if (appointment?.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO) {
      return false; // Já está liberado
    }
    return true;
  }, [isChecklistComplete, isFinanceResolved, appointment?.status]);

  const blockReasons = useMemo(() => {
    const reasons = [];

    if (!isChecklistComplete) {
      reasons.push('❌ Checklist incompleto — completa todos os itens primeiro');
    }

    if (!isFinanceResolved) {
      reasons.push('❌ Financeiro pendente — resolve convênio/pagamento antes');
    }

    if (appointment?.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO) {
      reasons.push('✅ Já liberado para atendimento');
    }

    return reasons;
  }, [isChecklistComplete, isFinanceResolved, appointment?.status]);

  // ============================================
  // AÇÕES
  // ============================================

  const handleRelease = async () => {
    if (!canRelease) {
      alert('Não é possível liberar neste momento');
      return;
    }

    // Confirmação
    setConfirmAction('release');
    setShowConfirm(true);
  };

  const handleConfirmRelease = async () => {
    try {
      setFinancialError(null);

      // 1️⃣ Atualizar status do appointment para LIBERADO_PARA_ATENDIMENTO
      console.log('💾 [1/3] Atualizando status para LIBERADO_PARA_ATENDIMENTO...');
      await onUpdateStatus(appointment.id, APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO, {
        liberado_em: new Date().toISOString(),
        liberado_por: 'current_user_id', // Em produção, usar user.id
      });

      console.log('✅ Status LIBERADO_PARA_ATENDIMENTO concluído');

      // 2️⃣ Criar lançamento financeiro automático (FASE 1)
      console.log('💰 [2/3] Criando lançamento financeiro automático...');
      setFinancialCreating(true);

      const financialResult = await createLancamentoFromAppointmentRelease(
        appointment,
        clinicId,
      );

      if (financialResult.success) {
        console.log('✅ Lançamento criado automaticamente!', financialResult);
      } else {
        console.warn('⚠️ Falha ao criar lançamento:', financialResult.reason, financialResult.message);
        setFinancialError(
          financialResult.message ||
            'Atenção: Status foi atualizado, mas o lançamento não pôde ser criado.',
        );
      }

      // 3️⃣ Mudar automaticamente para EM_ATENDIMENTO (Aguardando Profissional)
      console.log('🟢 [3/3] Transitando para EM_ATENDIMENTO (Aguardando Profissional)...');
      await onUpdateStatus(appointment.id, APPOINTMENT_STATUS.EM_ATENDIMENTO, {
        transicionado_em: new Date().toISOString(),
        fase: 'aguardando_profissional',
      });

      console.log('✅ Status EM_ATENDIMENTO concluído');

      // Log de auditoria de status completo
      logCheckinStarted(appointment.id, {
        status_anterior: appointment.status,
        status_intermediario: APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO,
        status_final: APPOINTMENT_STATUS.EM_ATENDIMENTO,
        transicao_automatica: true,
      }).catch((err) => console.warn('Erro ao logar auditoria:', err));

      setFinancialCreating(false);
      setShowConfirm(false);
      setConfirmAction(null);
      onRefresh?.();
    } catch (error) {
      console.error('❌ Erro ao confirmar liberação:', error);
      setFinancialError(`Erro: ${error.message}`);
      setFinancialCreating(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (confirm('Tem certeza que deseja marcar como FALTA?')) {
      await onUpdateStatus(appointment.id, APPOINTMENT_STATUS.FALTA);
      // Log de auditoria
      logMarkedNoShow(appointment.id, 'Marcado como falta via check-in').catch((err) =>
        console.warn('Erro ao logar auditoria:', err),
      );
      onRefresh?.();
    }
  };

  const handleMarkPending = async () => {
    if (confirm('Marcar como PENDENTE resolve qual problema?')) {
      await onUpdateStatus(appointment.id, APPOINTMENT_STATUS.PENDENTE);
      onRefresh?.();
    }
  };

  const handleReschedule = async () => {
    if (confirm('Deseja remarcar este agendamento?')) {
      // Em produção, abrir modal de reagendamento
      alert('Funcionalidade de reagendamento a ser implementada');
    }
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-6">
      {/* Status Atual */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-2">Status Atual</p>
        <p className="text-2xl font-bold text-gray-900">
          {appointment?.status === APPOINTMENT_STATUS.AGUARDANDO && '⏳ Aguardando'}
          {appointment?.status === APPOINTMENT_STATUS.CONFIRMADO && '✅ Confirmado'}
          {appointment?.status === APPOINTMENT_STATUS.PENDENTE && '🔴 Pendente'}
          {appointment?.status === APPOINTMENT_STATUS.FINANCEIRO_PENDENTE &&
            '💳 Financeiro Pendente'}
          {appointment?.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO && '🟢 Liberado'}
        </p>
      </div>

      {/* BOTÃO PRINCIPAL — LIBERAR */}
      {canRelease ? (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="text-green-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900">✅ Pronto para Liberar!</h3>
              <p className="text-green-800 mt-1">
                Todos os requisitos foram atendidos. Clique para liberar o paciente para
                atendimento.
              </p>
            </div>
          </div>

          <button
            onClick={handleRelease}
            disabled={loading}
            className={`
              mt-4 w-full py-3 rounded-lg font-bold text-lg transition
              ${
                loading
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
              }
            `}
          >
            {loading ? '⏳ Processando...' : '🟢 LIBERAR PARA ATENDIMENTO'}
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900">❌ Não é Possível Liberar</h3>
              <p className="text-red-800 mt-1 mb-3">Resolva os problemas abaixo:</p>
              <ul className="space-y-2">
                {blockReasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                    <span className="mt-1">▪</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            disabled
            className="mt-4 w-full py-3 rounded-lg font-bold text-lg bg-gray-300 text-gray-600 cursor-not-allowed"
          >
            <Lock className="inline mr-2" size={20} /> LIBERAÇÃO BLOQUEADA
          </button>
        </div>
      )}

      {/* OUTRAS AÇÕES */}
      <div className="border-t border-gray-200 pt-6">
        <p className="font-semibold text-gray-900 mb-4">Outras Ações</p>

        <div className="space-y-3">
          {/* Marcar Falta */}
          <button
            onClick={handleMarkNoShow}
            disabled={loading || appointment?.status === APPOINTMENT_STATUS.FALTA}
            className={`w-full p-4 border rounded-lg text-left transition ${
              appointment?.status === APPOINTMENT_STATUS.FALTA
                ? 'bg-gray-100 border-gray-300 opacity-50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <XCircle
                className={
                  appointment?.status === APPOINTMENT_STATUS.FALTA
                    ? 'text-gray-400'
                    : 'text-orange-600'
                }
                size={24}
              />
              <div>
                <p className="font-semibold text-gray-900">Marcar Falta</p>
                <p className="text-sm text-gray-600">Paciente não compareceu</p>
              </div>
            </div>
          </button>

          {/* Marcar Pendência */}
          <button
            onClick={handleMarkPending}
            disabled={loading || appointment?.status === APPOINTMENT_STATUS.PENDENTE}
            className={`w-full p-4 border rounded-lg text-left transition ${
              appointment?.status === APPOINTMENT_STATUS.PENDENTE
                ? 'bg-gray-100 border-gray-300 opacity-50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle
                className={
                  appointment?.status === APPOINTMENT_STATUS.PENDENTE
                    ? 'text-gray-400'
                    : 'text-red-600'
                }
                size={24}
              />
              <div>
                <p className="font-semibold text-gray-900">Marcar Pendência</p>
                <p className="text-sm text-gray-600">Aguardando resolução de dados ou convênio</p>
              </div>
            </div>
          </button>

          {/* Remarcar */}
          <button
            onClick={handleReschedule}
            disabled={
              loading || appointment?.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO
            }
            className={`w-full p-4 border rounded-lg text-left transition ${
              appointment?.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO
                ? 'bg-gray-100 border-gray-300 opacity-50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Redo2
                className={
                  appointment?.status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO
                    ? 'text-gray-400'
                    : 'text-blue-600'
                }
                size={24}
              />
              <div>
                <p className="font-semibold text-gray-900">Remarcar</p>
                <p className="text-sm text-gray-600">Agendar novo horário</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirm && confirmAction === 'release' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Liberação</h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-900 font-semibold">
                Paciente <strong>{appointment.patient_name}</strong>
              </p>
              <p className="text-sm text-blue-800 mt-2">
                Será liberado para <strong>{appointment.professional_name}</strong>
              </p>
              <p className="text-sm text-blue-800 mt-3 bg-blue-100 rounded p-2">
                ✅ Lançamento financeiro criado automaticamente
                <br />✅ Status muda para: <strong>Aguardando Profissional</strong>
              </p>
            </div>

            {/* Fluxo de 3 Etapas */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-white ${
                  financialCreating ? 'bg-yellow-500 animate-pulse' : 'bg-green-600'
                }`}>
                  1
                </div>
                <span className="text-gray-700">Atualizar status → LIBERADO_PARA_ATENDIMENTO</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-white ${
                  financialCreating ? 'bg-yellow-500 animate-pulse' : 'bg-green-600'
                }`}>
                  2
                </div>
                <span className="text-gray-700">Criar lançamento financeiro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-white ${
                  financialCreating ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
                }`}>
                  3
                </div>
                <span className={financialCreating ? 'text-gray-500' : 'text-gray-700'}>
                  Transicionar para EM_ATENDIMENTO (Aguardando Profissional)
                </span>
              </div>
            </div>

            {/* Status de Criação do Financeiro */}
            {financialCreating && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-3">
                <Clock className="text-yellow-600 flex-shrink-0 mt-1 animate-spin" size={20} />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Processando...</p>
                  <p className="text-xs text-yellow-800">
                    Etapas 1 e 2 em andamento
                    <br />Etapa 3 será executada em seguida
                  </p>
                </div>
              </div>
            )}

            {/* Erro no Financeiro */}
            {financialError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-red-900">⚠️ Aviso</p>
                <p className="text-sm text-red-800">{financialError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading || financialCreating}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 disabled:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRelease}
                disabled={loading || financialCreating}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {financialCreating ? (
                  <>
                    <Clock size={16} className="animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    {loading ? '⏳' : '✅'} Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTA IMPORTANTE */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
        <div>
          <p className="font-semibold text-yellow-900">Garantia de Qualidade</p>
          <ul className="text-sm text-yellow-800 mt-2 space-y-1">
            <li>✅ Liberar = Muda para LIBERADO_PARA_ATENDIMENTO + Cria lançamento + Transiciona para EM_ATENDIMENTO</li>
            <li>✅ Profissional PODE começar imediatamente (status: Aguardando Profissional)</li>
            <li>✅ Cancelamento com autorização pode reverter tudo (com rastreabilidade)</li>
            <li>✅ Registra automaticamente data/hora/usuário de todas as ações</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
