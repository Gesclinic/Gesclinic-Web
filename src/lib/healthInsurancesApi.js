// src/lib/healthInsurancesApi.js
// ============================================================
// API - Convênios e Seguros (Health Insurances)
// ============================================================

import { supabase } from "@/lib/customSupabaseClient";

/**
 * Lista todos os convênios de uma clínica
 * @param {string} clinicId
 * @param {Object} options - { includeInactive: false }
 * @returns {Promise<Array>}
 */
export async function listHealthInsurances(clinicId, options = {}) {
  const { includeInactive = false } = options;

  let query = supabase
    .from("health_insurances")
    .select(`
      id,
      code,
      name,
      fantasy_name,
      legal_name,
      type,
      cnpj,
      contact_person,
      contact_email,
      contact_phone,
      contact_mobile,
      requires_authorization,
      authorization_lead_time_days,
      discount_percentage,
      minimum_margin_percentage,
      special_rules,
      registration_ans,
      tiss_pattern,
      guide_format,
      tiss_version,
      address_street,
      address_number,
      address_neighborhood,
      address_city,
      address_state,
      address_zip_code,
      municipal_registration,
      state_registration,
      country,
      payment_due_days,
      accepted_payment_methods,
      billing_cycle_start,
      billing_cycle_end,
      administration_fee_percentage,
      early_payment_discount_percentage,
      volume_discount_percentage,
      reajustment_index,
      annual_reajustment_date,
      next_reajustment_date,
      monthly_billing_ceiling,
      consultation_limit,
      copayment_value,
      contract_start_date,
      contract_end_date,
      auto_renewal,
      prior_notice_days,
      days_to_suspension,
      late_payment_fine_percentage,
      daily_interest_rate_percentage,
      financial_contact_name,
      financial_contact_email,
      financial_contact_phone,
      bank_name,
      bank_branch,
      bank_account,
      active,
      created_at,
      updated_at,
      registration_ans,
      tiss_enabled,
      submission_method,
      tiss_endpoint,
      tiss_username,
      tiss_password,
      tiss_response_email,
      tiss_last_sync
    `)
    .eq("clinic_id", clinicId)
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao listar convênios: ${error.message}`);
  return data ?? [];
}

/**
 * Obtém detalhes de um convênio
 * @param {string} insuranceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getHealthInsurance(insuranceId, clinicId) {
  const { data, error } = await supabase
    .from("health_insurances")
    .select(`
      id,
      code,
      name,
      fantasy_name,
      legal_name,
      type,
      cnpj,
      registration_number,
      contact_person,
      contact_email,
      contact_phone,
      contact_mobile,
      requires_authorization,
      authorization_lead_time_days,
      discount_percentage,
      minimum_margin_percentage,
      special_rules,
      registration_ans,
      tiss_pattern,
      guide_format,
      tiss_version,
      address_street,
      address_number,
      address_neighborhood,
      address_city,
      address_state,
      address_zip_code,
      municipal_registration,
      state_registration,
      country,
      icms_applicable,
      icms_rate,
      pis_applicable,
      pis_rate,
      cofins_applicable,
      cofins_rate,
      iss_applicable,
      iss_rate,
      issrf_applicable,
      issrf_rate,
      inss_applicable,
      inss_rate,
      ibs_applicable,
      ibs_rate,
      cbs_applicable,
      cbs_rate,
      retains_taxes,
      tax_regime,
      payment_due_days,
      accepted_payment_methods,
      billing_cycle_start,
      billing_cycle_end,
      administration_fee_percentage,
      early_payment_discount_percentage,
      volume_discount_percentage,
      reajustment_index,
      annual_reajustment_date,
      next_reajustment_date,
      monthly_billing_ceiling,
      consultation_limit,
      copayment_value,
      contract_start_date,
      contract_end_date,
      auto_renewal,
      prior_notice_days,
      days_to_suspension,
      late_payment_fine_percentage,
      daily_interest_rate_percentage,
      financial_contact_name,
      financial_contact_email,
      financial_contact_phone,
      bank_name,
      bank_branch,
      bank_account,
      active,
      created_at,
      updated_at,
      registration_ans,
      tiss_enabled,
      submission_method,
      tiss_endpoint,
      tiss_username,
      tiss_password,
      tiss_response_email,
      tiss_last_sync
    `)
    .eq("id", insuranceId)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) throw new Error(`Falha ao obter convênio: ${error.message}`);
  return data;
}

/**
 * Cria novo convênio
 * @param {string} clinicId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createHealthInsurance(clinicId, data) {
  const { 
    code, 
    name, 
    fantasy_name,
    legal_name,
    type, 
    cnpj, 
    contact_person, 
    contact_email, 
    contact_phone,
    contact_mobile,
    discount_percentage,
    minimum_margin_percentage,
    special_rules,
    registration_ans,
    tiss_pattern,
    guide_format,
    tiss_version,
    address_street,
    address_number,
    address_neighborhood,
    address_city,
    address_state,
    address_zip_code,
    municipal_registration,
    state_registration,
    country,
    icms_applicable,
    icms_rate,
    pis_applicable,
    pis_rate,
    cofins_applicable,
    cofins_rate,
    iss_applicable,
    iss_rate,
    issrf_applicable,
    issrf_rate,
    inss_applicable,
    inss_rate,
    ibs_applicable,
    ibs_rate,
    cbs_applicable,
    cbs_rate,
    retains_taxes,
    tax_regime,
    payment_due_days,
    accepted_payment_methods,
    billing_cycle_start,
    billing_cycle_end,
    administration_fee_percentage,
    early_payment_discount_percentage,
    volume_discount_percentage,
    reajustment_index,
    annual_reajustment_date,
    next_reajustment_date,
    monthly_billing_ceiling,
    consultation_limit,
    copayment_value,
    contract_start_date,
    contract_end_date,
    auto_renewal,
    prior_notice_days,
    days_to_suspension,
    late_payment_fine_percentage,
    daily_interest_rate_percentage,
    financial_contact_name,
    financial_contact_email,
    financial_contact_phone,
    bank_name,
    bank_branch,
    bank_account
  } = data;

  // Validar código único
  if (code) {
    const existing = await supabase
      .from("health_insurances")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("code", code)
      .maybeSingle();

    if (existing.data) {
      throw new Error(`Convênio com código "${code}" já existe`);
    }
  }

  const insertData = {
    clinic_id: clinicId,
    code: code || null,
    name: name || null,
    fantasy_name: fantasy_name || null,
    legal_name: legal_name || null,
    type: type || null,
    cnpj: cnpj || null,
    contact_person: contact_person || null,
    contact_email: contact_email || null,
    contact_phone: contact_phone || null,
    contact_mobile: contact_mobile || null,
    discount_percentage: parseFloat(discount_percentage) || 0,
    minimum_margin_percentage: parseFloat(minimum_margin_percentage) || 0,
    special_rules: special_rules || null,
    registration_ans: registration_ans || null,
    tiss_pattern: tiss_pattern || false,
    guide_format: guide_format || null,
    tiss_version: tiss_version || "3.05.00",
    address_street: address_street || null,
    address_number: address_number || null,
    address_neighborhood: address_neighborhood || null,
    address_city: address_city || null,
    address_state: address_state || null,
    address_zip_code: address_zip_code || null,
    municipal_registration: municipal_registration || null,
    state_registration: state_registration || null,
    country: country || "Brasil",
    icms_applicable: icms_applicable || false,
    icms_rate: parseFloat(icms_rate) || 0,
    pis_applicable: pis_applicable || false,
    pis_rate: parseFloat(pis_rate) || 0,
    cofins_applicable: cofins_applicable || false,
    cofins_rate: parseFloat(cofins_rate) || 0,
    iss_applicable: iss_applicable || false,
    iss_rate: parseFloat(iss_rate) || 0,
    issrf_applicable: issrf_applicable || false,
    issrf_rate: parseFloat(issrf_rate) || 0,
    inss_applicable: inss_applicable || false,
    inss_rate: parseFloat(inss_rate) || 0,
    ibs_applicable: ibs_applicable || false,
    ibs_rate: parseFloat(ibs_rate) || 0,
    cbs_applicable: cbs_applicable || false,
    cbs_rate: parseFloat(cbs_rate) || 0,
    retains_taxes: retains_taxes || false,
    tax_regime: tax_regime || null,
    payment_due_days: parseInt(payment_due_days) || 30,
    accepted_payment_methods: accepted_payment_methods || [],
    billing_cycle_start: parseInt(billing_cycle_start) || 1,
    billing_cycle_end: parseInt(billing_cycle_end) || 30,
    administration_fee_percentage: parseFloat(administration_fee_percentage) || 0,
    early_payment_discount_percentage: parseFloat(early_payment_discount_percentage) || 0,
    volume_discount_percentage: parseFloat(volume_discount_percentage) || 0,
    reajustment_index: reajustment_index || null,
    annual_reajustment_date: annual_reajustment_date || null,
    next_reajustment_date: next_reajustment_date || null,
    monthly_billing_ceiling: monthly_billing_ceiling ? parseFloat(monthly_billing_ceiling) : null,
    consultation_limit: consultation_limit ? parseInt(consultation_limit) : null,
    copayment_value: copayment_value ? parseFloat(copayment_value) : null,
    contract_start_date: contract_start_date || null,
    contract_end_date: contract_end_date || null,
    auto_renewal: auto_renewal || false,
    prior_notice_days: parseInt(prior_notice_days) || 30,
    days_to_suspension: parseInt(days_to_suspension) || 30,
    late_payment_fine_percentage: parseFloat(late_payment_fine_percentage) || 0,
    daily_interest_rate_percentage: parseFloat(daily_interest_rate_percentage) || 0,
    financial_contact_name: financial_contact_name || null,
    financial_contact_email: financial_contact_email || null,
    financial_contact_phone: financial_contact_phone || null,
    bank_name: bank_name || null,
    bank_branch: bank_branch || null,
    bank_account: bank_account || null,
    active: true,
  };

  console.log("📊 Dados sendo enviados para INSERT:", insertData);

  const { data: insurance, error } = await supabase
    .from("health_insurances")
    .insert([insertData])
    .select()
    .maybeSingle();

  if (error) {
    console.error("❌ Erro Supabase INSERT:", error);
    if (error.code === "23505") {
      throw new Error("CNPJ ou código já cadastrado para esta clínica");
    }
    throw new Error(`Falha ao criar convênio: ${error.message}`);
  }

  console.log("✅ Convênio criado com sucesso:", insurance);
  return insurance;
}

/**
 * Atualiza dados de um convênio
 * @param {string} insuranceId
 * @param {string} clinicId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateHealthInsurance(insuranceId, clinicId, updates) {
  console.log("🔄 UPDATE - insuranceId:", insuranceId, "clinicId:", clinicId);
  console.log("📊 Dados sendo enviados para UPDATE:", updates);

  // Se atualizando código, validar unicidade
  if (updates.code) {
    const existing = await supabase
      .from("health_insurances")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("code", updates.code)
      .neq("id", insuranceId)
      .maybeSingle();

    if (existing.data) {
      throw new Error(`Código "${updates.code}" já existe`);
    }
  }

  // Preparar dados para atualização - limpar undefined
  const dataToUpdate = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );

  console.log("📊 Dados filtrados para UPDATE:", dataToUpdate);

  // Adionar updated_at automaticamente (será sobrescrito pelo trigger, mas mantém consistência)
  const dataWithTimestamp = {
    ...dataToUpdate,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("health_insurances")
    .update(dataWithTimestamp)
    .eq("id", insuranceId)
    .eq("clinic_id", clinicId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("❌ Erro Supabase UPDATE:", error);
    if (error.code === "23505") {
      throw new Error("CNPJ ou código já cadastrado");
    }
    throw new Error(`Falha ao atualizar convênio: ${error.message}`);
  }

  console.log("✅ Convênio atualizado com sucesso:", data);
  return data;
}

/**
 * Desativa um convênio (não deleta)
 * @param {string} insuranceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function deactivateHealthInsurance(insuranceId, clinicId) {
  const { data, error } = await supabase
    .from("health_insurances")
    .update({ active: false, updated_at: new Date() })
    .eq("id", insuranceId)
    .eq("clinic_id", clinicId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Falha ao desativar convênio: ${error.message}`);
  return data;
}

/**
 * Reativa um convênio
 * @param {string} insuranceId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function reactivateHealthInsurance(insuranceId, clinicId) {
  const { data, error } = await supabase
    .from("health_insurances")
    .update({ active: true, updated_at: new Date() })
    .eq("id", insuranceId)
    .eq("clinic_id", clinicId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Falha ao reativar convênio: ${error.message}`);
  return data;
}

/**
 * Busca convênio por código
 * @param {string} code
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getHealthInsuranceByCode(code, clinicId) {
  const { data, error } = await supabase
    .from("health_insurances")
    .select("id, code, name")
    .eq("code", code)
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar convênio: ${error.message}`);
  return data;
}

/**
 * Conta quantos convênios a clínica tem
 * @param {string} clinicId
 * @returns {Promise<number>}
 */
export async function countHealthInsurances(clinicId) {
  const { count, error } = await supabase
    .from("health_insurances")
    .select("id", { count: "exact" })
    .eq("clinic_id", clinicId)
    .eq("active", true);

  if (error) throw error;
  return count || 0;
}

/**
 * Busca convênios que requerem autorização
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listHealthInsurancesRequiringAuthorization(clinicId) {
  const { data, error } = await supabase
    .from("health_insurances")
    .select("id, code, name, authorization_lead_time_days")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .eq("requires_authorization", true);

  if (error) throw error;
  return data ?? [];
}

/**
 * ============================================================
 * VALIDAÇÃO TISS PARA CONVÊNIOS
 * ============================================================
 */

/**
 * Valida se convênio tem campos obrigatórios para TISS
 * @param {Object} insuranceData
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateInsuranceForTISS(insuranceData) {
  const errors = [];

  // ANS (obrigatório para privados)
  if (
    insuranceData.type !== "government" &&
    !insuranceData.registration_ans
  ) {
    errors.push(
      "ANS Registration é obrigatório para seguros privados"
    );
  }

  // TISS Pattern (recomendado)
  if (insuranceData.tiss_pattern !== true) {
    console.warn(
      "⚠️ TISS Pattern não ativado - pode causar rejeição"
    );
  }

  // Guide Format
  if (!insuranceData.guide_format) {
    console.warn("⚠️ Guide Format não definido para convênio");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Atualizar convênio com validação TISS
 * @param {string} insuranceId
 * @param {Object} insuranceData
 * @returns {Promise<Object>}
 */
export async function updateInsuranceWithValidation(
  insuranceId,
  insuranceData
) {
  const validation = validateInsuranceForTISS(insuranceData);
  if (!validation.valid) {
    throw new Error(
      `Erros TISS para convênio: ${validation.errors.join(", ")}`
    );
  }

  return updateHealthInsurance(insuranceId, insuranceData);
}
