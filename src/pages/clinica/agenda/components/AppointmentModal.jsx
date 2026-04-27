// src/pages/clinica/agenda/components/AppointmentModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatPhone } from '@/utils/formatters/formatPhone';
import AppointmentAuditTimeline from './AppointmentAuditTimeline';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { listarConveniosPorProfissional } from '@/modules/agenda/services/agenda.api.business';
import { supabase } from '@/lib/customSupabaseClient';
import { suggestEncaixes } from '@/modules/agenda/utils/suggestEncaixe';
import { generateTimeSlots } from '@/utils/helpers/generateTimeSlots';

/**
 * AppointmentModal - Modal com abas para criar/editar agendamentos
 * 
 * Abas:
 * - Agendamento (data, hora, profissional, sala, serviço)
 * - Paciente (dados do paciente)
 * - Financeiro (convênio, valor)
 * - Histórico (histórico de alterações)
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - selectedSlot: { date, time, type: 'new' | 'edit', id?, ...appointment }
 * - onSave: (appointment) => Promise<void>
 * - onCancel: (id) => Promise<void>
 * - onConfirm: (id) => Promise<void>
 * - onFitting: (data) => Promise<void>
 * - currentRole: string
 * - metadata: { professionals, rooms, services, payers, patients }
 * - loading: boolean
 */
export default function AppointmentModal({
  isOpen = false,
  onClose,
  selectedSlot,
  onSave,
  onCancel,
  onConfirm,
  onFitting,
  currentRole,
  metadata = {},
  loading = false,
  patientId,
  preSelectedPatient,
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('agendamento');
  const [formData, setFormData] = useState(getInitialFormData(selectedSlot, patientId, preSelectedPatient));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [errorFields, setErrorFields] = useState([]); // 🆕 Lista de campos com erro
  const [isQuickBooking, setIsQuickBooking] = useState(false);
  const [selectedPatientData, setSelectedPatientData] = useState(null);
  const [filteredPayers, setFilteredPayers] = useState(metadata.payers || []);
  
  // 🆕 Estados para transferência de agendamento
  const [showTransferOptions, setShowTransferOptions] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const isNewAppointment = !selectedSlot?.id;
  const isEditing = !isNewAppointment;

  // � AUTO-SELECIONA A ABA CORRETA BASEADO NO TIPO DE PACIENTE
  React.useEffect(() => {
    console.log('📌 [AppointmentModal] Verificando tipo de paciente para selecionar aba');
    console.log('   selectedSlot?.mode:', selectedSlot?.mode);
    console.log('   selectedSlot?.appointment?.payer_id:', selectedSlot?.appointment?.payer_id);
    
    // Apenas auto-selecionar quando vindo do modo edit (Contas a Receber)
    if (selectedSlot?.mode === 'edit' && selectedSlot?.appointment) {
      const appointment = selectedSlot.appointment;
      
      // Verificar se é particular (sem payer) ou convênio (com payer)
      const isParticular = !appointment.payer_id;
      const isConvenio = !!appointment.payer_id;
      
      console.log('   isParticular:', isParticular);
      console.log('   isConvenio:', isConvenio);
      
      if (isParticular) {
        console.log('✅ É PARTICULAR - Abrindo aba Financeiro (Pagamento)');
        setActiveTab('financeiro');
      } else if (isConvenio) {
        console.log('✅ É CONVÊNIO/FATURADO - Abrindo aba Financeiro (Faturamento)');
        setActiveTab('financeiro');
      }
    }
  }, [selectedSlot?.mode, selectedSlot?.appointment]);

  // �🔄 Atualizar formData quando selectedSlot ou preSelectedPatient mudarem
  React.useEffect(() => {
    console.log('🔄 Atualizando formData. selectedSlot:', selectedSlot, 'preSelectedPatient:', preSelectedPatient);
    const newFormData = getInitialFormData(selectedSlot, patientId, preSelectedPatient);
    setFormData(newFormData);
    console.log('📝 FormData atualizado:', newFormData);
    console.log('   📋 professional_id mapeado para:', newFormData.professional_id);
  }, [selectedSlot, patientId, preSelectedPatient]);

  // 🔍 Monitorar mudanças no professional_id ou metadata.professionals
  React.useEffect(() => {
    console.log('👀 [AppointmentModal] Estado atual do Profissional:');
    console.log('   formData.professional_id:', formData.professional_id);
    console.log('   metadata.professionals:', metadata.professionals?.length || 0, 'profissionais disponíveis');
    if (formData.professional_id && metadata.professionals) {
      const matched = metadata.professionals.find(p => p.id === formData.professional_id);
      console.log('   ✅ Profissional encontrado?', matched ? `${matched.name} (${matched.id})` : '❌ NÃO ENCONTRADO');
    }
  }, [formData.professional_id, metadata.professionals]);

  // Verificar permissões
  // ✅ Profissionais agora PODEM editar seus atendimentos (ex: mudar data, hora, detalhes)
  // 🔒 Recepcao NÃO pode cancelar
  const canEdit = true; // Permite edição para todos os roles
  const canCancel = currentRole !== 'recepcao';

  // 🚨 Função para fechar com confirmação se houver dados
  const handleCloseWithConfirmation = () => {
    const hasData = Object.values(formData).some(value => 
      value !== null && value !== '' && value !== undefined && value !== false
    );
    
    if (hasData && isNewAppointment) {
      const { missingFields } = validateAppointment();
      
      if (missingFields.length > 0) {
        const message = `⚠️ Você tem informações preenchidas, mas faltam ${missingFields.length} campo(s) obrigatório(s):\n\n• ${missingFields.join('\n• ')}\n\nDeseja sair sem salvar?`;
        if (confirm(message)) {
          onClose();
        }
      } else {
        // Tudo preenchido mas vai fechar sem salvar
        if (confirm('✅ Tudo está preenchido. Tem certeza que deseja sair sem salvar?')) {
          onClose();
        }
      }
    } else {
      onClose();
    }
  };

  // 👤 Carregar dados do paciente selecionado para pré-preencher campos
  React.useEffect(() => {
    async function loadPatientData() {
      // Se temos preSelectedPatient, usar esses dados
      if (preSelectedPatient) {
        console.log('📋 Pré-preenchendo com preSelectedPatient:', preSelectedPatient);
        setFormData(prev => ({
          ...prev,
          patient_cpf: preSelectedPatient.document_id || preSelectedPatient.cpf || '',
          patient_phone: preSelectedPatient.phone || '',
          patient_mobile: preSelectedPatient.cell_phone || preSelectedPatient.mobile || '',
        }));
        setSelectedPatientData(preSelectedPatient);
        return;
      }

      // Procurar em metadata.patients
      if (formData.patient_id && metadata.patients) {
        const patient = metadata.patients.find(p => p.id === formData.patient_id);
        if (patient) {
          console.log('📋 Pré-preenchendo com metadata.patients:', patient);
          setSelectedPatientData(patient);
          setFormData(prev => ({
            ...prev,
            patient_cpf: patient.document_id || patient.cpf || '',
            patient_phone: patient.phone || '',
            patient_mobile: patient.cell_phone || '',
          }));
          return;
        }
      }

      // Se não encontrou em metadata e tem patient_id, buscar do banco
      if (formData.patient_id && !selectedPatientData) {
        try {
          console.log('🔍 Buscando dados do paciente no banco:', formData.patient_id);
          const { data: patient, error } = await supabase
            .from('patients')
            .select('id, name, document_id, phone, cell_phone')
            .eq('id', formData.patient_id)
            .maybeSingle();

          if (error) {
            console.warn('⚠️ Erro ao buscar paciente:', error);
            throw error;
          }

          if (!patient) {
            console.warn('⚠️ Paciente não encontrado:', formData.patient_id);
            return;
          }

          if (patient) {
            console.log('✅ Dados do paciente carregados:', patient);
            setSelectedPatientData(patient);
            setFormData(prev => ({
              ...prev,
              patient_cpf: patient.document_id || '',
              patient_phone: patient.phone || '',
              patient_mobile: patient.cell_phone || '',
            }));
          }
        } catch (err) {
          console.error('❌ Erro ao carregar dados do paciente:', err);
        }
      }
    }

    loadPatientData();
  }, [preSelectedPatient, formData.patient_id, metadata.patients, selectedPatientData]);

  // 💰 Carregar convênios do profissional selecionado
  React.useEffect(() => {
    async function loadProfessionalPayers() {
      console.log("=== CARREGANDO PAYERS DO PROFISSIONAL ===");
      console.log("📋 formData.professional_id:", formData.professional_id);
      
      // Se não houver profissional selecionado, mostrar todos os convênios
      if (!formData.professional_id) {
        console.log("📋 Nenhum profissional selecionado, usando todos os convênios:", metadata.payers);
        setFilteredPayers(metadata.payers || []);
        return;
      }

      console.log("🔍 Carregando convênios para profissional:", formData.professional_id);
      
      try {
        const conventions = await listarConveniosPorProfissional({
          profissionalId: formData.professional_id,
        });
        console.log("✅ Resultado da função:", conventions);
        console.log("📊 Comprimento:", conventions?.length || 0);
        
        if (conventions && conventions.length > 0) {
          console.log("✨ Convênios encontrados! Atualizando state...");
          setFilteredPayers(conventions);
        } else {
          console.log("⚠️ Nenhum convênio encontrado para este profissional");
          setFilteredPayers([]);
        }
      } catch (err) {
        console.error("❌ Erro ao carregar convênios:", err);
        // Fallback: usar todos os convênios se erro
        setFilteredPayers(metadata.payers || []);
      }
    }

    loadProfessionalPayers();
  }, [formData.professional_id, metadata.payers]);

  // 💰 Carregar preço do serviço quando convênio ou serviço mudam
  React.useEffect(() => {
    async function loadServicePrice() {
      console.log("=== CARREGANDO PREÇO DO SERVIÇO ===");
      console.log("📋 formData.payer_id:", formData.payer_id);
      console.log("📋 formData.service_id:", formData.service_id);

      // Precisa de ambos para buscar o preço
      if (!formData.payer_id || !formData.service_id) {
        console.log("⚠️ Faltam payer_id ou service_id");
        return;
      }

      try {
        const { data: servicePrices, error } = await supabase
          .from('service_prices')
          .select('price')
          .eq('payer_id', formData.payer_id)
          .eq('service_id', formData.service_id)
          .maybeSingle();

        if (error) {
          console.log("⚠️ Erro ao buscar preço:", error);
          throw error;
        }

        if (!servicePrices) {
          console.log("⚠️ Nenhum preço encontrado para esta combinação");
          return;
        }

        if (servicePrices && servicePrices.price) {
          console.log("✅ Preço encontrado:", servicePrices.price);
          handleInputChange('value', servicePrices.price);
        }
      } catch (err) {
        console.error("❌ Erro ao carregar preço:", err);
      }
    }

    loadServicePrice();
  }, [formData.payer_id, formData.service_id]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  // Formatar telefone com máscara
  const formatPhoneNumber = (value) => {
    return formatPhone(value);
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    handleInputChange('lead_phone', formatted);
  };

  const handleMobileChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    handleInputChange('lead_mobile', formatted);
  };

  // 🚨 Função para validar campos obrigatórios
  const validateAppointment = () => {
    const missingFields = [];
    const fieldMap = {};

    // Validação para agendamento rápido
    if (isNewAppointment && isQuickBooking) {
      if (!formData.lead_name?.trim()) {
        missingFields.push('Nome do cliente');
        fieldMap['lead_name'] = true;
      }
      if (!formData.lead_phone?.trim()) {
        missingFields.push('Telefone');
        fieldMap['lead_phone'] = true;
      }
    } else {
      // Validação normal para agendamento completo
      if (!formData.date) {
        missingFields.push('Data do agendamento');
        fieldMap['date'] = true;
      }
      if (!formData.time) {
        missingFields.push('Horário');
        fieldMap['time'] = true;
      }
      if (!formData.professional_id) {
        missingFields.push('Profissional');
        fieldMap['professional_id'] = true;
      }
      if (!formData.room_id) {
        missingFields.push('Sala');
        fieldMap['room_id'] = true;
      }
      if (!formData.service_id) {
        missingFields.push('Serviço');
        fieldMap['service_id'] = true;
      }
      if (!formData.patient_id) {
        missingFields.push('Paciente');
        fieldMap['patient_id'] = true;
      }
      if (!formData.payer_id) {
        missingFields.push('Convênio/Pagador');
        fieldMap['payer_id'] = true;
      }
    }

    return { missingFields, fieldMap };
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setErrorFields([]);

      console.log('💾 Tentando salvar agendamento...');
      console.log('📋 FormData:', formData);
      console.log('🆕 isNewAppointment:', isNewAppointment);
      console.log('📞 isQuickBooking:', isQuickBooking);

      // Validar campos obrigatórios
      const { missingFields, fieldMap } = validateAppointment();
      console.log('✓ Validação:', { missingFields, fieldMap });
      
      if (missingFields.length > 0) {
        setErrorFields(Object.keys(fieldMap));
        setError(`⚠️ Campos obrigatórios faltando:\n\n• ${missingFields.join('\n• ')}`);
        setSubmitting(false);
        console.log('❌ Validação falhou, campos faltando');
        return;
      }

      // Validação para agendamento rápido
      if (isNewAppointment && isQuickBooking) {
        // Enviar como pré-paciente
        const quickData = {
          ...formData,
          patient_id: null,
          patient_type: 'PRE_PATIENT',
        };
        console.log('📱 Salvando agendamento rápido:', quickData);
        await onSave(quickData);
      } else {
        const normalData = {
          ...formData,
          patient_type: 'PATIENT',
        };
        console.log('👤 Salvando agendamento normal:', normalData);
        await onSave(normalData);
      }

      console.log('✅ Agendamento salvo com sucesso!');
      onClose();
    } catch (err) {
      console.error('❌ Erro ao salvar:', err);
      setError(err.message || 'Erro ao salvar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        setSubmitting(true);
        setError(null);
        await onCancel(selectedSlot.id);
        onClose();
      } catch (err) {
        setError(err.message || 'Erro ao cancelar agendamento');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(selectedSlot.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao confirmar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFitting = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onFitting(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao criar encaixe');
    } finally {
      setSubmitting(false);
    }
  };

  // 🆕 Buscar sugestões de horários disponíveis para transferência
  const handleSearchAvailableSlots = async () => {
    try {
      setLoadingSuggestions(true);
      setError(null);

      // Data do agendamento
      const appointmentDate = formData.date || selectedSlot.date;
      if (!appointmentDate) {
        setError('Por favor, selecione uma data');
        setLoadingSuggestions(false);
        return;
      }

      // Buscar agendamentos do dia
      const { data: dayAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('scheduled_date', appointmentDate)
        .not('status', 'is', null);

      if (fetchError) throw fetchError;

      // Gerar horários do dia (08:00 às 17:30, intervalos de 30min)
      const horarios = generateTimeSlots({
        startHour: '08:00',
        endHour: '17:30',
        slotMinutes: 30,
      });

      // Preparar serviço (buscar informações)
      const servicoSelecionado = metadata.services?.find(s => s.id === formData.service_id);
      const servico = {
        duracao: servicoSelecionado?.duration_minutes || 30,
      };

      // Gerar sugestões
      const sugestoes = suggestEncaixes({
        horarios,
        agendamentos: dayAppointments || [],
        profissionais: metadata.professionals || [],
        salas: metadata.rooms || [],
        servico,
        maxSugestoes: 5,
      });

      setSuggestedSlots(sugestoes);
      setShowTransferOptions(true);
    } catch (err) {
      console.error('Erro ao buscar horários:', err);
      setError(err.message || 'Erro ao buscar horários disponíveis');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // 🆕 Transferir agendamento para novo horário
  const handleTransferToSlot = async (sugestao) => {
    try {
      setSubmitting(true);
      setError(null);

      // Atualizar formData com novo horário
      const updatedFormData = {
        ...formData,
        date: formData.date || selectedSlot.date,
        time: sugestao.horario,
        professional_id: sugestao.profissional.id,
        room_id: sugestao.sala.id,
      };

      // Salvar mudanças
      await onSave(updatedFormData);
      
      // Fechar modal de sugestões
      setShowTransferOptions(false);
      setSuggestedSlots([]);
    } catch (err) {
      setError(err.message || 'Erro ao transferir agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !selectedSlot) return null;

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-shell app-modal-shell--form app-modal-shell--wide rounded-lg bg-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isNewAppointment ? 'Novo Agendamento' : 'Editar Agendamento'}
          </h2>
          <button
            onClick={() => {
              console.log("X button clicked, calling onClose");
              handleCloseWithConfirmation();
            }}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 flex gap-0">
          {['agendamento', 'paciente', 'financeiro', 'historico'].map(tab => {
            let tabLabel = '';
            if (tab === 'agendamento') tabLabel = 'Dados do Agendamento';
            else if (tab === 'paciente') tabLabel = 'Dados Cadastrais';
            else if (tab === 'financeiro') {
              // Mostrar label diferente baseado no tipo de paciente
              const isParticular = !selectedSlot?.appointment?.payer_id;
              tabLabel = isParticular ? 'Pagamento' : 'Faturamento';
            }
            else if (tab === 'historico') tabLabel = 'Histórico';
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-custom">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
              <div className="font-bold mb-2">⚠️ {error.split('\n')[0]}</div>
              {error.includes('\n') && (
                <ul className="ml-4 space-y-1">
                  {error.split('\n').slice(2).map((line, idx) => (
                    <li key={idx} className="text-sm">{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'agendamento' && (
            <TabAgendamento
              formData={formData}
              onChange={handleInputChange}
              metadata={metadata}
              selectedSlot={selectedSlot}
              isNewAppointment={isNewAppointment}
              canEdit={canEdit}
              showTransferOptions={showTransferOptions}
              suggestedSlots={suggestedSlots}
              loadingSuggestions={loadingSuggestions}
              submitting={submitting}
              onSearchAvailableSlots={handleSearchAvailableSlots}
              onTransferToSlot={handleTransferToSlot}
              onCloseTransferOptions={() => {
                setShowTransferOptions(false);
                setSuggestedSlots([]);
              }}
            />
          )}

          {activeTab === 'paciente' && (
            <div>
              {isNewAppointment && isQuickBooking ? (
                // Agendamento rápido
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-1">📞 Agendamento Rápido</h3>
                    <p className="text-sm text-blue-800">Preencha os dados mínimos. Cadastro completo será feito na recepção.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Paciente *
                    </label>
                    <input
                      type="text"
                      value={formData.lead_name || ''}
                      onChange={(e) => handleInputChange('lead_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: João Silva"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Celular *
                      </label>
                      <input
                        type="tel"
                        value={formData.lead_mobile || ''}
                        onChange={handleMobileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(XX) 9 XXXX-XXXX"
                        maxLength="16"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={formData.lead_phone || ''}
                        onChange={handlePhoneChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(XX) XXXX-XXXX"
                        maxLength="14"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setIsQuickBooking(false)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-3"
                  >
                    ↑ Mudar para paciente cadastrado
                  </button>
                </div>
              ) : (
                // Paciente cadastrado
                <div className="space-y-4">
                  {isNewAppointment && (
                    <button
                      onClick={() => setIsQuickBooking(true)}
                      className="w-full px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition mb-4"
                    >
                      📞 Usar agendamento rápido (telefone)
                    </button>
                  )}

                  <TabPaciente
                    formData={formData}
                    onChange={handleInputChange}
                    metadata={metadata}
                    canEdit={canEdit}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'financeiro' && (
            <TabFinanceiro
              formData={formData}
              onChange={handleInputChange}
              metadata={metadata}
              filteredPayers={filteredPayers}
              canEdit={canEdit && currentRole !== 'recepcao'}
            />
          )}

          {activeTab === 'historico' && (
            <TabHistorico 
              selectedSlot={selectedSlot}
              currentRole={currentRole}
              userId={user?.id}
            />
          )}
        </div>

        {/* Footer com botões de ação */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleCloseWithConfirmation}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Fechar
          </button>

          {isEditing && canCancel && (
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium"
            >
              Cancelar
            </button>
          )}

          {isEditing && (
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
            >
              Confirmar
            </button>
          )}

          {isEditing && (
            <button
              onClick={handleSearchAvailableSlots}
              disabled={submitting || loadingSuggestions || showTransferOptions || !formData.date || !formData.service_id}
              className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium"
              title="Buscar horários disponíveis para transferir este agendamento"
            >
              🔄 Transferir
            </button>
          )}

          {isNewAppointment && (
            <button
              onClick={handleFitting}
              disabled={submitting}
              className="px-4 py-2 text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition font-medium"
            >
              Criar Encaixe
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={submitting || !canEdit}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * TabAgendamento - Dados do agendamento
 */
function TabAgendamento({
  formData,
  onChange,
  metadata,
  selectedSlot,
  isNewAppointment,
  canEdit,
  showTransferOptions,
  suggestedSlots,
  loadingSuggestions,
  submitting,
  onSearchAvailableSlots,
  onTransferToSlot,
  onCloseTransferOptions,
}) {
  // Encaixe permite editar data e hora
  const isEncaixe = selectedSlot?.type === 'encaixe';
  // ✅ CORRIGIDO: Permitir a TODOS editar data/hora (gestores, profissionais, receptionistas)
  // 📅 Se isNewAppointment, permite editar; se está editando, também permite
  const canEditDateTime = canEdit; // Simplificado: qualquer um que pode editar pode mudar data/hora
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            value={formData.date || selectedSlot.date || ''}
            onChange={(e) => onChange('date', e.target.value)}
            disabled={!canEditDateTime}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
          <input
            type="time"
            value={formData.time || selectedSlot.time || ''}
            onChange={(e) => onChange('time', e.target.value)}
            disabled={!canEditDateTime}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
          <select
            value={formData.professional_id || ''}
            onChange={(e) => onChange('professional_id', e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          >
            <option value="">Selecione um profissional</option>
            {metadata.professionals?.map(prof => (
              <option key={prof.id} value={prof.id}>{prof.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sala</label>
          <select
            value={formData.room_id || ''}
            onChange={(e) => onChange('room_id', e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          >
            <option value="">Selecione uma sala</option>
            {metadata.rooms?.map(room => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
        <select
          value={formData.service_id || ''}
          onChange={(e) => onChange('service_id', e.target.value)}
          disabled={!canEdit}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
        >
          <option value="">Selecione um serviço</option>
          {metadata.services?.map(service => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => onChange('notes', e.target.value)}
          disabled={!canEdit}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 resize-none"
          rows="3"
          placeholder="Observações sobre o agendamento..."
        />
      </div>

      {/* 🆕 Seção de Transferência de Horário */}
      {!showTransferOptions && (
        <button
          onClick={onSearchAvailableSlots}
          disabled={loadingSuggestions || !formData.date || !formData.service_id}
          className="w-full px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
        >
          {loadingSuggestions ? '⏳ Buscando horários...' : '🔄 Buscar Novos Horários'}
        </button>
      )}

      {/* Sugestões de Horários */}
      {showTransferOptions && suggestedSlots.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">💡 Horários Disponíveis</h4>
              <p className="text-xs text-gray-600">{suggestedSlots.length} opção(ões) encontrada(s)</p>
            </div>
            <button
              onClick={onCloseTransferOptions}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {suggestedSlots.map((slot, idx) => (
              <button
                key={idx}
                onClick={() => onTransferToSlot(slot)}
                disabled={submitting}
                className="w-full p-3 text-left border border-blue-200 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {slot.horario} - {slot.profissional.name} - {slot.sala.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{slot.motivo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-purple-600">Score: {slot.score.toFixed(0)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onCloseTransferOptions}
            className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar Busca
          </button>
        </div>
      )}

      {showTransferOptions && suggestedSlots.length === 0 && !loadingSuggestions && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">⚠️ Nenhum horário disponível encontrado neste dia.</p>
          <button
            onClick={onCloseTransferOptions}
            className="text-sm text-yellow-600 hover:text-yellow-700 mt-2 font-medium"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * TabPaciente - Dados do paciente
 */
function TabPaciente({
  formData,
  onChange,
  metadata,
  canEdit,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
        <select
          value={formData.patient_id || ''}
          onChange={(e) => onChange('patient_id', e.target.value)}
          disabled={!canEdit}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
        >
          <option value="">Selecione um paciente</option>
          {metadata.patients?.map(patient => (
            <option key={patient.id} value={patient.id}>{patient.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <input
            type="text"
            value={formData.patient_cpf || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input
            type="tel"
            value={formData.patient_phone || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
        <input
          type="tel"
          value={formData.patient_mobile || ''}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
        />
      </div>
    </div>
  );
}

/**
 * TabFinanceiro - Dados financeiros do agendamento
 */
function TabFinanceiro({
  formData,
  onChange,
  metadata,
  filteredPayers = [],
  canEdit,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Convênio / Pagador {filteredPayers.length > 0 && <span className="text-xs text-green-600">({filteredPayers.length})</span>}
        </label>
        <select
          value={formData.payer_id || ''}
          onChange={(e) => onChange('payer_id', e.target.value)}
          disabled={!canEdit}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
        >
          <option value="">{filteredPayers.length === 0 ? 'Nenhum convênio disponível' : 'Selecione um convênio'}</option>
          {filteredPayers.map(payer => (
            <option key={payer.id} value={payer.id}>{payer.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-medium text-gray-700">R$</span>
            <input
              type="number"
              value={formData.value || ''}
              onChange={(e) => onChange('value', e.target.value)}
              disabled={!canEdit}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              step="0.01"
              min="0"
            />
          </div>
          {formData.value && (
            <p className="text-xs text-gray-500 mt-1">
              R$ {parseFloat(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status || ''}
            onChange={(e) => onChange('status', e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          >
            <option value="">Selecione um status</option>
            <option value="a_confirmar">A Confirmar</option>
            <option value="confirmado">Confirmado</option>
            <option value="at_reception">📍 Na Recepção (Check-in)</option>
            <option value="presente">📍 Presente (Chegou)</option>
            <option value="pronto_atendimento">🟢 Pronto para Atendimento</option>
            <option value="em_atendimento">Em Atendimento</option>
            <option value="finalizado">Finalizado</option>
            <option value="faltou">Faltou</option>
            <option value="cancelado">Cancelado</option>
            <option value="encaixe">Encaixe</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/**
 * TabHistorico - Histórico de alterações com auditoria
 */
function TabHistorico({ selectedSlot, currentRole, userId }) {
  // Se for novo agendamento, não há histórico
  if (!selectedSlot?.id) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-700">
            📝 O histórico de auditoria aparecerá após o agendamento ser criado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppointmentAuditTimeline
        appointmentId={selectedSlot.id}
        currentRole={currentRole}
        currentUserId={userId}
      />
    </div>
  );
}

/**
 * Função auxiliar para inicializar os dados do formulário
 */
function getInitialFormData(selectedSlot, patientId, preSelectedPatient) {
  if (!selectedSlot) return {};

  if (selectedSlot.type === 'new') {
    console.log('🎬 [getInitialFormData] Novo agendamento, selectedSlot:', {
      date: selectedSlot.date,
      time: selectedSlot.time,
      professionalId: selectedSlot.professionalId,
      professional_id: selectedSlot.professional_id,
      roomId: selectedSlot.roomId,
      room_id: selectedSlot.room_id,
    });
    return {
      date: selectedSlot.date,
      time: selectedSlot.time,
      professional_id: selectedSlot.professionalId || selectedSlot.professional_id || '',
      room_id: selectedSlot.roomId || selectedSlot.room_id || '',
      service_id: '',
      patient_id: patientId || '',
      payer_id: preSelectedPatient?.payer_id || '',
      value: '',
      status: 'a_confirmar',
      notes: '',
      lead_name: preSelectedPatient?.name || '',
      lead_phone: preSelectedPatient?.phone || '',
      lead_mobile: preSelectedPatient?.cell_phone || preSelectedPatient?.mobile || '',
      patient_cpf: preSelectedPatient?.document_id || preSelectedPatient?.cpf || '',
      patient_phone: preSelectedPatient?.phone || '',
      patient_mobile: preSelectedPatient?.cell_phone || preSelectedPatient?.mobile || '',
    };
  }

  // Edição
  return {
    id: selectedSlot.id || '',
    date: selectedSlot.scheduled_date || selectedSlot.date || '',
    time: (selectedSlot.scheduled_time || selectedSlot.time || '').substring(0, 5),
    professional_id: selectedSlot.professional_id || '',
    room_id: selectedSlot.room_id || '',
    service_id: selectedSlot.service_id || '',
    patient_id: patientId || selectedSlot.patient_id || '',
    payer_id: selectedSlot.payer_id || '',
    value: selectedSlot.value || '',
    status: selectedSlot.status?.trim() ? selectedSlot.status : 'a_confirmar',
    notes: selectedSlot.notes || '',
    lead_name: selectedSlot.lead_name || '',
    lead_phone: selectedSlot.lead_phone || '',
    lead_mobile: selectedSlot.lead_mobile || '',
    patient_cpf: selectedSlot.patient_cpf || selectedSlot.patients?.document_id || '',
    patient_phone: selectedSlot.patient_phone || selectedSlot.patients?.phone || '',
    patient_mobile: selectedSlot.patient_mobile || selectedSlot.patients?.cell_phone || '',
  };
}

