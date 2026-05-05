// src/lib/agendaIntegrationRepasseApi.js
/**
 * Integração entre Agenda e Repasse Automático
 *
 * Objetivo: Auto-registrar produção quando um atendimento é marcado/finalizado
 */

import { supabase } from './customSupabaseClient';
import { registrarProducao } from './medicalRepasseApi';

/**
 * Ao marcar um atendimento, registrar automaticamente a produção
 * Deve ser chamado quando um appointment é criado/atualizado
 */
export async function aoMarcarAtendimento(appointmentData) {
  try {
    // Se o atendimento foi concluído ou é do tipo finalizado
    if (appointmentData.status === 'completed' || appointmentData.status === 'realizado') {
      // Buscar preço do serviço
      const { data: serviceData, error: serviceError } = await supabase
        .from('service_prices')
        .select('price')
        .eq('service_id', appointmentData.service_id)
        .eq('clinic_id', appointmentData.clinic_id)
        .single();

      if (serviceError) {
        console.warn('Erro ao buscar preço:', serviceError);
      }

      const valorBruto = serviceData?.price || appointmentData.price || 0;

      // Valor líquido = 80% do bruto (estimativa de deduções)
      const valorLiquido = valorBruto * 0.8;

      // Registrar produção automaticamente
      const producao = await registrarProducao(
        appointmentData.clinic_id,
        appointmentData.professional_id,
        {
          atendimento_id: appointmentData.id,
          tipo: 'consulta', // ou 'exame', 'cirurgia' conforme serviço
          valor_bruto: valorBruto,
          valor_liquido: valorLiquido,
          data_atendimento:
            appointmentData.appointment_date || new Date().toISOString().split('T')[0],
        },
      );

      console.log('✅ Produção registrada automaticamente:', producao);
      return producao;
    }
  } catch (err) {
    console.error('❌ Erro ao integrar agenda com repasse:', err);
    // Não falhar o agendamento se houver erro no repasse
  }
}

/**
 * Sincronizar produção de atendimentos já realizados
 * Útil para migrar dados históricos
 */
export async function sincronizarProducaoHistorica(clinicId, dataInicio, dataFim) {
  try {
    // Buscar todos os atendimentos concluídos no período
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*, services(name), professionals(name)')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .gte('appointment_date', dataInicio)
      .lte('appointment_date', dataFim);

    if (appointmentsError) {
      throw appointmentsError;
    }

    const resultados = [];

    for (const apt of appointments || []) {
      try {
        // Verificar se já existe produção registrada
        const { data: existente } = await supabase
          .from('medical_production')
          .select('id')
          .eq('atendimento_id', apt.id)
          .single();

        if (!existente) {
          // Registrar produção
          const resultado = await aoMarcarAtendimento(apt);
          resultados.push({ atendimento: apt.id, status: 'registrado' });
        } else {
          resultados.push({ atendimento: apt.id, status: 'ja-existente' });
        }
      } catch (err) {
        resultados.push({ atendimento: apt.id, status: 'erro', erro: err.message });
      }
    }

    return {
      total: appointments?.length || 0,
      registrados: resultados.filter((r) => r.status === 'registrado').length,
      jáExistentes: resultados.filter((r) => r.status === 'ja-existente').length,
      erros: resultados.filter((r) => r.status === 'erro').length,
      detalhes: resultados,
    };
  } catch (err) {
    console.error('❌ Erro ao sincronizar produção histórica:', err);
    throw err;
  }
}

/**
 * Listener para atualizar produção quando agenda muda
 * Integre isto com o seu sistema de agendamento
 */
export function setupAgendaListener(clinicId) {
  if (!clinicId) {
    return () => {};
  }

  // Setup listener para appointments
  const subscription = supabase
    .channel(`public:appointments:clinic_id=eq.${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `clinic_id=eq.${clinicId} AND status=eq.completed`,
      },
      (payload) => {
        console.log('🔔 Atendimento finalizado, registrando produção...', payload.new);
        aoMarcarAtendimento(payload.new).catch((err) =>
          console.error('Erro ao registrar produção:', err),
        );
      },
    )
    .subscribe();

  // Retornar função para desinscrever
  return () => {
    subscription.unsubscribe();
  };
}
