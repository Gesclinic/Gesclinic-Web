// src/lib/roomsApi.js
import { supabase } from '@/lib/customSupabaseClient';

/**
 * API para gerenciar salas de atendimento
 */

/**
 * Listar todas as salas de uma clÃ­nica
 * @param {string} clinicId - ID da clÃ­nica
 * @returns {Promise<Array>}
 */
export async function listRooms(clinicId) {
  if (!clinicId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) {
      console.error('âŒ Erro ao buscar salas:', error.message);
      return [];
    }

    console.log('âœ… Salas carregadas:', data);
    return data || [];
  } catch (err) {
    console.error('âŒ Erro ao buscar salas:', err);
    return [];
  }
}

/**
 * Obter uma sala especÃ­fica
 * @param {string} roomId - ID da sala
 * @returns {Promise<Object|null>}
 */
export async function getRoomById(roomId) {
  if (!roomId) {
    return null;
  }

  try {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();

    if (error) {
      console.error('Erro ao buscar sala:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Erro inesperado ao buscar sala:', err);
    return null;
  }
}

/**
 * Criar nova sala
 * @param {Object} roomData - Dados da sala { clinic_id, name, description, capacity }
 * @returns {Promise<Object|null>}
 */
export async function createRoom(roomData) {
  if (!roomData.clinic_id || !roomData.name) {
    throw new Error('clinic_id e name sÃ£o obrigatÃ³rios');
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          ...roomData,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Erro ao criar sala:', err);
    throw err;
  }
}

/**
 * Atualizar sala
 * @param {string} roomId - ID da sala
 * @param {Object} updates - Dados a atualizar
 * @returns {Promise<Object|null>}
 */
export async function updateRoom(roomId, updates) {
  if (!roomId) {
    return null;
  }

  try {
    const { data, error } = await supabase.from('rooms').update(updates).eq('id', roomId).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (error) {
      console.error('Erro ao atualizar sala:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Erro inesperado ao atualizar sala:', err);
    return null;
  }
}

/**
 * Inativar sala
 * @param {string} roomId - ID da sala
 * @returns {Promise<boolean>}
 */
export async function deactivateRoom(roomId) {
  if (!roomId) {
    return false;
  }

  try {
    const { error } = await supabase.from('rooms').update({ is_active: false }).eq('id', roomId);

    if (error) {
      console.error('Erro ao inativar sala:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erro inesperado ao inativar sala:', err);
    return false;
  }
}
