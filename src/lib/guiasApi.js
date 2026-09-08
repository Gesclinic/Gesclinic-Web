import { supabase } from './customSupabaseClient';

/**
 * API para gerenciar guias de consulta, internação e SADT
 */

/**
 * Listar guias de uma clínica
 * @param {string} clinicId - ID da clínica
 * @param {object} filters - Filtros (tipo, status, periodo)
 * @returns {Promise<Array>} Lista de guias
 */
export async function listarGuias(clinicId, filters = {}) {
  try {
    let query = supabase.from('billing_guides').select('*').eq('clinic_id', clinicId);

    // Aplicar filtros opcionais
    if (filters.tipo) {
      query = query.eq('tipo_guia', filters.tipo);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.dataInicio && filters.dataFim) {
      query = query.gte('data_criacao', filters.dataInicio).lte('data_criacao', filters.dataFim);
    }

    const { data, error } = await query.order('data_criacao', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro ao listar guias:', error);
    throw error;
  }
}

/**
 * Buscar uma guia por ID
 * @param {string} guiaId - ID da guia
 * @returns {Promise<object>} Dados da guia
 */
export async function buscarGuia(guiaId) {
  try {
    const { data, error } = await supabase
      .from('billing_guides')
      .select('*')
      .eq('id', guiaId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar guia:', error);
    throw error;
  }
}

/**
 * Criar uma nova guia
 * @param {string} clinicId - ID da clínica
 * @param {object} dadosGuia - Dados da guia (pode incluir appointment_id para auto-link)
 * @returns {Promise<object>} Guia criada
 */
export async function criarGuia(clinicId, dadosGuia) {
  try {
    // 🚀 BLOCKER 2 FIX: Allow optional patient/card validation for auto-creation from appointments
    // If appointment_id is provided, we're in auto-creation mode
    const isAutoCreation = !!dadosGuia.appointment_id;

    if (!isAutoCreation && (!dadosGuia.paciente_nome || !dadosGuia.numero_carteirinha)) {
      throw new Error('Nome do paciente e número de carteirinha são obrigatórios');
    }

    const guiaData = {
      clinic_id: clinicId,
      appointment_id: dadosGuia.appointment_id || null, // NEW: FK link to appointment
      tipo_guia: dadosGuia.tipo_guia || 'SP',
      paciente_nome: (dadosGuia.paciente_nome || '').trim() || 'Paciente',
      convenio: dadosGuia.convenio?.trim() || dadosGuia.payer_name?.trim() || null,
      plano: dadosGuia.plano?.trim() || dadosGuia.plan_name?.trim() || null,
      numero_carteirinha:
        (dadosGuia.numero_carteirinha || '').trim() || dadosGuia.card_number?.trim() || null,
      profissional: dadosGuia.profissional?.trim() || dadosGuia.professional_name?.trim() || null,
      codigo_cbhpm: dadosGuia.codigo_cbhpm?.trim() || dadosGuia.service_code?.trim() || null,
      valor: parseFloat(dadosGuia.valor || dadosGuia.value) || 0,
      observacoes: dadosGuia.observacoes?.trim() || null,
      status: isAutoCreation ? 'Aguardando Envio' : 'Aguardando XML',
      data_criacao: new Date().toISOString(),
    };

    // Warn if in auto-creation mode with missing card
    if (isAutoCreation && !guiaData.numero_carteirinha) {
      console.warn('⚠️ [GUIDE AUTO-CREATE] Creat without card number - may need manual update');
    }

    console.log('📝 Criando guia:', guiaData);

    const { data, error } = await supabase
      .from('billing_guides')
      .insert([guiaData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro Supabase:', error);
      throw error;
    }

    console.log('✅ Guia criada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao criar guia:', error);
    throw error;
  }
}

/**
 * Atualizar uma guia existente
 * @param {string} guiaId - ID da guia
 * @param {object} dadosGuia - Dados a atualizar
 * @returns {Promise<object>} Guia atualizada
 */
export async function atualizarGuia(guiaId, dadosGuia) {
  try {
    const guiaData = {
      tipo_guia: dadosGuia.tipo_guia || 'SP',
      paciente_nome: dadosGuia.paciente_nome?.trim(),
      convenio: dadosGuia.convenio?.trim() || null,
      plano: dadosGuia.plano?.trim() || null,
      numero_carteirinha: dadosGuia.numero_carteirinha?.trim(),
      profissional: dadosGuia.profissional?.trim() || null,
      codigo_cbhpm: dadosGuia.codigo_cbhpm?.trim() || null,
      valor: parseFloat(dadosGuia.valor) || 0,
      observacoes: dadosGuia.observacoes?.trim() || null,
      data_atualizacao: new Date().toISOString(),
    };

    console.log('📝 Atualizando guia:', guiaId, guiaData);

    const { data, error } = await supabase
      .from('billing_guides')
      .update(guiaData)
      .eq('id', guiaId)
      .select();


    if (error) {
      throw error;
    }

    console.log('✅ Guia atualizada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar guia:', error);
    throw error;
  }
}

/**
 * Deletar uma guia
 * @param {string} guiaId - ID da guia
 * @returns {Promise<void>}
 */
export async function deletarGuia(guiaId) {
  try {
    console.log('🗑️ Deletando guia:', guiaId);

    const { error } = await supabase.from('billing_guides').delete().eq('id', guiaId);

    if (error) {
      throw error;
    }

    console.log('✅ Guia deletada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao deletar guia:', error);
    throw error;
  }
}

/**
 * Atualizar status de uma guia
 * @param {string} guiaId - ID da guia
 * @param {string} novoStatus - Novo status
 * @returns {Promise<object>} Guia atualizada
 */
export async function atualizarStatusGuia(guiaId, novoStatus) {
  try {
    const { data, error } = await supabase
      .from('billing_guides')
      .update({
        status: novoStatus,
        data_atualizacao: new Date().toISOString(),
      })
      .eq('id', guiaId)
      .select();


    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    throw error;
  }
}
