// src/lib/medicalRepasseApi.js
/**
 * API para Módulo Completo de Repasse Automático
 * 
 * Funções:
 * - Configuração de repasse por profissional
 * - Registro de produção médica
 * - Cálculo automático de repasse
 * - Dashboard de lucro por médico
 */

import { supabase } from './customSupabaseClient';

// ============================================
// 1. CONFIGURAÇÃO DE REPASSE
// ============================================

/**
 * Listar configurações de repasse
 */
export async function listarConfigRepasse(clinicId) {
  const { data, error } = await supabase
    .from('medical_repasse_config')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Obter configuração de um profissional específico
 */
export async function obterConfigRepasse(clinicId, professionalId) {
  const { data, error } = await supabase
    .from('medical_repasse_config')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('professional_id', professionalId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data || null;
}

/**
 * Criar/atualizar configuração de repasse
 */
export async function salvarConfigRepasse(clinicId, professionalId, config) {
  const existing = await obterConfigRepasse(clinicId, professionalId);
  
  const dados = {
    clinic_id: clinicId,
    professional_id: professionalId,
    percentual_profissional: config.percentual_profissional || 70,
    percentual_clinica: config.percentual_clinica || 30,
    aplicar_imposto: config.aplicar_imposto !== false,
    aplicar_glosa: config.aplicar_glosa !== false,
    ativo: config.ativo !== false,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('medical_repasse_config')
      .update(dados)
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Insert
    const { data, error } = await supabase
      .from('medical_repasse_config')
      .insert([dados])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// ============================================
// 2. REGISTRO DE PRODUÇÃO MÉDICA
// ============================================

/**
 * Registrar atendimento/produção
 */
export async function registrarProducao(clinicId, professionalId, producao) {
  const { data, error } = await supabase
    .from('medical_production')
    .insert([{
      clinic_id: clinicId,
      professional_id: professionalId,
      atendimento_id: producao.atendimento_id || null,
      tipo: producao.tipo || 'consulta',
      valor_bruto: producao.valor_bruto,
      valor_liquido: producao.valor_liquido || producao.valor_bruto,
      data_atendimento: producao.data_atendimento || new Date().toISOString().split('T')[0],
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Listar produção de um período
 */
export async function listarProducaoPeriodo(clinicId, professionalId, dataInicio, dataFim) {
  const { data, error } = await supabase
    .from('medical_production')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('professional_id', professionalId)
    .gte('data_atendimento', dataInicio)
    .lte('data_atendimento', dataFim)
    .order('data_atendimento', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// ============================================
// 3. CÁLCULO DE REPASSE
// ============================================

/**
 * Calcular repasse para um profissional em um período
 * 
 * Chama a função RPC no Supabase que:
 * - Busca a configuração do profissional
 * - Suma toda produção do período
 * - Calcula repasse (70/30 ou proporção configurada)
 * - Insere ou atualiza resultado na tabela medical_repasse
 */
export async function calcularRepasse(clinicId, professionalId, dataInicio, dataFim) {
  // Primeiro, verificar se tem produção
  const producao = await listarProducaoPeriodo(clinicId, professionalId, dataInicio, dataFim);
  
  if (producao.length === 0) {
    console.warn('Nenhuma produção encontrada para este período');
    return null;
  }

  // Chamar a função RPC
  const { data, error } = await supabase.rpc('calcular_repasse', {
    p_professional_id: professionalId,
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  });
  
  if (error) throw error;
  
  // Retornar o repasse criado
  return await obterRepassePeriodo(clinicId, professionalId, dataInicio, dataFim);
}

// ============================================
// 4. CONSULTA DE REPASSE
// ============================================

/**
 * Obter repasse de um período específico
 */
export async function obterRepassePeriodo(clinicId, professionalId, dataInicio, dataFim) {
  const { data, error } = await supabase
    .from('medical_repasse')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('professional_id', professionalId)
    .eq('periodo_inicio', dataInicio)
    .eq('periodo_fim', dataFim)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Listar repasses de um período (todos os profissionais)
 */
export async function listarRepassesPeriodo(clinicId, dataInicio, dataFim, status = null) {
  let query = supabase
    .from('medical_repasse')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('periodo_inicio', dataInicio)
    .lte('periodo_fim', dataFim);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('periodo_inicio', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Listar histórico de repasses de um profissional
 */
export async function historicoProfissional(clinicId, professionalId, limite = 12) {
  const { data, error } = await supabase
    .from('medical_repasse')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('professional_id', professionalId)
    .order('periodo_fim', { ascending: false })
    .limit(limite);
  
  if (error) throw error;
  return data || [];
}

// ============================================
// 5. DASHBOARD DE LUCRO POR MÉDICO
// ============================================

/**
 * Dashboard com resumo de faturamento e repasse
 * Agora lê da tabela doctor_commissions (criada pela RPC generate_doctor_commissions_v2)
 */
export async function dashboardRepasseMedico(clinicId, dataInicio, dataFim) {
  console.log('📊 [DASHBOARD] Carregando dados de doctor_commissions para período:', {
    dataInicio,
    dataFim,
  });

  // Extrair mês e ano do dataInicio (formato YYYY-MM-DD)
  const [ano, mes] = dataInicio.split('-').slice(0, 2).map(Number);

  // Tentar primeiro a tabela doctor_commissions (dados da RPC)
  const { data: commissionsData, error: commissionError } = await supabase
    .from('doctor_commissions')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('reference_month', mes)
    .eq('reference_year', ano);

  if (commissionError) {
    console.warn('⚠️ [DASHBOARD] Erro ao buscar doctor_commissions:', commissionError);
  } else if (commissionsData && commissionsData.length > 0) {
    console.log('✅ [DASHBOARD] Encontrados', commissionsData.length, 'registros de comissões');
    console.log('🔍 [DASHBOARD] Data bruta da doctor_commissions:', commissionsData);

    // Carregar nomes dos profissionais para enriquecimento
    const { data: professionalsData, error: profError } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('clinic_id', clinicId);

    if (profError) {
      console.warn('⚠️ [DASHBOARD] Erro ao buscar profissionais:', profError);
    }

    const professionalMap = {};
    if (professionalsData) {
      professionalsData.forEach(p => {
        professionalMap[p.id] = p.name;
      });
    }
    console.log('👥 [DASHBOARD] Profissionais carregados:', professionalsData?.length || 0);
    console.log('📍 [DASHBOARD] Mapa de profissionais:', professionalMap);

    // Extrair IDs únicos das comissões
    const commissionsProfsIds = [...new Set(commissionsData.map(c => c.professional_id))];
    console.log('🏥 [DASHBOARD] IDs de profissionais nas comissões:', commissionsProfsIds);

    // Calcular totais a partir das comissões
    const totais = {
      totalBruto: commissionsData.reduce((sum, c) => sum + (c.gross_amount || 0), 0),
      totalLiquido: commissionsData.reduce((sum, c) => sum + (c.net_amount || 0), 0),
      totalProfissional: commissionsData.reduce((sum, c) => sum + (c.net_amount || 0), 0), // Repasse é 70%
      totalClinica: commissionsData.reduce((sum, c) => sum + ((c.gross_amount || 0) * 0.30), 0), // Clínica fica com 30%
    };

    // Agrupar por profissional com enriquecimento
    const porProfissional = commissionsData.map(c => {
      const profName = professionalMap[c.professional_id];
      console.log(`📌 [DASHBOARD] Enriquecendo commission de prof ${c.professional_id}: "
        encontrado="${profName || 'NÃO ENCONTRADO'}"`);
      
      return {
        professional_id: c.professional_id,
        profissional: profName || 'Profissional Desconhecido',
        totalBruto: c.gross_amount || 0,
        totalLiquido: c.net_amount || 0,
        totalRepasse: c.net_amount || 0, // 70% do bruto
        totalClinica: (c.gross_amount || 0) * 0.30, // 30% do bruto
        percentualProfissional: 70,
      };
    });

    console.log('📊 [DASHBOARD] Totais calculados:', totais);
    console.log('📊 [DASHBOARD] Por profissional (final):', porProfissional);

    return {
      totais,
      porProfissional,
      repasses: commissionsData,
    };
  }

  // Fallback: tentar tabela medical_repasse (antigas comissões)
  console.log('🔄 [DASHBOARD] Tentando fallback em medical_repasse');
  const repasses = await listarRepassesPeriodo(clinicId, dataInicio, dataFim);

  // Calcular totais
  const totais = {
    totalBruto: repasses.reduce((sum, r) => sum + (r.total_bruto || 0), 0),
    totalLiquido: repasses.reduce((sum, r) => sum + (r.total_liquido || 0), 0),
    totalProfissional: repasses.reduce((sum, r) => sum + (r.valor_profissional || 0), 0),
    totalClinica: repasses.reduce((sum, r) => sum + (r.valor_clinica || 0), 0),
  };

  // Agrupar por profissional
  const porProfissional = repasses.reduce((acc, repasse) => {
    const profId = repasse.professional_id;
    if (!acc[profId]) {
      acc[profId] = {
        profissional: repasse.professional,
        totalBruto: 0,
        totalLiquido: 0,
        totalRepasse: 0,
        totalClinica: 0,
        percentualProfissional: 0,
      };
    }
    acc[profId].totalBruto += repasse.total_bruto || 0;
    acc[profId].totalLiquido += repasse.total_liquido || 0;
    acc[profId].totalRepasse += repasse.valor_profissional || 0;
    acc[profId].totalClinica += repasse.valor_clinica || 0;

    // Calcular percentual efetivo
    if (acc[profId].totalLiquido > 0) {
      acc[profId].percentualProfissional =
        (acc[profId].totalRepasse / acc[profId].totalLiquido) * 100;
    }

    return acc;
  }, {});

  return {
    totais,
    porProfissional: Object.values(porProfissional),
    repasses,
  };
}

/**
 * Relatório detalhado de um profissional
 */
export async function relatorioDetalhoProfissional(clinicId, professionalId, dataInicio, dataFim) {
  // Produção
  const producao = await listarProducaoPeriodo(clinicId, professionalId, dataInicio, dataFim);
  
  // Repasses
  const repasses = await supabase
    .from('medical_repasse')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('professional_id', professionalId)
    .gte('periodo_inicio', dataInicio)
    .lte('periodo_fim', dataFim);
  
  if (repasses.error) throw repasses.error;
  
  // Configuração
  const config = await obterConfigRepasse(clinicId, professionalId);
  
  return {
    profissional: professionalId,
    periodo: { inicio: dataInicio, fim: dataFim },
    config,
    producao: producao || [],
    repasses: repasses.data || [],
    totais: {
      produtosBruto: producao.reduce((sum, p) => sum + (p.valor_bruto || 0), 0),
      produtosLiquido: producao.reduce((sum, p) => sum + (p.valor_liquido || 0), 0),
      repasseProfissional: repasses.data?.reduce((sum, r) => sum + (r.valor_profissional || 0), 0) || 0,
      repasseClinica: repasses.data?.reduce((sum, r) => sum + (r.valor_clinica || 0), 0) || 0,
    },
  };
}

// ============================================
// 6. UTILITÁRIOS
// ============================================

/**
 * Calcular repasse para todos os profissionais em um período
 * (útil para rodar repasse em lote)
 */
export async function calcularRepasseEmLote(clinicId, dataInicio, dataFim) {
  // Buscar todos os profissionais com produção no período
  const { data: producaoPorProf, error: prodError } = await supabase
    .from('medical_production')
    .select('professional_id')
    .eq('clinic_id', clinicId)
    .gte('data_atendimento', dataInicio)
    .lte('data_atendimento', dataFim);
  
  if (prodError) throw prodError;
  
  // Remover duplicatas
  const profissionaisUnicos = [...new Set(producaoPorProf.map(r => r.professional_id))];
  
  const resultados = [];
  for (const profId of profissionaisUnicos) {
    try {
      const repasse = await calcularRepasse(clinicId, profId, dataInicio, dataFim);
      if (repasse) {
        resultados.push({
          profissional: profId,
          status: 'sucesso',
          repasse,
        });
      }
    } catch (err) {
      resultados.push({
        profissional: profId,
        status: 'erro',
        erro: err.message,
      });
    }
  }
  
  return resultados;
}
