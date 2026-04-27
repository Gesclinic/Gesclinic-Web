import React, { useState, useEffect, useMemo } from 'react';
import AppointmentUnitedModal from './AppointmentUnitedModal';
import { listRooms } from '@/lib/roomsApi';
import { getAppointmentById } from '@/lib/appointmentsApi';
import { supabase } from '@/lib/customSupabaseClient';

export default function ModalCriarAgendamento({
  // Interface ANTIGA (esperada por AgendaIndex)
  open = false,
  onOpenChange = null,
  clinicId = null,
  data = null,
  appointmentIdToEdit = null,
  professionals = [],
  services = [],
  payers = [],
  onCreated = null,
  onEditCompleted = null,
  
  // Interface NOVA (props do novo modal)
  isOpen = false,
  onClose = null,
  mode = 'new',
  appointment = null,
  arrivals = {},
  onArrivalsUpdate = null,
  onSuccess = null,
  rooms = [],
}) {
  // 🔍 DEBUG
  console.log('🔧 [ModalCriarAgendamento-Wrapper] RENDER:', {
    open,
    isOpen,
    mode: appointmentIdToEdit ? 'edit' : mode,
    clinicId,
    appointmentIdToEdit,
    isModalOpen: open === true ? true : isOpen,
  });
  console.log('   props.data (slot data):', data);
  if (data) {
    console.log('   ✅ props.data completo:', JSON.stringify(data));
    console.log('   props.data.professionalId:', data.professionalId);
    console.log('   props.data.professional_id:', data.professional_id);
    console.log('   data keys:', Object.keys(data));
  }
  
  // Estado para carregar rooms
  const [roomsList, setRoomsList] = useState(rooms || []);
  
  // Estado para armazenar o agendamento carregado
  const [loadedAppointment, setLoadedAppointment] = useState(null);
  
  // Estado para detectar quando modal reabre
  const [wasModalOpenBefore, setWasModalOpenBefore] = useState(false);
  
  // ✅ CALCULAR isModalOpen AQUI (ANTES dos useEffects)
  // Se 'open' for true (interface antiga), usa true. Caso contrário, usa 'isOpen'
  const isModalOpen = open === true ? true : isOpen;
  
  // 📋 PASSO 3: Consolidate appointment from BOTH sources (prop or loaded via ID)
  // Prioridade: data (passed from parent) > loadedAppointment > appointment
  const finalAppointment = useMemo(() => data || loadedAppointment || appointment, [data, loadedAppointment, appointment]);
  
  // 🔍 DEBUG: QUAL SOURCE ESTÁ SENDO USADO?
  console.log('📋 [ModalCriarAgendamento] Consolidando appointment:', {
    temData: !!data,
    temLoadedAppointment: !!loadedAppointment,
    temAppointment: !!appointment,
    final: finalAppointment ? '✅' : '❌',
    modo: appointmentIdToEdit ? 'EDIT' : 'NEW',
  });
  
  if (finalAppointment) {
    console.log('✅ [ModalCriarAgendamento] finalAppointment COMPLETO:', {
      id: finalAppointment.id,
      professionalId: finalAppointment.professionalId,
      professional_id: finalAppointment.professional_id,
      payerId: finalAppointment.payerId,
      payer_id: finalAppointment.payer_id,
      data: finalAppointment.date,
      time: finalAppointment.time || finalAppointment.scheduled_time,
    });
  }
  
  // Carregar appointment quando appointmentIdToEdit muda
  useEffect(() => {
    if (appointmentIdToEdit && !data) {
      console.log('📥 [ModalCriarAgendamento] Carregando agendamento via appointmentIdToEdit:', appointmentIdToEdit);
      
      (async () => {
        try {
          const apt = await getAppointmentById(appointmentIdToEdit);
          
          if (apt) {
            console.log('✅ Agendamento carregado com mapping:', {
              id: apt.id,
              professionalId: apt.professionalId,
              patientId: apt.patientId,
              payerId: apt.payerId,
              date: apt.date,
              startTime: apt.startTime,
            });
            setLoadedAppointment(apt);
          } else {
            console.warn('⚠️ Agendamento não encontrado:', appointmentIdToEdit);
            setLoadedAppointment(null);
          }
        } catch (err) {
          console.error('❌ Exceção ao carregar agendamento:', err);
          setLoadedAppointment(null);
        }
      })();
    } else if (data) {
      // ✅ SE DATA JÁ FOI PASSADA VIA PROPS, NÃO PRECISA CARREGAR
      console.log('✅ [ModalCriarAgendamento] Dados já foram passados via props (data):', data);
      setLoadedAppointment(null);
    }
  }, [appointmentIdToEdit, data]);
  
  // 🔄 RECARREGAR DADOS QUANDO MODAL REABRE APÓS FECHAR
  useEffect(() => {
    if (isModalOpen && !wasModalOpenBefore && appointmentIdToEdit) {
      console.log('🔄 [ModalCriarAgendamento] Modal REABRINDO - recarregando dados atualizados após save');
      
      (async () => {
        try {
          const apt = await getAppointmentById(appointmentIdToEdit);
          if (apt) {
            console.log('✅ Dados ATUALIZADOS recarregados:', {
              id: apt.id,
              payerId: apt.payerId,
              roomId: apt.roomId,
              value: apt.value,
              date: apt.date,
            });
            setLoadedAppointment(apt);
          }
        } catch (err) {
          console.error('❌ Erro ao recarregar dados:', err);
        }
      })();
    }
    setWasModalOpenBefore(isModalOpen);
  }, [isModalOpen, appointmentIdToEdit]);
  
  // Carregar rooms se clinicId for fornecido
  useEffect(() => {
    if (clinicId && (!rooms || rooms.length === 0)) {
      listRooms(clinicId)
        .then(setRoomsList)
        .catch(() => setRoomsList([]));
    } else if (rooms && rooms.length > 0) {
      setRoomsList(rooms);
    }
  }, [clinicId, rooms]);
  
  // Determinar o modo baseado no estado
  const determinedMode = appointmentIdToEdit ? 'edit' : mode;
  
  // Handler de fechamento que chama o callback correto
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onOpenChange) {
      onOpenChange(false);
    }
  };
  
  // Handler de sucesso que chama o callback correto
  const handleSuccess = (appointmentData) => {
    if (onCreated) {
      onCreated(appointmentData);
    } else if (onEditCompleted) {
      onEditCompleted(appointmentData);
    } else if (onSuccess) {
      onSuccess(appointmentData);
    }
    handleClose();
  };
  
  // 🎬 DEBUG LOG
  if (isModalOpen && finalAppointment) {
    console.log('🎬 [ModalCriarAgendamento RENDER]');
    console.log('   loadedAppointment:', !!loadedAppointment);
    console.log('   appointment prop:', !!appointment);
    console.log('   data prop:', !!data);
    console.log('   → finalAppointment:', finalAppointment ? 'SIM' : 'NÃO');
    if (finalAppointment) {
      console.log('   finalAppointment.professionalId:', finalAppointment.professionalId);
      console.log('   finalAppointment.professional_id:', finalAppointment.professional_id);
    }
  }
  
  return (
    <AppointmentUnitedModal
      isOpen={isModalOpen}
      onClose={handleClose}
      mode={determinedMode}
      appointment={finalAppointment}
      appointmentIdToEdit={appointmentIdToEdit}
      arrivals={arrivals}
      onArrivalsUpdate={onArrivalsUpdate}
      onSuccess={handleSuccess}
      professionals={professionals}
      services={services}
      payers={payers}
      rooms={roomsList}
    />
  );
}
