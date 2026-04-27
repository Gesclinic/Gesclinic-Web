import { useState } from 'react';

/**
 * Hook para gerenciar estado do formulário de agendamento
 * 
 * Responsabilidades:
 * - Manter estado centralizado do formulário
 * - Preencher com dados do agendamento
 * - Reset para novo agendamento
 * 
 * @returns {Object} { formData, setFormData, fillFromAppointment, reset }
 */
export function useAppointmentForm() {

  const getEmpty = () => ({
    patient_id: '',
    professional_id: '',
    service_id: '',
    payer_id: '',
    room_id: '',
    scheduled_date: '',
    scheduled_time: '',
    value: '',
    status: 'scheduled',
    notes: ''
  });

  const [formData, setFormData] = useState(getEmpty());

  /**
   * Preenche o formulário com dados de um agendamento existente
   * @param {Object} apt - Agendamento com dados em snake_case (do banco)
   */
  const fillFromAppointment = (apt) => {
    if (!apt) return;

    console.log('🔧 [useAppointmentForm] fillFromAppointment chamado com:', apt.id);

    setFormData({
      patient_id: apt.patient_id || '',
      professional_id: apt.professional_id || '',
      service_id: apt.service_id || '',
      payer_id: apt.payer_id || '',
      room_id: apt.room_id || '',
      scheduled_date: apt.scheduled_date || '',
      scheduled_time: apt.scheduled_time || '',
      value: apt.value || '',
      status: apt.status || 'scheduled',
      notes: apt.notes || ''
    });

    console.log('✅ [useAppointmentForm] Formulário preenchido:', {
      payer_id: apt.payer_id,
      room_id: apt.room_id,
      professional_id: apt.professional_id,
    });
  };

  /**
   * Reseta o formulário para valores vazios
   */
  const reset = () => {
    console.log('🔄 [useAppointmentForm] Reset chamado');
    setFormData(getEmpty());
  };

  return {
    formData,
    setFormData,
    fillFromAppointment,
    reset
  };
}
