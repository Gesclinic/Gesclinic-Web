import { supabase } from '@/lib/customSupabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIST_LIMIT = 40;
const MAX_LIST_LIMIT = 500;

function isValidUuid(value) {
  return UUID_REGEX.test(String(value || ''));
}

function normalizeSearchTerm(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeSupabasePattern(value) {
  return value.replace(/[%_]/g, '\\$&').replace(/,/g, ' ');
}

function normalizePatientRecord(patient) {
  if (!patient) {
    return patient;
  }

  return {
    ...patient,
    full_name: patient.full_name || patient.name || '',
    cpf: patient.cpf || patient.document_id || '',
    birth_date: patient.birth_date || patient.birthdate || null,
  };
}

function sanitizePatientPayload(patientData = {}) {
  const source = { ...patientData };

  if (source.full_name !== undefined && source.name === undefined) {
    source.name = source.full_name;
  }
  if (source.cpf !== undefined && source.document_id === undefined) {
    source.document_id = source.cpf;
  }
  if (source.birth_date !== undefined && source.birthdate === undefined) {
    source.birthdate = source.birth_date;
  }
  if (source.street_number !== undefined && source.number === undefined) {
    source.number = source.street_number;
  }
  if (source.postal_code !== undefined && source.zip_code === undefined) {
    source.zip_code = source.postal_code;
  }
  if (source.profession !== undefined && source.professional_occupation === undefined) {
    source.professional_occupation = source.profession;
  }

  const allowedFields = [
    'name',
    'document_id',
    'birthdate',
    'gender',
    'cell_phone',
    'phone',
    'email',
    'street',
    'number',
    'neighborhood',
    'city',
    'address',
    'state',
    'zip_code',
    'complement',
    'mother_name',
    'rg_number',
    'nationality',
    'state_birth',
    'marital_status',
    'professional_occupation',
    'ethnicity',
    'prontuario_numero',
    'payer_id',
    'plan_id',
    'insurance_id_number',
    'responsible_name',
    'responsible_relationship',
    'record_number',
    'photo_url',
    'active',
  ];

  const payload = {};
  for (const key of allowedFields) {
    if (source[key] !== undefined) {
      payload[key] = typeof source[key] === 'string' ? source[key].trim() || null : source[key];
    }
  }

  return payload;
}

function removeTissComplementaryFields(payload = {}) {
  const sanitized = { ...payload };
  for (const key of [
    'complement',
    'mother_name',
    'rg_number',
    'nationality',
    'state_birth',
    'marital_status',
    'professional_occupation',
    'ethnicity',
  ]) {
    delete sanitized[key];
  }
  return sanitized;
}

/**
 * ======================================================
 *  🔍 LISTA PACIENTES + FILTRO POR NOME/CPF + GÊNERO
 * ======================================================
 */
export async function listPatients(clinicId, filters = {}) {
  if (!clinicId) {
    return [];
  }

  if (!isValidUuid(clinicId)) {
    console.error('❌ ClinicId inválido:', clinicId);
    return [];
  }

  const limit = Math.min(Math.max(Number(filters.limit) || DEFAULT_LIST_LIMIT, 1), MAX_LIST_LIMIT);

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
      photo_url,
      active,
      created_at,
      updated_at
    `,
    )
    .eq('clinic_id', clinicId);

  const searchTerm = normalizeSearchTerm(filters.q);
  if (searchTerm.length >= 2) {
    const safeSearchTerm = escapeSupabasePattern(searchTerm);
    const numericSearchTerm = searchTerm.replace(/\D/g, '');
    const searchColumns = [
      `name.ilike.%${safeSearchTerm}%`,
      `document_id.ilike.%${safeSearchTerm}%`,
      `email.ilike.%${safeSearchTerm}%`,
      `phone.ilike.%${safeSearchTerm}%`,
      `cell_phone.ilike.%${safeSearchTerm}%`,
    ];

    if (numericSearchTerm && numericSearchTerm !== safeSearchTerm) {
      searchColumns.push(`document_id.ilike.%${numericSearchTerm}%`);
      searchColumns.push(`phone.ilike.%${numericSearchTerm}%`);
      searchColumns.push(`cell_phone.ilike.%${numericSearchTerm}%`);
    }

    const orCondition = searchColumns.join(',');
    query = query.or(orCondition);
  }

  if (filters.gender && filters.gender !== 'Todos') {
    query = query.eq('gender', filters.gender);
  }

  if (filters.active === true) {
    query = query.neq('active', false);
  } else if (filters.active === false) {
    query = query.eq('active', false);
  }

  query = query.order('name', { ascending: true }).limit(limit);

  try {
    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar pacientes:', error);
      return [];
    }

    return (data || []).filter((patient) => isValidUuid(patient.id)).map(normalizePatientRecord);
  } catch (err) {
    console.error('❌ Erro inesperado ao buscar pacientes:', err);
    return [];
  }
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

  if (!isValidUuid(patientId)) {
    console.error('❌ patientId inválido:', patientId);
    throw new Error('ID inválido');
  }

  const baseSelect = `
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
    `;

  const tissSelect = `
      ${baseSelect},
      complement,
      mother_name,
      rg_number,
      nationality,
      state_birth,
      marital_status,
      professional_occupation,
      ethnicity
    `;

  let { data, error } = await supabase
    .from('patients')
    .select(tissSelect)
    .eq('id', patientId)
    .maybeSingle();

  if (error && error.code === '42703') {
    const fallback = await supabase
      .from('patients')
      .select(baseSelect)
      .eq('id', patientId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('❌ Erro ao buscar paciente:', error);
    throw error;
  }

  return normalizePatientRecord(data) || null;
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

  return normalizePatientRecord(data);
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

  const payload = { clinic_id: clinicId, ...sanitizePatientPayload(patientData) };

  let { data, error } = await supabase.from('patients').insert(payload).select().maybeSingle();

  if (error?.code === '42703') {
    const fallback = await supabase
      .from('patients')
      .insert(removeTissComplementaryFields(payload))
      .select()
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('❌ Erro ao criar paciente:', error);
    throw error;
  }

  // Se tiver foto, fazer upload e atualizar
  if (data && photoDataUrl) {
    try {
      const photoUrl = await uploadPatientPhoto(clinicId, data.id, photoDataUrl);
      const updated = await updatePatientPhoto(data.id, photoUrl);
      return normalizePatientRecord(updated || data);
    } catch (photoError) {
      console.warn('⚠️ Paciente criado, mas erro ao salvar foto:', photoError);
      return normalizePatientRecord(data); // Retornar paciente mesmo se foto falhar
    }
  }

  return normalizePatientRecord(data);
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

  const payload = { clinic_id: clinicId, ...sanitizePatientPayload(patientData) };

  let { data, error } = await supabase.from('patients').insert(payload).select().maybeSingle();

  if (error?.code === '42703') {
    const fallback = await supabase
      .from('patients')
      .insert(removeTissComplementaryFields(payload))
      .select()
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('❌ Erro ao criar paciente:', error);
    throw error;
  }

  return normalizePatientRecord(data);
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

  const payload = sanitizePatientPayload(patientData);

  let { data, error } = await supabase
    .from('patients')
    .update(payload)
    .eq('id', patientId)
    .select()
    .maybeSingle();

  if (error?.code === '42703') {
    const fallback = await supabase
      .from('patients')
      .update(removeTissComplementaryFields(payload))
      .eq('id', patientId)
      .select()
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao atualizar paciente:', error);
    throw error;
  }

  return normalizePatientRecord(data);
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
export async function checkPatientExists({ clinicId, cpf, documentId }) {
  const rawDocument = String(documentId || cpf || '').trim();
  const documentDigits = rawDocument.replace(/\D/g, '');

  if (!clinicId || !rawDocument) {
    return false;
  }

  const formattedDocument =
    documentDigits.length === 11
      ? `${documentDigits.slice(0, 3)}.${documentDigits.slice(3, 6)}.${documentDigits.slice(6, 9)}-${documentDigits.slice(9, 11)}`
      : rawDocument;

  const variants = [...new Set([rawDocument, documentDigits, formattedDocument].filter(Boolean))];

  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('clinic_id', clinicId)
    .in('document_id', variants)
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

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }

    console.log('✅ Prontuário gerado:', newProntuario);
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao gerar prontuário:', error);
    throw error;
  }
}
