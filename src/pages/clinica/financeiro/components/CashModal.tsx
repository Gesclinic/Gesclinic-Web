import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Zap, Calculator, TrendingUp, Loader2 } from 'lucide-react';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/paymentMethodsConfig';
import { stockSuppliersApi } from '@/lib/stockApi';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { CashMovementInput } from '../types/CashMovement';
import type { Patient, Professional, Service, Payer } from '../hooks/useCashFormData';
import { useRepasseCalculation } from '../hooks/useRepasseCalculation';
import { toastService } from '../hooks/useToastManager';
import { RegisteredCounterpartyField, type SupplierRecord } from './RegisteredCounterpartyField';

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

const MANUAL_FINANCIAL_CATEGORIES = [
  { value: 'other', label: 'Geral' },
  { value: 'medical_service', label: 'Serviço / Receita clínica' },
  { value: 'materials', label: 'Materiais e insumos' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'utilities', label: 'Contas de consumo' },
  { value: 'tax', label: 'Impostos e taxas' },
  { value: 'software', label: 'Sistemas e tecnologia' },
];

type LinkableAppointment = {
  id: string;
  patient_id: string;
  patient?: { name: string };
  professional_id: string;
  professional?: { name: string };
  service_id: string;
  service?: { name: string; price: number };
  payer_id?: string;
  payer_type?: string;
  payer?: { name: string };
  value?: number;
  status?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  start_time?: string;
  end_time?: string;
  clinic_id: string;
  prior_production?: {
    valor_bruto?: number;
    valor_liquido?: number;
    data_atendimento?: string;
  };
};

const formatCurrency = (value: number) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const buildManualMovementDescription = (form: {
  type: 'entrada' | 'saida';
  description: string;
  expense_supplier_name?: string;
  expense_provider_name?: string;
  expense_service_description?: string;
}) => {
  const baseDescription = form.description.trim();

  if (form.type !== 'saida') {
    return baseDescription;
  }

  const details = [
    form.expense_supplier_name?.trim() ? `Fornecedor: ${form.expense_supplier_name.trim()}` : null,
    form.expense_provider_name?.trim() ? `Prestador: ${form.expense_provider_name.trim()}` : null,
    form.expense_service_description?.trim() ? `Serviço: ${form.expense_service_description.trim()}` : null,
  ].filter(Boolean);

  return details.length ? `${baseDescription} | ${details.join(' | ')}` : baseDescription;
};

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
  clinicId,
}) => {
  const { user, currentRole } = useAuth();
  const permissions = usePermissions();
  const [canLinkByUserPermission, setCanLinkByUserPermission] = useState(false);
  const canLinkAppointment = ['admin', 'gestor'].includes(String(currentRole || '').toLowerCase())
    || canLinkByUserPermission
    || Boolean(permissions?.canEdit?.('financeiro.caixa.vincular_atendimento'))
    || Boolean(permissions?.canEdit?.('financeiro.caixa'))
    || Boolean(permissions?.canEdit?.('financeiro'));
  const [activeTab, setActiveTab] = useState<'manual' | 'linked'>('manual');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [linkedAppointments, setLinkedAppointments] = useState<LinkableAppointment[]>([]);
  const [linkedAppointmentsLoading, setLinkedAppointmentsLoading] = useState(false);

  const { calculateRepasse } = useRepasseCalculation();

  const [manualForm, setManualForm] = useState({
    type: 'entrada' as const,
    amount: '',
    payment_method: 'DINHEIRO',
    description: '',
    reference_document: '',
    counterparty_name: '',
    expense_supplier_name: '',
    expense_supplier_document: '',
    expense_provider_name: '',
    expense_provider_document: '',
    expense_service_description: '',
    financial_category: 'other',
    status: 'confirmado' as const,
  });

  const [linkedForm, setLinkedForm] = useState({
    appointment_id: '',
    patient_id: '',
    professional_id: '',
    service_id: '',
    payer_type: 'particular' as const,
    payer_id: '',
    surcharge: '',
    discount: '',
    link_reason: '',
    status: 'confirmado' as const,
  });
  const [linkedSearch, setLinkedSearch] = useState({
    date: '',
    patient: '',
    professionalId: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('manual');
      setManualForm({
        type: 'entrada',
        amount: '',
        payment_method: 'DINHEIRO',
        description: '',
        reference_document: '',
        counterparty_name: '',
        expense_supplier_name: '',
        expense_supplier_document: '',
        expense_provider_name: '',
        expense_provider_document: '',
        expense_service_description: '',
        financial_category: 'other',
        status: 'confirmado',
      });
      setLinkedForm({
        appointment_id: '',
        patient_id: '',
        professional_id: '',
        service_id: '',
        payer_type: 'particular',
        payer_id: '',
        surcharge: '',
        discount: '',
        link_reason: '',
        status: 'confirmado',
      });
      setLinkedSearch({ date: '', patient: '', professionalId: '' });
      setValidationError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!canLinkAppointment && activeTab === 'linked') {
      setActiveTab('manual');
      setValidationError(null);
    }
  }, [activeTab, canLinkAppointment]);

  useEffect(() => {
    if (!isOpen || !clinicId) {
      return;
    }

    let active = true;
    setSuppliersLoading(true);
    stockSuppliersApi
      .list(clinicId)
      .then((data: SupplierRecord[]) => {
        if (active) {
          setSuppliers(data || []);
        }
      })
      .catch((error: unknown) => {
        console.error('Erro ao carregar fornecedores/prestadores:', error);
      })
      .finally(() => {
        if (active) {
          setSuppliersLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, clinicId]);

  useEffect(() => {
    const role = String(currentRole || '').toLowerCase();
    if (!isOpen || !user?.id || !clinicId || ['admin', 'gestor'].includes(role)) {
      setCanLinkByUserPermission(false);
      return;
    }

    let active = true;
    supabase
      .from('user_permissions')
      .select('permission_key, access_level')
      .eq('user_id', user.id)
      .eq('clinic_id', clinicId)
      .in('permission_key', [
        '*',
        'financeiro',
        'financeiro.*',
        'financeiro.caixa',
        'financeiro.caixa.*',
        'financeiro.caixa.vincular_atendimento',
      ])
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          console.warn('Não foi possível verificar permissão de vínculo de atendimento:', error);
          setCanLinkByUserPermission(false);
          return;
        }

        const allowed = (data || []).some((permission) => {
          const accessLevel = String(permission.access_level || '').toLowerCase();
          return !accessLevel || ['edit', 'editar', 'write', 'admin'].includes(accessLevel);
        });
        setCanLinkByUserPermission(allowed);
      });

    return () => {
      active = false;
    };
  }, [isOpen, user?.id, clinicId, currentRole]);

  useEffect(() => {
    if (!isOpen || !clinicId || activeTab !== 'linked' || !canLinkAppointment) {
      return;
    }

    let active = true;
    setLinkedAppointmentsLoading(true);
    supabase
      .from('appointments')
      .select(
        `
        id,
        patient_id,
        professional_id,
        service_id,
        payer_id,
        payer_type,
        value,
        status,
        scheduled_date,
        scheduled_time,
        end_time,
        clinic_id,
        patients(name),
        professionals(name),
        services(name, price)
      `,
      )
      .eq('clinic_id', clinicId)
      .not('status', 'in', '(cancelado,canceled,cancelled)')
      .not('patient_id', 'is', null)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          console.error('Erro ao carregar atendimentos para vínculo:', error);
          setLinkedAppointments([]);
          return;
        }

        const appointmentsData = data || [];
        const appointmentIds = appointmentsData.map((appointment: any) => appointment.id).filter(Boolean);

        const applyAppointments = (productions: any[] = []) => {
          const productionByAppointment = new Map(
            productions.map((production) => [production.atendimento_id, production]),
          );

          setLinkedAppointments(appointmentsData.map((appointment: any) => ({
            id: appointment.id,
            patient_id: appointment.patient_id,
            patient: appointment.patients,
            professional_id: appointment.professional_id,
            professional: appointment.professionals,
            service_id: appointment.service_id,
            service: appointment.services
              ? {
                ...appointment.services,
                price: appointment.value !== null && appointment.value !== undefined
                  ? Number(appointment.value)
                  : Number(appointment.services.price || 0),
              }
              : undefined,
            payer_id: appointment.payer_id || undefined,
            payer_type: appointment.payer_type || undefined,
            value: appointment.value !== null && appointment.value !== undefined ? Number(appointment.value) : undefined,
            status: appointment.status,
            scheduled_date: appointment.scheduled_date,
            scheduled_time: appointment.scheduled_time,
            start_time: appointment.scheduled_date && appointment.scheduled_time
              ? `${appointment.scheduled_date}T${appointment.scheduled_time}`
              : appointment.scheduled_date,
            end_time: appointment.end_time,
            clinic_id: appointment.clinic_id,
            prior_production: productionByAppointment.has(appointment.id)
              ? {
                valor_bruto: Number(productionByAppointment.get(appointment.id)?.valor_bruto || 0),
                valor_liquido: Number(productionByAppointment.get(appointment.id)?.valor_liquido || 0),
                data_atendimento: productionByAppointment.get(appointment.id)?.data_atendimento,
              }
              : undefined,
          })));
        };

        if (appointmentIds.length === 0) {
          applyAppointments([]);
          return;
        }

        supabase
          .from('medical_production')
          .select('atendimento_id, valor_bruto, valor_liquido, data_atendimento')
          .eq('clinic_id', clinicId)
          .in('atendimento_id', appointmentIds)
          .then(({ data: productions, error: productionError }) => {
            if (!active) {
              return;
            }
            if (productionError) {
              console.warn('Não foi possível verificar produção médica anterior do atendimento:', productionError);
              applyAppointments([]);
              return;
            }
            applyAppointments(productions || []);
          });
      })
      .finally(() => {
        if (active) {
          setLinkedAppointmentsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, clinicId, activeTab, canLinkAppointment]);

  const getAppointmentDate = (appointment: any) => {
    const value = appointment?.scheduled_date || appointment?.start_time || appointment?.date || appointment?.created_at;
    if (!value) {
      return '';
    }
    const raw = String(value);
    return raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
  };

  const formatAppointmentDate = (appointment: LinkableAppointment) => {
    const iso = getAppointmentDate(appointment);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return 'Data não informada';
    }
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  };

  const parseLinkedDateFilter = (value: string) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value || '')) {
      return '';
    }
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
  };

  const normalizeLinkedDateInput = (value: string) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const getAppointmentPayerName = (appointment: LinkableAppointment) => {
    if (!appointment.payer_id) {
      return 'Particular';
    }
    return appointment.payer?.name || payers.find((payer) => payer.id === appointment.payer_id)?.name || 'Convênio não identificado';
  };

  const describeAppointmentForConfirmation = (appointment: LinkableAppointment) => {
    const service = appointment.service?.name || 'Serviço sem cadastro';
    const value = Number(appointment.service?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    return [
      `Data: ${formatAppointmentDate(appointment)}`,
      `Paciente: ${appointment.patient?.name || 'Paciente não informado'}`,
      `Profissional: ${appointment.professional?.name || 'Profissional não informado'}`,
      `Serviço: ${service}`,
      `Convênio: ${getAppointmentPayerName(appointment)}`,
      `Valor: R$ ${value}`,
    ].join('\n');
  };

  const linkedProfessionalOptions = Array.from(
    new Map(
      linkedAppointments
        .map((appointment) => ({
          id: appointment.professional_id,
          name: appointment.professional?.name || 'Profissional não informado',
        }))
        .filter((professional) => professional.id)
        .map((professional) => [professional.id, professional]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const linkedDateFilterIso = parseLinkedDateFilter(linkedSearch.date);
  const filteredReadyAppointments = linkedAppointments.filter((appointment) => {
    if (linkedDateFilterIso && getAppointmentDate(appointment) !== linkedDateFilterIso) {
      return false;
    }
    if (linkedSearch.professionalId && appointment.professional_id !== linkedSearch.professionalId) {
      return false;
    }
    if (linkedSearch.patient) {
      const search = linkedSearch.patient.toLowerCase().trim();
      const patientName = String(appointment.patient?.name || '').toLowerCase();
      if (!patientName.includes(search)) {
        return false;
      }
    }
    return true;
  });
  const selectedAppointment = linkedAppointments.find((appointment) => appointment.id === linkedForm.appointment_id);
  const selectedService = selectedAppointment?.service || services.find((s) => s.id === linkedForm.service_id);
  const baseServiceAmount = Number(selectedService?.price || 0);
  const surcharge = Math.max(0, parseFloat(linkedForm.surcharge || '0') || 0);
  const discount = Math.max(0, parseFloat(linkedForm.discount || '0') || 0);
  const adjustedGrossAmount = baseServiceAmount + surcharge;
  const netAmount = selectedService ? adjustedGrossAmount - discount : 0;
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const selectedAppointmentDate = selectedAppointment ? getAppointmentDate(selectedAppointment) : '';
  const isPriorRepasseAdjustment = Boolean(
    selectedAppointment?.prior_production
    && selectedAppointmentDate
    && selectedAppointmentDate < currentMonthStart,
  );
  const adjustmentDelta = surcharge - discount;
  const movementAmount = isPriorRepasseAdjustment ? Math.abs(adjustmentDelta) : netAmount;
  const movementType = isPriorRepasseAdjustment && adjustmentDelta < 0 ? 'saida' : 'entrada';
  const originalRepasseData = linkedForm.professional_id && selectedService
    ? calculateRepasse(linkedForm.professional_id, baseServiceAmount, 0)
    : null;
  const repasseData = linkedForm.professional_id
    ? calculateRepasse(linkedForm.professional_id, adjustedGrossAmount, discount)
    : null;
  const repasseDifference = repasseData && originalRepasseData
    ? Math.round((repasseData.commission - originalRepasseData.commission) * 100) / 100
    : 0;

  const validateLinkedForm = (): boolean => {
    setValidationError(null);

    if (!linkedForm.appointment_id) {
      setValidationError('Selecione um atendimento liberado para vincular ao caixa');
      toastService.warning('Validação', 'Atendimento é obrigatório');
      return false;
    }

    if (!selectedService || Number(selectedService.price || 0) <= 0) {
      setValidationError('O atendimento selecionado não possui serviço com valor cadastrado. Corrija o serviço antes de vincular ao caixa.');
      toastService.warning('Validação', 'Serviço sem valor');
      return false;
    }

    if (isPriorRepasseAdjustment && adjustmentDelta === 0) {
      setValidationError('Para atendimento de mês anterior com produção já registrada, informe acréscimo ou desconto do ajuste.');
      toastService.warning('Validação', 'Ajuste sem diferença');
      return false;
    }

    if (discount > adjustedGrossAmount) {
      setValidationError('O desconto não pode ser maior que o valor do serviço somado ao acréscimo.');
      toastService.warning('Validação', 'Desconto maior que o valor');
      return false;
    }

    if (!linkedForm.link_reason.trim()) {
      setValidationError('Informe o motivo da inclusão manual deste atendimento no caixa');
      toastService.warning('Validação', 'Motivo da inclusão é obrigatório');
      return false;
    }

    if (!isPriorRepasseAdjustment && netAmount <= 0) {
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

    if (!manualForm.description.trim()) {
      setValidationError('Informe uma descrição para identificar a receita ou despesa');
      toastService.warning('Validação', 'Descrição é obrigatória');
      return false;
    }

    if (!manualForm.counterparty_name.trim()) {
      setValidationError(
        manualForm.type === 'entrada'
          ? 'Informe o pagador da receita'
          : 'Informe o favorecido da despesa',
      );
      toastService.warning('Validação', manualForm.type === 'entrada' ? 'Pagador é obrigatório' : 'Favorecido é obrigatório');
      return false;
    }

    return true;
  };

  const refreshSuppliers = async () => {
    if (!clinicId) {
      return;
    }
    const data = await stockSuppliersApi.list(clinicId);
    setSuppliers(data || []);
  };

  const ensureCounterpartyCadastro = async (kind: 'supplier' | 'provider') => {
    const name = kind === 'supplier' ? manualForm.expense_supplier_name.trim() : manualForm.expense_provider_name.trim();
    const document = kind === 'supplier' ? manualForm.expense_supplier_document.trim() : manualForm.expense_provider_document.trim();

    if (!name || !document) {
      return null;
    }

    const saved = await stockSuppliersApi.ensureFromDocument(clinicId, {
      name,
      cnpj: document,
      contact_person: kind === 'provider' ? 'Prestador de servico' : null,
    });

    if (saved) {
      setManualForm((prev) => ({
        ...prev,
        ...(kind === 'supplier'
          ? { expense_supplier_name: saved.name || name, expense_supplier_document: saved.tax_id || saved.cnpj || document }
          : { expense_provider_name: saved.name || name, expense_provider_document: saved.tax_id || saved.cnpj || document }),
      }));
      await refreshSuppliers();
    }

    return saved;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateManualForm()) return;

    setLoading(true);
    try {
      toastService.info('Processando', 'Registrando movimento manual...');

      if (manualForm.type === 'saida') {
        await ensureCounterpartyCadastro('supplier');
        await ensureCounterpartyCadastro('provider');
      }

      await onSubmit({
        type: manualForm.type,
        amount: parseFloat(manualForm.amount),
        payment_method: manualForm.payment_method,
        description: buildManualMovementDescription(manualForm),
        reference_document: manualForm.reference_document.trim() || undefined,
        counterparty_name: manualForm.counterparty_name.trim(),
        expense_supplier_name: manualForm.expense_supplier_name.trim() || undefined,
        expense_provider_name: manualForm.expense_provider_name.trim() || undefined,
        expense_service_description: manualForm.expense_service_description.trim() || undefined,
        financial_category: manualForm.financial_category,
        status: manualForm.status,
        origin: 'manual',
      });

      toastService.success(
        'Movimento manual registrado',
        `R$ ${Number.parseFloat(manualForm.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      );

      setManualForm({
        type: 'entrada',
        amount: '',
        payment_method: 'DINHEIRO',
        description: '',
        reference_document: '',
        counterparty_name: '',
        expense_supplier_name: '',
        expense_supplier_document: '',
        expense_provider_name: '',
        expense_provider_document: '',
        expense_service_description: '',
        financial_category: 'other',
        status: 'confirmado',
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
        type: movementType,
        amount: movementAmount,
        patient_id: linkedForm.patient_id,
        appointment_id: linkedForm.appointment_id,
        professional_id: linkedForm.professional_id || undefined,
        service_id: linkedForm.service_id,
        payer_type: linkedForm.payer_type,
        payer_id: linkedForm.payer_type === 'convenio' ? linkedForm.payer_id : undefined,
        status: linkedForm.status,
        payment_method: linkedForm.payer_type === 'convenio' ? 'CONVENIO' : 'DINHEIRO',
        description: `${isPriorRepasseAdjustment ? 'Ajuste de atendimento com repasse anterior' : 'Inclusão manual de atendimento no caixa'}. Motivo: ${linkedForm.link_reason.trim()}${surcharge > 0 ? ` | Acréscimo: R$ ${formatCurrency(surcharge)}` : ''}${discount > 0 ? ` | Desconto: R$ ${formatCurrency(discount)}` : ''}`,
        origin: 'agenda',
        discount: discount > 0 ? discount : undefined,
        surcharge: surcharge > 0 ? surcharge : undefined,
        prior_repasse_adjustment: isPriorRepasseAdjustment,
        adjustment_delta: isPriorRepasseAdjustment ? adjustmentDelta : undefined,
        appointment_scheduled_date: selectedAppointmentDate || undefined,
      });

      const patientName = patients.find((p) => p.id === linkedForm.patient_id)?.name || 'Paciente';

      toastService.success(
        'Movimento vinculado com sucesso',
        `${patientName} - R$ ${Number(netAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      );

      setLinkedForm({
        appointment_id: '',
        patient_id: '',
        professional_id: '',
        service_id: '',
        payer_type: 'particular',
        payer_id: '',
        surcharge: '',
        discount: '',
        link_reason: '',
        status: 'confirmado',
      });
      setLinkedSearch({ date: '', patient: '', professionalId: '' });

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

  const hasActiveAppointment = Boolean(selectedAppointment);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {activeTab === 'linked' ? 'Vincular Atendimento ao Caixa' : 'Novo Movimento Manual de Caixa'}
          </h2>
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
        {canLinkAppointment && (
          <div className="border-b border-slate-100 flex flex-shrink-0">
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
          </div>
        )}

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Warning for manual tab */}
          {activeTab === 'manual' && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-blue-900 text-sm">Movimentação manual</p>
                <p className="text-blue-700 text-xs mt-1">
                  Use para receitas avulsas e despesas do caixa. Para atendimento de paciente,
                  prefira vincular o atendimento.
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
          {canLinkAppointment && activeTab === 'linked' && (
            <form onSubmit={handleLinkedSubmit} className="space-y-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Use esta opção apenas para exceções autorizadas: atendimento que não entrou automaticamente no caixa, correção administrativa ou reconciliação.
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data do atendimento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="dd/mm/aaaa"
                    value={linkedSearch.date}
                    onChange={(event) => setLinkedSearch((prev) => ({ ...prev, date: normalizeLinkedDateInput(event.target.value) }))}
                    disabled={loading}
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  />
                  <span className="mt-1 block text-[10px] text-slate-400">dd/mm/aaaa</span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Paciente</label>
                  <input
                    type="text"
                    value={linkedSearch.patient}
                    onChange={(event) => setLinkedSearch((prev) => ({ ...prev, patient: event.target.value }))}
                    disabled={loading}
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                    placeholder="Buscar pelo nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Profissional</label>
                  <select
                    value={linkedSearch.professionalId}
                    onChange={(event) => setLinkedSearch((prev) => ({ ...prev, professionalId: event.target.value }))}
                    disabled={loading}
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    <option value="">Todos</option>
                    {linkedProfessionalOptions.map((professional) => (
                      <option key={professional.id} value={professional.id}>{professional.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ⚡ Atendimento encontrado <span className="text-red-600">*</span>
                </label>
                <select
                  value={linkedForm.appointment_id}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setLinkedForm({
                        ...linkedForm,
                        appointment_id: '',
                        patient_id: '',
                        professional_id: '',
                        service_id: '',
                        payer_type: 'particular',
                        payer_id: '',
                      });
                      setValidationError(null);
                      return;
                    }

                    const appointment = linkedAppointments.find((item) => item.id === e.target.value);
                    if (!appointment) {
                      return;
                    }

                    const confirmed = window.confirm(
                      `Confirma o vínculo deste atendimento ao caixa?\n\n${describeAppointmentForConfirmation(appointment)}\n\nEsta ação registrará o movimento no caixa e a produção médica para repasse.`,
                    );
                    if (!confirmed) {
                      return;
                    }

                    const hasPayer = Boolean(appointment.payer_id);
                    setLinkedForm({
                      ...linkedForm,
                      appointment_id: appointment?.id || '',
                      patient_id: appointment?.patient_id || '',
                      professional_id: appointment?.professional_id || '',
                      service_id: appointment?.service_id || '',
                      payer_type: hasPayer ? 'convenio' : 'particular',
                      payer_id: appointment?.payer_id || '',
                    });
                    setValidationError(null);
                  }}
                  disabled={loading || linkedAppointmentsLoading}
                  aria-label="Atendimento encontrado"
                  className={`w-full px-3 py-2.5 border-2 rounded-lg focus:outline-none transition ${
                    hasActiveAppointment
                      ? 'border-green-200 focus:border-green-500 bg-green-50/30'
                      : 'border-slate-200 focus:border-blue-500'
                  } disabled:opacity-50`}
                >
                  <option value="">{linkedAppointmentsLoading ? 'Carregando atendimentos...' : 'Selecione o atendimento correto'}</option>
                  {filteredReadyAppointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {formatAppointmentDate(appointment)} - {appointment.patient?.name || 'Paciente'} - {appointment.service?.name || 'Serviço sem cadastro'} - {getAppointmentPayerName(appointment)} - {appointment.professional?.name || 'Profissional'} - R$ {Number(appointment.service?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                {!linkedAppointmentsLoading && filteredReadyAppointments.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">Nenhum atendimento encontrado para os filtros informados.</p>
                )}
                {hasActiveAppointment && (
                  <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                    ✓ Atendimento selecionado: {formatAppointmentDate(selectedAppointment as LinkableAppointment)} - {selectedAppointment?.patient?.name || 'Paciente'} - {getAppointmentPayerName(selectedAppointment as LinkableAppointment)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Motivo da inclusão <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={linkedForm.link_reason}
                  onChange={(event) => {
                    setLinkedForm({ ...linkedForm, link_reason: event.target.value });
                    setValidationError(null);
                  }}
                  disabled={loading}
                  rows={3}
                  className="w-full px-3 py-2.5 border-2 border-amber-200 bg-amber-50/40 rounded-lg focus:border-amber-500 focus:outline-none transition disabled:opacity-50"
                  placeholder="Ex: atendimento não entrou automaticamente no caixa após finalização na recepção; inclusão autorizada pelo gestor."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🩺 Profissional
                  </label>
                  <div className="w-full px-3 py-2.5 border-2 border-slate-100 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {selectedAppointment?.professional?.name || 'Selecione um atendimento'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🏥 Serviço <span className="text-red-600">*</span>
                  </label>
                  <div className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm ${selectedService && Number(selectedService.price || 0) > 0 ? 'border-slate-100 bg-slate-50 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    {selectedService
                      ? `${selectedService.name} - R$ ${Number(selectedService.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'Selecione um atendimento'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    💳 Tipo de Pagamento
                  </label>
                  <div className="w-full px-3 py-2.5 border-2 border-slate-100 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {selectedAppointment ? (linkedForm.payer_type === 'convenio' ? 'Convênio' : 'Particular') : 'Selecione um atendimento'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🏢 Convênio
                  </label>
                  <div className="w-full px-3 py-2.5 border-2 border-slate-100 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {selectedAppointment ? getAppointmentPayerName(selectedAppointment) : 'Selecione um atendimento'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    ➕ Acréscimo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={linkedForm.surcharge}
                    onChange={(e) => setLinkedForm({ ...linkedForm, surcharge: e.target.value })}
                    disabled={loading}
                    aria-label="Acréscimo"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🏷️ Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={adjustedGrossAmount || 0}
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
                        status: e.target.value as 'confirmado' | 'pendente' | 'estornado',
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
                        R$ {formatCurrency(baseServiceAmount)}
                      </span>
                    </div>

                    {surcharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Acréscimo:</span>
                        <span className="font-semibold text-green-700">
                          +R$ {formatCurrency(surcharge)}
                        </span>
                      </div>
                    )}

                    {discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Desconto:</span>
                        <span className="font-semibold text-red-600">
                          -R$ {formatCurrency(discount)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-blue-200 pt-2 flex justify-between">
                      <span className="font-semibold">{isPriorRepasseAdjustment ? 'Valor do Ajuste no Caixa:' : 'Valor Caixa:'}</span>
                      <span className="font-bold text-lg text-green-600">
                        R$ {formatCurrency(movementAmount)}
                      </span>
                    </div>

                    {isPriorRepasseAdjustment && (
                      <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        Atendimento de mês anterior com produção já registrada. O próximo repasse receberá apenas a diferença do ajuste.
                      </div>
                    )}

                    {repasseData && (
                      <div className="mt-3 pt-3 border-t border-blue-200 bg-white/50 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 flex items-center gap-2">
                            <TrendingUp size={16} className="text-orange-600" />
                            {isPriorRepasseAdjustment ? 'Diferença no próximo repasse:' : 'Repasse:'}
                          </span>
                          <span className={`font-bold ${isPriorRepasseAdjustment && repasseDifference < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {isPriorRepasseAdjustment && repasseDifference < 0 ? '-R$ ' : 'R$ '}
                            {formatCurrency(isPriorRepasseAdjustment ? Math.abs(repasseDifference) : repasseData.commission)}
                          </span>
                        </div>
                        {isPriorRepasseAdjustment && originalRepasseData ? (
                          <p className="text-xs text-slate-500 mt-1">
                            Original: R$ {formatCurrency(originalRepasseData.commission)} | Ajustado: R$ {formatCurrency(repasseData.commission)} | {repasseData.description}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">{repasseData.description}</p>
                        )}
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Natureza</label>
                  <select
                    value={manualForm.type}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        type: e.target.value as 'entrada' | 'saida',
                        expense_supplier_name: e.target.value === 'saida' ? manualForm.expense_supplier_name : '',
                        expense_supplier_document: e.target.value === 'saida' ? manualForm.expense_supplier_document : '',
                        expense_provider_name: e.target.value === 'saida' ? manualForm.expense_provider_name : '',
                        expense_provider_document: e.target.value === 'saida' ? manualForm.expense_provider_document : '',
                        expense_service_description: e.target.value === 'saida' ? manualForm.expense_service_description : '',
                      })
                    }
                    disabled={loading}
                    aria-label="Tipo de movimento"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    <option value="entrada">Receita / Entrada</option>
                    <option value="saida">Despesa / Saída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {manualForm.type === 'entrada' ? 'Pagador' : 'Favorecido'} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.counterparty_name}
                    onChange={(e) => {
                      setManualForm({ ...manualForm, counterparty_name: e.target.value });
                      setValidationError(null);
                    }}
                    disabled={loading}
                    aria-label={manualForm.type === 'entrada' ? 'Pagador da receita' : 'Favorecido da despesa'}
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                    placeholder={manualForm.type === 'entrada' ? 'Nome de quem pagou' : 'Nome de quem recebeu'}
                  />
                </div>
              </div>

              {manualForm.type === 'saida' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-rose-100 bg-rose-50/40 p-4">
                  <RegisteredCounterpartyField
                    label="Fornecedor"
                    value={manualForm.expense_supplier_name}
                    documentValue={manualForm.expense_supplier_document}
                    suppliers={suppliers}
                    loading={suppliersLoading}
                    disabled={loading}
                    onNameChange={(value) => setManualForm({ ...manualForm, expense_supplier_name: value })}
                    onDocumentChange={(value) => setManualForm({ ...manualForm, expense_supplier_document: value })}
                    onCreate={() => ensureCounterpartyCadastro('supplier').catch((error: unknown) => {
                      const errorMsg = error instanceof Error ? error.message : 'Erro ao cadastrar fornecedor.';
                      setValidationError(errorMsg);
                      toastService.error('Erro ao cadastrar', errorMsg);
                    })}
                  />

                  <RegisteredCounterpartyField
                    label="Prestador"
                    value={manualForm.expense_provider_name}
                    documentValue={manualForm.expense_provider_document}
                    suppliers={suppliers}
                    loading={suppliersLoading}
                    disabled={loading}
                    onNameChange={(value) => setManualForm({ ...manualForm, expense_provider_name: value })}
                    onDocumentChange={(value) => setManualForm({ ...manualForm, expense_provider_document: value })}
                    onCreate={() => ensureCounterpartyCadastro('provider').catch((error: unknown) => {
                      const errorMsg = error instanceof Error ? error.message : 'Erro ao cadastrar prestador.';
                      setValidationError(errorMsg);
                      toastService.error('Erro ao cadastrar', errorMsg);
                    })}
                  />

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Serviço / Despesa
                    </label>
                    <input
                      type="text"
                      value={manualForm.expense_service_description}
                      onChange={(e) => setManualForm({ ...manualForm, expense_service_description: e.target.value })}
                      disabled={loading}
                      aria-label="Serviço ou despesa realizada"
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50 bg-white"
                      placeholder="Ex: entrega, manutenção..."
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Categoria financeira
                  </label>
                  <select
                    value={manualForm.financial_category}
                    onChange={(e) => setManualForm({ ...manualForm, financial_category: e.target.value })}
                    disabled={loading}
                    aria-label="Categoria financeira"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  >
                    {MANUAL_FINANCIAL_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    Documento / Referência
                  </label>
                  <input
                    type="text"
                    value={manualForm.reference_document}
                    onChange={(e) => setManualForm({ ...manualForm, reference_document: e.target.value })}
                    disabled={loading}
                    aria-label="Documento ou referência do movimento"
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                    placeholder="Recibo, NF, autorização..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Descrição <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={manualForm.description}
                  onChange={(e) => {
                    setManualForm({ ...manualForm, description: e.target.value });
                    setValidationError(null);
                  }}
                  disabled={loading}
                  aria-label="Descrição do movimento"
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:opacity-50"
                  placeholder="Ex: Compra de material, reembolso, recebimento avulso..."
                  rows={2}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Impacto no caixa</span>
                  <span className={`font-bold ${manualForm.type === 'entrada' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {manualForm.type === 'entrada' ? '+' : '-'} R${' '}
                    {Number(manualForm.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <select
                  value={manualForm.status}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      status: e.target.value as 'confirmado' | 'pendente' | 'estornado',
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
                : !manualForm.amount || !manualForm.description.trim() || !manualForm.counterparty_name.trim())
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
                  <>📝 Registrar Movimento</>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
