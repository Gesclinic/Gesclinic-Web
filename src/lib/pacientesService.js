import { supabase } from '@/lib/customSupabaseClient.js';

export async function listPacientes(searchTerm = '', clinicId = null) {
  console.log('🔍 === LISTPACIENTES CHAMADO ===');
  console.log('🔍 SearchTerm:', searchTerm);
  console.log('🔍 ClinicId:', clinicId);
  console.log('🔍 ClinicId tipo:', typeof clinicId);

  // Validar UUID
  if (
    clinicId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)
  ) {
    console.error('❌ ClinicId não é um UUID válido:', clinicId);
    throw new Error(`ClinicId inválido: ${clinicId}`);
  }

  // Teste adicionando colunas gradualmente
  let query = supabase
    .from('patients')
    .select(
      `
      id,
      clinic_id,
      full_name,
      cpf,
      birth_date,
      email,
      record_number,
      cell_phone,
      gender,
      city,
      state,
      zip_code,
      street,
      number,
      neighborhood,
      marital_status,
      status,
      payer_id,
      plan_id,
      insurance_id_number
    `,
    )
    .is('deleted_at', null) // Filtrar apenas pacientes não soft-deleted
    .order('full_name', { ascending: true });

  // Filtrar por clínica se fornecido
  if (clinicId) {
    console.log('🔍 Aplicando filtro clinic_id:', clinicId);
    console.log(
      '🔍 ClinicId é UUID válido?',
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId),
    );
    query = query.eq('clinic_id', clinicId);
  } else {
    console.log('⚠️ Nenhum clinicId fornecido - buscando todos os pacientes');
  }

  if (searchTerm) {
    console.log('🔍 Aplicando filtro de busca:', searchTerm);
    // Busca por nome, CPF, telefone ou prontuário
    query = query.or(
      [
        `full_name.ilike.%${searchTerm}%`,
        `cpf.ilike.%${searchTerm}%`,
        `cell_phone.ilike.%${searchTerm}%`,
        `record_number.ilike.%${searchTerm}%`,
        `email.ilike.%${searchTerm}%`,
        `city.ilike.%${searchTerm}%`,
      ].join(','),
    );
  }

  console.log('🔍 Executando query...');

  // Teste simplificado se necessário - remover em produção

  const { data, error } = await query;
  console.log('🔍 Resultado query COM FILTRO - Data count:', data?.length, 'Error:', error);

  if (error) {
    console.error('❌ Erro na query pacientes:', error);
    console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('✅ Pacientes encontrados:', data?.length || 0);
  if (data?.length > 0) {
    console.log('📋 Primeira amostra completa:', data[0]);
    console.log('📋 Campos disponíveis:', Object.keys(data[0]));
  }

  return data || [];
}

export async function getPacienteById(id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null) // Apenas pacientes não soft-deleted
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function createPaciente(payload) {
  const { data, error } = await supabase.from('patients').insert(payload).select().single();
  if (error) {
    throw error;
  }
  return data;
}

export async function updatePaciente(id, payload) {
  const { data, error } = await supabase.from('patients').update(payload).eq('id', id).select();

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Paciente não encontrado ou sem permissão');
  }

  return data[0];
}

export async function deletePaciente(id) {
  const { error } = await supabase.from('patients').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function uploadPacienteMedia(patientId, file, userId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const path = `${patientId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('patient_media').upload(path, file);
  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage.from('patient_media').getPublicUrl(path);
  const publicURL = publicUrlData.publicUrl;

  const { error: dbError } = await supabase.from('patients_files').insert({
    patient_id: patientId,
    file_name: file.name,
    file_url: publicURL,
    file_type: file.type,
    uploaded_by: userId,
  });

  if (dbError) {
    await supabase.storage.from('patient_media').remove([path]);
    throw dbError;
  }

  return { url: publicURL, name: file.name };
}

export async function listPacienteMedia(pacienteId) {
  const { data, error } = await supabase
    .from('patients_files')
    .select('id, file_name, file_url')
    .eq('patient_id', pacienteId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return (data || []).map((f) => ({ id: f.id, name: f.file_name, url: f.file_url }));
}

export async function deletePacienteMedia(pacienteId, fileId, fileName) {
  const { error: dbError } = await supabase.from('patients_files').delete().eq('id', fileId);
  if (dbError) {
    throw dbError;
  }

  const filePath = `${pacienteId}/${fileName.split('/').pop()}`;
  const { error: storageError } = await supabase.storage.from('patient_media').remove([filePath]);
  if (storageError && storageError.statusCode !== '404') {
    console.warn(
      'Storage deletion might have failed, but DB record is removed:',
      storageError.message,
    );
  }
}
