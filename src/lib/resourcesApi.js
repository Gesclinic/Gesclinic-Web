// src/lib/resourcesApi.js
// ============================================================
// API - Recursos (Equipamentos, Insumos, Instrumentos)
// ============================================================

import { customSupabaseClient as supabase } from "@/lib/customSupabaseClient";

/**
 * Lista todos os recursos de uma clínica
 * @param {string} clinicId
 * @param {Object} options - { includeInactive: false, type: null }
 * @returns {Promise<Array>}
 */
export async function listResources(clinicId, options = {}) {
  const { includeInactive = false, type = null } = options;

  let query = supabase
    .from("resources")
    .select("id, code, name, description, type, category, is_consumable, requires_maintenance, active")
    .eq("clinic_id", clinicId)
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao listar recursos: ${error.message}`);
  return data ?? [];
}

/**
 * Obtém detalhes de um recurso
 * @param {string} resourceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getResource(resourceId, clinicId) {
  const { data, error } = await supabase
    .from("resources")
    .select(`
      id,
      code,
      name,
      description,
      type,
      category,
      is_consumable,
      requires_maintenance,
      last_maintenance_date,
      maintenance_interval_days,
      active,
      created_at
    `)
    .eq("id", resourceId)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) throw new Error(`Falha ao obter recurso: ${error.message}`);
  return data;
}

/**
 * Cria novo recurso
 * @param {string} clinicId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createResource(clinicId, data) {
  const {
    code,
    name,
    description = null,
    type = null,
    category = null,
    is_consumable = false,
    requires_maintenance = false,
  } = data;

  // Validar código único
  if (code) {
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("code", code)
      .maybeSingle();

    if (existing.data) {
      throw new Error(`Recurso com código "${code}" já existe`);
    }
  }

  const { data: resource, error } = await supabase
    .from("resources")
    .insert([
      {
        clinic_id: clinicId,
        code: code || null,
        name,
        description,
        type,
        category,
        is_consumable,
        requires_maintenance,
        active: true,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Código já cadastrado para esta clínica");
    }
    throw new Error(`Falha ao criar recurso: ${error.message}`);
  }

  return resource;
}

/**
 * Atualiza recurso
 * @param {string} resourceId
 * @param {string} clinicId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateResource(resourceId, clinicId, updates) {
  if (updates.code) {
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("code", updates.code)
      .neq("id", resourceId)
      .maybeSingle();

    if (existing.data) {
      throw new Error(`Código "${updates.code}" já existe`);
    }
  }

  const { data, error } = await supabase
    .from("resources")
    .update(updates)
    .eq("id", resourceId)
    .eq("clinic_id", clinicId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Falha ao atualizar recurso: ${error.message}`);
  return data;
}

/**
 * Desativa recurso
 * @param {string} resourceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function deactivateResource(resourceId, clinicId) {
  const { data, error } = await supabase
    .from("resources")
    .update({ active: false })
    .eq("id", resourceId)
    .eq("clinic_id", clinicId)
    .select();

  if (error) throw new Error(`Falha ao desativar recurso: ${error.message}`);
  
  if (!data || data.length === 0) {
    throw new Error('Recurso não encontrado');
  }
  
  return data[0];
}

/**
 * Lista recursos de uma sala
 * @param {string} roomId
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listRoomResources(roomId, clinicId) {
  const { data, error } = await supabase
    .from("room_resources")
    .select(`
      id,
      room_id,
      resource_id,
      quantity,
      is_fixed,
      active,
      resources(code, name, type)
    `)
    .eq("room_id", roomId)
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("resources(name)", { ascending: true });

  if (error) throw new Error(`Falha ao listar recursos da sala: ${error.message}`);
  return data ?? [];
}

/**
 * Aloca recurso em uma sala
 * @param {string} roomId
 * @param {string} resourceId
 * @param {string} clinicId
 * @param {Object} options - { quantity: 1, is_fixed: false }
 * @returns {Promise<Object>}
 */
export async function allocateResourceToRoom(
  roomId,
  resourceId,
  clinicId,
  options = {}
) {
  const { quantity = 1, is_fixed = false } = options;

  const { data, error } = await supabase
    .from("room_resources")
    .insert([
      {
        room_id: roomId,
        resource_id: resourceId,
        clinic_id: clinicId,
        quantity,
        is_fixed,
        active: true,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Recurso já alocado nesta sala");
    }
    throw new Error(`Falha ao alocar recurso: ${error.message}`);
  }

  return data;
}

/**
 * Remove alocação de recurso em sala
 * @param {string} roomId
 * @param {string} resourceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function deallocateResourceFromRoom(roomId, resourceId, clinicId) {
  const { data, error } = await supabase
    .from("room_resources")
    .update({ active: false })
    .eq("room_id", roomId)
    .eq("resource_id", resourceId)
    .eq("clinic_id", clinicId)
    .select();

  if (error) throw new Error(`Falha ao remover alocação: ${error.message}`);
  
  if (!data || data.length === 0) {
    throw new Error('Alocação não encontrada');
  }
  
  return data[0];
}

/**
 * Atualiza quantidade de recurso em sala
 * @param {string} roomId
 * @param {string} resourceId
 * @param {string} clinicId
 * @param {number} quantity
 * @returns {Promise<Object>}
 */
export async function updateRoomResourceQuantity(roomId, resourceId, clinicId, quantity) {
  const { data, error } = await supabase
    .from("room_resources")
    .update({ quantity })
    .eq("room_id", roomId)
    .eq("resource_id", resourceId)
    .eq("clinic_id", clinicId)
    .select();

  if (error) throw new Error(`Falha ao atualizar quantidade: ${error.message}`);
  
  if (!data || data.length === 0) {
    throw new Error('Recurso não encontrado');
  }
  
  return data[0];
}

/**
 * Obtém recursos que precisam de manutenção
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listResourcesRequiringMaintenance(clinicId) {
  const { data, error } = await supabase
    .from("resources")
    .select("id, code, name, last_maintenance_date, maintenance_interval_days")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .eq("requires_maintenance", true)
    .order("last_maintenance_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Registra manutenção de recurso
 * @param {string} resourceId
 * @param {string} clinicId
 * @param {Object} maintenanceData
 * @returns {Promise<Object>}
 */
export async function recordMaintenance(resourceId, clinicId, maintenanceData = {}) {
  const { data, error } = await supabase
    .from("resources")
    .update({
      last_maintenance_date: maintenanceData.date || new Date().toISOString().split('T')[0],
    })
    .eq("id", resourceId)
    .eq("clinic_id", clinicId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Conta recursos de uma clínica
 * @param {string} clinicId
 * @returns {Promise<number>}
 */
export async function countResources(clinicId) {
  const { count, error } = await supabase
    .from("resources")
    .select("id", { count: "exact" })
    .eq("clinic_id", clinicId)
    .eq("active", true);

  if (error) throw error;
  return count || 0;
}

/**
 * Busca recurso por código
 * @param {string} code
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getResourceByCode(code, clinicId) {
  const { data, error } = await supabase
    .from("resources")
    .select("id, code, name, type")
    .eq("code", code)
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Deleta recurso (soft delete - marca como inativo)
 * @param {string} resourceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function deleteResource(resourceId, clinicId) {
  return deactivateResource(resourceId, clinicId);
}

/**
 * Atualiza recurso com clinicId automático (compatibilidade com UI)
 * @param {string} resourceId
 * @param {Object} updates
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function updateResourceSimple(resourceId, updates, clinicId) {
  return updateResource(resourceId, clinicId, updates);
}

// Alias para compatibilidade com páginas que chamam getResources
export const getResources = listResources;
