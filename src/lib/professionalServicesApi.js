// src/lib/professionalServicesApi.js
// ============================================================
// API - Vínculo Profissional x Serviço
// ============================================================

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

/**
 * Lista todos os profissionais vinculados a um serviço
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listProfessionalsByService(serviceId, clinicId) {
  const { data, error } = await supabase
    .from('professional_services')
    .select(
      `
      id,
      professional_id,
      service_id,
      competence_level,
      duration_minutes_override,
      active,
      professionals(id, name, email, specialization)
    `,
    )
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('professionals(name)', { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar profissionais: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Lista todos os serviços vinculados a um profissional
 * @param {string} professionalId
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listServicesByProfessional(professionalId, clinicId) {
  const { data, error } = await supabase
    .from('professional_services')
    .select(
      `
      id,
      professional_id,
      service_id,
      competence_level,
      duration_minutes_override,
      active,
      services(id, code, name, duration_minutes, active)
    `,
    )
    .eq('professional_id', professionalId)
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('services(name)', { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar serviços: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Vincula um profissional a um serviço
 * @param {string} professionalId
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {Object} options - { competenceLevel, durationMinutesOverride }
 * @returns {Promise<Object>}
 */
export async function linkProfessionalService(professionalId, serviceId, clinicId, options = {}) {
  const { competence_level = 'standard', duration_minutes_override = null } = options;

  const { data, error } = await supabase
    .from('professional_services')
    .insert([
      {
        professional_id: professionalId,
        service_id: serviceId,
        clinic_id: clinicId,
        competence_level,
        duration_minutes_override,
        active: true,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este profissional já está vinculado a este serviço');
    }
    throw new Error(`Falha ao vincular profissional: ${error.message}`);
  }

  return data;
}

/**
 * Desvincula um profissional de um serviço (inativa apenas)
 * @param {string} professionalId
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function unlinkProfessionalService(professionalId, serviceId, clinicId) {
  const { data, error } = await supabase
    .from('professional_services')
    .update({ active: false, updated_at: new Date() })
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao desvincar: ${error.message}`);
  }
  return data;
}

/**
 * Atualiza dados do vínculo
 * @param {string} professionalId
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateProfessionalService(professionalId, serviceId, clinicId, updates = {}) {
  const { data, error } = await supabase
    .from('professional_services')
    .update({
      ...updates,
      updated_at: new Date(),
    })
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao atualizar vínculo: ${error.message}`);
  }
  return data;
}

/**
 * Verifica se profissional pode atender serviço
 * @param {string} professionalId
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<boolean>}
 */
export async function canProfessionalServe(professionalId, serviceId, clinicId) {
  const { data, error } = await supabase
    .from('professional_services')
    .select('id')
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao validar vínculo: ${error.message}`);
  }
  return !!data;
}

/** Obtém o vínculo ativo usado pelas validações de agenda e check-in. */
export async function getProfessionalServiceData(professionalId, serviceId, clinicId) {
  const { data, error } = await supabase
    .from('professional_services')
    .select('id, professional_id, service_id, competence_level, duration_minutes_override, active')
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new Error(`Falha ao obter vínculo: ${error.message}`);
  return data;
}

/** Cria ou reativa o vínculo sem criar uma segunda linha para o mesmo par. */
export async function upsertProfessionalService(professionalId, serviceId, clinicId) {
  if (!clinicId) throw new Error('Clínica não informada');
  const { data: existing, error } = await supabase
    .from('professional_services')
    .select('id, active')
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao consultar vínculo: ${error.message}`);
  if (existing?.active) return existing;
  if (existing) return updateProfessionalService(professionalId, serviceId, clinicId, { active: true });
  return linkProfessionalService(professionalId, serviceId, clinicId);
}

/**
 * Obtém duração do atendimento (com override se houver)
 * @param {string} professionalId
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<number>} duração em minutos
 */
export async function getServiceDuration(professionalId, serviceId, clinicId) {
  const { data: psData } = await supabase
    .from('professional_services')
    .select('duration_minutes_override')
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (psData?.duration_minutes_override) {
    return psData.duration_minutes_override;
  }

  // Fallback para duração padrão do serviço
  const { data: serviceData } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  return serviceData?.duration_minutes || 30;
}

/**
 * Valida integridade: serviço tem profissionais?
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<{valid: boolean, count: number}>}
 */
export async function validateServiceHasProfessionals(serviceId, clinicId) {
  const { count, error } = await supabase
    .from('professional_services')
    .select('id', { count: 'exact' })
    .eq('service_id', serviceId)
    .eq('clinic_id', clinicId)
    .eq('active', true);

  if (error) {
    throw error;
  }

  return {
    valid: (count || 0) > 0,
    count: count || 0,
  };
}

/**
 * Obtém todos os vínculo para uma clínica
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function getAllProfessionalServices(clinicId) {
  const { data, error } = await supabase
    .from('professional_services')
    .select(
      `
      id,
      professional_id,
      service_id,
      competence_level,
      duration_minutes_override,
      active,
      professionals(name, specialization),
      services(code, name)
    `,
    )
    .eq('clinic_id', clinicId)
    .eq('active', true);

  if (error) {
    throw new Error(`Falha ao listar vínculos: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Get professional services for a specific professional
 */
export async function getProfessionalServicesByProfessional(professionalId) {
  const { data, error } = await supabase
    .from('professional_services')
    .select(
      `
      id,
      professional_id,
      service_id,
      competence_level,
      duration_minutes_override,
      active,
      services(id, name, code)
    `,
    )
    .eq('professional_id', professionalId)
    .eq('active', true);

  if (error) {
    throw new Error(`Falha ao listar serviços do profissional: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Cria um novo vínculo profissional-serviço (para uso em formulários CRUD)
 * @param {string} clinicId
 * @param {Object} data - { professional_id, service_id, active }
 * @returns {Promise<Object>}
 */
export async function createProfessionalService(clinicId, data) {
  const { data: result, error } = await supabase
    .from('professional_services')
    .insert([
      {
        clinic_id: clinicId,
        professional_id: data.professional_id,
        service_id: data.service_id,
        active: data.active ?? true,
        competence_level: 'standard',
      },
    ])
    .select();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este profissional já possui este serviço registrado');
    }
    throw new Error(`Falha ao criar vínculo: ${error.message}`);
  }

  if (!result?.length) throw new Error('Vínculo não encontrado');
  return result[0];
}

/**
 * Atualiza um vínculo profissional-serviço por ID (para uso em formulários CRUD)
 * @param {string} id - ID do vínculo
 * @param {Object} data - { professional_id, service_id, active }
 * @returns {Promise<Object>}
 */
export async function updateProfessionalServiceById(id, data) {
  const { data: result, error } = await supabase
    .from('professional_services')
    .update({
      professional_id: data.professional_id,
      service_id: data.service_id,
      active: data.active ?? true,
      duration_minutes_override: data.duration_minutes_override ?? null,
      competence_level: data.competence_level ?? 'standard',
      // NOTE: updated_at is automatically handled by the database trigger
    })
    .eq('id', id)
    .select();

  if (error) {
    throw new Error(`Falha ao atualizar vínculo: ${error.message}`);
  }
  if (!result?.length) throw new Error('Vínculo não encontrado');
  return result[0];
}

/**
 * Deleta um vínculo profissional-serviço por ID
 * @param {string} id - ID do vínculo
 * @returns {Promise<boolean>}
 */
export async function deleteProfessionalService(id) {
  const { error } = await supabase.from('professional_services').delete().eq('id', id);

  if (error) {
    throw new Error(`Falha ao deletar vínculo: ${error.message}`);
  }
  return true;
}

// Alias para compatibilidade - DEPRECATED: use getProfessionalServicesByProfessional instead
export const getProfessionalServices = getProfessionalServicesByProfessional;
