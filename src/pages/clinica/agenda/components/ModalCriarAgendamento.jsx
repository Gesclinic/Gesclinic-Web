import React, { useState, useEffect } from 'react';
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
  
  // Carregar appointment quando appointmentIdToEdit muda
  useEffect(() => {
    if (appointmentIdToEdit) {
      console.log('📥 [ModalCriarAgendamento] Carregando agendamento:', appointmentIdToEdit);
      
      (async () => {
        try {
          const apt = await getAppointmentById(appointmentIdToEdit);
          
          if (apt) {
            console.log('✅ Agendamento carregado com mapping:', {
              id: apt.id,
              professionalId: apt.professionalId,
              patientId: apt.patientId,
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
    } else {
      setLoadedAppointment(null);
    }
  }, [appointmentIdToEdit]);
  
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
  
  // Determinar se o modal está aberto (compatível com ambas as interfaces)
  // Se 'open' for true (interface antiga), usa true. Caso contrário, usa 'isOpen'
  const isModalOpen = open === true ? true : isOpen;
  
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
  
  const finalAppointment = loadedAppointment || appointment || data;
  
  if (isModalOpen && finalAppointment) {
    console.log('🎬 [ModalCriarAgendamento RETURN - PRE RENDER]');
    console.log('   loadedAppointment:', loadedAppointment);
    console.log('   appointment prop:', appointment);
    console.log('   data prop:', data);
    console.log('   → finalAppointment RESULTADO:', finalAppointment);
    console.log('   finalAppointment.professionalId:', finalAppointment.professionalId);
    console.log('   finalAppointment.professional_id:', finalAppointment.professional_id);
    console.log('   finalAppointment keys:', Object.keys(finalAppointment));
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
