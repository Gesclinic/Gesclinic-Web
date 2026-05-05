// src/lib/roomServicesApi.js
// ============================================================
// API - Room Services (M:M de Salas × Serviços)
// ============================================================

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

/**
 * Lista todos os serviços atribuídos a salas
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listRoomServices(clinicId) {
  const { data, error } = await supabase
    .from('room_services')
    .select(
      `
      id,
      room_id,
      service_id,
      active,
      rooms(id, name),
      services(id, name, code)
    `,
    )
    .eq('clinic_id', clinicId)
    .order('rooms(name)', { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar serviços de salas: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Obtém serviços de uma sala específica
 * @param {string} roomId
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function getRoomServices(roomId, clinicId) {
  const { data, error } = await supabase
    .from('room_services')
    .select(
      `
      id,
      room_id,
      service_id,
      active,
      services(id, name, code)
    `,
    )
    .eq('room_id', roomId)
    .eq('clinic_id', clinicId)
    .eq('active', true);

  if (error) {
    throw new Error(`Falha ao obter serviços da sala: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Cria atribuição de serviço a sala
 * @param {string} clinicId
 * @param {Object} data - { room_id, service_id, active }
 * @returns {Promise<Object>}
 */
export async function createRoomService(clinicId, data) {
  const { room_id, service_id, active = true } = data;

  // Verificar se já existe
  const existing = await supabase
    .from('room_services')
    .select('id')
    .eq('room_id', room_id)
    .eq('service_id', service_id)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (existing.data) {
    throw new Error('Este serviço já está atribuído a esta sala');
  }

  const { data: roomService, error } = await supabase
    .from('room_services')
    .insert([
      {
        clinic_id: clinicId,
        room_id,
        service_id,
        active,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao criar atribuição: ${error.message}`);
  }
  return roomService;
}

/**
 * Atualiza atribuição de serviço
 * @param {string} id
 * @param {string} clinicId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateRoomService(id, clinicId, updates) {
  const { data, error } = await supabase
    .from('room_services')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select();

  if (error) {
    throw new Error(`Falha ao atualizar atribuição: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Atribuição não encontrada');
  }

  return data[0];
}

/**
 * Deleta atribuição de serviço
 * @param {string} id
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function deleteRoomService(id, clinicId) {
  const { data, error } = await supabase
    .from('room_services')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao deletar atribuição: ${error.message}`);
  }
  return data;
}

/**
 * Desativa atribuição (soft delete)
 * @param {string} id
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function deactivateRoomService(id, clinicId) {
  return updateRoomService(id, clinicId, { active: false });
}
