/**
 * Patients API Service
 * Operações de pacientes
 */

import { queryTableByClinic, insertIntoTable, updateInTable } from './baseService';
import { getSupabaseClient } from '@/services/supabase/supabaseClient';

const supabase = getSupabaseClient();

/**
 * Lista pacientes da clínica
 */
export const listPatients = async (clinicId, filters = {}) => {
  return queryTableByClinic('patients', clinicId, filters);
};

/**
 * Obtém paciente por ID
 */
export const getPatientById = async (id, clinicId) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get patient error:', error);
    return { data: null, error };
  }
};

/**
 * Cria novo paciente
 */
export const createPatient = async (clinicId, payload) => {
  return insertIntoTable('patients', payload, clinicId);
};

/**
 * Atualiza paciente
 */
export const updatePatient = async (id, clinicId, payload) => {
  return updateInTable('patients', id, payload, clinicId);
};

/**
 * Busca pacientes por CPF ou nome
 */
export const searchPatients = async (clinicId, searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`cpf.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Search patients error:', error);
    return { data: null, error };
  }
};
