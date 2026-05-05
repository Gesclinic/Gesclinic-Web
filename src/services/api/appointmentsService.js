/**
 * Appointments API Service
 * Operações de agendamentos
 */

import { queryTableByClinic, insertIntoTable, updateInTable } from './baseService';
import { getSupabaseClient } from '@/services/supabase/supabaseClient';

const supabase = getSupabaseClient();

/**
 * Lista agendamentos da clínica
 */
export const listAppointments = async (clinicId, filters = {}) => {
  return queryTableByClinic('appointments', clinicId, filters);
};

/**
 * Obtém agendamento por ID
 */
export const getAppointmentById = async (id, clinicId) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get appointment error:', error);
    return { data: null, error };
  }
};

/**
 * Cria novo agendamento
 */
export const createAppointment = async (clinicId, payload) => {
  return insertIntoTable('appointments', payload, clinicId);
};

/**
 * Atualiza agendamento
 */
export const updateAppointment = async (id, clinicId, payload) => {
  return updateInTable('appointments', id, payload, clinicId);
};

/**
 * Lista agendamentos por data
 */
export const listAppointmentsByDateRange = async (clinicId, startDate, endDate, filters = {}) => {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('start_time', startDate)
      .lte('start_time', endDate);

    // Aplica filtros adicionais
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('List appointments by date error:', error);
    return { data: null, error };
  }
};
