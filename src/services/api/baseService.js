/**
 * API Base Service
 * Centraliza operações comuns de API
 */

import { getSupabaseClient } from '@/services/supabase/supabaseClient';
import { requireAuth, requireClinicContext } from '@/guards/authGuard';

const supabase = getSupabaseClient();

/**
 * Executa query em tabela com filtro por clinic_id
 */
export const queryTableByClinic = async (table, clinicId, filters = {}) => {
  try {
    let query = supabase.from(table).select('*');

    // Sempre filtra por clinic_id para RLS
    query = query.eq('clinic_id', clinicId);

    // Aplica filtros adicionais
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object') {
          // Range filters, etc
          query = query.gte(key, value.gte).lte(key, value.lte);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Query error on ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Insere registros com clinic_id automático
 */
export const insertIntoTable = async (table, payload, clinicId) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert({
        ...payload,
        clinic_id: clinicId,
      })
      .select();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Insert error on ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Atualiza registros com validação de clinic_id
 */
export const updateInTable = async (table, id, payload, clinicId) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Update error on ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Deleta registros com validação de clinic_id
 */
export const deleteFromTable = async (table, id, clinicId) => {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id).eq('clinic_id', clinicId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    console.error(`Delete error on ${table}:`, error);
    return { error };
  }
};

/**
 * Executa RPC com autenticação
 */
export const executeRPC = async (functionName, params = {}) => {
  try {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error(`RPC error on ${functionName}:`, error);
    return { data: null, error };
  }
};
