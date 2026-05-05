// src/lib/tiskCascadeValidationApi.js
// ============================================================
// API - Validações em Cascata TISS (Phase 4)
// Valida o fluxo completo: Agenda → Faturamento → XML
// ============================================================

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

/**
 * Valida se um profissional está vinculado a um serviço
 * Essencial para bloquear agendamentos inválidos
 * @param {string} professionalId
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
export async function validateProfessionalServiceLinkage(professionalId, serviceId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('professional_services')
      .select('id, active')
      .eq('professional_id', professionalId)
      .eq('service_id', serviceId)
      .eq('clinic_id', clinicId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao validar vínculo: ${error.message}`);
    }

    if (!data) {
      return {
        valid: false,
        error: `Profissional ${professionalId} não está vinculado ao serviço ${serviceId}. Cadastre o vínculo em Profissionais > Serviços.`,
      };
    }

    if (!data.active) {
      return {
        valid: false,
        error:
          'Vínculo entre profissional e serviço está inativo. Ative em Profissionais > Serviços.',
      };
    }

    return { valid: true, error: null };
  } catch (err) {
    console.error('[validateProfessionalServiceLinkage]', err);
    return { valid: false, error: `Erro ao validar vínculo: ${err.message}` };
  }
}

/**
 * Valida credenciais do profissional na operadora
 * Bloqueia agendamentos sem credential_number válido
 * CRÍTICO: Missing credential_number = 100% payment glosa
 * @param {string} professionalId
 * @param {string} payerId
 * @param {string} clinicId
 * @returns {Promise<{valid: boolean, error: string|null, credentialNumber: string|null}>}
 */
export async function validateProfessionalCredentialAtPayer(professionalId, payerId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('professional_payers')
      .select('id, credential_number, active')
      .eq('professional_id', professionalId)
      .eq('payer_id', payerId)
      .eq('clinic_id', clinicId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao validar credencial: ${error.message}`);
    }

    if (!data) {
      return {
        valid: false,
        error:
          '⚠️ CRÍTICO: Profissional não credenciado nesta operadora. Cadastre a credencial em Convênios > Profissionais. SEM ISTO, O PAGAMENTO SERÁ 100% REJEITADO.',
        credentialNumber: null,
      };
    }

    if (!data.active) {
      return {
        valid: false,
        error:
          'Credencial do profissional nesta operadora está inativa. Ative em Convênios > Profissionais.',
        credentialNumber: null,
      };
    }

    if (!data.credential_number || data.credential_number.trim() === '') {
      return {
        valid: false,
        error:
          '⚠️ CRÍTICO: Número de credencial vazio. Preencha em Convênios > Profissionais. OBRIGATÓRIO para faturamento.',
        credentialNumber: null,
      };
    }

    return {
      valid: true,
      error: null,
      credentialNumber: data.credential_number,
    };
  } catch (err) {
    console.error('[validateProfessionalCredentialAtPayer]', err);
    return {
      valid: false,
      error: `Erro ao validar credencial: ${err.message}`,
      credentialNumber: null,
    };
  }
}

/**
 * Valida dados TISS do serviço
 * Bloqueia XML generation se campos obrigatórios faltam
 * @param {Object} service - Objeto de serviço com campos TISS
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateServiceTISSCompleteness(service) {
  const errors = [];

  if (!service.tuss_code || service.tuss_code.trim() === '') {
    errors.push('TUSS Code (10 dígitos) é obrigatório para faturamento');
  } else if (!/^\d{10}$/.test(service.tuss_code.trim())) {
    errors.push(`TUSS Code inválido: "${service.tuss_code}" (deve ter exatamente 10 dígitos)`);
  }

  if (!service.type_service || service.type_service.trim() === '') {
    errors.push('Tipo de Serviço é obrigatório');
  }

  if (!service.guide_type || service.guide_type.trim() === '') {
    errors.push('Tipo de Guia é obrigatório');
  }

  if (!service.unit_measure || service.unit_measure.trim() === '') {
    errors.push('Unidade de Medida é obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados TISS do profissional
 * Bloqueia XML generation se campos obrigatórios faltam
 * @param {Object} professional - Objeto de profissional com campos TISS
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateProfessionalTISSCompleteness(professional) {
  const errors = [];

  if (!professional.cbo_code || professional.cbo_code.trim() === '') {
    errors.push('CBO Code (6 dígitos) é obrigatório para faturamento');
  } else if (!/^\d{6}$/.test(professional.cbo_code.trim())) {
    errors.push(`CBO Code inválido: "${professional.cbo_code}" (deve ter exatamente 6 dígitos)`);
  }

  if (!professional.council_type || professional.council_type.trim() === '') {
    errors.push('Órgão Regulador (CBO, CRFA, CRM, etc) é obrigatório');
  }

  if (!professional.council_number || professional.council_number.trim() === '') {
    errors.push('Número de Registro é obrigatório');
  }

  if (!professional.council_state || professional.council_state.trim() === '') {
    errors.push('Estado (UF) de Registro é obrigatório');
  } else if (!/^[A-Z]{2}$/.test(professional.council_state.trim())) {
    errors.push(`UF inválido: "${professional.council_state}" (deve ser 2 letras maiúsculas)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados TISS da operadora/convênio
 * Bloqueia XML generation se campos obrigatórios faltam
 * @param {Object} payer - Objeto de operadora com campos TISS
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePayerTISSCompleteness(payer) {
  const errors = [];

  // Verifica se é operadora privada (não está em lista de governos)
  const governmentPayers = ['SUS', 'INSS', 'governo', 'saude'];
  const isPrivate =
    !payer.type || !governmentPayers.some((g) => payer.type.toLowerCase().includes(g));

  if (isPrivate && (!payer.registration_ans || payer.registration_ans.trim() === '')) {
    errors.push('Código ANS é obrigatório para operadoras privadas');
  }

  if (payer.registration_ans && payer.registration_ans.trim() !== '') {
    if (!/^\d{6,9}$/.test(payer.registration_ans.trim())) {
      errors.push(`Código ANS inválido: "${payer.registration_ans}" (deve ser 6-9 dígitos)`);
    }
  }

  if (payer.tiss_pattern !== true && payer.tiss_pattern !== false) {
    errors.push('Padrão TISS deve ser ativado (sim/não)');
  }

  if (!payer.guide_format || payer.guide_format.trim() === '') {
    errors.push('Formato de Guia é obrigatório (Consulta/SADT/Internação)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validação COMPLETA em cascata para uma agenda/agendamento
 * Usado ANTES de permitir criação de agendamento
 * @param {Object} appointmentData
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export async function validateAppointmentCascade(appointmentData) {
  const { professionalId, serviceId, payerId, clinicId } = appointmentData;
  const errors = [];

  if (!professionalId || !serviceId || !clinicId) {
    errors.push('Profissional, Serviço e Clínica são obrigatórios');
    return { valid: false, errors };
  }

  // Validação 1: Professional-Service linkage
  const linkageValidation = await validateProfessionalServiceLinkage(
    professionalId,
    serviceId,
    clinicId,
  );
  if (!linkageValidation.valid) {
    errors.push(linkageValidation.error);
  }

  // Validação 2: Professional credential at payer (se tem convênio)
  if (payerId) {
    const credentialValidation = await validateProfessionalCredentialAtPayer(
      professionalId,
      payerId,
      clinicId,
    );
    if (!credentialValidation.valid) {
      errors.push(credentialValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validação COMPLETA para geração de TISS XML
 * Usado ANTES de gerar XML para faturamento
 * @param {Object} guideData - { service, professional, payer }
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTISSXMLGenerationCascade(guideData) {
  const { service, professional, payer } = guideData;
  const errors = [];

  // Validação 1: Serviço
  if (!service) {
    errors.push('Serviço não encontrado');
  } else {
    const serviceValidation = validateServiceTISSCompleteness(service);
    if (!serviceValidation.valid) {
      errors.push(`Serviço incompleto: ${serviceValidation.errors.join('; ')}`);
    }
  }

  // Validação 2: Profissional
  if (!professional) {
    errors.push('Profissional não encontrado');
  } else {
    const profValidation = validateProfessionalTISSCompleteness(professional);
    if (!profValidation.valid) {
      errors.push(`Profissional incompleto: ${profValidation.errors.join('; ')}`);
    }
  }

  // Validação 3: Operadora
  if (!payer) {
    errors.push('Operadora não encontrada');
  } else {
    const payerValidation = validatePayerTISSCompleteness(payer);
    if (!payerValidation.valid) {
      errors.push(`Operadora incompleta: ${payerValidation.errors.join('; ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper: Retorna mensagem de erro formatada para toast/modal
 * @param {Array<string>} errors
 * @returns {string}
 */
export function formatCascadeErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Erro desconhecido';
  }

  return errors.map((err, i) => `${i + 1}. ${err}`).join('\n');
}
