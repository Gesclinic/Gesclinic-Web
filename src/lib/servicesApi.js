import { supabase } from "@/lib/customSupabaseClient";
import { normalizeCodeCBHPM } from "@/utils/formatters/formatters";

/**
 * Lista todos os serviÃ§os de uma clÃ­nica
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listServices(clinicId) {
  console.log('ðŸ“‹ [listServices] Iniciando com clinicId:', clinicId);
  
  if (!clinicId) {
    console.log('ðŸ“‹ [listServices] Sem clinicId, retornando vazio');
    return [];
  }
  
  try {
    console.log('ðŸ“‹ [listServices] Executando query para clinic_id ==', clinicId);
    
    const { data, error } = await supabase
      .from("services")
      .select("id, name, code, description, default_duration_minutes, type_billing, allow_scheduling_fit, requires_authorization, base_value, service_category, is_billable, tuss_code, type_service, guide_type, unit_measure, cost_value, active")
      .eq("clinic_id", clinicId)
      .order("name", { ascending: true });
    
    console.log('ðŸ“‹ [listServices] Query executada. Resultado:', { count: data?.length || 0, error: error?.message || 'nenhum' });
    
    if (error) {
      console.error('ðŸ“‹ [listServices] Erro na query:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('ðŸ“‹ [listServices] Erro no try/catch:', err);
    throw err;
  }
}

/**
 * Cria um novo serviÃ§o
 * @param {string} clinicId
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
export async function createService(clinicId, serviceData) {
  if (!clinicId || !serviceData.name) {
    throw new Error("clinic_id e name sÃ£o obrigatÃ³rios");
  }

  const { data, error } = await supabase
    .from("services")
    .insert([
      {
        clinic_id: clinicId,
        name: serviceData.name,
        description: serviceData.description || null,
        default_duration_minutes: serviceData.default_duration_minutes || 30,
        type_billing: serviceData.type_billing || "per_consultation",
        allow_scheduling_fit: serviceData.allow_scheduling_fit !== false,
        requires_authorization: serviceData.requires_authorization || false,
        base_value: parseFloat(serviceData.base_value) || 0,
        code: serviceData.code ? normalizeCodeCBHPM(serviceData.code) : null,
        service_category: serviceData.service_category || "consultation",
        is_billable: serviceData.is_billable !== false,
        tuss_code: serviceData.tuss_code ? normalizeCodeCBHPM(serviceData.tuss_code) : null,
        type_service: serviceData.type_service || null,
        guide_type: serviceData.guide_type || null,
        unit_measure: serviceData.unit_measure || null,
        cost_value: serviceData.cost_value ? parseFloat(serviceData.cost_value) : 0,
        active: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza um serviÃ§o
 * @param {string} serviceId
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
export async function updateService(serviceId, serviceData) {
  // Normalizar cÃ³digos CBHPM/TUSS se fornecidos
  const normalizedData = {
    ...serviceData,
    ...(serviceData.code && { code: normalizeCodeCBHPM(serviceData.code) }),
    ...(serviceData.tuss_code && { tuss_code: normalizeCodeCBHPM(serviceData.tuss_code) }),
  };

  const { data, error } = await supabase
    .from("services")
    .update(normalizedData)
    .eq("id", serviceId)
    .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

  if (error) throw error;
  return data;
}

/**
 * Deleta um serviÃ§o (soft delete via active flag)
 * @param {string} serviceId
 * @returns {Promise<Object>}
 */
export async function deleteService(serviceId) {
  const { data, error } = await supabase
    .from("services")
    .update({ active: false })
    .eq("id", serviceId)
    .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

  if (error) throw error;
  return data;
}

/**
 * ============================================================
 * VALIDAÃ‡ÃƒO TISS PARA SERVIÃ‡OS
 * ============================================================
 */

/**
 * Valida se serviÃ§o tem campos obrigatÃ³rios para TISS
 * @param {Object} serviceData
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateServiceForTISS(serviceData) {
  const errors = [];

  // TUSS Code (obrigatÃ³rio)
  if (!serviceData.tuss_code) {
    errors.push("TUSS Code Ã© obrigatÃ³rio");
  } else if (serviceData.tuss_code.length !== 10) {
    errors.push("TUSS Code deve ter exatamente 10 dÃ­gitos");
  } else if (!/^\d{10}$/.test(serviceData.tuss_code)) {
    errors.push("TUSS Code deve conter apenas nÃºmeros");
  }

  // Type Service (obrigatÃ³rio)
  if (!serviceData.type_service) {
    errors.push("Tipo de ServiÃ§o Ã© obrigatÃ³rio");
  }

  // Guide Type (recomendado)
  if (!serviceData.guide_type) {
    console.warn("âš ï¸ Guide Type nÃ£o definido para serviÃ§o");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Atualizar serviÃ§o com validaÃ§Ã£o TISS
 * @param {string} serviceId
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
export async function updateServiceWithValidation(serviceId, serviceData) {
  // Validar se vai ativar sem campos obrigatÃ³rios
  if (serviceData.active && !serviceData.tuss_code) {
    throw new Error(
      "NÃ£o Ã© possÃ­vel ativar serviÃ§o sem TUSS Code (obrigatÃ³rio para TISS)"
    );
  }

  const validation = validateServiceForTISS(serviceData);
  if (!validation.valid) {
    console.warn("âš ï¸ Avisos TISS para serviÃ§o:", validation.errors);
    // Continua mesmo com avisos, mas registra
  }

  return updateService(serviceId, serviceData);
}

