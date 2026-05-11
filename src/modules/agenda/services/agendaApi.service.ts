/**
 * 🌐 AGENDA API SERVICE
 * ====================
 *
 * Serviço que encapsula integração com Backend API
 * Centraliza todas as chamadas HTTP para agendamentos
 * Independent de UI components
 */

import {
  Appointment,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  UpdateAppointmentStatusPayload,
  PaginatedAppointments,
  AgendaFilters,
  ApiResponse,
  ApiErrorResponse,
} from '../types';
import { buildFilterQuery } from './appointments.service';

// ============================================================================
// 1. SUPABASE CLIENT SINGLETON
// ============================================================================

// Importa cliente existente do projeto
// Este é o ponto de integração com o código legado
let supabaseClient: any = null;

/**
 * Obtém instância do cliente Supabase
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    try {
      // Import dinâmico do cliente existente
      import('@/lib/customSupabaseClient').then(module => {
        supabaseClient = module.default;
      });
    } catch (error) {
      console.error('Failed to load Supabase client', error);
      throw new Error('Supabase client not initialized');
    }
  }
  return supabaseClient;
}

/**
 * Define cliente Supabase (para testes)
 */
export function setSupabaseClient(client: any) {
  supabaseClient = client;
}

// ============================================================================
// 2. OPERAÇÕES DE LEITURA
// ============================================================================

/**
 * Lista agendamentos com filtros e paginação
 */
export async function listAppointments(options: {
  clinicId: string;
  filters?: AgendaFilters;
  limit?: number;
  offset?: number;
}): Promise<Appointment[]> {
  try {
    const client = getSupabaseClient();

    let query = client
      .from('appointments')
      .select(
        `
        *,
        patient:patient_id(id, name, email, phone),
        professional:professional_id(id, name),
        room:room_id(id, name),
        payer:payer_id(id, name, type),
        plan:plan_id(id, name)
      `
      )
      .eq('clinic_id', options.clinicId);

    // Aplicar filtros
    if (options.filters?.dateFrom) {
      query = query.gte('scheduled_date', options.filters.dateFrom);
    }

    if (options.filters?.dateTo) {
      query = query.lte('scheduled_date', options.filters.dateTo);
    }

    if (options.filters?.professionalId) {
      query = query.eq('professional_id', options.filters.professionalId);
    }

    if (options.filters?.roomId) {
      query = query.eq('room_id', options.filters.roomId);
    }

    if (options.filters?.payerId) {
      query = query.eq('payer_id', options.filters.payerId);
    }

    if (options.filters?.status && options.filters.status.length > 0) {
      query = query.in('status', options.filters.status);
    }

    // Paginação
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Ordenação
    query = query.order('scheduled_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }

    return (data || []) as Appointment[];
  } catch (error) {
    console.error('listAppointments error:', error);
    throw error;
  }
}

/**
 * Obtém um agendamento específico
 */
export async function getAppointment(appointmentId: string): Promise<Appointment | null> {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('appointments')
      .select(
        `
        *,
        patient:patient_id(id, name, email, phone),
        professional:professional_id(id, name),
        room:room_id(id, name),
        payer:payer_id(id, name, type),
        plan:plan_id(id, name)
      `
      )
      .eq('id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = row not found
      console.error('Error fetching appointment:', error);
      throw error;
    }

    return (data || null) as Appointment | null;
  } catch (error) {
    console.error('getAppointment error:', error);
    throw error;
  }
}

/**
 * Verifica disponibilidade de um slot
 */
export async function checkAvailability(options: {
  clinicId: string;
  professionalId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  excludeAppointmentId?: string;
}): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { clinicId, professionalId, scheduledDate, scheduledTime, duration, excludeAppointmentId } = options;

    // Calcula hora final
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    let query = client
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .eq('scheduled_date', scheduledDate)
      .not('status', 'in', '(cancelled,no_show)');

    // Verifica sobreposição de horários
    query = query.or(
      `and(scheduled_time.lt.${endTime},end_time.gt.${scheduledTime})`
    );

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking availability:', error);
      throw error;
    }

    // Se encontrou conflitos, não há disponibilidade
    return (data || []).length === 0;
  } catch (error) {
    console.error('checkAvailability error:', error);
    throw error;
  }
}

// ============================================================================
// 3. OPERAÇÕES DE ESCRITA
// ============================================================================

/**
 * Cria novo agendamento
 */
export async function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<Appointment> {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('appointments')
      .insert([payload])
      .select(
        `
        *,
        patient:patient_id(id, name, email, phone),
        professional:professional_id(id, name),
        room:room_id(id, name),
        payer:payer_id(id, name, type),
        plan:plan_id(id, name)
      `
      )
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }

    return data as Appointment;
  } catch (error) {
    console.error('createAppointment error:', error);
    throw error;
  }
}

/**
 * Atualiza agendamento existente
 */
export async function updateAppointment(
  appointmentId: string,
  payload: UpdateAppointmentPayload,
): Promise<Appointment> {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('appointments')
      .update(payload)
      .eq('id', appointmentId)
      .select(
        `
        *,
        patient:patient_id(id, name, email, phone),
        professional:professional_id(id, name),
        room:room_id(id, name),
        payer:payer_id(id, name, type),
        plan:plan_id(id, name)
      `
      )
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }

    return data as Appointment;
  } catch (error) {
    console.error('updateAppointment error:', error);
    throw error;
  }
}

/**
 * Atualiza apenas status
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  payload: UpdateAppointmentStatusPayload,
): Promise<Appointment> {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('appointments')
      .update({ status: payload.status })
      .eq('id', appointmentId)
      .select(
        `
        *,
        patient:patient_id(id, name, email, phone),
        professional:professional_id(id, name),
        room:room_id(id, name),
        payer:payer_id(id, name, type),
        plan:plan_id(id, name)
      `
      )
      .single();

    if (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }

    return data as Appointment;
  } catch (error) {
    console.error('updateAppointmentStatus error:', error);
    throw error;
  }
}

/**
 * Deleta agendamento
 */
export async function deleteAppointment(appointmentId: string): Promise<void> {
  try {
    const client = getSupabaseClient();

    const { error } = await client
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  } catch (error) {
    console.error('deleteAppointment error:', error);
    throw error;
  }
}

// ============================================================================
// 4. REALTIME SUBSCRIPTIONS
// ============================================================================

export type RealtimeCallback = (appointment: Appointment) => void;
export type RealtimeErrorCallback = (error: Error) => void;

const subscriptions = new Map<string, () => void>();

/**
 * Se inscreve para mudanças em tempo real
 */
export function subscribeToAppointments(options: {
  clinicId: string;
  onInsert?: RealtimeCallback;
  onUpdate?: RealtimeCallback;
  onDelete?: RealtimeCallback;
  onError?: RealtimeErrorCallback;
}): string {
  try {
    const client = getSupabaseClient();
    const subscriptionId = `appointments-${options.clinicId}-${Date.now()}`;

    const channel = client
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${options.clinicId}`,
        },
        payload => {
          if (options.onInsert) {
            options.onInsert(payload.new as Appointment);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${options.clinicId}`,
        },
        payload => {
          if (options.onUpdate) {
            options.onUpdate(payload.new as Appointment);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${options.clinicId}`,
        },
        payload => {
          if (options.onDelete) {
            options.onDelete(payload.old as Appointment);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to appointments: ${subscriptionId}`);
        } else if (status === 'CHANNEL_ERROR') {
          if (options.onError) {
            options.onError(new Error('Channel error'));
          }
        }
      });

    // Armazena unsubscribe
    subscriptions.set(subscriptionId, () => {
      client.removeChannel(channel);
    });

    return subscriptionId;
  } catch (error) {
    console.error('subscribeToAppointments error:', error);
    if (options.onError) {
      options.onError(error as Error);
    }
    throw error;
  }
}

/**
 * Desinscreve de updates em tempo real
 */
export function unsubscribeFromAppointments(subscriptionId: string): void {
  const unsubscribe = subscriptions.get(subscriptionId);
  if (unsubscribe) {
    unsubscribe();
    subscriptions.delete(subscriptionId);
    console.log(`✅ Unsubscribed: ${subscriptionId}`);
  }
}

/**
 * Desinscreve de todas as assinaturas
 */
export function unsubscribeFromAll(): void {
  subscriptions.forEach(unsubscribe => {
    unsubscribe();
  });
  subscriptions.clear();
  console.log('✅ Unsubscribed from all');
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  getSupabaseClient,
  setSupabaseClient,
  listAppointments,
  getAppointment,
  checkAvailability,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  subscribeToAppointments,
  unsubscribeFromAppointments,
  unsubscribeFromAll,
};
