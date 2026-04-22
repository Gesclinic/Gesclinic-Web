import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Zap, Calculator, TrendingUp, Loader2 } from 'lucide-react';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/paymentMethodsConfig';
import type { CashMovementInput } from '../types/CashMovement';
import type { Patient, Professional, Service, Payer } from '../hooks/useCashFormData';
import { useAppointments } from '../hooks/useAppointments';
import { useRepasseCalculation } from '../hooks/useRepasseCalculation';
import { toastService } from '../hooks/useToastManager';

interface CashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CashMovementInput) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  patients: Patient[];
  professionals: Professional[];
  services: Service[];
  payers: Payer[];
  clinicId: string;
}

export const CashModal: React.FC<CashModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSuccess,
  onError,
  patients,
  professionals,
  services,
  payers,
  clinicId
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'linked'>('linked');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { findPatientAppointments } = useAppointments(clinicId);
  const { calculateRepasse } = useRepasseCalculation();

  const [manualForm, setManualForm] = useState({
    type: 'entrada' as const,
    amount: '',
    payment_method: 'DINHEIRO',
    description: '',
    status: 'confirmado' as const
  });

  const [linkedForm, setLinkedForm] = useState({
    patient_id: '',
    professional_id: '',
    service_id: '',
    payer_type: 'particular' as const,
    payer_id: '',
    discount: '',
    status: 'confirmado' as const
  });

  useEffect(() => {
    if (!isOpen) {
      setManualForm({
        type: 'entrada',
        amount: '',
        payment_method: 'DINHEIRO',
        description: '',
        status: 'confirmado'
      });
      setLinkedForm({
        patient_id: '',
        professional_id: '',
        service_id: '',
        payer_type: 'particular',
        payer_id: '',
        discount: '',
        status: 'confirmado'
      });
      setValidationError(null);
    }
  }, [isOpen]);

  const selectedService = services.find((s) => s.id === linkedForm.service_id);
  const discount = parseFloat(linkedForm.discount || '0');
  const netAmount = selectedService ? selectedService.price - discount : 0;
  const repasseData = linkedForm.professional_id
    ? calculateRepasse(linkedForm.professional_id, selectedService?.price || 0, discount)
    : null;

  const validateLinkedForm = (): boolean => {
    setValidationError(null);

    if (!linkedForm.patient_id) {
      setValidationError('Selecione um paciente');
      toastService.warning('Validação', 'Paciente é obrigatório');
      return false;
    }

    if (!linkedForm.service_id) {
      setValidationError('Selecione um serviço');
      toastService.warning('Validação', 'Serviço é obrigatório');
      return false;
    }

    const patientAppointments = findPatientAppointments(linkedForm.patient_id);
    if (patientAppointments.length === 0) {
      setValidationError('Atendimento não liberado para profissional ainda');
      toastService.error(
        'Atendimento não pronto',
        'Recepção precisa confirmar pagamento/guia e liberar para o profissional'
      );
      return false;
    }

    if (linkedForm.payer_type === 'convenio' && !linkedForm.payer_id) {
      setValidationError('Selecione um convênio');
      toastService.warning('Validação', 'Convênio é obrigatório');
      return false;
    }

    if (netAmount <= 0) {
      setValidationError('O valor líquido deve ser positivo');
      toastService.warning('Validação', 'Valor do serviço > desconto');
      return false;
    }

    return true;
  };

  const validateManualForm = (): boolean => {
    setValidationError(null);

    if (!manualForm.amount) {
      setValidationError('Digite um valor');
      toastService.warning('Validação', 'Valor é obrigatório');
      return false;
    }

    const amount = parseFloat(manualForm.amount);
    if (amount <= 0) {
      setValidationError('O valor deve ser positivo');
      toastService.warning('Validação', 'Digite um valor > zero');
      return false;
    }

    return true;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateManualForm()) return;

    setLoading(true);
    try {
      toastService.info('Processando', 'Registrando movimento manual...');

      await onSubmit({
        type: manualForm.type,
        amount: parseFloat(manualForm.amount),
        payment_method: manualForm.payment_method,
        description: manualForm.description,
        status: manualForm.status,
        origin: 'manual'
      });

      toastService.success(
        'Movimento manual registrado',
        `R$ ${parseFloat(manualForm.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );

      setManualForm({
        type: 'entrada',
        amount: '',
        payment_method: 'DINHEIRO',
        description: '',
        status: 'confirmado'
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao registrar movimento';
      console.error('Erro manual:', error);
      toastService.error('Erro ao registrar', errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateLinkedForm()) return;

    setLoading(true);
    try {
      toastService.info('Processando', 'Vinculando atendimento ao caixa...');

      await onSubmit({
        type: 'entrada',
        amount: netAmount,
        patient_id: linkedForm.patient_id,
        professional_id: linkedForm.professional_id || undefined,
        service_id: linkedForm.service_id,
        payer_type: linkedForm.payer_type,
        payer_id: linkedForm.payer_type === 'convenio' ? linkedForm.payer_id : undefined,
        status: linkedForm.status,
        origin: 'agenda',
        discount: discount > 0 ? discount : undefined
      });

      const patientName = patients.find((p) => p.id === linkedForm.patient_id)?.name || 'Paciente';

      toastService.success(
        'Movimento vinculado com sucesso',
        `${patientName} - R$ ${netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );

      setLinkedForm({
        patient_id: '',
        professional_id: '',
        service_id: '',
        payer_type: 'particular',
        payer_id: '',
        discount: '',
        status: 'confirmado'
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao vincular movimento';
      console.error('Erro vinculado:', error);
      toastService.error('Erro ao vincular', errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const patientAppointments = linkedForm.patient_id
    ? findPatientAppointments(linkedForm.patient_id)
    : [];
  const hasActiveAppointment = patientAppointments.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Novo Movimento de Caixa</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50 transition"
            aria-label="Fechar modal"
            title="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 flex flex-shrink-0">
          <button
            onClick={() => {
              setActiveTab('linked');
              setValidationError(null);
            }}
            disabled={loading}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'linked'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            <Zap size={18} />
            Vincular Atendimento
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              setValidationError(null);
            }}
            disabled={loading}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'manual'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            📝 Manual
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Warning for manual tab */}
          {activeTab === 'manual' && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Recomendação</p>
                <p className="text-amber-700 text-xs mt-1">
                  Prefira "Vincular Atendimento" para registrar automaticamente o repasse ao profissional
                </p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-red-900 text-sm">Erro de validação</p>
                <p className="text-red-700 text-xs mt-1">{validationError}</p>
              </div>
            </div>
          )}

          {/* LINKED TAB */}
          {activeTab === 'linked' && (
            <form onSubmit={handleLinkedSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  👤 Paciente <span className="text-red-600">*</span>
                </label>
                <select
                  value={linkedForm.patient_id}
                  onChange={(e) => {
                    setLinkedForm({ ...linkedForm, patient_id: e.target.value });
                    setValidationError(null);
                  }}
                  disabled={loading}
                  aria-label="Paciente"
                  className={`w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none transition ${
                    hasActiveAppointment
                      ? 'border-green-200 focus:border-green-500 bg-green-50/30'
                      : 'border-slate-200 focus:border-blue-500'
                  } disabled:opacity-50`}
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {hasActiveAppointment && (
                  <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                    ✓ Atendimento pronto (liberado para profissional)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🩺 Profissional
                  </label>
                  <select
                    value={linkedForm.professional_id}
                    onChange={(e) => setLinkedForm({ ...linkedForm, professional_id: e.target.value })}
                    disabled={loading}
                    aria-label="Profissional"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    <option value="">Não informar</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🏥 Serviço <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={linkedForm.service_id}
                    onChange={(e) => {
                      setLinkedForm({ ...linkedForm, service_id: e.target.value });
                      setValidationError(null);
                    }}
                    disabled={loading}
                    required
                    aria-label="Serviço"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    <option value="">Selecione um serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - R$ {s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    💳 Tipo de Pagamento
                  </label>
                  <select
                    value={linkedForm.payer_type}
                    onChange={(e) =>
                      setLinkedForm({
                        ...linkedForm,
                        payer_type: e.target.value as 'particular' | 'convenio',
                        payer_id: ''
                      })
                    }
                    disabled={loading}
                    aria-label="Tipo de pagamento"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    <option value="particular">Particular</option>
                    <option value="convenio">Convênio</option>
                  </select>
                </div>

                {linkedForm.payer_type === 'convenio' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      🏢 Convênio <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={linkedForm.payer_id}
                      onChange={(e) => setLinkedForm({ ...linkedForm, payer_id: e.target.value })}
                      disabled={loading}
                      aria-label="Convênio"
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                    >
                      <option value="">Selecione um convênio</option>
                      {payers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🏷️ Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedService?.price || 0}
                    value={linkedForm.discount}
                    onChange={(e) => setLinkedForm({ ...linkedForm, discount: e.target.value })}
                    disabled={loading}
                    aria-label="Desconto"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    ✓ Status
                  </label>
                  <select
                    value={linkedForm.status}
                    onChange={(e) =>
                      setLinkedForm({
                        ...linkedForm,
                        status: e.target.value as 'confirmado' | 'pendente' | 'estornado'
                      })
                    }
                    disabled={loading}
                    aria-label="Status"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    <option value="confirmado">✓ Confirmado</option>
                    <option value="pendente">⏳ Pendente</option>
                    <option value="estornado">✗ Estornado</option>
                  </select>
                </div>
              </div>

              {/* Calculation Summary */}
              {selectedService && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Calculator size={18} className="text-blue-600" />
                    Cálculo Automático
                  </h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Serviço:</span>
                      <span className="font-semibold">
                        R$ {(selectedService.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Desconto:</span>
                        <span className="font-semibold text-red-600">
                          -R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-blue-200 pt-2 flex justify-between">
                      <span className="font-semibold">Valor Caixa:</span>
                      <span className="font-bold text-lg text-green-600">
                        R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {repasseData && (
                      <div className="mt-3 pt-3 border-t border-blue-200 bg-white/50 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 flex items-center gap-2">
                            <TrendingUp size={16} className="text-orange-600" />
                            Repasse:
                          </span>
                          <span className="font-bold text-orange-600">
                            R$ {(repasseData.commission ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{repasseData.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* MANUAL TAB */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={manualForm.type}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, type: e.target.value as 'entrada' | 'saida' })
                    }
                    disabled={loading}
                    aria-label="Tipo de movimento"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    <option value="entrada">📥 Entrada</option>
                    <option value="saida">📤 Saída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Valor (R$) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualForm.amount}
                    onChange={(e) => {
                      setManualForm({ ...manualForm, amount: e.target.value });
                      setValidationError(null);
                    }}
                    disabled={loading}
                    aria-label="Valor do movimento"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50 text-lg font-semibold"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Forma de Pagamento
                </label>
                <select
                  value={manualForm.payment_method}
                  onChange={(e) => setManualForm({ ...manualForm, payment_method: e.target.value })}
                  disabled={loading}
                  aria-label="Forma de pagamento"
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                >
                  {Object.entries(PAYMENT_METHODS).map(([key]) => (
                    <option key={key} value={key}>
                      {PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS] || key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  disabled={loading}
                  aria-label="Descrição do movimento"
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  placeholder="Ex: Reembolso, devolução, etc."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={manualForm.status}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      status: e.target.value as 'confirmado' | 'pendente' | 'estornado'
                    })
                  }
                  disabled={loading}
                  aria-label="Status do movimento"
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                >
                  <option value="confirmado">✓ Confirmado</option>
                  <option value="pendente">⏳ Pendente</option>
                  <option value="estornado">✗ Estornado</option>
                </select>
              </div>
            </form>
          )}
        </div>

        {/* Footer - Buttons */}
        <div className="border-t border-slate-100 p-6 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={activeTab === 'linked' ? handleLinkedSubmit : handleManualSubmit}
            disabled={
              loading ||
              (activeTab === 'linked'
                ? !linkedForm.patient_id || !linkedForm.service_id || !hasActiveAppointment
                : !manualForm.amount)
            }
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {activeTab === 'linked' ? 'Vinculando...' : 'Registrando...'}
              </>
            ) : (
              <>
                {activeTab === 'linked' ? (
                  <>
                    <Zap size={18} />
                    Vincular Movimento
                  </>
                ) : (
                  <>
                    📝 Registrar Movimento
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
