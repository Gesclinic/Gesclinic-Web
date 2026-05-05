import { supabase } from '@/lib/customSupabaseClient.js';
import { asStringOrNull } from '@/lib/selectUtils';

export function normalizeProfessionalProfile(professional) {
  if (!professional) {
    return null;
  }

  return {
    ...professional,
    name: professional.name || professional.full_name || '',
    specialization: professional.specialization || professional.specialty || '',
    crm_line: [professional.cremepe_crm || professional.crm, professional.state]
      .filter(Boolean)
      .join('/'),
    address_line: [professional.address, professional.city, professional.state]
      .filter(Boolean)
      .join(' - '),
    contact_line: [professional.phone, professional.email].filter(Boolean).join(' • '),
  };
}

/* ----------------------------------------
 * BUSCAR PROFISSIONAL DO USUARIO LOGADO
 * ---------------------------------------- */
export async function getProfessionalByUserId(userId, email) {
  console.log('🔍 === GET PROFESSIONAL BY EMAIL/USER ID ===');
  console.log('🔍 User ID recebido:', userId);
  console.log('🔍 Email recebido:', email);

  try {
    // Buscar por email sem coerção para objeto único, evitando 406 quando não houver linhas.
    if (email) {
      console.log('🔍 Tentando buscar por email...');
      const { data: emailRows, error: emailError } = await supabase
        .from('professionals')
        .select('*')
        .ilike('email', email)
        .limit(1);

      const emailData = Array.isArray(emailRows) ? emailRows[0] : null;

      if (!emailError && emailData) {
        console.log('✅ Profissional encontrado por email:', emailData);
        return normalizeProfessionalProfile(emailData);
      }
      console.log('ℹ️ Email não encontrou:', emailError?.code);
    }

    console.warn('⚠️ Profissional não encontrado por email');
    return null;
  } catch (err) {
    console.error('❌ Erro ao buscar profissional:', err);
    return null;
  }
}

/* ----------------------------------------
 * LISTA PROFISSIONAIS
 * ---------------------------------------- */
export async function listProfessionals(clinicId) {
  console.log('🔍 === LISTANDO PROFISSIONAIS ===');
  console.log('🔍 ClinicId recebido:', clinicId);

  if (!clinicId) {
    console.log('🔍 Sem clinicId, retornando vazio');
    return [];
  }

  try {
    let query = supabase.from('professionals').select('*').order('name', { ascending: true });

    // Se tiver clinicId, filtra direto no banco (Melhor performance e segurança)
    // MAS TAMBÉM retorna profissionais sem clinic_id (fallback para dados antigos)
    console.log('🔍 Filtrando por clinicId ou NULL (fallback):', clinicId);
    query = query.or(`clinic_id.eq.${clinicId},clinic_id.is.null`);

    const { data, error } = await query;

    console.log('🔍 Profissionais encontrados:', data?.length || 0, 'dados:', data);

    if (error) {
      console.error('❌ Erro ao buscar profissionais:', error);
      throw new Error(error.message || 'Erro ao buscar profissionais');
    }

    return data || [];
  } catch (err) {
    console.error('❌ Erro fatal ao listar profissionais:', err);
    throw err;
  }
}

/* ----------------------------------------
 * DETALHES DO PROFISSIONAL - BUSCA DIRETA
 * ---------------------------------------- */
export async function getProfessionalDetails(id) {
  console.log('🔍 === GET PROFESSIONAL DETAILS ===');
  console.log('🔍 ID recebido:', id);

  if (!id || id === 'null' || id === 'undefined') {
    console.warn('getProfessionalDetails chamado com ID inválido.');
    return null;
  }

  try {
    // Tentar RPC primeiro
    console.log('🔍 Tentando RPC get_single_professional...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_single_professional', {
      p_professional_id: id,
    });

    console.log('🔍 RPC Result - Data:', rpcData);
    console.log('🔍 RPC Result - Error:', rpcError);

    if (!rpcError && rpcData) {
      const professionalData = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      console.log('🔍 ProfessionalData RPC:', professionalData);
      console.log('🔍 ProfessionalData.professional:', professionalData?.professional);

      if (professionalData && Object.keys(professionalData).length > 0) {
        console.log('✅ Dados via RPC:', professionalData);
        const result = {
          ...professionalData.professional,
          professional_schedules: professionalData.professional_schedules || [],
          professional_services: professionalData.professional_services || [],
          professional_payers: professionalData.professional_payers || [],
          total_active_services: professionalData.total_active_services || 0,
        };
        console.log('✅ Resultado RPC formatado:', result);
        return result;
      }
    }

    // Fallback: busca direta na tabela
    console.log('🔄 RPC falhou, tentando busca direta...');
    const { data: directData, error: directError } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Busca direta - Data:', directData);
    console.log('🔍 Busca direta - Error:', directError);

    if (directError) {
      // Se o erro é "Cannot coerce the result to a single JSON object", significa que não encontrou
      if (directError.code === 'PGRST116') {
        console.log(`ℹ️ Profissional não encontrado para o ID: ${id} - isso é normal`);
        return null;
      }
      console.error('❌ Erro na busca direta:', directError);
      throw new Error(directError.message);
    }

    if (!directData) {
      console.warn(`❌ Nenhum profissional encontrado para o ID: ${id}`);
      return null;
    }

    // Buscar schedules separadamente
    console.log('🔍 Buscando schedules...');
    const { data: schedules } = await supabase
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', id);

    // Buscar payers separadamente
    console.log('🔍 Buscando payers...');
    const { data: payers } = await supabase
      .from('professional_payers')
      .select('*')
      .eq('professional_id', id);

    console.log('🔍 Schedules encontrados:', schedules?.length || 0);
    console.log('🔍 Payers encontrados:', payers?.length || 0);

    const result = {
      ...directData,
      professional_schedules: schedules || [],
      professional_services: [], // Por enquanto vazio
      professional_payers: payers || [],
      total_active_services: 0,
    };

    console.log('✅ Resultado final montado:', result);
    console.log('✅ Keys do resultado:', Object.keys(result));
    console.log('✅ Nome do resultado:', result.name);
    console.log('✅ Email do resultado:', result.email);
    console.log('✅ CRM do resultado:', result.crm);

    return result;
  } catch (err) {
    console.error('❌ Erro fatal ao buscar detalhes:', err);
    // Se é um erro PGRST116, retorna null ao invés de lançar exceção
    if (err.message && err.message.includes('Cannot coerce the result to a single JSON object')) {
      console.warn(`❌ Profissional não encontrado (catch): ${id}`);
      return null;
    }
    throw new Error(`Falha ao buscar profissional: ${err.message}`);
  }
}

/* ----------------------------------------
 * CRIAR PROFISSIONAL - DIRETO SEM RPC
 * ---------------------------------------- */
export async function createProfessional(clinicId, payload) {
  console.log('🎯 === CRIAR PROFISSIONAL DIRETO ===');
  console.log('🎯 ClinicId:', clinicId);
  console.log('🎯 Payload original:', payload);

  // Validar clinicId
  if (!clinicId) {
    throw new Error('ClinicId é obrigatório para criar profissional');
  }

  // Preparar payload apenas com campos que EXISTEM na tabela
  const prepared = {
    name: payload.name || '',
    specialization: payload.specialization || payload.specialty || null,
    cpf: payload.cpf || null,
    crm: payload.crm || null,
    email: payload.email || null,
    phone: payload.phone || null,
    active: payload.active !== undefined ? payload.active : true,
    clinic_id: clinicId,
  };

  // Adicionar campos opcionais apenas se fornecidos
  if (payload.address) {
    prepared.address = payload.address;
  }
  if (payload.city) {
    prepared.city = payload.city;
  }
  if (payload.state) {
    prepared.state = payload.state;
  }
  if (payload.schedule_notes) {
    prepared.schedule_notes = payload.schedule_notes;
  }

  console.log('🎯 Payload final:', prepared);

  try {
    // APENAS insert direto - sem RPC
    console.log('🎯 Executando INSERT direto na tabela professionals...');

    const { data, error } = await supabase
      .from('professionals')
      .insert([prepared]) // Array para evitar problemas
      .select('*')
      .single();

    console.log('🎯 Resultado INSERT - Data:', data);
    console.log('🎯 Resultado INSERT - Error:', error);

    if (error) {
      console.error('❌ Erro no INSERT:', error);
      // Tentar novamente sem campos opcionais
      console.log('🔄 Tentando com campos mínimos...');

      const minimal = {
        name: payload.name || 'Profissional Sem Nome',
        clinic_id: clinicId,
        active: true,
        cpf: payload.cpf || null,
        email: payload.email || null,
        phone: payload.phone || null,
        specialization: payload.specialization || null,
      };

      const { data: minData, error: minError } = await supabase
        .from('professionals')
        .insert([minimal])
        .select('*')
        .single();

      if (minError) {
        throw new Error(`Falha total ao criar: ${minError.message}`);
      }

      console.log('✅ Criado com campos mínimos:', minData);
      return minData;
    }

    console.log('✅ Profissional criado com sucesso:', data);
    return data;
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    throw new Error(`Impossível criar profissional: ${err.message}`);
  }
}

/* ----------------------------------------
 * ATUALIZAR PROFISSIONAL
 * ---------------------------------------- */
export async function updateProfessional(id, payload) {
  if (!id) {
    throw new Error('ID do profissional é obrigatório para atualização.');
  }

  const prepared = {
    ...payload,
  };

  if (prepared.professional_kind) {
    prepared.professional_kind = asStringOrNull(prepared.professional_kind);
  }

  delete prepared.professional_schedules;
  delete prepared.professional_services;
  delete prepared.professional_payer_restrictions;
  delete prepared.photo_path;

  const { data, error } = await supabase
    .from('professionals')
    .update(prepared)
    .eq('id', id)
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

/* ----------------------------------------
 * ATUALIZAR FOTO DO PROFISSIONAL
 * ---------------------------------------- */
export async function updateProfessionalPhotoUrl(
  professionalId,
  { photo_path = null, photo_url = null } = {},
) {
  if (!professionalId) {
    throw new Error('ID do profissional é obrigatório.');
  }

  const { data, error } = await supabase
    .from('professionals')
    .update({
      photo_path,
      photo_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', professionalId)
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

/* ----------------------------------------
 * EXCLUIR PROFISSIONAL
 * ---------------------------------------- */
export async function deleteProfessional(id) {
  if (!id) {
    throw new Error('ID do profissional é obrigatório para exclusão.');
  }
  const { error } = await supabase.from('professionals').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

/* ----------------------------------------
 * UPSERT: AGENDAS
 * ---------------------------------------- */
export async function upsertProfessionalSchedules(professionalId, clinicId, schedules) {
  console.log('📅 Salvando horários:', schedules?.length || 0);

  if (!professionalId || !clinicId) {
    console.log('📅 Parâmetros inválidos, pulando...');
    return;
  }

  console.log('📅 Deletando schedules existentes...');
  const { error: delErr } = await supabase
    .from('professional_schedules')
    .delete()
    .eq('professional_id', professionalId);

  if (delErr) {
    console.error('📅 Erro ao deletar schedules:', delErr);
    throw delErr;
  }
  console.log('📅 Schedules existentes deletados');

  const rows = (schedules ?? []).map((s) => ({
    professional_id: professionalId,
    clinic_id: clinicId,
    weekday: s.weekday,
    start_time: s.start_time,
    end_time: s.end_time,
    appointment_duration: s.appointment_duration || 30,
    active: true,
  }));

  console.log('📅 Rows para inserir:', rows);

  if (!rows.length) {
    console.log('📅 Nenhum schedule para inserir');
    return;
  }

  console.log('📅 Inserindo novos schedules...');
  const { error: insErr } = await supabase.from('professional_schedules').insert(rows);

  if (insErr) {
    console.error('📅 Erro ao inserir schedules:', insErr);
    throw insErr;
  }

  console.log('📅 ✅ Schedules salvos com sucesso!');
}

/* ----------------------------------------
 * UPSERT: CONVÊNIOS (PAYERS)
 * ---------------------------------------- */
export async function upsertProfessionalPayers(professionalId, clinicId, payers) {
  console.log('💰 Salvando convênios:', payers?.length || 0);

  if (!professionalId || !clinicId) {
    console.log('💰 Parâmetros inválidos, pulando...');
    return;
  }

  console.log('💰 Deletando payers existentes...');
  const { error: delErr } = await supabase
    .from('professional_payers')
    .delete()
    .eq('professional_id', professionalId);

  if (delErr) {
    console.error('💰 Erro ao deletar payers:', delErr);
    throw delErr;
  }
  console.log('💰 Payers existentes deletados');

  const rows = (payers ?? []).map((p) => ({
    professional_id: professionalId,
    clinic_id: clinicId,
    payer_id: p.payer_id,
    accepted: !!p.accepted,
    restricted: !!p.restricted,
  }));

  console.log('💰 Rows para inserir:', rows);

  if (!rows.length) {
    console.log('💰 Nenhum payer para inserir');
    return;
  }

  console.log('💰 Inserindo novos payers...');
  const { error } = await supabase.from('professional_payers').insert(rows);

  if (error) {
    console.error('💰 Erro ao inserir payers:', error);
    throw error;
  }

  console.log('💰 ✅ Payers salvos com sucesso!');
}

/* ----------------------------------------
 * VALIDAÇÃO TISS PARA PROFISSIONAIS
 * ---------------------------------------- */

/**
 * Valida se profissional tem campos obrigatórios para TISS
 * @param {Object} profData
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateProfessionalForTISS(profData) {
  const errors = [];

  // CBO Code (obrigatório)
  if (!profData.cbo_code) {
    errors.push('CBO Code é obrigatório (ex: 225101)');
  } else if (!/^\d{6}$/.test(profData.cbo_code)) {
    errors.push('CBO Code deve ter 6 dígitos');
  }

  // Council (obrigatório)
  if (!profData.council_type) {
    errors.push('Tipo de Conselho é obrigatório (CRM/CREFITO/CRP/etc)');
  }
  if (!profData.council_number) {
    errors.push('Número do Conselho é obrigatório');
  }
  if (!profData.council_state || profData.council_state.length !== 2) {
    errors.push('UF do Conselho é obrigatória (ex: SP)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Atualizar profissional com validação TISS
 * @param {string} professionalId
 * @param {Object} profData
 * @returns {Promise<Object>}
 */
export async function updateProfessionalWithValidation(professionalId, profData) {
  // Validar se vai ativar sem campos obrigatórios
  if (profData.active && !profData.cbo_code) {
    throw new Error(
      'Não é possível ativar profissional sem CBO Code e dados de conselho (obrigatórios para TISS)',
    );
  }

  const validation = validateProfessionalForTISS(profData);
  if (!validation.valid) {
    console.warn('⚠️ Avisos TISS para profissional:', validation.errors);
  }

  return updateProfessional(professionalId, profData);
}

/* ----------------------------------------
 * UPLOAD DE DOCUMENTOS
 * ---------------------------------------- */

/**
 * Upload de documento profissional
 * @param {string} clinicId
 * @param {string} professionalId
 * @param {File} file
 * @returns {Promise<string>} URL pública do documento
 */
export async function uploadProfessionalDocument(clinicId, professionalId, file) {
  try {
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }

    // Gerar nome único com timestamp
    const timestamp = Date.now();
    const fileName = `${professionalId}-${timestamp}-${file.name}`;
    const filePath = `${clinicId}/professionals/${professionalId}/${fileName}`;

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('professional-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Gerar URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('professional-documents').getPublicUrl(filePath);

    return {
      url: publicUrl,
      fileName: file.name,
      path: filePath,
    };
  } catch (error) {
    console.error('❌ Erro ao fazer upload de documento:', error);
    throw new Error(error.message || 'Erro ao fazer upload do documento');
  }
}

/**
 * Atualizar referência do documento no profissional
 * @param {string} professionalId
 * @param {string} documentUrl
 * @param {string} documentName
 */
export async function updateProfessionalDocument(professionalId, documentUrl, documentName) {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .update({
        document_url: documentUrl,
        document_name: documentName,
      })
      .eq('id', professionalId)
      .select();

    if (error) {
      throw error;
    }
    return data?.[0];
  } catch (error) {
    console.error('❌ Erro ao atualizar documento do profissional:', error);
    throw error;
  }
}

/**
 * Remover documento do profissional
 * @param {string} professionalId
 */
export async function removeProfessionalDocument(professionalId) {
  try {
    const { data, error } = await supabase
      .from('professionals')
      .update({
        document_url: null,
        document_name: null,
      })
      .eq('id', professionalId)
      .select();

    if (error) {
      throw error;
    }
    return data?.[0];
  } catch (error) {
    console.error('❌ Erro ao remover documento do profissional:', error);
    throw error;
  }
}
