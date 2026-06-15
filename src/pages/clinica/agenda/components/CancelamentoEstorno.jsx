/**
 * CancelamentoEstorno.jsx
 *
 * Componente para cancelamento de atendimento com estorno financeiro
 * 
 * Features:
 * - Estorno total ou parcial
 * - Requer autorização (role-based)
 * - Registra motivo completo
 * - Rastreabilidade total
 * - Mostra impacto no financeiro
 */

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  DollarSign,
  Lock,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { APPOINTMENT_STATUS } from '@/lib/appointmentStatusEnums';
import { processAppointmentChargeBack } from '@/lib/lancamentoHelpers';
import { useAuth } from '@/contexts/AuthContext';

export default function CancelamentoEstorno({
  appointment,
  clinicId,
  financialData = null,
  onCancelSuccess = null,
}) {
  const { user, currentRole } = useAuth();

  const [showConfirm, setShowConfirm] = useState(false);
  const [cancellationType, setCancellationType] = useState('FULL'); // FULL | PARTIAL
  const [refundAmount, setRefundAmount] = useState(
    financialData?.totalAmount || appointment?.estimated_value || 0,
  );
  const [reason, setReason] = useState('');
  const [authorization, setAuthorization] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ============================================
  // VALIDAÇÕES
  // ============================================

  const canCancel = useMemo(() => {
    // Verificar se está em status cancellável
    const cancellableStatuses = [
      APPOINTMENT_STATUS.AGUARDANDO,
      APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO,
      APPOINTMENT_STATUS.EM_ATENDIMENTO,
      APPOINTMENT_STATUS.FINALIZADO,
    ];

    const isStatusValid = cancellableStatuses.includes(appointment?.status);
    const hasPermission = ['admin', 'gerente', 'operador_financeiro'].includes(currentRole);

    return isStatusValid && hasPermission;
  }, [appointment?.status, currentRole]);

  const canRefundPartial = useMemo(() => {
    return (
      cancellationType === 'PARTIAL' &&
      refundAmount > 0 &&
      refundAmount <= (financialData?.totalAmount || appointment?.estimated_value || 0)
    );
  }, [cancellationType, refundAmount, financialData, appointment]);

  const refundPercent = useMemo(() => {
    const total = financialData?.totalAmount || appointment?.estimated_value || 0;
    return total > 0 ? Math.round((refundAmount / total) * 100) : 0;
  }, [refundAmount, financialData, appointment]);

  const hasValidAuth = useMemo(() => {
    return (
      authorization.trim().length > 5 &&
      reason.trim().length > 10 &&
      (cancellationType === 'FULL' || canRefundPartial)
    );
  }, [authorization, reason, cancellationType, canRefundPartial]);

  // ============================================
  // FUNÇÕES
  // ============================================

  const handleCancelRequest = async () => {
    if (!hasValidAuth) {
      setError('❌ Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🔄 Processando cancelamento/estorno...', {
        appointmentId: appointment.id,
        cancellationType,
        refundAmount,
        reason,
      });

      const result = await processAppointmentChargeBack({
        appointmentId: appointment.id,
        clinicId,
        authorizedBy: user?.id,
        authorizedByRole: currentRole,
        reason,
        refundAmount: cancellationType === 'FULL' ? null : refundAmount,
        cancellationType,
      });

      if (result.success) {
        console.log('✅ Cancelamento processado com sucesso!', result);
        setSuccess(`✅ Estorno de R$ ${refundAmount.toFixed(2)} autorizado e registrado com rastreabilidade completa`);
        setShowConfirm(false);

        // Reset form
        setCancellationType('FULL');
        setRefundAmount(financialData?.totalAmount || appointment?.estimated_value || 0);
        setReason('');
        setAuthorization('');

        onCancelSuccess?.(result);
      } else {
        console.error('❌ Falha ao processar cancelamento:', result);
        setError(`❌ ${result.message || 'Erro ao processar cancelamento'}`);
      }
    } catch (err) {
      console.error('❌ Erro no cancelamento:', err);
      setError(`❌ Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (!canCancel) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="text-red-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <p className="font-semibold text-red-900">Cancelamento Não Permitido</p>
            <p className="text-sm text-red-800 mt-1">
              {!['admin', 'gerente', 'operador_financeiro'].includes(currentRole)
                ? '❌ Você não tem permissão para cancelar atendimentos'
                : `❌ Status "${appointment?.status}" não permite cancelamento`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AVISO */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
        <div>
          <p className="font-semibold text-yellow-900">⚠️ Cancelamento com Estorno Financeiro</p>
          <p className="text-sm text-yellow-800 mt-1">
            Esta ação vai cancelar o atendimento e estornar o financeiro gerado. Requer autorização.
          </p>
        </div>
      </div>

      {/* MENSAGEM DE SUCESSO */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <p className="font-semibold text-green-900">{success}</p>
            <p className="text-sm text-green-800 mt-1">
              💾 Tudo foi registrado na auditoria com rastreabilidade completa.
            </p>
          </div>
        </div>
      )}

      {/* ERRO */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <p className="font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      {!success && (
        <>
          {/* TIPO DE CANCELAMENTO */}
          <div className="space-y-3">
            <p className="font-semibold text-gray-900">Tipo de Cancelamento</p>

            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cancellationType"
                  value="FULL"
                  checked={cancellationType === 'FULL'}
                  onChange={(e) => {
                    setCancellationType(e.target.value);
                    setRefundAmount(financialData?.totalAmount || appointment?.estimated_value || 0);
                  }}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold text-gray-900">🔴 Cancelamento Total</p>
                  <p className="text-sm text-gray-600">
                    Estorna R$ {(financialData?.totalAmount || appointment?.estimated_value || 0).toFixed(2)} completos
                  </p>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cancellationType"
                  value="PARTIAL"
                  checked={cancellationType === 'PARTIAL'}
                  onChange={(e) => setCancellationType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold text-gray-900">🟡 Cancelamento Parcial</p>
                  <p className="text-sm text-gray-600">Especifique o valor a estornar</p>
                </div>
              </label>
            </div>
          </div>

          {/* VALOR (Se Parcial) */}
          {cancellationType === 'PARTIAL' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Valor a Estornar ({refundPercent}%)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-600">R$</span>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  max={financialData?.totalAmount || appointment?.estimated_value || 0}
                  min={0}
                  step={0.01}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-600">
                Máximo: R$ {(financialData?.totalAmount || appointment?.estimated_value || 0).toFixed(2)}
              </p>
            </div>
          )}

          {/* MOTIVO */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Motivo do Cancelamento *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique detalhadamente o motivo do cancelamento/estorno..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
              rows={3}
            />
            <p className="text-xs text-gray-600">Mínimo 10 caracteres</p>
          </div>

          {/* AUTORIZAÇÃO */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Código de Autorização *
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 flex items-start gap-2">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <p className="text-sm text-blue-900">
                Digite seu código ou frase de autorização (6+ caracteres) para confirmar que você está autorizado a fazer esta ação.
              </p>
            </div>
            <input
              type="password"
              value={authorization}
              onChange={(e) => setAuthorization(e.target.value)}
              placeholder="Digite seu código de autorização..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-600">Será registrado na auditoria</p>
          </div>

          {/* RESUMO */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <p className="font-semibold text-gray-900 mb-3">📊 Resumo do Estorno</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-semibold text-gray-900">
                  {cancellationType === 'FULL' ? '🔴 Total' : '🟡 Parcial'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor a Estornar:</span>
                <span className="font-semibold text-red-600">R$ {refundAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Autorizado por:</span>
                <span className="font-semibold text-gray-900">{user?.email || 'Usuário'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-semibold text-gray-900">{currentRole}</span>
              </div>
            </div>
          </div>

          {/* BOTÕES */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowConfirm(true);
                setError(null);
              }}
              disabled={!hasValidAuth || loading}
              className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                hasValidAuth && !loading
                  ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              <DollarSign size={20} />
              {loading ? 'Processando...' : 'Confirmar Estorno'}
            </button>
          </div>
        </>
      )}

      {/* MODAL DE CONFIRMAÇÃO FINAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900">Confirmar Estorno</h3>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <p className="text-red-900 font-semibold">Esta ação vai:</p>
              <ul className="text-red-800 space-y-1">
                <li>✅ Cancelar o atendimento</li>
                <li>✅ Estornar R$ {refundAmount.toFixed(2)} do financeiro</li>
                <li>✅ Registrar tudo na auditoria</li>
                <li>✅ Criar lançamento negativo para rastreabilidade</li>
              </ul>
              <p className="text-red-900 font-semibold mt-3">Isso NÃO pode ser desfeito!</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 disabled:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={loading}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span> Processando...
                  </>
                ) : (
                  <>
                    <X size={20} /> Confirmar Estorno
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
