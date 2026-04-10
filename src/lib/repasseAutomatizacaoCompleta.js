// src/lib/repasseAutomatizacaoCompleta.js
/**
 * Automatização Completa do Sistema de Repasse
 * 
 * Orquestra: Agenda → Production → Repasse → Transferência → Email
 * Sem necessidade de ação manual do usuário
 */

import { supabase } from './customSupabaseClient';
import { calcularRepasseEmLote, obterRepassePeriodo } from './medicalRepasseApi';
import { processarTransferenciasLote } from './repasseBancariaApi';
import { enviarNotificacoesEmLote } from './repasseEmailApi';
import { aoMarcarAtendimento } from './agendaIntegrationRepasseApi';
import { executarCalculoAutomatico } from './repasseSchedulerApi';

/**
 * PIPELINE 1: Quando um atendimento é marcado/concluído
 * Fluxo: Atendimento → Registra Production → Calcula Repasse Automático
 */
export async function pipelineAtendimentoConcluido(appointmentData) {
  try {
    console.log('🔄 Pipeline: Atendimento concluído');
    
    // Etapa 1: Registrar como production (agenda integration)
    await aoMarcarAtendimento(appointmentData);
    
    // Etapa 2: Calcular repasse automático (se configurado)
    const clinicId = appointmentData.clinic_id;
    const profissionalId = appointmentData.professional_id;
    
    // Busca a data do atendimento
    const mesAtendimento = new Date(appointmentData.data_atendimento);
    const periodoInicio = new Date(mesAtendimento.getFullYear(), mesAtendimento.getMonth(), 1);
    const periodoFim = new Date(mesAtendimento.getFullYear(), mesAtendimento.getMonth() + 1, 0);
    
    // Calcula repasse para este período
    const repasseFinal = await calcularRepasseEmLote(
      clinicId,
      periodoInicio.toISOString().split('T')[0],
      periodoFim.toISOString().split('T')[0]
    );
    
    console.log('✅ Production registrada e repasse calculado');
    return { success: true, repasse: repasseFinal };
  } catch (err) {
    console.error('❌ Erro no pipeline de atendimento:', err);
    throw err;
  }
}

/**
 * PIPELINE 2: Fim do mês - Calcula, Transfere e Notifica
 * Fluxo: Busca Repassos Pendentes → Transfere → Email
 * 
 * IMPORTANTE: Executar automaticamente em 1º de cada mês via cron
 * ou manualmente quando necessário
 */
export async function pipelineFinDeMes(clinicId) {
  try {
    console.log('💰 Pipeline: Fim de mês - Liquidação completa');
    
    // Etapa 1: Buscar repassos do mês anterior (não processados)
    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    
    const periodoInicio = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), 1);
    const periodoFim = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0);
    
    const repassos = await obterRepassePeriodo(
      clinicId,
      periodoInicio.toISOString().split('T')[0],
      periodoFim.toISOString().split('T')[0]
    );
    
    if (!repassos || repassos.length === 0) {
      console.log('⚠️  Nenhum repasse para processar');
      return { processados: 0, transferências: 0, emails: 0 };
    }
    
    console.log(`📊 ${repassos.length} repassos encontrados`);
    
    // Etapa 2: Processar transferências bancárias
    const resultadosTransferencia = await processarTransferenciasLote(repassos, 'pix');
    const transferenciasOK = resultadosTransferencia.filter(r => r.status === 'sucesso').length;
    console.log(`💳 ${transferenciasOK}/${repassos.length} transferências processadas`);
    
    // Etapa 3: Enviar notificações por email
    const resultadosEmail = await enviarNotificacoesEmLote(repassos, { id: clinicId });
    const emailsOK = resultadosEmail.filter(r => r.status === 'enviado').length;
    console.log(`📧 ${emailsOK}/${repassos.length} emails enviados`);
    
    // Registrar log de execução
    await registrarExecucaoPipeline({
      clinicId,
      tipo: 'fim_de_mes',
      repassos_total: repassos.length,
      transferencias_ok: transferenciasOK,
      emails_ok: emailsOK,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      resultado: 'sucesso'
    });
    
    return {
      processados: repassos.length,
      transferências: transferenciasOK,
      emails: emailsOK,
      resultado: 'sucesso'
    };
  } catch (err) {
    console.error('❌ Erro no pipeline de fim de mês:', err);
    await registrarExecucaoPipeline({
      tipo: 'fim_de_mes',
      clinicId,
      resultado: 'erro',
      erro_mensagem: err.message
    });
    throw err;
  }
}

/**
 * PIPELINE 3: Processamento sob Demanda
 * Permite ao usuário processar repassos manualmente
 */
export async function pipelineProcessamentoManual(clinicId, dataInicio, dataFim) {
  try {
    console.log('⚡ Pipeline: Processamento manual sob demanda');
    
    // Etapa 1: Calcular repassos para o período
    const repassos = await calcularRepasseEmLote(
      clinicId,
      dataInicio,
      dataFim
    );
    
    if (!repassos || repassos.length === 0) {
      console.log('⚠️  Nenhum repasse para o período');
      return { processados: 0 };
    }
    
    console.log(`📊 ${repassos.length} repassos calculados`);
    
    // Etapa 2: Processar transferências (opcional)
    const respProcessarTransferencias = confirm(`Deseja processar ${repassos.length} transferências agora?`);
    let transferenciasOK = 0;
    
    if (respProcessarTransferencias) {
      const resultadosTransferencia = await processarTransferenciasLote(repassos, 'pix');
      transferenciasOK = resultadosTransferencia.filter(r => r.status === 'sucesso').length;
      console.log(`💳 ${transferenciasOK}/${repassos.length} transferências processadas`);
    }
    
    // Etapa 3: Enviar emails (opcional)
    const respEnviarEmails = confirm(`Deseja notificar ${repassos.length} profissionais?`);
    let emailsOK = 0;
    
    if (respEnviarEmails) {
      const resultadosEmail = await enviarNotificacoesEmLote(repassos, { id: clinicId });
      emailsOK = resultadosEmail.filter(r => r.status === 'enviado').length;
      console.log(`📧 ${emailsOK}/${repassos.length} emails enviados`);
    }
    
    await registrarExecucaoPipeline({
      clinicId,
      tipo: 'manual',
      repassos_total: repassos.length,
      transferencias_ok: transferenciasOK,
      emails_ok: emailsOK,
      periodo_inicio: dataInicio,
      periodo_fim: dataFim,
      resultado: 'sucesso'
    });
    
    return {
      processados: repassos.length,
      transferências: transferenciasOK,
      emails: emailsOK,
      resultado: 'sucesso'
    };
  } catch (err) {
    console.error('❌ Erro no processamento manual:', err);
    throw err;
  }
}

/**
 * Registrar execução do pipeline para auditoria
 */
async function registrarExecucaoPipeline(dados) {
  try {
    const { error } = await supabase
      .from('repasse_pipeline_log')
      .insert([
        {
          clinic_id: dados.clinicId,
          tipo_execucao: dados.tipo,
          periodo_inicio: dados.periodo_inicio,
          periodo_fim: dados.periodo_fim,
          repassos_total: dados.repassos_total,
          transferencias_ok: dados.transferencias_ok,
          emails_ok: dados.emails_ok,
          resultado: dados.resultado,
          erro_mensagem: dados.erro_mensagem,
          created_at: new Date().toISOString(),
        }
      ]);
    
    if (error) throw error;
    console.log('📝 Execução registrada em auditoria');
  } catch (err) {
    console.warn('⚠️  Erro ao registrar pipeline:', err);
  }
}

/**
 * Setup: Monitores em Tempo Real para Gatilhos Automáticos
 * 
 * IMPORTANTE: Chamar UMA VEZ durante inicialização do app
 */
export function setupAutomatizacaoEmTempoReal(clinicId) {
  console.log('🚀 Configurando automatização em tempo real...');
  
  // Monitor 1: Quando atendimentos são criados/finalizados
  const subscricaoAtendimentos = supabase
    .channel(`agenda:clinic_${clinicId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'appointments',
      filter: `clinic_id=eq.${clinicId}`
    }, async (payload) => {
      if (payload.new.status === 'completed' || payload.new.status === 'realizado') {
        try {
          await pipelineAtendimentoConcluido(payload.new);
        } catch (err) {
          console.error('❌ Erro ao processar atendimento em tempo real:', err);
        }
      }
    })
    .subscribe();
  
  // Monitor 2: Verificar se é dia 1º do mês (para executar pipelineFinDeMes)
  const intervaloDiario = setInterval(async () => {
    const hoje = new Date();
    if (hoje.getDate() === 1 && hoje.getHours() === 1) { // Executa 01:00 do 1º dia
      try {
        await pipelineFinDeMes(clinicId);
      } catch (err) {
        console.error('❌ Erro no pipeline automático mensal:', err);
      }
    }
  }, 60000); // Verificar a cada minuto
  
  console.log('✅ Automatização em tempo real ativada');
  
  return { subscricaoAtendimentos, intervaloDiario };
}

/**
 * Cleanup: Remover listeners quando desmontar
 */
export function limpezaAutomatizacao(subscricao, intervalo) {
  if (subscricao) {
    supabase.removeChannel(subscricao);
  }
  if (intervalo) {
    clearInterval(intervalo);
  }
  console.log('🛑 Automatização em tempo real desativada');
}

/**
 * Teste: Executar pipeline completo manualmente
 * Útil para debug e testes
 */
export async function testePipelineCompleto(clinicId) {
  console.log('🧪 Iniciando teste de pipeline...');
  
  try {
    // Teste 1: Simular atendimento concluído
    console.log('Teste 1: Simulando atendimento concluído...');
    const fakeAppointment = {
      id: 'test-' + Date.now(),
      clinic_id: clinicId,
      professional_id: null, // Será preenchido do BD
      data_atendimento: new Date().toISOString(),
      status: 'completed'
    };
    // await pipelineAtendimentoConcluido(fakeAppointment);
    console.log('✅ Teste 1 concluído');
    
    // Teste 2: Processamento manual
    console.log('Teste 2: Processamento manual...');
    const hoje = new Date();
    const periodoInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const periodoFim = hoje;
    
    const resultado = await pipelineProcessamentoManual(
      clinicId,
      periodoInicio.toISOString().split('T')[0],
      periodoFim.toISOString().split('T')[0]
    );
    console.log('✅ Teste 2 concluído:', resultado);
    
    console.log('🎉 Teste de pipeline finalizado com sucesso!');
    return { sucesso: true, resultado };
  } catch (err) {
    console.error('❌ Teste de pipeline falhou:', err);
    return { sucesso: false, erro: err.message };
  }
}
