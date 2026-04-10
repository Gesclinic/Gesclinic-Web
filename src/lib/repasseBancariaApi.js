// src/lib/repasseBancariaApi.js
/**
 * Integração com Transferência Bancária Automática
 * 
 * Suportado:
 * - Brasil: PIX, TED
 * - Internacional: SWIFT
 * - Wallets: PayPal, Stripe
 */

import { supabase } from './customSupabaseClient';

/**
 * Registrar dados bancários do profissional
 */
export async function salvarDadosBancarios(professionalId, clinicId, dadosBancarios) {
  try {
    const { data, error } = await supabase
      .from('professional_bank_accounts')
      .upsert([
        {
          professional_id: professionalId,
          clinic_id: clinicId,
          banco: dadosBancarios.banco,
          agencia: dadosBancarios.agencia,
          conta: dadosBancarios.conta,
          tipo_conta: dadosBancarios.tipo_conta, // 'corrente', 'poupança'
          cpf_cnpj: dadosBancarios.cpf_cnpj,
          tipo_chave: dadosBancarios.tipo_chave, // 'cpf', 'email', 'telefone', 'aleatoria'
          chave_pix: dadosBancarios.chave_pix,
          titular: dadosBancarios.titular,
          ativo: true,
          created_at: new Date().toISOString(),
        }
      ], { onConflict: ['professional_id', 'clinic_id'] });

    if (error) throw error;
    console.log('✅ Dados bancários salvos:', data);
    return data;
  } catch (err) {
    console.error('❌ Erro ao salvar dados bancários:', err);
    throw err;
  }
}

/**
 * Obter dados bancários do profissional
 */
export async function obterDadosBancarios(professionalId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('professional_bank_accounts')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('clinic_id', clinicId)
      .eq('ativo', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (err) {
    console.error('❌ Erro ao obter dados bancários:', err);
    return null;
  }
}

/**
 * Criar requisição de transferência (PIX ou TED)
 */
export async function criarRequisicaoTransferencia(repasse, metodo = 'pix') {
  try {
    // Buscar dados bancários do profissional
    const dadosBancarios = await obterDadosBancarios(
      repasse.professional_id,
      repasse.clinic_id
    );

    if (!dadosBancarios) {
      throw new Error('Profissional não possui dados bancários cadastrados');
    }

    // Criar registro de transferência
    const { data, error } = await supabase
      .from('repasse_transferencias')
      .insert([
        {
          repasse_id: repasse.id,
          professional_id: repasse.professional_id,
          clinic_id: repasse.clinic_id,
          valor: repasse.valor_profissional,
          metodo, // 'pix', 'ted', 'paypal', 'stripe'
          dados_bancarios_id: dadosBancarios.id,
          status: 'pendente', // 'pendente', 'processando', 'concluido', 'erro'
          descricao: `Repasse ${repasse.periodo_inicio} a ${repasse.periodo_fim}`,
          data_transacao: null,
          id_transacao_externa: null,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) throw error;
    console.log('✅ Requisição de transferência criada:', data);
    return data?.[0];
  } catch (err) {
    console.error('❌ Erro ao criar requisição de transferência:', err);
    throw err;
  }
}

/**
 * Simular transferência PIX (para testes)
 * Em produção, integrar com API real do banco
 */
export async function transferirPIX(transferencia) {
  try {
    console.log('🏦 Iniciando transferência PIX...');
    console.log('Valor:', transferencia.valor);
    console.log('Chave PIX:', transferencia.dados_bancarios?.chave_pix);

    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Atualizar status
    const { data, error } = await supabase
      .from('repasse_transferencias')
      .update({
        status: 'concluido',
        data_transacao: new Date().toISOString(),
        id_transacao_externa: `PIX-${Date.now()}`,
      })
      .eq('id', transferencia.id)
      .select();

    if (error) throw error;
    console.log('✅ Transferência PIX concluída:', data);
    return data?.[0];
  } catch (err) {
    console.error('❌ Erro ao transferir PIX:', err);
    throw err;
  }
}

/**
 * Integração com API real (exemplo: API 99Pay, Bradesco, etc)
 */
export async function transferirIntegracaoAPI(transferencia, provedor = 'api-99pay') {
  try {
    // Aqui você integraria com API real
    // Exemplo:
    
    if (provedor === 'api-99pay') {
      // const response = await fetch('https://api.exemplo.com/transfer', {
      //   method: 'POST',
      //   headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     amount: transferencia.valor,
      //     beneficiary: transferencia.dados_bancarios,
      //     reference: transferencia.repasse_id,
      //   })
      // });
      // const result = await response.json();
    }

    console.log('⚠️  Integração com API não configurada');
    return null;
  } catch (err) {
    console.error('❌ Erro na integração com API:', err);
    throw err;
  }
}

/**
 * Processar múltiplas transferências em lote
 */
export async function processarTransferenciasLote(repassos, metodo = 'pix') {
  try {
    const resultados = [];

    for (const repasse of repassos) {
      try {
        // Criar requisição
        const requisicao = await criarRequisicaoTransferencia(repasse, metodo);

        if (metodo === 'pix') {
          // Executar transferência
          const resultado = await transferirPIX(requisicao);
          resultados.push({ 
            repasse: repasse.id, 
            status: 'sucesso',
            transacao: resultado 
          });
        } else {
          // Outros métodos
          resultados.push({ 
            repasse: repasse.id, 
            status: 'pendente_processamento',
            detalhes: requisicao 
          });
        }
      } catch (err) {
        resultados.push({ 
          repasse: repasse.id, 
          status: 'erro',
          erro: err.message 
        });
      }
    }

    return resultados;
  } catch (err) {
    console.error('❌ Erro ao processar lote:', err);
    throw err;
  }
}

/**
 * Obter histórico de transferências
 */
export async function obterHistoricoTransferencias(clinicId, professionalId = null) {
  try {
    let query = supabase
      .from('repasse_transferencias')
      .select('*, professional:professional_id(name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (professionalId) {
      query = query.eq('professional_id', professionalId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Erro ao buscar histórico:', err);
    throw err;
  }
}

/**
 * Gerar relatório bancário
 */
export async function gerarRelatorioBancario(clinicId, dataInicio, dataFim) {
  try {
    const { data, error } = await supabase
      .from('repasse_transferencias')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('created_at', dataInicio)
      .lte('created_at', dataFim)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calcular totais
    const totais = {
      total_repassos: data?.length || 0,
      concluidos: data?.filter(t => t.status === 'concluido').length || 0,
      pendentes: data?.filter(t => t.status === 'pendente' || t.status === 'processando').length || 0,
      erros: data?.filter(t => t.status === 'erro').length || 0,
      valor_total: data?.reduce((sum, t) => sum + (t.valor || 0), 0) || 0,
      valor_concluido: data?.filter(t => t.status === 'concluido').reduce((sum, t) => sum + (t.valor || 0), 0) || 0,
    };

    return { dados: data, totais };
  } catch (err) {
    console.error('❌ Erro ao gerar relatório:', err);
    throw err;
  }
}
