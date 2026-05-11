/**
 * Reception Module - API Services
 * 
 * Funções para interagir com a API de recepção
 * Incluindo check-in, fila de espera e operações realtime
 */

import { supabase } from '@/lib/customSupabaseClient';
import {
  ReceptionCheckIn,
  WaitingQueueAppointment,
  WaitingQueueStats,
  PerformCheckInResponse,
  ReceptionOperationalData,
  CheckInParams,
  WaitingQueueParams,
} from '../types/reception';
import { OfficialAppointmentStatus } from '@/modules/agenda/types';

/**
 * Realizar check-in de um paciente
 * 
 * Valida que agendamento está em status 'confirmed'
 * Cria registro em reception_checkins
 * Atualiza status para 'checked_in'
 */
export async function performCheckIn(
  params: CheckInParams & { checked_in_by: string }
): Promise<PerformCheckInResponse> {
  try {
    const { data, error } = await supabase.rpc('perform_checkin', {
      p_appointment_id: params.appointment_id,
      p_clinic_id: params.clinic_id,
      p_checked_in_by: params.checked_in_by,
      p_notes: params.notes || null,
    });

    if (error) {
      return {
        success: false,
        message: `Erro ao fazer check-in: ${error.message}`,
      };
    }

    const response = data as Array<PerformCheckInResponse>;
    return response[0] || { success: false, message: 'Resposta inválida' };
  } catch (err) {
    return {
      success: false,
      message: `Erro ao fazer check-in: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Obter fila de espera em tempo real
 * 
 * Retorna agendamentos com status checked_in ou waiting
 * Ordenados por tempo de check-in (primeiro que chegou, primeiro atendido)
 * Inclui cálculo de tempo de espera
 */
export async function getWaitingQueue(
  params: WaitingQueueParams
): Promise<{ queue: WaitingQueueAppointment[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('waiting_queue_view')
      .select('*')
      .eq('clinic_id', params.clinic_id)
      .order('checked_in_at', { ascending: true })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);

    if (error) {
      return {
        queue: [],
        error: `Erro ao buscar fila: ${error.message}`,
      };
    }

    return {
      queue: (data as WaitingQueueAppointment[]) || [],
    };
  } catch (err) {
    return {
      queue: [],
      error: `Erro ao buscar fila: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Calcular estatísticas da fila de espera
 */
export async function getWaitingQueueStats(
  clinic_id: string
): Promise<{ stats: WaitingQueueStats; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('waiting_queue_view')
      .select('tempo_espera_minutos, wait_priority')
      .eq('clinic_id', clinic_id);

    if (error) {
      return {
        stats: {
          total_waiting: 0,
          total_in_progress: 0,
          average_wait_time_minutes: 0,
          max_wait_time_minutes: 0,
          critical_count: 0,
          warning_count: 0,
        },
        error: `Erro ao calcular estatísticas: ${error.message}`,
      };
    }

    const queue = (data as Array<{ tempo_espera_minutos: number; wait_priority: string }>) || [];

    const stats: WaitingQueueStats = {
      total_waiting: queue.length,
      total_in_progress: 0, // TODO: buscar do status 'in_progress'
      average_wait_time_minutes:
        queue.length > 0
          ? Math.round(
              queue.reduce((sum, q) => sum + (q.tempo_espera_minutos || 0), 0) /
                queue.length
            )
          : 0,
      max_wait_time_minutes: Math.max(
        ...(queue.map((q) => q.tempo_espera_minutos || 0) || [0])
      ),
      critical_count: queue.filter((q) => q.wait_priority === 'critical').length,
      warning_count: queue.filter((q) => q.wait_priority === 'warning').length,
    };

    return { stats };
  } catch (err) {
    return {
      stats: {
        total_waiting: 0,
        total_in_progress: 0,
        average_wait_time_minutes: 0,
        max_wait_time_minutes: 0,
        critical_count: 0,
        warning_count: 0,
      },
      error: `Erro ao calcular estatísticas: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Obter dados operacionais completos da recepção
 * 
 * Agrupa agendamentos por:
 * - Próximos (waiting, primeiro da fila)
 * - Em atendimento (in_progress)
 * - Aguardando confirmação (confirmed, sem check-in)
 */
export async function getReceptionOperationalData(
  clinic_id: string
): Promise<{ data: ReceptionOperationalData; error?: string }> {
  try {
    // Buscar próximos (waiting, primeiro)
    const { data: next } = await supabase
      .from('waiting_queue_view')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('official_status', 'waiting')
      .order('checked_in_at', { ascending: true })
      .limit(1);

    // Buscar em atendimento
    const { data: inProgress } = await supabase
      .from('waiting_queue_view')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('official_status', 'in_progress')
      .order('checked_in_at', { ascending: true });

    // Buscar aguardando confirmação
    const { data: awaitingConfirm } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('official_status', 'confirmed')
      .order('scheduled_date', { ascending: true });

    // Buscar fila completa (checked_in + waiting)
    const { data: waiting } = await supabase
      .from('waiting_queue_view')
      .select('*')
      .eq('clinic_id', clinic_id)
      .order('checked_in_at', { ascending: true });

    return {
      data: {
        next_appointments: (next as WaitingQueueAppointment[]) || [],
        in_progress: (inProgress as WaitingQueueAppointment[]) || [],
        waiting: (waiting as WaitingQueueAppointment[]) || [],
        awaiting_confirmation: awaitingConfirm || [],
      },
    };
  } catch (err) {
    return {
      data: {
        next_appointments: [],
        in_progress: [],
        waiting: [],
        awaiting_confirmation: [],
      },
      error: `Erro ao buscar dados operacionais: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Obter check-in específico
 */
export async function getCheckIn(
  checkin_id: string
): Promise<{ checkin: ReceptionCheckIn | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('reception_checkins')
      .select('*')
      .eq('id', checkin_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      return {
        checkin: null,
        error: `Erro ao buscar check-in: ${error.message}`,
      };
    }

    return {
      checkin: (data as ReceptionCheckIn) || null,
    };
  } catch (err) {
    return {
      checkin: null,
      error: `Erro ao buscar check-in: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Atualizar notas do check-in
 */
export async function updateCheckInNotes(
  checkin_id: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('reception_checkins')
      .update({ notes })
      .eq('id', checkin_id);

    if (error) {
      return {
        success: false,
        error: `Erro ao atualizar notas: ${error.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Erro ao atualizar notas: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Obter histórico de check-ins de um agendamento
 */
export async function getCheckInHistory(
  appointment_id: string
): Promise<{ history: ReceptionCheckIn[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('reception_checkins')
      .select('*')
      .eq('appointment_id', appointment_id)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        history: [],
        error: `Erro ao buscar histórico: ${error.message}`,
      };
    }

    return {
      history: (data as ReceptionCheckIn[]) || [],
    };
  } catch (err) {
    return {
      history: [],
      error: `Erro ao buscar histórico: ${err instanceof Error ? err.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Subscribe em tempo real à fila de espera
 * 
 * Retorna unsubscribe function
 */
export function subscribeToWaitingQueue(
  clinic_id: string,
  callback: (queue: WaitingQueueAppointment[]) => void
): (() => void) {
  // Usar timestamp para garantir ID único
  const uniqueChannelId = `waiting_queue:${clinic_id}:${Date.now()}:${Math.random()}`;
  
  const channel = supabase
    .channel(uniqueChannelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reception_checkins',
        filter: `clinic_id=eq.${clinic_id}`,
      },
      () => {
        // Refetch ao mudança
        getWaitingQueue({ clinic_id }).then(({ queue }) => callback(queue));
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

/**
 * Subscribe em tempo real a mudanças de appointment status
 */
export function subscribeToAppointmentStatusChanges(
  clinic_id: string,
  callback: (event: any) => void
): (() => void) {
  // Usar timestamp para garantir ID único
  const uniqueChannelId = `appointments:${clinic_id}:${Date.now()}:${Math.random()}`;
  
  const channel = supabase
    .channel(uniqueChannelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `clinic_id=eq.${clinic_id}`,
      },
      callback
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
