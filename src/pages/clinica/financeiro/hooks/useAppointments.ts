import { useState, useEffect } from 'react';
import { customSupabaseClient } from '@/lib/customSupabaseClient';

export interface Appointment {
  id: string;
  patient_id: string;
  patient?: { name: string };
  professional_id: string;
  professional?: { name: string };
  service_id: string;
  service?: { name: string; price: number };
  status:
    | 'agendado'
    | 'confirmado'
    | 'aguardando_profissional'
    | 'em_atendimento'
    | 'concluido'
    | 'cancelado';
  start_time: string;
  end_time: string;
  clinic_id: string;
}

export function useAppointments(clinicId: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!clinicId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await customSupabaseClient
        .from('appointments')
        .select(
          `
          id,
          patient_id,
          professional_id,
          service_id,
          status,
          start_time,
          end_time,
          clinic_id,
          patients(name),
          professionals(name),
          services(name, price)
        `,
        )
        .eq('clinic_id', clinicId)
        .eq('status', 'aguardando_profissional')
        .order('start_time', { ascending: true });

      if (err) throw err;

      const appointmentsWithRelations: Appointment[] = (data || []).map((apt: any) => ({
        id: apt.id,
        patient_id: apt.patient_id,
        patient: apt.patients,
        professional_id: apt.professional_id,
        professional: apt.professionals,
        service_id: apt.service_id,
        service: apt.services,
        status: apt.status,
        start_time: apt.start_time,
        end_time: apt.end_time,
        clinic_id: apt.clinic_id,
      }));

      setAppointments(appointmentsWithRelations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar atendimentos';
      setError(errorMessage);
      console.error('Erro ao buscar atendimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [clinicId]);

  // Find appointments for a specific patient
  const findPatientAppointments = (patientId: string) => {
    return appointments.filter(
      (apt) => apt.patient_id === patientId && apt.status === 'aguardando_profissional',
    );
  };

  // Find ready appointments (awaiting professional)
  const getReadyAppointments = () => {
    return appointments.filter((apt) => apt.status === 'aguardando_profissional');
  };

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    findPatientAppointments,
    getReadyAppointments,
  };
}
