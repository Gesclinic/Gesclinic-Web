import { supabase } from './customSupabaseClient.js';

const sanitizeForLike = (s) => String(s ?? '').replace(/[%_]/g, (m) => `\\${m}`);

export const listAppointmentsRange = async (clinicId, from, to, freeText, professionalId) => {
  console.log('🔍 === API listAppointmentsRange CHAMADA ===');
  console.log('🔍 ClinicId recebido:', clinicId);
  console.log('🔍 From:', from);
  console.log('🔍 To:', to);

  if (!clinicId) {
    throw new Error('clinicId é obrigatório');
  }

  // Usar RPC se disponível
  try {
    const { data, error } = await supabase.rpc('list_appointments_enhanced', {
      p_clinic_id: clinicId,
      p_start_date: from?.toISOString() || new Date(0).toISOString(),
      p_end_date: to?.toISOString() || new Date().toISOString(),
      p_professional_id:
        professionalId && professionalId !== 'todos' && professionalId !== ''
          ? professionalId
          : null,
      p_status: null,
    });

    if (error) {
      console.log('🔄 RPC failed, using direct query:', error);
      throw error;
    }

    console.log('✅ RPC data:', data);
    return data || [];
  } catch (rpcError) {
    console.log('🔄 Fallback to direct query due to:', rpcError.message);

    const selectCols = `
      id, clinic_id, professional_id, patient_id, service_id, start_time, end_time, 
      status, is_fit, price, payer_id, plan_id, notes, is_blocked, phone
    `;

    let query = supabase
      .from('appointments')
      .select(selectCols)
      .eq('clinic_id', clinicId)
      .order('start_time', { ascending: true });

    if (from instanceof Date) {
      query = query.gte('start_time', from.toISOString());
    }
    if (to instanceof Date) {
      query = query.lt('end_time', to.toISOString());
    }
    if (professionalId && professionalId !== 'todos' && professionalId !== '') {
      query = query.eq('professional_id', professionalId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Direct query error:', error);
      throw new Error(error.message);
    }

    console.log('🔍 Direct query data:', data);

    // Enriquecer dados
    const enrichedData = await Promise.all(
      (data || []).map(async (appointment) => {
        const enriched = { ...appointment };

        // Buscar nome do paciente
        if (appointment.patient_id) {
          try {
            const { data: patient } = await supabase
              .from('patients')
              .select('full_name, record_number')
              .eq('id', appointment.patient_id)
              .single();

            if (patient) {
              const nomeLimpo = patient.full_name
                ? String(patient.full_name)
                    .replace(
                      /\s*[-–—()\[\]{}]*\s*(\+?\d{2,3}\s*)?(\(?\d{2,3}\)?\s*)?\d{4,5}[-.\s]?\d{4}\s*$/g,
                      '',
                    )
                    .trim()
                : '';

              enriched.patient_name = nomeLimpo;
              enriched.record_number = patient.record_number || null;
            } else {
              enriched.record_number = null;
            }
          } catch (err) {
            console.warn('Failed to fetch patient:', err);
            enriched.patient_name = appointment.is_blocked
              ? 'Bloqueio de Agenda'
              : 'Paciente não informado';
          }
        } else {
          enriched.patient_name = appointment.is_blocked
            ? 'Bloqueio de Agenda'
            : 'Paciente não informado';
        }

        // Nome do profissional
        if (appointment.professional_id) {
          try {
            const { data: professional } = await supabase
              .from('professionals')
              .select('name')
              .eq('id', appointment.professional_id)
              .single();

            if (professional) {
              enriched.professional_name = professional.name;
            }
          } catch (err) {
            console.warn('Failed to fetch professional:', err);
            enriched.professional_name = 'Profissional não informado';
          }
        }

        // Nome do serviço
        if (appointment.service_id) {
          try {
            const { data: service } = await supabase
              .from('services')
              .select('name')
              .eq('id', appointment.service_id)
              .single();

            if (service) {
              enriched.service_name = service.name;
            }
          } catch (err) {
            enriched.service_name = 'Serviço não informado';
          }
        }

        return enriched;
      }),
    );

    console.log('🔍 Enriched data:', enrichedData);
    return enrichedData;
  }
};

export const getAppointmentById = async (appointmentId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      *,
      patients:patient_id(id, name, document_id, phone, cell_phone, prontuario_numero),
      professionals:professional_id(id, name),
      services:service_id(id, name, code, tuss_code),
      rooms:room_id(id, name),
      payers:payer_id(id, name),
      plans:plan_id(id, name)
    `,
    )
    .eq('id', appointmentId)
    .single();

  if (error) {
    console.error('[agendaApi.getAppointmentById] error', error);
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  // Mapear dados para o formato esperado
  return {
    ...data,
    patient_name: data.patients?.name,
    professional_name: data.professionals?.name,
    service_name: data.services?.name,
    payer_name: data.payers?.name,
    plan_name: data.plans?.name,
    record_number: data.patients?.prontuario_numero,
  };
};

// Atualização de status
export const updateAppointmentStatus = async (appointmentId, newStatus) => {
  console.log('🔄 Atualizando status do agendamento:', { appointmentId, newStatus });

  if (!appointmentId) {
    throw new Error('appointmentId é obrigatório');
  }
  if (!newStatus) {
    throw new Error('newStatus é obrigatório');
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw new Error(error.message);
    }

    console.log('✅ Status atualizado com sucesso:', data);
    return data[0];
  } catch (error) {
    console.error('❌ Erro na função updateAppointmentStatus:', error);
    throw error;
  }
};
