// API de Repasse Médico - src/lib/repasseMedicoApi.js
import { supabase } from './customSupabaseClient';
import { logRepasseCalculated, logRepassePaid } from '@/lib/auditFinancialIntegration.js';

// Geração de repasse
export async function gerarRepasse({ clinicId, mes, ano, tipoGeracao }) {
  // Chama função SQL/RPC para gerar repasse (snapshot)
  // Garante que ano e mes têm valores padrão
  const currentYear = ano || new Date().getFullYear();
  const currentMonth = mes || new Date().getMonth() + 1;

  const { data, error } = await supabase.rpc('gerar_repasse_medico', {
    p_clinic_id: clinicId,
    p_mes: currentMonth,
    p_ano: currentYear,
    p_tipo_geracao: tipoGeracao || 'manual',
  });
  if (error) {
    throw error;
  }

  // Log: Repasse calculado para cada registro
  if (Array.isArray(data)) {
    data.forEach((repasse) => {
      logRepasseCalculated(
        repasse.appointment_id || null,
        repasse.professional_id,
        repasse.id,
        repasse.valor_total || 0,
        repasse.comissao || 0,
        {
          mes: currentMonth,
          ano: currentYear,
          tipo_geracao: tipoGeracao,
          status: repasse.status,
        },
      ).catch((err) => console.warn('Auditoria log failed:', err));
    });
  }

  return data;
}

// Listagem de repasses
export async function listarRepasses({ clinicId, mes, ano, profissionalId, status }) {
  let query = supabase.from('repasse_medico').select('*').eq('clinic_id', clinicId);
  if (mes) {
    query = query.eq('periodo_mes', mes);
  }
  if (ano) {
    query = query.eq('ano', ano);
  }
  if (profissionalId) {
    query = query.eq('professional_id', profissionalId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return data;
}

// Detalhe de repasse
export async function detalheRepasse(repasseId) {
  const { data, error } = await supabase
    .from('repasse_medico')
    .select('*')
    .eq('id', repasseId)
    .single();
  if (error) {
    throw error;
  }
  return data;
}

// Ajuste manual de repasse
export async function ajustarRepasse({ repasseId, valorAjuste, motivo, usuarioId }) {
  const { data, error } = await supabase
    .from('repasse_ajuste')
    .insert([{ repasse_id: repasseId, valor_ajuste: valorAjuste, motivo, usuario_id: usuarioId }]);
  if (error) {
    throw error;
  }
  return data;
}

// Dashboard de repasse
export async function dashboardRepasse({ clinicId, mes, ano }) {
  const currentYear = ano || new Date().getFullYear();
  const currentMonth = mes || new Date().getMonth() + 1;

  const { data, error } = await supabase.rpc('dashboard_repasse_medico', {
    p_clinic_id: clinicId,
    p_mes: currentMonth,
    p_ano: currentYear,
  });
  if (error) {
    throw error;
  }
  return data;
}

// Integração com contas a pagar
export async function liberarRepasseParaPagamento(repasseId) {
  // Fetch detalhes do repasse antes de processar
  const { data: repasseData } = await supabase
    .from('repasse_medico')
    .select('*')
    .eq('id', repasseId)
    .single();

  // Chama função SQL/RPC para criar conta a pagar e atualizar status
  const { data, error } = await supabase.rpc('liberar_repasse_pagamento', {
    p_repasse_id: repasseId,
  });
  if (error) {
    throw error;
  }

  // Log: Repasse pago
  if (repasseData) {
    logRepassePaid(
      repasseData.appointment_id || null,
      repasseData.professional_id,
      repasseId,
      repasseData.valor_total || 0,
      {
        professional_name: repasseData.professional_name,
        previous_status: repasseData.status,
        new_status: 'paid',
      },
    ).catch((err) => console.warn('Auditoria log failed:', err));
  }

  return data;
}
