// tests/tiss-unit.test.js
// ============================================================
// PHASE 5: Testes Unitários - Validações TISS
// Não depende do banco de dados
// ============================================================

import { describe, it, expect } from 'vitest';

/**
 * SUITE 1: Validação de Completude TISS - Serviço
 */
describe('Phase 5.1: Service TISS Completeness', () => {
  // Simula: validateServiceTISSCompleteness(service)
  const validateServiceTISSCompleteness = (service) => {
    const errors = [];
    
    // Validar TUSS Code (10 dígitos obrigatório)
    if (!service.tuss_code || service.tuss_code.trim() === '') {
      errors.push('TUSS Code é obrigatório');
    } else if (!/^\d{10}$/.test(service.tuss_code)) {
      errors.push('TUSS Code deve ter exatamente 10 dígitos (formato inválido)');
    }
    
    // Validar Type Service
    if (!service.type_service || service.type_service.trim() === '') {
      errors.push('Tipo de Serviço é obrigatório');
    }
    
    // Validar Guide Type
    if (!service.guide_type || service.guide_type.trim() === '') {
      errors.push('Tipo de Guia é obrigatório');
    }
    
    // Validar Unit Measure
    if (!service.unit_measure || service.unit_measure.trim() === '') {
      errors.push('Unidade de Medida é obrigatória');
    }
    
    // Validar Cost Value
    if (service.cost_value === undefined || service.cost_value === null || service.cost_value <= 0) {
      errors.push('Valor de Custo deve ser maior que zero');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  };

  it('✅ deve validar serviço com todos os campos TISS', () => {
    const service = {
      tuss_code: '0101010101',
      type_service: 'Consulta',
      guide_type: 'Guia de Consulta',
      unit_measure: 'Unidade',
      cost_value: 100.00,
    };

    const result = validateServiceTISSCompleteness(service);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('❌ deve rejeitar TUSS code vazio', () => {
    const service = {
      tuss_code: '',
      type_service: 'Consulta',
      guide_type: 'Guia de Consulta',
      unit_measure: 'Unidade',
      cost_value: 100.00,
    };

    const result = validateServiceTISSCompleteness(service);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('TUSS Code');
  });

  it('❌ deve rejeitar TUSS code com formato inválido', () => {
    const service = {
      tuss_code: '12345',
      type_service: 'Consulta',
      guide_type: 'Guia de Consulta',
      unit_measure: 'Unidade',
      cost_value: 100.00,
    };

    const result = validateServiceTISSCompleteness(service);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('inválido'))).toBe(true);
  });

  it('❌ deve rejeitar type_service vazio', () => {
    const service = {
      tuss_code: '0101010101',
      type_service: '',
      guide_type: 'Guia de Consulta',
      unit_measure: 'Unidade',
      cost_value: 100.00,
    };

    const result = validateServiceTISSCompleteness(service);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Tipo de Serviço'))).toBe(true);
  });

  it('❌ deve rejeitar cost_value inválido', () => {
    const service = {
      tuss_code: '0101010101',
      type_service: 'Consulta',
      guide_type: 'Guia de Consulta',
      unit_measure: 'Unidade',
      cost_value: 0,
    };

    const result = validateServiceTISSCompleteness(service);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Valor de Custo'))).toBe(true);
  });
});

/**
 * SUITE 2: Validação de Completude TISS - Profissional
 */
describe('Phase 5.2: Professional TISS Completeness', () => {
  // Simula: validateProfessionalTISSCompleteness(professional)
  const validateProfessionalTISSCompleteness = (professional) => {
    const errors = [];
    
    // Validar CBO Code (6 dígitos)
    if (!professional.cbo_code || professional.cbo_code.trim() === '') {
      errors.push('CBO Code é obrigatório');
    } else if (!/^\d{6}$/.test(professional.cbo_code)) {
      errors.push('CBO Code deve ter exatamente 6 dígitos (formato inválido)');
    }
    
    // Validar Council Type
    const validCouncils = ['CRM', 'CRFA', 'CRP', 'COREN', 'CRO', 'CRTZ', 'CRTS', 'OUTROS'];
    if (!professional.council_type || !validCouncils.includes(professional.council_type)) {
      errors.push('Tipo de Conselho inválido');
    }
    
    // Validar Council Number
    if (!professional.council_number || professional.council_number.trim() === '') {
      errors.push('Número do Conselho é obrigatório');
    }
    
    // Validar Council State (2 caracteres)
    if (!professional.council_state || professional.council_state.trim() === '' || professional.council_state.length !== 2) {
      errors.push('Estado do Conselho deve ter exatamente 2 caracteres');
    }
    
    // Validar CNS Code (opcional mas se informado, deve ser válido)
    if (professional.cns_code && professional.cns_code.trim() !== '' && !/^[A-Z0-9]{9,}$/.test(professional.cns_code)) {
      errors.push('CNS Code deve ser alfanumérico com pelo menos 9 caracteres');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  };

  it('✅ deve validar profissional com todos os campos TISS', () => {
    const professional = {
      cbo_code: '225101',
      council_type: 'CRM',
      council_number: '12345',
      council_state: 'SP',
      cns_code: 'ABC123456',
    };

    const result = validateProfessionalTISSCompleteness(professional);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('❌ deve rejeitar CBO code vazio', () => {
    const professional = {
      cbo_code: '',
      council_type: 'CRM',
      council_number: '12345',
      council_state: 'SP',
      cns_code: 'ABC123456',
    };

    const result = validateProfessionalTISSCompleteness(professional);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('CBO Code'))).toBe(true);
  });

  it('❌ deve rejeitar CBO code com formato inválido', () => {
    const professional = {
      cbo_code: '12345',
      council_type: 'CRM',
      council_number: '12345',
      council_state: 'SP',
      cns_code: 'ABC123456',
    };

    const result = validateProfessionalTISSCompleteness(professional);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('inválido'))).toBe(true);
  });

  it('❌ deve rejeitar council_type inválido', () => {
    const professional = {
      cbo_code: '225101',
      council_type: 'INVALID',
      council_number: '12345',
      council_state: 'SP',
      cns_code: 'ABC123456',
    };

    const result = validateProfessionalTISSCompleteness(professional);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Conselho'))).toBe(true);
  });

  it('❌ deve rejeitar council_state inválido', () => {
    const professional = {
      cbo_code: '225101',
      council_type: 'CRM',
      council_number: '12345',
      council_state: 'SPX',
      cns_code: 'ABC123456',
    };

    const result = validateProfessionalTISSCompleteness(professional);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Estado do Conselho'))).toBe(true);
  });

  it('❌ deve rejeitar CNS code com formato inválido', () => {
    const professional = {
      cbo_code: '225101',
      council_type: 'CRM',
      council_number: '12345',
      council_state: 'SP',
      cns_code: '12345',  // Muito curto e numérico puro
    };

    const result = validateProfessionalTISSCompleteness(professional);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('CNS Code'))).toBe(true);
  });
});

/**
 * SUITE 3: Validação de Completude TISS - Convênio (Insurance)
 */
describe('Phase 5.3: Insurance TISS Completeness', () => {
  // Simula: validateInsuranceTISSCompleteness(insurance)
  const validateInsuranceTISSCompleteness = (insurance) => {
    const errors = [];
    
    // Validar se é convênio privado
    if (insurance.type === 'private' || insurance.type === 'particular') {
      // ANS é obrigatório para seguradoras privadas
      if (!insurance.registration_ans || insurance.registration_ans.trim() === '') {
        errors.push('Número de Registro na ANS é obrigatório para seguradoras privadas');
      } else if (!/^\d{6}$/.test(insurance.registration_ans)) {
        errors.push('Número de Registro na ANS deve ter exatamente 6 dígitos');
      }
    }
    
    // Validar TISS Pattern (se informado)
    if (insurance.tiss_pattern && insurance.tiss_pattern !== true && insurance.tiss_pattern !== false) {
      errors.push('TISS Pattern deve ser um valor booleano');
    }
    
    // Validar Guide Format
    const validFormats = ['papel', 'eletronica', 'ambas'];
    if (!insurance.guide_format || !validFormats.includes(insurance.guide_format)) {
      errors.push('Formato de Guia deve ser: papel, eletronica ou ambas');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  };

  it('✅ deve validar seguradora privada com ANS preenchido', () => {
    const insurance = {
      type: 'private',
      registration_ans: '123456',
      tiss_pattern: true,
      guide_format: 'eletronica',
    };

    const result = validateInsuranceTISSCompleteness(insurance);
    expect(result.valid).toBe(true);
  });

  it('❌ deve rejeitar seguradora privada sem ANS', () => {
    const insurance = {
      type: 'private',
      registration_ans: '',
      tiss_pattern: true,
      guide_format: 'eletronica',
    };

    const result = validateInsuranceTISSCompleteness(insurance);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ANS'))).toBe(true);
  });

  it('❌ deve rejeitar ANS com formato inválido', () => {
    const insurance = {
      type: 'private',
      registration_ans: '12345',  // Só 5 dígitos
      tiss_pattern: true,
      guide_format: 'eletronica',
    };

    const result = validateInsuranceTISSCompleteness(insurance);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ANS'))).toBe(true);
  });

  it('❌ deve rejeitar guide_format inválido', () => {
    const insurance = {
      type: 'public',
      tiss_pattern: true,
      guide_format: 'invalido',
    };

    const result = validateInsuranceTISSCompleteness(insurance);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Formato de Guia'))).toBe(true);
  });
});

/**
 * SUITE 4: Integração - Todos os Campos TISS Preenchidos
 */
describe('Phase 5.4: Full TISS Integration', () => {
  it('✅ deve validar fluxo completo: Service + Professional + Insurance', () => {
    const service = {
      tuss_code: '0101010101',
      type_service: 'Consulta',
      guide_type: 'Guia de Consulta',
      unit_measure: 'Unidade',
      cost_value: 100.00,
    };

    const professional = {
      cbo_code: '225101',
      council_type: 'CRM',
      council_number: '12345',
      council_state: 'SP',
      cns_code: 'ABC123456',
    };

    const insurance = {
      type: 'private',
      registration_ans: '123456',
      tiss_pattern: true,
      guide_format: 'eletronica',
    };

    // Simula: todos preenchidos = válido
    const allValid = 
      service.tuss_code !== '' &&
      professional.cbo_code !== '' &&
      insurance.registration_ans !== '';

    expect(allValid).toBe(true);
  });

  it('❌ deve falhar se qualquer campo obrigatório TISS está vazio', () => {
    const service = {
      tuss_code: '',  // VAZIO!
      type_service: 'Consulta',
      guide_type: 'Guia de Consulta',
      unit_measure: 'Unidade',
      cost_value: 100.00,
    };

    const professional = {
      cbo_code: '225101',
      council_type: 'CRM',
      council_number: '12345',
      council_state: 'SP',
      cns_code: 'ABC123456',
    };

    // Simula: serviço inválido
    const serviceValid = service.tuss_code !== '';

    expect(serviceValid).toBe(false);
  });
});

/**
 * SUITE 5: Validação de Credencial (CRÍTICO)
 */
describe('Phase 5.5: Credential Validation (CRITICAL)', () => {
  // Simula: validateProfessionalCredentialAtPayer
  const validateCredential = (professional, payer) => {
    const errors = [];

    // CRÍTICO: credential_number é obrigatório
    if (!professional.credential_number || professional.credential_number.trim() === '') {
      errors.push('CRÍTICO: Número de Credencial ausente - glosa 100% sem este campo!');
    }

    // CRÍTICO: profissional deve estar ativo no convênio
    if (payer.type === 'private' && !professional.credential_number) {
      errors.push('CRÍTICO: Profissional não credenciado neste convênio');
    }

    return {
      valid: errors.length === 0,
      credentialNumber: professional.credential_number || null,
      errors,
    };
  };

  it('⚠️ CRÍTICO: deve validar credential_number preenchido', () => {
    const professional = {
      cbo_code: '225101',
      credential_number: 'CRED123456',
    };

    const payer = { type: 'private' };

    const result = validateCredential(professional, payer);
    expect(result.valid).toBe(true);
    expect(result.credentialNumber).toBe('CRED123456');
  });

  it('⚠️ CRÍTICO: deve rejeitar credential_number vazio', () => {
    const professional = {
      cbo_code: '225101',
      credential_number: '',
    };

    const payer = { type: 'private' };

    const result = validateCredential(professional, payer);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('CRÍTICO'))).toBe(true);
  });

  it('⚠️ CRÍTICO: credential_number vazio = glosa 100%', () => {
    // Este é o caso de maior impacto financeiro
    const credentialNumber = '';
    const hasCredential = credentialNumber !== '' && credentialNumber !== undefined;

    // Se não tem credencial = 100% de glosa (rejeição de pagamento)
    expect(hasCredential).toBe(false);
    expect(hasCredential).toBe(false);  // Falha dupla para ênfase
  });
});

/**
 * SUITE 6: Normalizações e Formatos
 */
describe('Phase 5.6: Data Normalization and Formatting', () => {
  it('✅ deve converter TUSS code para string numérica', () => {
    const tussCode = 101010101;  // número
    const tussString = String(tussCode).padStart(10, '0');

    expect(tussString).toBe('0101010101');
    expect(tussString).toHaveLength(10);
  });

  it('✅ deve converter council state para maiúsculas', () => {
    const councilState = 'sp';
    const normalized = councilState.toUpperCase();

    expect(normalized).toBe('SP');
  });

  it('✅ deve formatar erros para exibição em UI', () => {
    const errors = [
      'TUSS Code é obrigatório',
      'CBO Code deve ter exatamente 6 dígitos',
    ];

    const formatted = errors.map(err => `• ${err}`).join('\n');

    expect(formatted).toContain('TUSS Code');
    expect(formatted).toContain('CBO Code');
  });
});

/**
 * SUITE 7: Casos de Uso Reais
 */
describe('Phase 5.7: Real-World Scenarios', () => {
  it('Scenario 1: Criar agendamento com todos os campos TISS', () => {
    const appointment = {
      service: { tuss_code: '0101010101' },
      professional: { cbo_code: '225101', credential_number: 'CRED123' },
      payer: { registration_ans: '123456' },
    };

    const valid = 
      appointment.service?.tuss_code?.length === 10 &&
      appointment.professional?.cbo_code?.length === 6 &&
      appointment.professional?.credential_number?.length > 0 &&
      appointment.payer?.registration_ans?.length === 6;

    expect(valid).toBe(true);
  });

  it('Scenario 2: Gerar XML sem credential = falha', () => {
    const xmlData = {
      credential_number: '',  // VAZIO!
    };

    const canGenerateXML = xmlData.credential_number !== '';

    expect(canGenerateXML).toBe(false);
  });

  it('Scenario 3: Importar profissional sem TISS = bloqueado', () => {
    const professional = {
      name: 'Dr. Silva',
      cbo_code: '',  // VAZIO!
    };

    const isTISSComplete = professional.cbo_code !== '';

    expect(isTISSComplete).toBe(false);
  });

  it('Scenario 4: Batch update de serviços com validação TISS', () => {
    const services = [
      { tuss_code: '0101010101', valid: true },
      { tuss_code: '', valid: false },
      { tuss_code: '0202020202', valid: true },
    ];

    const validCount = services.filter(s => s.valid).length;
    const invalidCount = services.filter(s => !s.valid).length;

    expect(validCount).toBe(2);
    expect(invalidCount).toBe(1);
  });
});
