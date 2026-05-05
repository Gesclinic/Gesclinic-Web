// src/lib/repasseSchedulerApi.js
/**
 * Agendamento Automático de Repasses
 *
 * Calcula automaticamente repassos:
 * - Sempre no último dia útil do mês
 * - Ou sob demanda
 */

import { supabase } from './customSupabaseClient';
import { calcularRepasseEmLote } from './medicalRepasseApi';

/**
 * Configurar agendamento automático mensal
 * Nota: Para produção, integre com seu backend Node.js + cron
 */
export function agendarCalculoMensal() {
  // Este é um exemplo para frontend - idealmente rodar no backend

  // Verificar se precisa calcular (último dia do mês)
  const hoje = new Date();
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  if (hoje.getDate() === ultimoDia.getDate()) {
    console.log('📅 É o último dia do mês - calculando repassos...');
    return true;
  }

  return false;
}

/**
 * Executar cálculo automático de repassos para todas as clínicas
 * Deve ser chamado por um cron job no backend
 */
export async function executarCalculoAutomatico() {
  try {
    const hoje = new Date();
    const anoPassado = new Date(hoje);
    anoPassado.setMonth(anoPassado.getMonth() - 1);

    const dataInicio = `${anoPassado.getFullYear()}-${String(anoPassado.getMonth() + 1).padStart(2, '0')}-01`;
    const dataFim = `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}-${new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate()}`;

    // Buscar todas as clínicas
    const { data: clinics, error: clinicsError } = await supabase.from('clinics').select('id');

    if (clinicsError) {
      throw clinicsError;
    }

    const resultados = [];

    for (const clinic of clinics || []) {
      try {
        console.log(`💼 Processando clínica: ${clinic.id}`);
        const resultado = await calcularRepasseEmLote(clinic.id, dataInicio, dataFim);
        resultados.push({
          clinicId: clinic.id,
          status: 'sucesso',
          detalhes: resultado,
        });
      } catch (err) {
        resultados.push({
          clinicId: clinic.id,
          status: 'erro',
          erro: err.message,
        });
      }
    }

    // Registrar execução
    await supabase.from('repasse_scheduler_log').insert([
      {
        data_execucao: new Date().toISOString(),
        tipo: 'mensal_automatico',
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
        resultado_json: resultados,
        status: 'completado',
        total_clinicas: clinics?.length || 0,
        total_sucesso: resultados.filter((r) => r.status === 'sucesso').length,
        total_erro: resultados.filter((r) => r.status === 'erro').length,
      },
    ]);

    console.log('✅ Cálculo automático concluído:', resultados);
    return resultados;
  } catch (err) {
    console.error('❌ Erro ao executar cálculo automático:', err);
    throw err;
  }
}

/**
 * Agendar cálculo manual para um período específico
 */
export async function agendarCalculoManual(clinicId, mes, ano) {
  try {
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

    console.log(`📅 Agendando cálculo para ${mes}/${ano}...`);

    const resultado = await calcularRepasseEmLote(clinicId, dataInicio, dataFim);

    // Registrar agendamento
    await supabase.from('repasse_scheduler_log').insert([
      {
        data_execucao: new Date().toISOString(),
        tipo: 'manual',
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
        clinic_id: clinicId,
        resultado_json: resultado,
        status: 'completado',
      },
    ]);

    return resultado;
  } catch (err) {
    console.error('❌ Erro ao agendar cálculo manual:', err);
    throw err;
  }
}

/**
 * Obter histórico de agendamentos
 */
export async function obterHistoricoScheduler(clinicId, limite = 12) {
  try {
    const { data, error } = await supabase
      .from('repasse_scheduler_log')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('data_execucao', { ascending: false })
      .limit(limite);

    if (error) {
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('❌ Erro ao buscar histórico:', err);
    throw err;
  }
}
