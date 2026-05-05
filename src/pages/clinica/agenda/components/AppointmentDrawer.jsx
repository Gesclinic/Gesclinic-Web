import { useState, useEffect } from 'react';
import { X, CheckCircle, Phone, Clock, MapPin, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { listPayers } from '@/lib/payersApi';
import { getServicePrice } from '@/lib/getServicePrice';
import {
  STATUS_CONFIG,
  APPOINTMENT_STATUSES,
  migrateStatus,
} from '@/lib/appointmentStatusConstants';

/**
 * AppointmentDrawer - Drawer lateral para ações de atendimento
 *
 * Exibe detalhes do agendamento e botões de ação rápida:
 * - Check-in
 * - Confirmar presença
 * - Iniciar atendimento
 * - Remarcar
 * - Cancelar
 * - Faturar
 */
export default function AppointmentDrawer({
  appointment,
  isOpen,
  onClose,
  onCheckIn,
  onConfirm,
  onStartAppointment,
  onReschedule,
  onCancel,
  onBill,
  onEdit,
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinCPF, setCheckinCPF] = useState('');
  const [checkinPhone, setCheckinPhone] = useState('');
  const [checkinProcessing, setCheckinProcessing] = useState(false);
  const [editingDataOpen, setEditingDataOpen] = useState(false);
  const [editCPF, setEditCPF] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // 🆕 Estados para dados financeiros no check-in
  const [checkinPlan, setCheckinPlan] = useState('');
  const [checkinAuthorization, setCheckinAuthorization] = useState('');
  const [checkinValue, setCheckinValue] = useState('');
  const [checkinTab, setCheckinTab] = useState('essencial'); // 'essencial', 'cadastrais' ou 'financeiro'

  // 🆕 Estados para edição de cadastrais no check-in
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // 🆕 Campos financeiros adicionais
  const [checkinPayerType, setCheckinPayerType] = useState('CONVENIO'); // CONVENIO, PARTICULAR, CORTESIA
  const [checkinPayerId, setCheckinPayerId] = useState(''); // 🆕 ID do convênio
  const [checkinPlanId, setCheckinPlanId] = useState(''); // 🆕 ID do plano
  const [checkinCardNumber, setCheckinCardNumber] = useState('');
  const [checkinCardVerified, setCheckinCardVerified] = useState(false);
  const [checkinAuthExpiry, setCheckinAuthExpiry] = useState('');
  const [checkinGuideNumber, setCheckinGuideNumber] = useState('');
  const [checkinPaymentMethod, setCheckinPaymentMethod] = useState(''); // DINHEIRO, CARTAO, PIX, CHEQUE, BOLETO
  const [checkinCopayment, setCheckinCopayment] = useState('');
  const [checkinDiscount, setCheckinDiscount] = useState('');

  // 🆕 Estados para carregar payers/plans dinamicamente
  const [payers, setPayers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loadingPayers, setLoadingPayers] = useState(false);

  // Sincronizar dados do appointment quando modal abre
  useEffect(() => {
    if (checkinOpen && appointment) {
      const cpf = appointment?.patient_cpf || appointment?.cpf || '';
      const phone =
        appointment?.patient_phone || appointment?.patient_mobile || appointment?.telefone || '';
      // 🔧 Separar payer_name e plan_name corretamente
      const payer =
        appointment?.payer_name ||
        appointment?.health_plan ||
        appointment?.convênio ||
        'Particular';
      // Se plan_name não existe (coluna plan_id ainda não criada), usar payer_name como fallback
      const plan = appointment?.plan_name || appointment?.payer_name || 'Particular';
      const authorization = appointment?.authorization || appointment?.autorização || '';
      const value = appointment?.value || appointment?.valor || '';
      const payerType = appointment?.payer_type || 'CONVENIO';
      const cardNumber = appointment?.card_number || appointment?.carteirinha || '';
      const authExpiry =
        appointment?.authorization_expiry || appointment?.autorização_vencimento || '';
      const guideNumber = appointment?.guide_number || appointment?.guia || '';
      const paymentMethod = appointment?.payment_method || '';
      const copayment = appointment?.copayment || appointment?.coparticipação || '';
      const discount = appointment?.discount || appointment?.desconto || '';
      const payerId = appointment?.payer_id || ''; // 🆕
      const planId = appointment?.plan_id || ''; // 🆕

      console.log('[AppointmentDrawer] Sincronizando dados financeios do check-in:', {
        cpf,
        phone,
        payer,
        plan,
        payerType,
        authorization,
        value,
        payerId,
        planId,
      });

      setCheckinCPF(cpf);
      setCheckinPhone(phone);
      setCheckinPlan(plan);
      setCheckinPayerId(payerId); // 🆕
      setCheckinPlanId(planId); // 🆕
      setCheckinAuthorization(authorization);
      setCheckinValue(value);
      setCheckinPayerType(payerType);
      setCheckinCardNumber(cardNumber);
      setCheckinCardVerified(!!cardNumber);
      setCheckinAuthExpiry(authExpiry);
      setCheckinGuideNumber(guideNumber);
      setCheckinPaymentMethod(paymentMethod);
      setCheckinCopayment(copayment);
      setCheckinDiscount(discount);
      setCheckinTab('essencial');
    }
  }, [checkinOpen, appointment]);

  // 🆕 Carregar convênios quando check-in abre
  useEffect(() => {
    if (checkinOpen && appointment) {
      const clinicId = appointment?.clinic_id;
      if (clinicId) {
        (async () => {
          setLoadingPayers(true);
          try {
            const payersData = await listPayers(clinicId);
            setPayers(payersData || []);
          } catch (err) {
            console.error('❌ Erro ao carregar convênios:', err);
            setPayers([]);
          } finally {
            setLoadingPayers(false);
          }
        })();
      }
    }
  }, [checkinOpen, appointment]);

  // 🆕 Carregar planos quando convênio for selecionado
  useEffect(() => {
    if (checkinPayerId && checkinPayerId !== 'particular') {
      (async () => {
        try {
          const { data } = await supabase
            .from('plans')
            .select('id, name')
            .eq('payer_id', checkinPayerId);
          setPlans(data || []);

          // Auto-selecionar se houver apenas um plano
          if (data && data.length === 1) {
            console.log('✅ [CheckIn] Auto-selecionando único plano:', data[0].name);
            setCheckinPlanId(String(data[0].id));
            setCheckinPlan(data[0].name);
          }
        } catch (err) {
          console.error('❌ Erro ao carregar planos:', err);
          setPlans([]);
        }
      })();
    } else {
      setPlans([]);
      setCheckinPlanId('');
    }
  }, [checkinPayerId]);

  // Sincronizar dados para edição quando modal de edição abre
  useEffect(() => {
    if (editingDataOpen && appointment) {
      const cpf = appointment?.patient_cpf || appointment?.cpf || '';
      const phone =
        appointment?.patient_phone || appointment?.patient_mobile || appointment?.telefone || '';

      setEditCPF(cpf);
      setEditPhone(phone);
    }
  }, [editingDataOpen, appointment]);

  if (!isOpen || !appointment) {
    return null;
  }

  const {
    id,
    paciente,
    patient_name,
    horário,
    serviço,
    service_name,
    profissional,
    professional_name,
    sala,
    room,
    status,
    duração,
    duration,
    convênio,
    health_plan,
    notas,
    notes,
    idade,
    age,
    scheduled_date,
    data,
    date,
  } = appointment;

  // 🆕 Debug: Mostrar estrutura do appointment
  console.log('[AppointmentDrawer] Estrutura do appointment:', {
    id: appointment?.id,
    prontuario_numero: appointment?.prontuario_numero,
    patient_prontuario: appointment?.patient?.prontuario_numero,
    record_number: appointment?.record_number,
    patient_record: appointment?.patient_record,
    plan_name: appointment?.plan_name,
    plan: appointment?.plan,
    health_plan_name: appointment?.health_plan_name,
    convênio_plano: appointment?.convênio_plano,
    full_appointment: JSON.stringify(appointment).substring(0, 500),
  });

  const name = paciente || patient_name || 'Sem nome';
  const service = serviço || service_name || 'Sem serviço';
  const prof = profissional || professional_name || 'Sem profissional';
  const roomNum = sala || room || 'Sem sala';
  const duration_min = duração || duration || 30;
  const plan = convênio || health_plan || 'Particular';
  const patient_age = idade || age;
  const appointmentTime = horário || appointment.horario || appointment.time || '—';
  const appointmentDate =
    scheduled_date || data || date || appointment.scheduled_date || appointment.data || '—';
  const noteText = notas || notes || '';

  // Mapear status antigos para novos se necessário (backward compat)
  const normalizedStatus = migrateStatus(status);

  const statusInfo =
    STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[APPOINTMENT_STATUSES.SCHEDULED];

  // Verificar dados essenciais completos
  const getEssentialDataStatus = () => {
    // Usar valores locais (checkinCPF/checkinPhone) se disponíveis, caso contrário usar do appointment
    const cpf = checkinCPF || appointment?.patient_cpf;
    const phone = checkinPhone || appointment?.patient_phone || appointment?.patient_mobile;

    const essentialFields = {
      name: appointment?.patient_name,
      cpf: cpf,
      phone: phone,
    };

    const missingFields = Object.entries(essentialFields).reduce((acc, [key, value]) => {
      if (!value) {
        acc.push(key);
      }
      return acc;
    }, []);

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      essentialFields,
    };
  };

  const essentialDataStatus = getEssentialDataStatus();

  // Salvar dados editados e voltar para o check-in
  const handleSaveEditedData = async () => {
    try {
      // Validar CPF
      if (!editCPF || editCPF.replace(/\D/g, '').length !== 11) {
        alert('❌ CPF inválido! Use 11 dígitos.');
        return;
      }

      if (!editPhone) {
        alert('❌ Telefone é obrigatório!');
        return;
      }

      console.log('[handleSaveEditedData] Salvando dados:', {
        cpf: editCPF,
        phone: editPhone,
      });

      // Atualizar os dados do check-in com os valores editados
      setCheckinCPF(editCPF);
      setCheckinPhone(editPhone);

      // Fechar modal de edição
      setEditingDataOpen(false);

      // Em produção, aqui você faria uma chamada API para salvar os dados:
      // await updatePatient(appointment?.patient_id, { cpf: editCPF, phone: editPhone });

      alert('✅ Dados atualizados! Voltando ao check-in...');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      alert('❌ Erro ao salvar dados');
    }
  };

  // Handle Check-in Rápido
  const handleQuickCheckIn = async () => {
    setCheckinProcessing(true);
    try {
      // Verificar dados essenciais
      if (!essentialDataStatus.isComplete) {
        const missingFieldsText = {
          name: 'Nome',
          cpf: 'CPF',
          phone: 'Telefone',
        };

        const missingNames = essentialDataStatus.missingFields
          .map((f) => missingFieldsText[f])
          .join(', ');

        alert(
          `⚠️ Dados Incompletos!\n\nFaltam os seguintes campos: ${missingNames}\n\nAbrindo página para atualização...`,
        );

        const patientId = appointment?.patient_id;
        if (patientId) {
          window.open(`/clinica/pacientes/${patientId}`, '_blank');
          setCheckinOpen(false);
          onClose();
        } else {
          alert('❌ Erro: ID do paciente não encontrado');
        }
        return;
      }

      // Validar CPF
      if (checkinCPF && checkinCPF.replace(/\D/g, '').length !== 11) {
        alert('❌ CPF inválido! Use 11 dígitos.');
        setCheckinProcessing(false);
        return;
      }

      // ✅ NOVO: Validar dados financeiros
      if (!checkinPlan || checkinPlan === '') {
        alert('⚠️ Convênio não informado! Por favor, defina o plano de saúde antes do check-in.');
        setCheckinTab('financeiro');
        setCheckinProcessing(false);
        return;
      }

      // Se tiver valor, validar formato
      if (checkinValue && isNaN(parseFloat(checkinValue))) {
        alert('❌ Valor inválido! Use apenas números e pontos.');
        setCheckinProcessing(false);
        return;
      }

      console.log('[handleQuickCheckIn] ✅ Check-in com dados completos:', {
        appointmentId: appointment?.id,
        patient: essentialDataStatus.essentialFields,
        financial: {
          plan: checkinPlan,
          payerType: checkinPayerType,
          authorization: checkinAuthorization,
          authExpiry: checkinAuthExpiry,
          cardNumber: checkinCardNumber,
          cardVerified: checkinCardVerified,
          guideNumber: checkinGuideNumber,
          paymentMethod: checkinPaymentMethod,
          value: checkinValue,
          copayment: checkinCopayment,
          discount: checkinDiscount,
        },
      });

      // Simular processamento
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Preparar dados financeiros
      const financialData = {
        payer_type: checkinPayerType,
        health_plan: checkinPlan,
        authorization_number: checkinAuthorization,
        authorization_expiry: checkinAuthExpiry,
        card_number: checkinCardNumber,
        card_verified: checkinCardVerified,
        guide_number: checkinGuideNumber,
        payment_method: checkinPaymentMethod,
        value: checkinValue,
        copayment: checkinCopayment,
        discount: checkinDiscount,
        // 🆕 Adicionar dados de cadastrais
        patient_name: editName || name,
        patient_email: editEmail,
        patient_cpf: checkinCPF,
        patient_phone: checkinPhone,
      };

      console.log('[handleQuickCheckIn] Chamando onCheckIn com dados financeiros e cadastrais...');
      onCheckIn(financialData);
      console.log('[handleQuickCheckIn] onCheckIn foi chamado!');

      // Fechar modal e drawer
      setCheckinOpen(false);
      onClose();
    } catch (error) {
      console.error('Erro no check-in:', error);
      alert('❌ Erro ao processar check-in');
    } finally {
      setCheckinProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* 🆕 Modal Centralizado */}
      <div className="relative w-[90vw] max-w-2xl max-h-[90vh] bg-white shadow-2xl rounded-lg overflow-hidden z-[10001] flex flex-col">
        {/* 🆕 Header com Gradiente Moderno */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <h2 className="text-lg font-bold">Detalhes do Atendimento</h2>
              <p className="text-xs text-blue-100">Informações completas do agendamento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-lg transition-colors">
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content com overflow-y-auto */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-custom space-y-1.5">
          {/* Status Badge */}
          <div
            className={`${statusInfo.color} ${statusInfo.textColor} px-2 py-1.5 rounded-lg font-semibold text-sm text-center flex items-center justify-center gap-1 mb-2`}
          >
            <span>{statusInfo.icon}</span>
            <span>{statusInfo.label}</span>
          </div>

          {/* 🆕 Row 1: Paciente, Prontuário, Telefone */}
          <div className="grid grid-cols-1 gap-1.5">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <div className="flex items-center gap-1.5 mb-0.5">
                <User size={14} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-600 uppercase">Paciente</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{name}</p>
              {patient_age && <p className="text-xs text-gray-600">{patient_age} anos</p>}
            </div>

            {/* Prontuário + Telefone em 2 colunas */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                  Prontuário
                </span>
                <p className="text-xs text-gray-900 font-medium">
                  {appointment?.patient_prontuario ||
                    appointment?.patients?.prontuario_numero ||
                    appointment?.patient?.prontuario_numero ||
                    appointment?.prontuario_numero ||
                    appointment?.record_number ||
                    appointment?.patient_record ||
                    appointment?.prontuario ||
                    '—'}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                  Telefone
                </span>
                <p className="text-xs text-gray-900 font-medium break-all">
                  {checkinPhone ||
                    appointment?.patient_phone ||
                    appointment?.patient_mobile ||
                    appointment?.phone ||
                    appointment?.telefone ||
                    '—'}
                </p>
              </div>
            </div>
          </div>

          {/* 🆕 Row 2: Data, Horário, Duração */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <span className="text-xs font-semibold text-blue-600 uppercase block mb-0.5">
                Data
              </span>
              <p className="text-xs font-semibold text-gray-900">
                {appointmentDate && appointmentDate !== '—'
                  ? (() => {
                      const [year, month, day] = appointmentDate.split('-').map(Number);
                      const safeDate = new Date(year, month - 1, day);
                      return safeDate.toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      });
                    })()
                  : '—'}
              </p>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                Horário
              </span>
              <p className="text-xs font-semibold text-gray-900">{appointmentTime}</p>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                Duração
              </span>
              <p className="text-xs font-semibold text-gray-900">{duration_min} min</p>
            </div>
          </div>

          {/* 🆕 Row 3: Serviço, Profissional, Sala */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                Serviço
              </span>
              <p className="text-xs font-semibold text-gray-900">{service}</p>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                Profissional
              </span>
              <p className="text-xs font-semibold text-gray-900">{prof}</p>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                Sala
              </span>
              <p className="text-xs font-semibold text-gray-900">{roomNum}</p>
            </div>
          </div>

          {/* 🆕 Row 4: Convênio, Plano, Código, Valor */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <span className="text-xs font-semibold text-blue-600 uppercase block mb-0.5">
                Convênio
              </span>
              <p className="text-xs font-semibold text-blue-900">
                {appointment?.payer_name || appointment?.payers?.name || 'Particular'}
              </p>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                Plano
              </span>
              <p className="text-xs font-medium text-gray-900">
                {checkinPlan || appointment?.plan_name || 'Particular'}
              </p>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-0.5">
                Código
              </span>
              <p className="text-xs font-medium text-gray-900 font-mono">
                {appointment?.plan_code || '—'}
              </p>
            </div>

            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
              <span className="text-xs font-semibold text-green-600 uppercase block mb-0.5">
                Valor (R$)
              </span>
              <p className="text-xs font-semibold text-green-900">
                {checkinValue || appointment?.value
                  ? `R$ ${parseFloat(checkinValue || appointment?.value).toFixed(2)}`
                  : '—'}
              </p>
            </div>
          </div>

          {/* 🆕 Observações */}
          {noteText && (
            <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
              <span className="text-xs font-semibold text-yellow-600 uppercase block mb-0.5">
                Observações
              </span>
              <p className="text-xs text-yellow-900">{noteText}</p>
            </div>
          )}
        </div>

        {/* 🆕 Quick Actions Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <h3 className="text-xs font-bold text-gray-600 uppercase mb-2">Ações Rápidas</h3>

          <div className="grid grid-cols-2 gap-1.5">
            {status?.toLowerCase() === 'agendado' && (
              <>
                <button
                  onClick={() => {
                    onConfirm(id);
                    onClose();
                  }}
                  className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
                >
                  📞 Confirmar Presença
                </button>
              </>
            )}

            {(normalizedStatus === 'agendado' ||
              normalizedStatus === 'scheduled' ||
              normalizedStatus === 'confirmado' ||
              normalizedStatus === 'confirmed' ||
              normalizedStatus === 'at_reception' ||
              status?.toLowerCase?.()?.includes('agendado') ||
              status?.toLowerCase?.()?.includes('scheduled')) && (
              <button
                onClick={() => setCheckinOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
              >
                {normalizedStatus === 'at_reception' ? '📝 Check-in' : '📍 Check-in'}
              </button>
            )}

            {(normalizedStatus === 'at_reception' ||
              normalizedStatus === 'check-in' ||
              normalizedStatus === 'confirmado' ||
              status?.toLowerCase?.()?.includes('check-in') ||
              status?.toLowerCase?.()?.includes('at_reception')) && (
              <button
                onClick={() => {
                  onStartAppointment(id);
                  onClose();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
              >
                🎯 Iniciar
              </button>
            )}

            {status?.toLowerCase() === 'finalizado' && (
              <button
                onClick={() => {
                  onBill(id);
                  onClose();
                }}
                className="col-span-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
              >
                💳 Faturar
              </button>
            )}

            <button
              onClick={() => {
                onEdit(id);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
            >
              ✏️ Editar
            </button>

            <button
              onClick={() => {
                onReschedule(id);
              }}
              className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
            >
              📅 Remarcar
            </button>

            <button
              onClick={() => {
                onCancel(id);
                onClose();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
            >
              ❌ Cancelar
            </button>
          </div>
        </div>

        {/* Modal de Check-in Rápido */}
        {checkinOpen && (
          <div className="app-modal-overlay" style={{ zIndex: 10002 }}>
            <div className="app-modal-shell app-modal-shell--compact rounded-lg bg-white p-6 shadow-xl overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>📍 Check-in Rápido</span>
                </h3>
                <button
                  onClick={() => setCheckinOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 🆕 Abas */}
              <div className="flex gap-2 mb-4 border-b overflow-x-auto pb-2">
                <button
                  onClick={() => setCheckinTab('essencial')}
                  className={`px-3 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    checkinTab === 'essencial'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  👤 Dados Essenciais
                </button>
                <button
                  onClick={() => setCheckinTab('cadastrais')}
                  className={`px-3 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    checkinTab === 'cadastrais'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📋 Cadastrais
                </button>
                <button
                  onClick={() => setCheckinTab('financeiro')}
                  className={`px-3 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    checkinTab === 'financeiro'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  💳 Financeiro
                </button>
              </div>

              {/* 🆕 Aba: Dados Essenciais */}
              {checkinTab === 'essencial' && (
                <div className="space-y-4">
                  {/* Aviso de Dados Incompletos */}
                  {!essentialDataStatus.isComplete && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm flex items-start gap-2">
                      <span className="text-lg">🚫</span>
                      <div>
                        <p className="font-semibold">Dados Obrigatórios Faltando!</p>
                        <p className="text-xs">
                          {essentialDataStatus.missingFields
                            .map((f) => {
                              const labels = {
                                name: 'Nome',
                                cpf: 'CPF',
                                phone: 'Telefone',
                              };
                              return labels[f];
                            })
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dados do Paciente */}
                  <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-1">
                    <p>
                      <strong>👤 Paciente:</strong> {name}
                    </p>
                    <p>
                      <strong>🕐 Horário:</strong> {appointmentTime}
                    </p>
                    <p>
                      <strong>📌 CPF:</strong> {checkinCPF || '—'}
                    </p>
                    <p>
                      <strong>📱 Telefone:</strong> {checkinPhone || '—'}
                    </p>
                  </div>

                  {!essentialDataStatus.isComplete && (
                    <button
                      onClick={() => setEditingDataOpen(true)}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                    >
                      📝 Completar Dados Cadastrais
                    </button>
                  )}
                </div>
              )}

              {/* 🆕 Aba: Cadastrais */}
              {checkinTab === 'cadastrais' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                    <p>
                      <strong>⚠️ Editar Dados Cadastrais</strong>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Dados atualizados aqui serão salvos no sistema
                    </p>
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      👤 Nome Completo
                    </label>
                    <input
                      type="text"
                      value={editName || name}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* CPF */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📌 CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={checkinCPF}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setCheckinCPF(cleaned);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📱 Telefone
                    </label>
                    <input
                      type="tel"
                      placeholder="(11) 9999-9999"
                      value={checkinPhone}
                      onChange={(e) => setCheckinPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📧 Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    ℹ️ Preencha todos os campos para confirmar o check-in
                  </p>
                </div>
              )}

              {/* 🆕 Aba: Financeiro */}
              {checkinTab === 'financeiro' && (
                <div className="space-y-4">
                  {/* Tipo de Convênio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🏥 Tipo de Convênio
                    </label>
                    <select
                      value={checkinPayerType}
                      onChange={(e) => setCheckinPayerType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CONVENIO">Convênio</option>
                      <option value="PARTICULAR">Particular</option>
                      <option value="CORTESIA">Cortesia</option>
                    </select>
                  </div>

                  {/* Convênio / Plano */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      💳 Convênio
                    </label>
                    <select
                      value={checkinPayerId}
                      onChange={(e) => {
                        setCheckinPayerId(e.target.value);
                        if (e.target.value) {
                          const selectedPayer = payers.find((p) => p.id === e.target.value);
                          setCheckinPlan(selectedPayer?.name || '');
                        } else {
                          setCheckinPlan('');
                        }
                      }}
                      disabled={loadingPayers}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {loadingPayers ? 'Carregando...' : 'Selecione um convênio'}
                      </option>
                      {payers.map((payer) => (
                        <option key={payer.id} value={payer.id}>
                          {payer.name}
                        </option>
                      ))}
                      <option value="particular">Particular</option>
                    </select>
                  </div>

                  {/* Plano (se houver convênio selecionado) */}
                  {checkinPayerId && checkinPayerId !== 'particular' && plans.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        📋 Plano
                      </label>
                      <select
                        value={checkinPlanId}
                        onChange={(e) => {
                          setCheckinPlanId(e.target.value);
                          if (e.target.value) {
                            const selectedPlan = plans.find((p) => p.id === e.target.value);
                            setCheckinPlan(selectedPlan?.name || '');
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um plano</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Carteirinha */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🎫 Nº Carteirinha
                      </label>
                      <input
                        type="text"
                        value={checkinCardNumber}
                        onChange={(e) => setCheckinCardNumber(e.target.value)}
                        placeholder="Número da carteirinha"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checkinCardVerified}
                          onChange={(e) => setCheckinCardVerified(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Verificada</span>
                      </label>
                    </div>
                  </div>

                  {/* Autorização */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔐 Autorização
                      </label>
                      <input
                        type="text"
                        value={checkinAuthorization}
                        onChange={(e) => setCheckinAuthorization(e.target.value)}
                        placeholder="Número"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        📅 Vencimento
                      </label>
                      <input
                        type="date"
                        value={checkinAuthExpiry}
                        onChange={(e) => setCheckinAuthExpiry(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Guia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📄 Nº Guia
                    </label>
                    <input
                      type="text"
                      value={checkinGuideNumber}
                      onChange={(e) => setCheckinGuideNumber(e.target.value)}
                      placeholder="Número da guia"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        💰 Valor
                      </label>
                      <input
                        type="text"
                        value={checkinValue}
                        onChange={(e) => setCheckinValue(e.target.value.replace(/[^\d.,]/g, ''))}
                        placeholder="Ex: 150,00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🎁 Desconto
                      </label>
                      <input
                        type="text"
                        value={checkinDiscount}
                        onChange={(e) => setCheckinDiscount(e.target.value.replace(/[^\d.,]/g, ''))}
                        placeholder="Ex: 10,00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Co-participação */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      💸 Co-participação
                    </label>
                    <input
                      type="text"
                      value={checkinCopayment}
                      onChange={(e) => setCheckinCopayment(e.target.value.replace(/[^\d.,]/g, ''))}
                      placeholder="Ex: 50,00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Forma de Pagamento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      💳 Forma de Pagamento
                    </label>
                    <select
                      value={checkinPaymentMethod}
                      onChange={(e) => setCheckinPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="PIX">PIX</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="TRANSFERENCIA">Transferência</option>
                    </select>
                  </div>

                  {!checkinPlan && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm flex items-start gap-2">
                      <span>⚠️</span>
                      <p>Convênio/Plano é obrigatório para prosseguir com o check-in.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col gap-2 pt-4 border-t mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCheckinOpen(false)}
                    disabled={checkinProcessing}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    ❌ Cancelar
                  </button>
                  <button
                    onClick={handleQuickCheckIn}
                    disabled={checkinProcessing || !essentialDataStatus.isComplete || !checkinPlan}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkinProcessing ? '⏳' : '✅'}{' '}
                    {checkinProcessing ? 'Processando...' : 'Confirmar Check-in'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição de Dados */}
        {editingDataOpen && (
          <div className="app-modal-overlay" style={{ zIndex: 10002 }}>
            <div className="app-modal-shell app-modal-shell--compact rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>✏️ Atualizar Dados</span>
                </h3>
                <button
                  onClick={() => setEditingDataOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Info sobre o paciente */}
              <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                <p>
                  <strong>👤 Paciente:</strong> {name}
                </p>
              </div>

              {/* Campo CPF */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">📌 CPF *</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={editCPF}
                  onChange={(e) => setEditCPF(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    editCPF
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-red-300 focus:ring-red-500'
                  }`}
                />
              </div>

              {/* Campo Telefone */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📱 Telefone *
                </label>
                <input
                  type="tel"
                  placeholder="(11) 9999-9999"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    editPhone
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-red-300 focus:ring-red-500'
                  }`}
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => setEditingDataOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={handleSaveEditedData}
                  disabled={!editCPF || !editPhone}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  💾 Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
