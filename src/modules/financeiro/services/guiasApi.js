import { supabase } from '@/lib/customSupabaseClient';
import * as Sentry from '@sentry/react';
import {
  mapGuiaToDatabase,
  mapGuiaFromDatabase,
  mapGuiasFromDatabase,
  sanitizePayload,
} from '@/lib/mappers';
import { validateGuiaPayload, validateClinicId } from '@/lib/validators';
import { getClinicContext } from '@/lib/getClinicContext';

/**
 * ⚙️ FUNÇÃO UTILITÁRIA: Buscar clinic_id do banco
 * ✅ Usa função global centralizada
 * ✅ Evita duplicação de código
 * ✅ clinic_id vem sempre do banco (fonte oficial)
 * ✅ Garante sincronização com RLS
 */
async function getClinicId() {
  try {
    const context = await getClinicContext();

    console.debug('✅ [getClinicId] Autenticação OK:', {
      userId: context.userId,
      clinicId: context.clinicId,
    });

    return context;
  } catch (err) {
    console.error('❌ [getClinicId] Falha geral:', err.message);
    throw err;
  }
}

/**
 * LISTAR GUIAS
 * ✅ Valida autenticação
 * ✅ clinic_id vem do banco (não de user_metadata)
 * ✅ Nunca retorna guias com clinic_id null
 */
export async function listarGuias() {
  try {
    console.log('📋 [GUIAS] Iniciando listagem');

    // Passo 1: Obter clinic_id do banco
    const { clinicId, userId } = await getClinicId();

    console.log('🔎 [GUIAS] DEBUG:', {
      userId,
      clinicId,
    });

    // Passo 2: Buscar guias (RLS controla acesso)
    const { data, error } = await supabase
      .from('billing_guides')
      .select('*')
      .order('data_criacao', { ascending: false });

    if (error) {
      throw error;
    }

    const response = mapGuiasFromDatabase(data || []);
    console.log('✅ [GUIAS] Listagem OK:', response.length, 'guias');
    return response;
  } catch (err) {
    console.error('❌ [GUIAS] Erro ao listar:', err.message);
    Sentry.captureException(err, {
      tags: { action: 'list_guides' },
    });
    return [];
  }
}

/**
 * LISTAR GUIAS ATIVAS
 * ✅ Valida autenticação
 * ✅ clinic_id vem do banco
 */
export async function listarGuiasAtivas() {
  try {
    console.log('📋 [GUIAS-ATIVAS] Iniciando listagem');

    // Passo 1: Obter clinic_id do banco
    const { clinicId, userId } = await getClinicId();

    console.log('🔎 [GUIAS-ATIVAS] DEBUG:', {
      userId,
      clinicId,
    });

    // Passo 2: Buscar guias ativas (RLS controla acesso)
    const { data, error } = await supabase
      .from('billing_guides')
      .select('*')
      .eq('ativa', true)
      .order('data_criacao', { ascending: false });

    if (error) {
      throw error;
    }

    const response = mapGuiasFromDatabase(data || []);
    console.log('✅ [GUIAS-ATIVAS] Listagem OK:', response.length);
    return response;
  } catch (err) {
    console.error('❌ [GUIAS-ATIVAS] Erro ao listar:', err.message);
    Sentry.captureException(err, {
      tags: { action: 'list_active_guides' },
    });
    return [];
  }
}

/**
 * OBTER GUIA POR ID
 * ✅ Valida autenticação
 * ✅ clinic_id vem do banco
 * ✅ Usa maybeSingle em vez de single
 */
export async function obterGuia(guiaId) {
  try {
    if (!guiaId) {
      throw new Error('guiaId é obrigatório');
    }

    console.log('🔍 [GUIA] Buscando guia:', guiaId);

    // Passo 1: Obter clinic_id do banco
    const { clinicId, userId } = await getClinicId();

    console.log('🔎 [GUIA] DEBUG:', {
      userId,
      clinicId,
      guiaId,
    });

    // Passo 2: Buscar guia (RLS controla acesso)
    const { data, error } = await supabase
      .from('billing_guides')
      .select('*')
      .eq('id', guiaId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      console.warn('⚠️ [GUIA] Guia não encontrado:', guiaId);
      throw new Error('Guia não encontrado ou sem permissão de acesso');
    }

    const response = mapGuiaFromDatabase(data);
    console.log('✅ [GUIA] Encontrada:', guiaId);
    return response;
  } catch (err) {
    console.error('❌ [GUIA] Erro ao buscar:', err.message);
    Sentry.captureException(err, {
      tags: { action: 'get_guide', guide_id: guiaId },
    });
    throw err;
  }
}

/**
 * CRIAR GUIA
 * ✅ Valida autenticação
 * ✅ clinic_id vem do banco
 * ✅ NÃO envia user_id/role
 * ✅ Usa maybeSingle em vez de single
 */
export async function criarGuia(payload) {
  try {
    console.log('➕ [GUIA-CREATE] Iniciando criação');

    // Passo 1: Obter clinic_id do banco
    const { clinicId, userId } = await getClinicId();

    console.log('🔎 [GUIA-CREATE] DEBUG:', {
      userId,
      clinicId,
      tipoGuia: payload?.tipo_guia,
    });

    const payloadWithClinic = {
      ...payload,
      clinic_id: clinicId,
      numero_guia: payload.numero_guia || (await gerarNumeroGuia()),
    };

    // Passo 2: Validar payload
    validateGuiaPayload(payloadWithClinic);

    // Passo 3: Sanitizar
    const sanitized = sanitizePayload(payloadWithClinic);

    // Passo 4: Mapear para DB
    const dbPayload = mapGuiaToDatabase(sanitized);

    // Passo 5: Inserir
    const { data, error } = await supabase
      .from('billing_guides')
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Falha ao inserir guia — nenhum dado retornado');
    }

    const response = mapGuiaFromDatabase(data);
    console.log('✅ [GUIA-CREATE] Sucesso:', response.id);
    Sentry.captureMessage('Guia de faturamento criada', 'info', {
      tags: { action: 'create_guide', clinic_id: clinicId },
    });

    return response;
  } catch (err) {
    console.error('❌ [GUIA-CREATE] Erro:', err.message);
    Sentry.captureException(err, {
      tags: { action: 'create_guide_error', clinic_id: payload?.clinic_id },
    });
    throw err;
  }
}

/**
 * ATUALIZAR GUIA
 * ✅ Valida autenticação
 * ✅ clinic_id vem do banco
 * ✅ NÃO envia user_id/role
 * ✅ Usa maybeSingle em vez de single
 */
export async function atualizarGuia(guiaId, payload) {
  try {
    if (!guiaId) {
      throw new Error('guiaId é obrigatório');
    }

    console.log('✏️ [GUIA-UPDATE] Iniciando atualização:', guiaId);

    // Passo 1: Obter clinic_id do banco
    const { clinicId, userId } = await getClinicId();

    console.log('🔎 [GUIA-UPDATE] DEBUG:', {
      userId,
      clinicId,
      guiaId,
      updateDataKeys: Object.keys(payload),
    });

    const payloadWithClinic = {
      ...payload,
      clinic_id: clinicId,
    };

    // Passo 2: Validar payload
    validateGuiaPayload(payloadWithClinic);

    // Passo 3: Sanitizar
    const sanitized = sanitizePayload(payloadWithClinic);

    // Passo 4: Mapear para DB
    const dbPayload = mapGuiaToDatabase(sanitized);
    const { id, data_criacao, ...updateData } = dbPayload;

    // Passo 5: Atualizar (RLS controla acesso)
    const { data, error } = await supabase
      .from('billing_guides')
      .update(updateData)
      .eq('id', guiaId)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      console.warn('⚠️ [GUIA-UPDATE] Nenhum registro atualizado — RLS ou ID inválido');
      throw new Error('Guia não encontrado ou sem permissão de acesso');
    }

    const response = mapGuiaFromDatabase(data);
    console.log('✅ [GUIA-UPDATE] Sucesso:', guiaId);
    Sentry.captureMessage('Guia de faturamento atualizada', 'info', {
      tags: { action: 'update_guide', clinic_id: clinicId },
    });

    return response;
  } catch (err) {
    console.error('❌ [GUIA-UPDATE] Erro:', err.message);
    Sentry.captureException(err, {
      tags: { action: 'update_guide_error', clinic_id: payload?.clinic_id },
    });
    throw err;
  }
}

/**
 * DELETAR GUIA
 * ✅ Valida autenticação
 * ✅ clinic_id vem do banco
 */
export async function deletarGuia(guiaId) {
  try {
    if (!guiaId) {
      throw new Error('guiaId é obrigatório');
    }

    console.log('🗑️ [GUIA-DELETE] Iniciando deleção:', guiaId);

    // Passo 1: Obter clinic_id do banco
    const { clinicId, userId } = await getClinicId();

    console.log('🔎 [GUIA-DELETE] DEBUG:', {
      userId,
      clinicId,
      guiaId,
    });

    // Passo 2: Deletar (RLS controla acesso)
    const { error } = await supabase.from('billing_guides').delete().eq('id', guiaId);

    if (error) {
      throw error;
    }

    console.log('✅ [GUIA-DELETE] Sucesso:', guiaId);
    Sentry.captureMessage('Guia de faturamento deletada', 'info', {
      tags: { action: 'delete_guide', clinic_id: clinicId },
    });

    return { success: true };
  } catch (err) {
    console.error('❌ [GUIA-DELETE] Erro:', err.message);
    Sentry.captureException(err, {
      tags: { action: 'delete_guide_error', guide_id: guiaId },
    });
    throw err;
  }
}

/**
 * GERAR NÚMERO GUIA
 * ✅ Gera número único para guia
 * ✅ Formato: G{timestamp(6)}{random}
 * ✅ Valida autenticação (clinic_id)
 */
export async function gerarNumeroGuia() {
  const { clinicId } = await getClinicContext();

  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000);

  return `G${timestamp}${random}`;
}
