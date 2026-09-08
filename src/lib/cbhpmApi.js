/**
 * @fileoverview API para gerenciar Procedimentos CBHPM
 * @module cbhpmApi
 *
 * Funcionalidades:
 * - CRUD de procedimentos CBHPM
 * - Listagem com filtros (ativo, tipo_guia, categoria)
 * - Busca por código ou descrição
 * - Validação de códigos CBHPM
 * - Mapeamento com serviços
 */

import { supabase } from '@/lib/customSupabaseClient';
import { normalizeCodeCBHPM } from '@/utils/formatters/formatters';

/**
 * Lista procedimentos CBHPM da clínica
 * @param {string} clinicId - ID da clínica
 * @param {Object} filters - Filtros opcionais
 * @param {boolean} filters.ativo - Filtrar por status ativo
 * @param {string} filters.tipo_guia - Filtrar por tipo de guia
 * @param {string} filters.categoria - Filtrar por categoria
 * @param {string} filters.search - Buscar por código ou descrição
 * @returns {Promise<Array>}
 */
export async function listCBHPM(clinicId, filters = {}) {
  if (!clinicId) {
    throw new Error('clinic_id é obrigatório');
  }

  console.log('🔍 listCBHPM chamado com:');
  console.log('   clinicId:', clinicId);
  console.log('   filters:', filters);

  // Query base
  let query = supabase
    .from('cbhpm_procedures')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('ativo', true);

  // Filtro por tipo de guia
  if (filters.tipo_guia) {
    query = query.eq('tipo_guia', filters.tipo_guia);
  }

  // Filtro por categoria
  if (filters.categoria) {
    query = query.eq('categoria', filters.categoria);
  }

  // Busca por descrição
  if (filters.search) {
    const searchTerm = filters.search.trim();
    console.log('📝 Adicionando filtro de busca:', searchTerm);
    query = query.ilike('descricao_completa', `%${searchTerm}%`);
  }

  // Ordenar
  query = query.order('codigo_cbhpm', { ascending: true });

  console.log('📡 Executando query Supabase...');
  const { data, error } = await query;

  console.log('✅ Query finalizada:');
  console.log('   Row count:', data?.length || 0);
  console.log('   Error:', error);
  console.log('   Amostra:', data?.[0]);

  if (error) {
    console.error('❌ ERRO NA QUERY:', error.message, error.code);
    throw error;
  }

  return data || [];
}

/**
 * Buscar procedimento CBHPM por ID
 * @param {string} procedureId
 * @returns {Promise<Object>}
 */
export async function getCBHPMById(procedureId) {
  if (!procedureId) {
    throw new Error('procedure_id é obrigatório');
  }

  const { data, error } = await supabase
    .from('cbhpm_procedures')
    .select('*')
    .eq('id', procedureId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Buscar procedimento por código CBHPM
 * @param {string} clinicId
 * @param {string} codigoCBHPM
 * @returns {Promise<Object|null>}
 */
export async function getCBHPMByCode(clinicId, codigoCBHPM) {
  if (!clinicId || !codigoCBHPM) {
    throw new Error('clinic_id e codigo_cbhpm são obrigatórios');
  }

  const normalized = normalizeCodeCBHPM(codigoCBHPM);

  const { data, error } = await supabase
    .from('cbhpm_procedures')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('codigo_cbhpm', normalized)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  } // PGRST116 = no rows found
  return data || null;
}

/**
 * Criar novo procedimento CBHPM
 * @param {string} clinicId
 * @param {Object} procedureData
 * @returns {Promise<Object>}
 */
export async function createCBHPM(clinicId, procedureData) {
  if (!clinicId || !procedureData.codigo_cbhpm || !procedureData.descricao_completa) {
    throw new Error('clinic_id, codigo_cbhpm e descricao_completa são obrigatórios');
  }

  // Normalizar código CBHPM
  const codigoCBHPM = normalizeCodeCBHPM(procedureData.codigo_cbhpm);

  // Verificar duplicata
  const existing = await getCBHPMByCode(clinicId, codigoCBHPM);
  if (existing) {
    throw new Error(`Procedimento CBHPM ${codigoCBHPM} já existe na sua clínica`);
  }

  const { data, error } = await supabase
    .from('cbhpm_procedures')
    .insert([
      {
        clinic_id: clinicId,
        codigo_cbhpm: codigoCBHPM,
        descricao_completa: procedureData.descricao_completa.trim(),
        descricao_curta: procedureData.descricao_curta?.trim(),
        grupo_procedimento: procedureData.grupo_procedimento,
        subgrupo_procedimento: procedureData.subgrupo_procedimento,
        codigo_tuss: procedureData.codigo_tuss
          ? normalizeCodeCBHPM(procedureData.codigo_tuss)
          : null,
        valor_minimo: procedureData.valor_minimo ? parseFloat(procedureData.valor_minimo) : 0,
        valor_maximo: procedureData.valor_maximo ? parseFloat(procedureData.valor_maximo) : 0,
        valor_base: procedureData.valor_base ? parseFloat(procedureData.valor_base) : 0,
        permite_faturamento: procedureData.permite_faturamento !== false,
        exige_autorizacao: procedureData.exige_autorizacao || false,
        tipo_guia: procedureData.tipo_guia,
        unidade_medida: procedureData.unidade_medida,
        observacoes: procedureData.observacoes,
        categoria: procedureData.categoria,
        subcategoria: procedureData.subcategoria,
        ano_tabela: procedureData.ano_tabela || new Date().getFullYear(),
        indice_reajuste: procedureData.indice_reajuste || 1.0,
        data_vigencia: procedureData.data_vigencia,
        data_fim_vigencia: procedureData.data_fim_vigencia,
        ativo: procedureData.ativo !== false,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Atualizar procedimento CBHPM
 * @param {string} procedureId
 * @param {Object} procedureData
 * @returns {Promise<Object>}
 */
export async function updateCBHPM(procedureId, procedureData) {
  if (!procedureId) {
    throw new Error('procedure_id é obrigatório');
  }

  const updateData = {
    ...procedureData,
    // Normalizar códigos se fornecidos
    ...(procedureData.codigo_cbhpm && {
      codigo_cbhpm: normalizeCodeCBHPM(procedureData.codigo_cbhpm),
    }),
    ...(procedureData.codigo_tuss && {
      codigo_tuss: normalizeCodeCBHPM(procedureData.codigo_tuss),
    }),
    // Garantir tipos corretos
    ...(procedureData.valor_minimo !== undefined && {
      valor_minimo: parseFloat(procedureData.valor_minimo),
    }),
    ...(procedureData.valor_maximo !== undefined && {
      valor_maximo: parseFloat(procedureData.valor_maximo),
    }),
    ...(procedureData.valor_base !== undefined && {
      valor_base: parseFloat(procedureData.valor_base),
    }),
    ...(procedureData.indice_reajuste !== undefined && {
      indice_reajuste: parseFloat(procedureData.indice_reajuste),
    }),
  };

  const { data, error } = await supabase
    .from('cbhpm_procedures')
    .update(updateData)
    .eq('id', procedureId)
    .select();


  if (error) {
    throw error;
  }
  return data;
}

/**
 * Deletar (soft delete) procedimento CBHPM
 * @param {string} procedureId
 * @returns {Promise<Object>}
 */
export async function deleteCBHPM(procedureId) {
  if (!procedureId) {
    throw new Error('procedure_id é obrigatório');
  }

  return updateCBHPM(procedureId, { ativo: false });
}

/**
 * Restaurar procedimento CBHPM deletado
 * @param {string} procedureId
 * @returns {Promise<Object>}
 */
export async function restoreCBHPM(procedureId) {
  if (!procedureId) {
    throw new Error('procedure_id é obrigatório');
  }

  return updateCBHPM(procedureId, { ativo: true });
}

/**
 * Validar código CBHPM
 * @param {string} codigo
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateCBHPMCode(codigo) {
  const errors = [];

  if (!codigo) {
    errors.push('Código CBHPM é obrigatório');
  }

  // CBHPM formato: X.XX.XX.XX-X (1.01.01.01-2) ou 10 dígitos (1010101012)
  const formatoValido = /^(\d{1,2}\.\d{2}\.\d{2}\.\d{2}-\d|\d{10})$/.test(
    codigo?.toString().trim() || '',
  );

  if (codigo && !formatoValido) {
    errors.push('Código CBHPM inválido. Use formato: 1.01.01.01-2 ou 1010101012');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Listar categorias únicas de procedimentos
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listCBHPMCategories(clinicId) {
  if (!clinicId) {
    throw new Error('clinic_id é obrigatório');
  }

  const { data, error } = await supabase
    .from('cbhpm_procedures')
    .select('categoria')
    .eq('clinic_id', clinicId)
    .eq('ativo', true)
    .order('categoria', { ascending: true })
    .distinct();

  if (error) {
    throw error;
  }
  return (data || []).map((d) => d.categoria).filter((cat) => cat !== null && cat !== '');
}

/**
 * Listar tipos de guia únicos
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listCBHPMGuiaTypes(clinicId) {
  if (!clinicId) {
    throw new Error('clinic_id é obrigatório');
  }

  const { data, error } = await supabase
    .from('cbhpm_procedures')
    .select('tipo_guia')
    .eq('clinic_id', clinicId)
    .eq('ativo', true)
    .order('tipo_guia', { ascending: true })
    .distinct();

  if (error) {
    throw error;
  }
  return (data || []).map((d) => d.tipo_guia).filter((type) => type !== null && type !== '');
}

/**
 * Mapear procedimento CBHPM com serviço
 * @param {string} cbhpmId
 * @param {string} serviceId
 * @param {string} clinicId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function mapCBHPMToService(cbhpmId, serviceId, clinicId, options = {}) {
  if (!cbhpmId || !serviceId || !clinicId) {
    throw new Error('cbhpmId, serviceId e clinicId são obrigatórios');
  }

  const { data, error } = await supabase
    .from('cbhpm_service_mapping')
    .insert([
      {
        cbhpm_id: cbhpmId,
        service_id: serviceId,
        clinic_id: clinicId,
        eh_principal: options.eh_principal || false,
        sobrescreve_valor: options.sobrescreve_valor || false,
        valor_especifico: options.valor_especifico ? parseFloat(options.valor_especifico) : null,
      },
    ])
    .select();


  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('Este mapeamento já existe');
    }
    throw error;
  }
  return data;
}

/**
 * Remover mapeamento CBHPM-Service
 * @param {string} mappingId
 * @returns {Promise<void>}
 */
export async function unmapCBHPMFromService(mappingId) {
  if (!mappingId) {
    throw new Error('mapping_id é obrigatório');
  }

  const { error } = await supabase.from('cbhpm_service_mapping').delete().eq('id', mappingId);

  if (error) {
    throw error;
  }
}

/**
 * Listar serviços mapeados para um CBHPM
 * @param {string} cbhpmId
 * @returns {Promise<Array>}
 */
export async function listServicesForCBHPM(cbhpmId) {
  if (!cbhpmId) {
    throw new Error('cbhpm_id é obrigatório');
  }

  const { data, error } = await supabase
    .from('cbhpm_service_mapping')
    .select(
      `
      id,
      eh_principal,
      sobrescreve_valor,
      valor_especifico,
      service_id,
      services (id, name, base_value)
    `,
    )
    .eq('cbhpm_id', cbhpmId);

  if (error) {
    throw error;
  }
  return data || [];
}

/**
 * Obter valor final de um procedimento (base ou especifico do mapeamento)
 * @param {string} cbhpmId
 * @param {string} serviceId
 * @returns {Promise<number>}
 */
export async function getEffectivePrice(cbhpmId, serviceId) {
  if (!cbhpmId) {
    throw new Error('cbhpm_id é obrigatório');
  }

  // Se não tem service, retorna valor base do CBHPM
  if (!serviceId) {
    const procedure = await getCBHPMById(cbhpmId);
    return procedure?.valor_base || 0;
  }

  // Buscar mapeamento
  const { data: mapping } = await supabase
    .from('cbhpm_service_mapping')
    .select('sobrescreve_valor, valor_especifico')
    .eq('cbhpm_id', cbhpmId)
    .eq('service_id', serviceId);


  if (mapping && mapping.sobrescreve_valor && mapping.valor_especifico) {
    return mapping.valor_especifico;
  }

  // Sem mapeamento, retorna valor base
  const procedure = await getCBHPMById(cbhpmId);
  return procedure?.valor_base || 0;
}

export default {
  listCBHPM,
  getCBHPMById,
  getCBHPMByCode,
  createCBHPM,
  updateCBHPM,
  deleteCBHPM,
  restoreCBHPM,
  validateCBHPMCode,
  listCBHPMCategories,
  listCBHPMGuiaTypes,
  mapCBHPMToService,
  unmapCBHPMFromService,
  listServicesForCBHPM,
  getEffectivePrice,
};
