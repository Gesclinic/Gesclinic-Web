import { useState, useEffect } from 'react';
import { X, CheckCircle, Phone, Clock, MapPin, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { listPayers } from '@/lib/payersApi';
import { getServicePrice } from '@/lib/getServicePrice';
import { STATUS_CONFIG, APPOINTMENT_STATUSES, migrateStatus } from '@/lib/appointmentStatusConstants';

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
  onEdit
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
      const phone = appointment?.patient_phone || appointment?.patient_mobile || appointment?.telefone || '';
      // 🔧 Separar payer_name e plan_name corretamente
      const payer = appointment?.payer_name || appointment?.health_plan || appointment?.convênio || 'Particular';
      // Se plan_name não existe (coluna plan_id ainda não criada), usar payer_name como fallback
      const plan = appointment?.plan_name || appointment?.payer_name || 'Particular';
      const authorization = appointment?.authorization || appointment?.autorização || '';
      const value = appointment?.value || appointment?.valor || '';
      const payerType = appointment?.payer_type || 'CONVENIO';
      const cardNumber = appointment?.card_number || appointment?.carteirinha || '';
      const authExpiry = appointment?.authorization_expiry || appointment?.autorização_vencimento || '';
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
        planId
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
          const {
            data
          } = await supabase.from('plans').select('id, name').eq('payer_id', checkinPayerId);
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
      const phone = appointment?.patient_phone || appointment?.patient_mobile || appointment?.telefone || '';
      setEditCPF(cpf);
      setEditPhone(phone);
    }
  }, [editingDataOpen, appointment]);
  if (!isOpen || !appointment) return null;
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
    date
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
    full_appointment: JSON.stringify(appointment).substring(0, 500)
  });
  const name = paciente || patient_name || 'Sem nome';
  const service = serviço || service_name || 'Sem serviço';
  const prof = profissional || professional_name || 'Sem profissional';
  const roomNum = sala || room || 'Sem sala';
  const duration_min = duração || duration || 30;
  const plan = convênio || health_plan || 'Particular';
  const patient_age = idade || age;
  const appointmentTime = horário || appointment.horario || appointment.time || '—';
  const appointmentDate = scheduled_date || data || date || appointment.scheduled_date || appointment.data || '—';
  const noteText = notas || notes || '';

  // Mapear status antigos para novos se necessário (backward compat)
  let normalizedStatus = migrateStatus(status);
  const statusInfo = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[APPOINTMENT_STATUSES.SCHEDULED];

  // Verificar dados essenciais completos
  const getEssentialDataStatus = () => {
    // Usar valores locais (checkinCPF/checkinPhone) se disponíveis, caso contrário usar do appointment
    const cpf = checkinCPF || appointment?.patient_cpf;
    const phone = checkinPhone || appointment?.patient_phone || appointment?.patient_mobile;
    const essentialFields = {
      name: appointment?.patient_name,
      cpf: cpf,
      phone: phone
    };
    const missingFields = Object.entries(essentialFields).reduce((acc, [key, value]) => {
      if (!value) acc.push(key);
      return acc;
    }, []);
    return {
      isComplete: missingFields.length === 0,
      missingFields,
      essentialFields
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
        phone: editPhone
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
          phone: 'Telefone'
        };
        const missingNames = essentialDataStatus.missingFields.map(f => missingFieldsText[f]).join(', ');
        alert(`⚠️ Dados Incompletos!\n\nFaltam os seguintes campos: ${missingNames}\n\nAbrindo página para atualização...`);
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
          discount: checkinDiscount
        }
      });

      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 500));

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
        patient_phone: checkinPhone
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
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[10000] flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/30",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative w-[90vw] max-w-2xl max-h-[90vh] bg-white shadow-2xl rounded-lg overflow-hidden z-[10001] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex items-center justify-between z-20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDC41\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold"
  }, "Detalhes do Atendimento"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-100"
  }, "Informa\xE7\xF5es completas do agendamento"))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "p-1 hover:bg-blue-700 rounded-lg transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 24,
    className: "text-white"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-4 py-3 scrollbar-custom space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: `${statusInfo.color} ${statusInfo.textColor} px-2 py-1.5 rounded-lg font-semibold text-sm text-center flex items-center justify-center gap-1 mb-2`
  }, /*#__PURE__*/React.createElement("span", null, statusInfo.icon), /*#__PURE__*/React.createElement("span", null, statusInfo.label)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 p-2 rounded-lg border border-blue-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-0.5"
  }, /*#__PURE__*/React.createElement(User, {
    size: 14,
    className: "text-blue-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-blue-600 uppercase"
  }, "Paciente")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-gray-900"
  }, name), patient_age && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, patient_age, " anos")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Prontu\xE1rio"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-900 font-medium"
  }, appointment?.patient_prontuario || appointment?.patients?.prontuario_numero || appointment?.patient?.prontuario_numero || appointment?.prontuario_numero || appointment?.record_number || appointment?.patient_record || appointment?.prontuario || '—')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Telefone"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-900 font-medium break-all"
  }, checkinPhone || appointment?.patient_phone || appointment?.patient_mobile || appointment?.phone || appointment?.telefone || '—')))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 p-2 rounded-lg border border-blue-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-blue-600 uppercase block mb-0.5"
  }, "Data"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-900"
  }, appointmentDate && appointmentDate !== '—' ? (() => {
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const safeDate = new Date(year, month - 1, day);
    return safeDate.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  })() : '—')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Hor\xE1rio"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-900"
  }, appointmentTime)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Dura\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-900"
  }, duration_min, " min"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-900"
  }, service)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Profissional"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-900"
  }, prof)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Sala"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-900"
  }, roomNum))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 p-2 rounded-lg border border-blue-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-blue-600 uppercase block mb-0.5"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-blue-900"
  }, appointment?.payer_name || appointment?.payers?.name || 'Particular')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "Plano"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-gray-900"
  }, checkinPlan || appointment?.plan_name || 'Particular')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-500 uppercase block mb-0.5"
  }, "C\xF3digo"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-gray-900 font-mono"
  }, appointment?.plan_code || '—')), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-2 rounded-lg border border-green-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-green-600 uppercase block mb-0.5"
  }, "Valor (R$)"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-green-900"
  }, checkinValue || appointment?.value ? `R$ ${parseFloat(checkinValue || appointment?.value).toFixed(2)}` : '—'))), noteText && /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 p-2 rounded-lg border border-yellow-200"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-yellow-600 uppercase block mb-0.5"
  }, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-yellow-900"
  }, noteText))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-200 bg-gray-50 p-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xs font-bold text-gray-600 uppercase mb-2"
  }, "A\xE7\xF5es R\xE1pidas"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, status?.toLowerCase() === 'agendado' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onConfirm(id);
      onClose();
    },
    className: "col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
  }, "\uD83D\uDCDE Confirmar Presen\xE7a")), (normalizedStatus === 'agendado' || normalizedStatus === 'scheduled' || normalizedStatus === 'confirmado' || normalizedStatus === 'confirmed' || normalizedStatus === 'at_reception' || status?.toLowerCase?.()?.includes('agendado') || status?.toLowerCase?.()?.includes('scheduled')) && /*#__PURE__*/React.createElement("button", {
    onClick: () => setCheckinOpen(true),
    className: "bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
  }, normalizedStatus === 'at_reception' ? '📝 Check-in' : '📍 Check-in'), (normalizedStatus === 'at_reception' || normalizedStatus === 'check-in' || normalizedStatus === 'confirmado' || status?.toLowerCase?.()?.includes('check-in') || status?.toLowerCase?.()?.includes('at_reception')) && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onStartAppointment(id);
      onClose();
    },
    className: "bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
  }, "\uD83C\uDFAF Iniciar"), status?.toLowerCase() === 'finalizado' && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onBill(id);
      onClose();
    },
    className: "col-span-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
  }, "\uD83D\uDCB3 Faturar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onEdit(id);
    },
    className: "bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
  }, "\u270F\uFE0F Editar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onReschedule(id);
    },
    className: "bg-gray-700 hover:bg-gray-800 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
  }, "\uD83D\uDCC5 Remarcar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onCancel(id);
      onClose();
    },
    className: "bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-2 text-xs rounded-lg transition-colors"
  }, "\u274C Cancelar"))), checkinOpen && /*#__PURE__*/React.createElement("div", {
    className: "app-modal-overlay",
    style: {
      zIndex: 10002
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-modal-shell app-modal-shell--compact rounded-lg bg-white p-6 shadow-xl overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCD Check-in R\xE1pido")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCheckinOpen(false),
    className: "p-1 hover:bg-gray-100 rounded"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4 border-b overflow-x-auto pb-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCheckinTab('essencial'),
    className: `px-3 py-2 font-medium text-sm transition-colors whitespace-nowrap ${checkinTab === 'essencial' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`
  }, "\uD83D\uDC64 Dados Essenciais"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCheckinTab('cadastrais'),
    className: `px-3 py-2 font-medium text-sm transition-colors whitespace-nowrap ${checkinTab === 'cadastrais' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`
  }, "\uD83D\uDCCB Cadastrais"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCheckinTab('financeiro'),
    className: `px-3 py-2 font-medium text-sm transition-colors whitespace-nowrap ${checkinTab === 'financeiro' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`
  }, "\uD83D\uDCB3 Financeiro")), checkinTab === 'essencial' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, !essentialDataStatus.isComplete && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83D\uDEAB"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, "Dados Obrigat\xF3rios Faltando!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs"
  }, essentialDataStatus.missingFields.map(f => {
    const labels = {
      name: 'Nome',
      cpf: 'CPF',
      phone: 'Telefone'
    };
    return labels[f];
  }).join(', ')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 p-3 rounded-lg text-sm space-y-1"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "\uD83D\uDC64 Paciente:"), " ", name), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "\uD83D\uDD50 Hor\xE1rio:"), " ", appointmentTime), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "\uD83D\uDCCC CPF:"), " ", checkinCPF || '—'), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "\uD83D\uDCF1 Telefone:"), " ", checkinPhone || '—')), !essentialDataStatus.isComplete && /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingDataOpen(true),
    className: "w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
  }, "\uD83D\uDCDD Completar Dados Cadastrais")), checkinTab === 'cadastrais' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "\u26A0\uFE0F Editar Dados Cadastrais")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mt-1"
  }, "Dados atualizados aqui ser\xE3o salvos no sistema")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDC64 Nome Completo"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editName || name,
    onChange: e => setEditName(e.target.value),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCCC CPF"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "000.000.000-00",
    value: checkinCPF,
    onChange: e => {
      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
      setCheckinCPF(cleaned);
    },
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCF1 Telefone"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    placeholder: "(11) 9999-9999",
    value: checkinPhone,
    onChange: e => setCheckinPhone(e.target.value),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCE7 Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "email@example.com",
    value: editEmail,
    onChange: e => setEditEmail(e.target.value),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center"
  }, "\u2139\uFE0F Preencha todos os campos para confirmar o check-in")), checkinTab === 'financeiro' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83C\uDFE5 Tipo de Conv\xEAnio"), /*#__PURE__*/React.createElement("select", {
    value: checkinPayerType,
    onChange: e => setCheckinPayerType(e.target.value),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "CONVENIO"
  }, "Conv\xEAnio"), /*#__PURE__*/React.createElement("option", {
    value: "PARTICULAR"
  }, "Particular"), /*#__PURE__*/React.createElement("option", {
    value: "CORTESIA"
  }, "Cortesia"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCB3 Conv\xEAnio"), /*#__PURE__*/React.createElement("select", {
    value: checkinPayerId,
    onChange: e => {
      setCheckinPayerId(e.target.value);
      if (e.target.value) {
        const selectedPayer = payers.find(p => p.id === e.target.value);
        setCheckinPlan(selectedPayer?.name || '');
      } else {
        setCheckinPlan('');
      }
    },
    disabled: loadingPayers,
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, loadingPayers ? 'Carregando...' : 'Selecione um convênio'), payers.map(payer => /*#__PURE__*/React.createElement("option", {
    key: payer.id,
    value: payer.id
  }, payer.name)), /*#__PURE__*/React.createElement("option", {
    value: "particular"
  }, "Particular"))), checkinPayerId && checkinPayerId !== 'particular' && plans.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCCB Plano"), /*#__PURE__*/React.createElement("select", {
    value: checkinPlanId,
    onChange: e => {
      setCheckinPlanId(e.target.value);
      if (e.target.value) {
        const selectedPlan = plans.find(p => p.id === e.target.value);
        setCheckinPlan(selectedPlan?.name || '');
      }
    },
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione um plano"), plans.map(plan => /*#__PURE__*/React.createElement("option", {
    key: plan.id,
    value: plan.id
  }, plan.name)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83C\uDFAB N\xBA Carteirinha"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: checkinCardNumber,
    onChange: e => setCheckinCardNumber(e.target.value),
    placeholder: "N\xFAmero da carteirinha",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checkinCardVerified,
    onChange: e => setCheckinCardVerified(e.target.checked),
    className: "rounded border-gray-300"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "Verificada")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDD10 Autoriza\xE7\xE3o"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: checkinAuthorization,
    onChange: e => setCheckinAuthorization(e.target.value),
    placeholder: "N\xFAmero",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCC5 Vencimento"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: checkinAuthExpiry,
    onChange: e => setCheckinAuthExpiry(e.target.value),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCC4 N\xBA Guia"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: checkinGuideNumber,
    onChange: e => setCheckinGuideNumber(e.target.value),
    placeholder: "N\xFAmero da guia",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCB0 Valor"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: checkinValue,
    onChange: e => setCheckinValue(e.target.value.replace(/[^\d.,]/g, '')),
    placeholder: "Ex: 150,00",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83C\uDF81 Desconto"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: checkinDiscount,
    onChange: e => setCheckinDiscount(e.target.value.replace(/[^\d.,]/g, '')),
    placeholder: "Ex: 10,00",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCB8 Co-participa\xE7\xE3o"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: checkinCopayment,
    onChange: e => setCheckinCopayment(e.target.value.replace(/[^\d.,]/g, '')),
    placeholder: "Ex: 50,00",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCB3 Forma de Pagamento"), /*#__PURE__*/React.createElement("select", {
    value: checkinPaymentMethod,
    onChange: e => setCheckinPaymentMethod(e.target.value),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione..."), /*#__PURE__*/React.createElement("option", {
    value: "DINHEIRO"
  }, "Dinheiro"), /*#__PURE__*/React.createElement("option", {
    value: "CARTAO_CREDITO"
  }, "Cart\xE3o de Cr\xE9dito"), /*#__PURE__*/React.createElement("option", {
    value: "CARTAO_DEBITO"
  }, "Cart\xE3o de D\xE9bito"), /*#__PURE__*/React.createElement("option", {
    value: "PIX"
  }, "PIX"), /*#__PURE__*/React.createElement("option", {
    value: "CHEQUE"
  }, "Cheque"), /*#__PURE__*/React.createElement("option", {
    value: "BOLETO"
  }, "Boleto"), /*#__PURE__*/React.createElement("option", {
    value: "TRANSFERENCIA"
  }, "Transfer\xEAncia"))), !checkinPlan && /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("p", null, "Conv\xEAnio/Plano \xE9 obrigat\xF3rio para prosseguir com o check-in."))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 pt-4 border-t mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCheckinOpen(false),
    disabled: checkinProcessing,
    className: "flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
  }, "\u274C Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleQuickCheckIn,
    disabled: checkinProcessing || !essentialDataStatus.isComplete || !checkinPlan,
    className: "flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
  }, checkinProcessing ? '⏳' : '✅', " ", checkinProcessing ? 'Processando...' : 'Confirmar Check-in'))))), editingDataOpen && /*#__PURE__*/React.createElement("div", {
    className: "app-modal-overlay",
    style: {
      zIndex: 10002
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-modal-shell app-modal-shell--compact rounded-lg bg-white p-6 shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\u270F\uFE0F Atualizar Dados")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingDataOpen(false),
    className: "p-1 hover:bg-gray-100 rounded"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-3 rounded-lg mb-4 text-sm"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "\uD83D\uDC64 Paciente:"), " ", name)), /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCCC CPF *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "000.000.000-00",
    value: editCPF,
    onChange: e => setEditCPF(e.target.value.replace(/\D/g, '').slice(0, 11)),
    className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${editCPF ? 'border-green-300 focus:ring-green-500' : 'border-red-300 focus:ring-red-500'}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCF1 Telefone *"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    placeholder: "(11) 9999-9999",
    value: editPhone,
    onChange: e => setEditPhone(e.target.value),
    className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${editPhone ? 'border-green-300 focus:ring-green-500' : 'border-red-300 focus:ring-red-500'}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-4 border-t"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditingDataOpen(false),
    className: "flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
  }, "\u274C Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveEditedData,
    disabled: !editCPF || !editPhone,
    className: "flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
  }, "\uD83D\uDCBE Salvar"))))));
}