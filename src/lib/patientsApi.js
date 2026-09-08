import { supabase } from '@/lib/customSupabaseClient';

/**
 * ======================================================
 *  🔍 LISTA PACIENTES + FILTRO POR NOME/CPF + GÊNERO
 * ======================================================
 */
export async function listPatients(clinicId, filters = {}) {
  console.log('📌 listPatients():', { clinicId, filters });

  if (!clinicId) {
    return [];
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(clinicId)) {
    console.error('❌ ClinicId inválido:', clinicId);
    return [];
  }

  let query = supabase
    .from('patients')
    .select(
      `
      id,
      prontuario_numero,
      name,
      document_id,
      phone,
      cell_phone,
      birthdate,
      gender,
      email,
      street,
      number,
      neighborhood,
      city,
      address,
      state,
      zip_code,
      photo_url
    `,
    )
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true })
    .limit(40);

  /**
   * 🔎 Filtro de busca por nome/CPF
   */
  if (filters.q && filters.q.trim().length >= 2) {
    const term = filters.q.trim();
    query = query.or(`name.ilike.%${term}%,document_id.ilike.%${term}%`);
  }

  /**
   * 🟣 Filtro por gênero
   */
  if (filters.gender && filters.gender !== 'Todos') {
    query = query.eq('gender', filters.gender);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Erro ao buscar pacientes:', error);
    return [];
  }

  // Garantir ID válido
  return (data || []).filter((p) => uuidRegex.test(p.id));
}

/**
 * ======================================================
 *  👤 BUSCA PACIENTE POR ID
 * ======================================================
 */
export async function getPatientById(patientId) {
  if (!patientId) {
    return null;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(patientId)) {
    console.error('❌ patientId inválido:', patientId);
    throw new Error('ID inválido');
  }

  const { data, error } = await supabase
    .from('patients')
    .select(
      `
      id,
      prontuario_numero,
      name,
      document_id,
      birthdate,
      gender,
      email,
      phone,
      cell_phone,

      street,
      number,
      neighborhood,
      zip_code,
      city,
      state,

      payer_id,
      plan_id,
      insurance_id_number,

      responsible_name,
      responsible_relationship,

      clinic_id,
      record_number,
      photo_url
    `,
    )
    .eq('id', patientId)
    .maybeSingle();

  if (error) {
    console.error('❌ Erro ao buscar paciente:', error);
    throw error;
  }

  return data || null;
}

/**
 * ======================================================
 *  📸 FAZER UPLOAD DE FOTO DO PACIENTE
 * ======================================================
 */
export async function uploadPatientPhoto(clinicId, patientId, photoDataUrl) {
  if (!patientId || !photoDataUrl) {
    throw new Error('Parâmetros inválidos para upload (patientId e photoDataUrl são obrigatórios)');
  }

  try {
    // Converter data URL para Blob
    const response = await fetch(photoDataUrl);
    const blob = await response.blob();

    // Tentar padrão mais simples: photos/[patientId].jpg
    // Isto pode ser permitido pela RLS policy
    const fileName = `photos/${patientId}.jpg`;

    console.log('📸 Uploading file:', { fileName, size: blob.size });

    // Upload para Supabase Storage - SEM upsert para evitar novo "row"
    const { error: uploadError, data } = await supabase.storage
      .from('patient-photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false, // Não create "new row" - atualizar se existir
      });

    // Se o arquivo já existe, tenta com update
    if (uploadError && uploadError.message.includes('already exists')) {
      console.log('📸 Arquivo existe, tentando update...');
      const { error: updateError, data: updateData } = await supabase.storage
        .from('patient-photos')
        .update(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (updateError) {
        throw updateError;
      }
    } else if (uploadError) {
      throw uploadError;
    }

    console.log('✅ Upload/Update concluído');

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage.from('patient-photos').getPublicUrl(fileName);

    console.log('✅ URL Pública gerada:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Erro ao processar foto:', error);
    throw error;
  }
}

/**
 * ======================================================
 *  ✏ ATUALIZAR FOTO DO PACIENTE
 * ======================================================
 */
export async function updatePatientPhoto(patientId, photoUrl) {
  if (!patientId) {
    return null;
  }

  const { data, error } = await supabase
    .from('patients')
    .update({ photo_url: photoUrl })
    .eq('id', patientId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('❌ Erro ao atualizar foto:', error);
    throw error;
  }

  return data;
}

/**
 * ======================================================
 *  ➕ CRIAR PACIENTE (COM FOTO)
 * ======================================================
 */
export async function createPatientWithPhoto(clinicId, patientData, photoDataUrl = null) {
  if (!clinicId) {
    throw new Error('Clínica não informada!');
  }

  // Lista de colunas válidas na tabela 'patients'
  const allowedFields = [
    'name',
    'document_id',
    'birthdate',
    'gender',
    'cell_phone',
    'phone',
    'email',
    'city',
    'address',
    'state',
    'zip_code',
    'prontuario_numero',
    'payer_id',
    'plan_id',
    'insurance_id_number',
    'responsible_name',
    'responsible_relationship',
    'record_number',
    'photo_url',
  ];

  // Monta o payload apenas com campos permitidos
  const payload = { clinic_id: clinicId };
  for (const key of allowedFields) {
    if (patientData[key] !== undefined) {
      payload[key] = patientData[key];
    }
  }

  const { data, error } = await supabase.from('patients').insert(payload).select().maybeSingle();

  if (error) {
    console.error('❌ Erro ao criar paciente:', error);
    throw error;
  }

  // Se tiver foto, fazer upload e atualizar
  if (data && photoDataUrl) {
    try {
      const photoUrl = await uploadPatientPhoto(clinicId, data.id, photoDataUrl);
      const updated = await updatePatientPhoto(data.id, photoUrl);
      return updated || data;
    } catch (photoError) {
      console.warn('⚠️ Paciente criado, mas erro ao salvar foto:', photoError);
      return data; // Retornar paciente mesmo se foto falhar
    }
  }

  return data;
}

/**
 * ======================================================
 *  ➕ CRIAR PACIENTE
 * ======================================================
 */
export async function createPatient(clinicId, patientData) {
  if (!clinicId) {
    throw new Error('Clínica não informada!');
  }

  // Lista de colunas válidas na tabela 'patients'
  const allowedFields = [
    'name',
    'document_id',
    'birthdate',
    'gender',
    'cell_phone',
    'phone',
    'email',
    'city',
    'address',
    'state',
    'zip_code',
    'prontuario_numero',
    'payer_id',
    'plan_id',
    'insurance_id_number',
    'responsible_name',
    'responsible_relationship',
    'record_number',
    'photo_url',
  ];

  // Monta o payload apenas com campos permitidos
  const payload = { clinic_id: clinicId };
  for (const key of allowedFields) {
    if (patientData[key] !== undefined) {
      payload[key] = patientData[key];
    }
  }

  const { data, error } = await supabase.from('patients').insert(payload).select().maybeSingle();

  if (error) {
    console.error('❌ Erro ao criar paciente:', error);
    throw error;
  }

  return data;
}

/**
 * ======================================================
 *  ✏ ATUALIZAR PACIENTE
 * ======================================================
 */
export async function updatePatient(patientId, patientData) {
  if (!patientId) {
    return null;
  }

  // Remover campo address se existir
  if ('address' in patientData) {
    delete patientData.address;
  }

  const { data, error } = await supabase
    .from('patients')
    .update(patientData)
    .eq('id', patientId)
    .select()
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao atualizar paciente:', error);
    throw error;
  }

  return data;
}

/**
 * ======================================================
 *  ❌ ARQUIVAR / EXCLUIR PACIENTE
 * ======================================================
 */
export async function deletePatient(patientId) {
  if (!patientId) {
    return false;
  }

  const { error } = await supabase.from('patients').delete().eq('id', patientId);

  if (error) {
    console.error('❌ Erro ao deletar paciente:', error);
    throw error;
  }

  return true;
}

/**
 * ======================================================
 *  💳 CONVÊNIOS (PAYERS)
 * ======================================================
 */
export async function fetchPayersForSelect(clinicId) {
  if (!clinicId) {
    return [];
  }

  const { data, error } = await supabase
    .from('payers')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .order('name');

  if (error) {
    return [];
  }
  return data || [];
}

/**
 * ======================================================
 *  📋 PLANOS
 * ======================================================
 */
export async function fetchPlansForSelect(clinicId) {
  if (!clinicId) {
    return [];
  }

  const { data, error } = await supabase
    .from('plans')
    .select('id, name, payer_id')
    .eq('clinic_id', clinicId)
    .order('name');

  if (error) {
    return [];
  }
  return data || [];
}

/**
 * ======================================================
 *  🔎 VERIFICA DUPLICIDADE (CPF)
 * ======================================================
 */
export async function checkPatientExists({ clinicId, cpf }) {
  if (!clinicId || !cpf) {
    return false;
  }

  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('cpf', cpf)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao verificar duplicidade:', error);
    return false;
  }

  return !!data;
}

/**
 * ======================================================
 *  🆔 GERAR PRONTUÁRIO PARA PACIENTE EXISTENTE
 * ======================================================
 * Usada quando o paciente foi criado antes da migration
 */
export async function generateProntuarioForPatient(patientId, clinicCode) {
  if (!patientId || !clinicCode) {
    throw new Error('patientId e clinicCode são obrigatórios');
  }

  try {
    // Busca o maior número de prontuário para esta clínica
    const { data: existingProntuarios, error: fetchError } = await supabase
      .from('patients')
      .select('prontuario_numero')
      .like('prontuario_numero', `${clinicCode}-%`)
      .order('prontuario_numero', { ascending: false })
      .limit(1);

    if (fetchError) {
      throw fetchError;
    }

    let nextNumber = 1000; // Padrão
    if (existingProntuarios && existingProntuarios.length > 0) {
      const lastProntuario = existingProntuarios[0].prontuario_numero;
      const lastNumber = parseInt(lastProntuario.split('-')[1]);
      nextNumber = lastNumber + 1;
    }

    const newProntuario = `${clinicCode}-${String(nextNumber).padStart(4, '0')}`;

    // Atualiza o paciente com o novo prontuário
    const { data, error: updateError } = await supabase
      .from('patients')
      .update({ prontuario_numero: newProntuario })
      .eq('id', patientId)
      .select();


    if (updateError) {
      throw updateError;
    }

    console.log('✅ Prontuário gerado:', newProntuario);
    return data;
  } catch (error) {
    console.error('❌ Erro ao gerar prontuário:', error);
    throw error;
  }
}
