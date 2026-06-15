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

  if (error) {
    throw error;
  }
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

  if (error && error.code !== 'PGRST116') {
    throw error;
  } // PGRST116 = not found
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
      .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (error) {
      throw error;
    }
    return data;
  } else {
    // Insert
    const { data, error } = await supabase.from('medical_repasse_config').insert([dados]).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (error) {
      throw error;
    }
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
    .insert([
      {
        clinic_id: clinicId,
        professional_id: professionalId,
        atendimento_id: producao.atendimento_id || null,
        tipo: producao.tipo || 'consulta',
        valor_bruto: producao.valor_bruto,
        valor_liquido: producao.valor_liquido || producao.valor_bruto,
        data_atendimento: producao.data_atendimento || new Date().toISOString().split('T')[0],
      },
    ])
    .select();

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];

  if (error) {
    throw error;
  }
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

  if (error) {
    throw error;
  }
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

  if (error) {
    throw error;
  }

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
    .eq('periodo_fim', dataFim);

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }
  return data[0];

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
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

  if (error) {
    throw error;
  }
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

  if (error) {
    throw error;
  }
  return data || [];
}

function formatPeriod(month, year) {
  return `${String(month).padStart(2, '0')}/${year}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

/**
 * Libera uma comissao medica consolidada para Contas a Pagar.
 * A idempotencia e feita por metadata para evitar AP duplicado.
 */
export async function liberarComissaoParaContasPagar(commissionId, options = {}) {
  const { dueDate = addDays(new Date(), 10), actorId = null } = options;
  const now = new Date().toISOString();

  const { data: commission, error: commissionError } = await supabase
    .from('doctor_commissions')
    .select('*')
    .eq('id', commissionId)
    .single();

  if (commissionError) {
    throw commissionError;
  }

  if (!commission?.clinic_id || !commission?.professional_id) {
    throw new Error('Comissao medica sem clinica ou profissional vinculado');
  }

  const amount = Number(commission.net_amount || 0);
  if (amount <= 0) {
    throw new Error('Comissao medica sem valor liquido para gerar AP');
  }

  const metadataKey = {
    source: 'doctor_commission',
    doctor_commission_id: commission.id,
  };

  const { data: existingPayables, error: existingError } = await supabase
    .from('ap_bills')
    .select('id, status, amount, due_date, metadata')
    .eq('clinic_id', commission.clinic_id)
    .contains('metadata', metadataKey)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingPayables?.length) {
    const { error: updateExistingError } = await supabase
      .from('doctor_commissions')
      .update({
        status: 'scheduled',
        payment_method: 'AP',
        updated_at: now,
      })
      .eq('id', commission.id);

    if (updateExistingError) {
      throw updateExistingError;
    }

    return {
      created: false,
      payable: existingPayables[0],
      commission: {
        ...commission,
        status: 'scheduled',
        payment_method: 'AP',
      },
    };
  }

  const { data: professional, error: professionalError } = await supabase
    .from('professionals')
    .select('id, name, cpf, council_type, council_number, council_state')
    .eq('id', commission.professional_id)
    .eq('clinic_id', commission.clinic_id)
    .maybeSingle();

  if (professionalError) {
    throw professionalError;
  }

  const professionalName = professional?.name || 'Profissional nao informado';
  const period = formatPeriod(commission.reference_month, commission.reference_year);
  const metadata = {
    ...metadataKey,
    origin_module: 'repasse_medico',
    reference_month: commission.reference_month,
    reference_year: commission.reference_year,
    calc_mode: commission.calc_mode,
    total_services: commission.total_services,
    gross_amount: Number(commission.gross_amount || 0),
    total_paid: Number(commission.total_paid || 0),
    total_pending: Number(commission.total_pending || 0),
    commission_percent: Number(commission.commission_percent || 0),
    released_at: now,
    released_by: actorId,
    enterprise: {
      cash_flow: {
        expected_entry_type: 'OUTFLOW',
        projection_status: 'FORECAST',
        source: 'medical_repass',
      },
      dre: {
        classification: 'MEDICAL_REPASS',
        competency_date: `${commission.reference_year}-${String(commission.reference_month).padStart(2, '0')}-01`,
      },
      medical_repass: {
        doctor_commission_id: commission.id,
        professional_id: commission.professional_id,
        period,
      },
    },
  };

  const { data: payable, error: payableError } = await supabase
    .from('ap_bills')
    .insert({
      clinic_id: commission.clinic_id,
      supplier_id: commission.professional_id,
      supplier_name: professionalName,
      vendor_name: professionalName,
      supplier_document: professional?.cpf || professional?.council_number || null,
      description: `Repasse medico - ${professionalName} - ${period}`,
      amount,
      net_amount: amount,
      balance_amount: amount,
      paid_value: 0,
      due_date: dueDate,
      competency_date: `${commission.reference_year}-${String(commission.reference_month).padStart(2, '0')}-01`,
      status: 'OPEN',
      payment_method: 'PIX',
      type: 'PAYROLL',
      category: 'medical_repass',
      subcategory: commission.calc_mode || null,
      dre_classification: 'MEDICAL_REPASS',
      is_forecast: true,
      is_manual: false,
      document_number: `REP-${commission.reference_year}${String(commission.reference_month).padStart(2, '0')}-${String(commission.id).slice(0, 8)}`,
      notes: `Gerado automaticamente a partir do repasse medico (${commission.calc_mode || 'padrao'}).`,
      metadata,
      created_by: actorId,
    })
    .select()
    .single();

  if (payableError) {
    throw payableError;
  }

  const { error: updateError } = await supabase
    .from('doctor_commissions')
    .update({
      status: 'scheduled',
      payment_method: 'AP',
      updated_at: now,
    })
    .eq('id', commission.id);

  if (updateError) {
    throw updateError;
  }

  return {
    created: true,
    payable,
    commission: {
      ...commission,
      status: 'scheduled',
      payment_method: 'AP',
    },
  };
}

export async function liberarComissoesPeriodoParaContasPagar({
  clinicId,
  month,
  year,
  actorId = null,
  dueDate,
} = {}) {
  if (!clinicId || !month || !year) {
    throw new Error('Clinica, mes e ano sao obrigatorios para gerar AP em lote');
  }

  const { data: commissions, error } = await supabase
    .from('doctor_commissions')
    .select('id, net_amount, status, payment_method')
    .eq('clinic_id', clinicId)
    .eq('reference_month', Number(month))
    .eq('reference_year', Number(year))
    .gt('net_amount', 0);

  if (error) {
    throw error;
  }

  const results = [];
  for (const commission of commissions || []) {
    const alreadyScheduled =
      commission.status === 'scheduled' || commission.payment_method === 'AP';

    if (alreadyScheduled) {
      results.push({
        commissionId: commission.id,
        created: false,
        skipped: true,
        reason: 'AP ja gerado',
      });
      continue;
    }

    try {
      const result = await liberarComissaoParaContasPagar(commission.id, { actorId, dueDate });
      results.push({
        commissionId: commission.id,
        created: result.created,
        skipped: false,
        payableId: result.payable?.id,
      });
    } catch (err) {
      results.push({
        commissionId: commission.id,
        created: false,
        skipped: false,
        error: err.message || 'Erro ao gerar AP',
      });
    }
  }

  return {
    total: commissions?.length || 0,
    created: results.filter((item) => item.created).length,
    existing: results.filter((item) => !item.created && item.payableId).length,
    skipped: results.filter((item) => item.skipped).length,
    failed: results.filter((item) => item.error).length,
    results,
  };
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
      professionalsData.forEach((p) => {
        professionalMap[p.id] = p.name;
      });
    }
    console.log('👥 [DASHBOARD] Profissionais carregados:', professionalsData?.length || 0);
    console.log('📍 [DASHBOARD] Mapa de profissionais:', professionalMap);

    // Extrair IDs únicos das comissões
    const commissionsProfsIds = [...new Set(commissionsData.map((c) => c.professional_id))];
    console.log('🏥 [DASHBOARD] IDs de profissionais nas comissões:', commissionsProfsIds);

    // Calcular totais a partir das comissões
    const totais = {
      totalBruto: commissionsData.reduce((sum, c) => sum + (c.gross_amount || 0), 0),
      totalLiquido: commissionsData.reduce((sum, c) => sum + (c.net_amount || 0), 0),
      totalProfissional: commissionsData.reduce((sum, c) => sum + (c.net_amount || 0), 0), // Repasse é 70%
      totalClinica: commissionsData.reduce((sum, c) => sum + (c.gross_amount || 0) * 0.3, 0), // Clínica fica com 30%
    };

    // Agrupar por profissional com enriquecimento
    const porProfissional = commissionsData.map((c) => {
      const profName = professionalMap[c.professional_id];
      console.log(`📌 [DASHBOARD] Enriquecendo commission de prof ${c.professional_id}: "
        encontrado="${profName || 'NÃO ENCONTRADO'}"`);

      return {
        professional_id: c.professional_id,
        commission_id: c.id,
        profissional: profName || 'Profissional Desconhecido',
        totalBruto: c.gross_amount || 0,
        totalLiquido: c.net_amount || 0,
        totalRepasse: c.net_amount || 0, // 70% do bruto
        totalClinica: (c.gross_amount || 0) * 0.3, // 30% do bruto
        percentualProfissional: 70,
        status: c.status || 'pending',
        paymentMethod: c.payment_method || null,
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

  if (!repasses.length) {
    console.log('🔄 [DASHBOARD] Tentando fallback em ar_invoices');
    const { data: receivables, error: receivablesError } = await supabase
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId);

    if (!receivablesError && receivables?.length) {
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('clinic_id', clinicId);
      const professionalMap = Object.fromEntries((professionalsData || []).map((p) => [p.id, p.name]));
      const byProfessional = (receivables || [])
        .filter((row) => {
          const date = String(row.competency_date || row.invoice_date || row.due_date || row.created_at || '').split('T')[0];
          return date >= dataInicio && date <= dataFim;
        })
        .filter((row) => row.professional_id)
        .reduce((acc, row) => {
          const profId = row.professional_id;
          if (!acc[profId]) {
            acc[profId] = {
              professional_id: profId,
              profissional: professionalMap[profId] || row.doctor_name || 'Profissional Desconhecido',
              totalBruto: 0,
              totalLiquido: 0,
              totalRepasse: 0,
              totalClinica: 0,
              percentualProfissional: 0,
              status: 'preview',
            };
          }
          const gross = Number(row.gross_amount ?? row.amount ?? 0);
          const net = Number(row.net_value ?? Math.max(0, gross - Number(row.discount_value || 0) - Number(row.fee_amount || 0)));
          const repasse = Number(row.repasse_expected || 0);
          acc[profId].totalBruto += gross;
          acc[profId].totalLiquido += net;
          acc[profId].totalRepasse += repasse;
          acc[profId].totalClinica += Math.max(0, net - repasse);
          acc[profId].percentualProfissional = acc[profId].totalLiquido > 0
            ? (acc[profId].totalRepasse / acc[profId].totalLiquido) * 100
            : 0;
          return acc;
        }, {});
      const porProfissional = Object.values(byProfessional);
      return {
        totais: {
          totalBruto: porProfissional.reduce((sum, item) => sum + item.totalBruto, 0),
          totalLiquido: porProfissional.reduce((sum, item) => sum + item.totalLiquido, 0),
          totalProfissional: porProfissional.reduce((sum, item) => sum + item.totalRepasse, 0),
          totalClinica: porProfissional.reduce((sum, item) => sum + item.totalClinica, 0),
        },
        porProfissional,
        repasses: [],
      };
    }
  }

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

  if (repasses.error) {
    throw repasses.error;
  }

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
      repasseProfissional:
        repasses.data?.reduce((sum, r) => sum + (r.valor_profissional || 0), 0) || 0,
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

  if (prodError) {
    throw prodError;
  }

  // Remover duplicatas
  const profissionaisUnicos = [...new Set(producaoPorProf.map((r) => r.professional_id))];

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
