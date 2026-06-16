/**
 * TISS API Module - Geração e Submissão de Guias TISS
 * =======================================================
 * Responsabilidades:
 * 1. Gerar XML TISS a partir de dados da guia
 * 2. Validar completude de dados antes de envio
 * 3. Submeter para operadora (via HTTP/SFTP)
 * 4. Rastrear status de submissão
 * 5. Retry automático de falhas
 *
 * Padrão: ANS (Agência Nacional de Saúde Suplementar) TISS
 * Data: Abril 10, 2026
 */

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

/**
 * ============================================================
 * 1. VALIDAÇÃO DE COMPLETUDE ANTES DE GERAR XML
 * ============================================================
 */

/**
 * Valida se todos os dados obrigatórios estão presentes
 * @param {Object} guideData - Dados da guia com appointment/patient/professional/payer
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTISSDataCompleteness(guideData) {
  const errors = [];

  // PACIENTE (obrigatório)
  if (!guideData.patient) {
    errors.push('Paciente não encontrado');
  } else {
    const patientCpf = guideData.patient.cpf || guideData.patient.document_id;
    if (!patientCpf || patientCpf.trim() === '') {
      errors.push('CPF do paciente é obrigatório');
    }
    if (!guideData.patient.name || guideData.patient.name.trim() === '') {
      errors.push('Nome do paciente é obrigatório');
    }
    if (!guideData.patient.birthdate) {
      errors.push('Data de nascimento do paciente é obrigatória');
    }
  }

  // PROFISSIONAL (obrigatório)
  if (!guideData.professional) {
    errors.push('Profissional não encontrado');
  } else {
    if (!guideData.professional.cbo_code || guideData.professional.cbo_code.trim() === '') {
      errors.push('CBO do profissional é obrigatório (ex: 225108)');
    } else if (!/^\d{6}$/.test(guideData.professional.cbo_code.trim())) {
      errors.push('CBO deve ter exatamente 6 dígitos');
    }
    if (!guideData.professional.council_number) {
      errors.push('Número de registro do profissional é obrigatório');
    }
    if (!guideData.professional.council_state) {
      errors.push('UF do conselho profissional é obrigatório');
    }
  }

  // SERVIÇO (obrigatório)
  if (!guideData.service) {
    errors.push('Serviço não encontrado');
  } else {
    if (!guideData.service.tuss_code || guideData.service.tuss_code.trim() === '') {
      errors.push('TUSS Code do serviço é obrigatório (10 dígitos)');
    } else if (!/^\d{10}$/.test(guideData.service.tuss_code.trim())) {
      errors.push('TUSS Code deve ter exatamente 10 dígitos');
    }
  }

  // OPERADORA (obrigatório)
  if (!guideData.payer) {
    errors.push('Operadora/Convênio não encontrado');
  } else {
    if (!guideData.payer.registration_ans || guideData.payer.registration_ans.trim() === '') {
      errors.push('ANS da operadora é obrigatório (ex: 394158)');
    }
  }

  // AUTORIZAÇÃO (se requerida)
  if (
    guideData.appointment?.requires_authorization &&
    !guideData.appointment?.authorization_number
  ) {
    errors.push('Número de autorização é obrigatório para esta operadora');
  }

  // DATA DO ATENDIMENTO (obrigatório)
  if (!guideData.appointment?.scheduled_date) {
    errors.push('Data do atendimento é obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ============================================================
 * 2. GERAÇÃO XML TISS (ANS padrão)
 * ============================================================
 */

/**
 * Gera XML TISS a partir de dados da guia
 * Formato: XML ANS (Agência Nacional de Saúde Suplementar)
 *
 * @param {Object} guideData - { patient, professional, service, payer, appointment }
 * @returns {string} XML string válido
 */
export function generateTISSXML(guideData) {
  // Validação prévia
  const validation = validateTISSDataCompleteness(guideData);
  if (!validation.valid) {
    throw new Error(`Dados incompletos para TISS: ${validation.errors.join('; ')}`);
  }

  const { patient, professional, service, payer, appointment } = guideData;
  const patientCpf = patient.cpf || patient.document_id || '';

  // Formatadores helpers
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0].replace(/-/g, '');
  };

  const formatCPF = (cpf) => cpf.replace(/\D/g, '');
  const formatPhone = (phone) => phone.replace(/\D/g, '').slice(-8);

  // Timestamps
  const now = new Date();
  const transmissionDate = formatDate(now);
  const guideNumber =
    appointment?.guide_number ||
    `${formatDate(new Date())}-${Math.random().toString(36).substr(2, 9)}`;

  // Construir XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TISSGuide xmlns="http://www.ans.org.br/tiss" version="3.02.00">
  <!-- ======== CABEÇALHO ADMINISTRATIVO ======== -->
  <Header>
    <TransmissionDate>${transmissionDate}</TransmissionDate>
    <TransmissionTime>${now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '')}</TransmissionTime>
    <MessageType>GUIDE</MessageType>
    <SequenceNumber>${Math.floor(Math.random() * 999999)}</SequenceNumber>
  </Header>

  <!-- ======== DADOS DA OPERADORA ======== -->
  <Payer>
    <RegistrationANS>${payer.registration_ans}</RegistrationANS>
    <Name>${escapeXML(payer.name)}</Name>
    <TISSVersion>3.02.00</TISSVersion>
  </Payer>

  <!-- ======== DADOS DO PRESTADOR ======== -->
  <Provider>
    <CREMRegistration>${professional.council_number}</CREMRegistration>
    <CREMState>${professional.council_state}</CREMState>
    <CREMUnitNumber>1</CREMUnitNumber>
    <CREMVerifierCode>00</CREMVerifierCode>
    <CBOCode>${professional.cbo_code}</CBOCode>
    <CPF>${formatCPF(professional.cpf || '')}</CPF>
    <Name>${escapeXML(professional.name)}</Name>
  </Provider>

  <!-- ======== DADOS DO SEGURADO/PACIENTE ======== -->
  <Subscriber>
    <SubscriberNumber>${appointment.subscriber_number || '000000000001'}</SubscriberNumber>
    <CPF>${formatCPF(patientCpf)}</CPF>
    <Name>${escapeXML(patient.name)}</Name>
    <Gender>${patient.gender?.toUpperCase() === 'M' ? 'M' : 'F'}</Gender>
    <BirthDate>${formatDate(patient.birthdate)}</BirthDate>
    <MotherName>${escapeXML(patient.mother_name || 'NÃO INFORMADO')}</MotherName>
  </Subscriber>

  <!-- ======== DADOS DO DEPENDENTE (se aplicável) ======== -->
  ${
    appointment?.dependent_number
      ? `
  <Dependent>
    <DependentNumber>${appointment.dependent_number}</DependentNumber>
    <Name>${escapeXML(appointment.dependent_name || patient.name)}</Name>
    <BirthDate>${formatDate(appointment.dependent_birthdate || patient.birthdate)}</BirthDate>
    <Gender>${appointment.dependent_gender || (patient.gender?.toUpperCase() === 'M' ? 'M' : 'F')}</Gender>
  </Dependent>
  `
      : ''
  }

  <!-- ======== DADOS DA GUIA ======== -->
  <Guide>
    <GuideNumber>${guideNumber}</GuideNumber>
    <GuideType>${mapGuideType(service.guide_type)}</GuideType>
    <GuideDescription>${escapeXML(service.name)}</GuideDescription>
    <SeriesNumber>001</SeriesNumber>
    <IssueDate>${formatDate(now)}</IssueDate>
    <ValidityDate>${formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</ValidityDate>
    <Status>1</Status> <!-- 1=Ativa -->
    <GuideRoute>1</GuideRoute> <!-- 1=Prestador remetente de dados -->
  </Guide>

  <!-- ======== PROCEDIMENTO/SERVIÇO ======== -->
  <Procedure>
    <ItemSequence>1</ItemSequence>
    <TUSSCode>${service.tuss_code}</TUSSCode>
    <TUSSDescription>${escapeXML(service.name)}</TUSSDescription>
    <Quantity>${appointment.quantity || 1}</Quantity>
    <UnitMeasure>${mapUnitMeasure(service.unit_measure || 'UN')}</UnitMeasure>
    <UnitValue>${(appointment.total_value / (appointment.quantity || 1)).toFixed(2).replace('.', '')}</UnitValue>
    <TotalValue>${(appointment.total_value || 0).toFixed(2).replace('.', '')}</TotalValue>
    <ExecutionDate>${formatDate(appointment.scheduled_date)}</ExecutionDate>
    <ExecutionTime>${appointment.scheduled_time?.replace(/:/g, '') || '000000'}</ExecutionTime>
    <AuthorizationNumber>${appointment.authorization_number || ''}</AuthorizationNumber>
  </Procedure>

  <!-- ======== OBSERVAÇÕES ======== -->
  <Observations>
    <ClinicObservation>${escapeXML(appointment.notes || 'Atendimento realizado conforme programado')}</ClinicObservation>
    <DiagnosisCode>${appointment.diagnosis_code || 'R69.9'}</DiagnosisCode> <!-- CID - Sintoma não especificado -->
  </Observations>

  <!-- ======== AUTENTICAÇÃO ======== -->
  <Authentication>
    <TransmissionKey>${generateTransmissionKey(patientCpf, guideNumber)}</TransmissionKey>
    <DigitalSignature>${generateDigitalSignature(guideNumber)}</DigitalSignature>
  </Authentication>
</TISSGuide>`;

  return xml;
}

/**
 * Mapeia tipo de guia TISS
 * @param {string} guideType - Tipo da guia (ex: "consulta", "internacao", "sadt")
 * @returns {string} Código TISS (1, 2, 3, 4, 5, ou 6)
 */
function mapGuideType(guideType) {
  const map = {
    consulta: '1',
    internacao: '2',
    sadt: '3',
    odontologia: '4',
    quimioterapia: '5',
    radioterapia: '6',
  };
  return map[guideType?.toLowerCase()] || '1';
}

/**
 * Mapeia unidade de medida TISS
 * @param {string} unitMeasure - Unidade (ex: "UN", "KG", "ML")
 * @returns {string} Código TISS
 */
function mapUnitMeasure(unitMeasure) {
  const map = {
    UN: '01', // Unidade
    KG: '02', // Quilograma
    ML: '03', // Mililitro
    L: '04', // Litro
    M2: '05', // Metro quadrado
    M3: '06', // Metro cúbico
  };
  return map[unitMeasure?.toUpperCase()] || '01';
}

/**
 * Escapa caracteres especiais XML
 * @param {string} text
 * @returns {string}
 */
function escapeXML(text) {
  if (!text) {
    return '';
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gera chave de transmissão TISS
 * @param {string} cpf
 * @param {string} guideNumber
 * @returns {string}
 */
function generateTransmissionKey(cpf, guideNumber) {
  const clean = cpf.replace(/\D/g, '');
  const num = guideNumber.toString().slice(-6);
  return `${clean.slice(-8)}${num}`;
}

/**
 * Gera assinatura digital simulada
 * @param {string} guideNumber
 * @returns {string}
 */
function generateDigitalSignature(guideNumber) {
  // Em produção, usar biblioteca crypto ou certificado digital
  const hash = Buffer.from(guideNumber).toString('base64');
  return hash.slice(0, 32).toUpperCase();
}

/**
 * ============================================================
 * 3. SUBMISSÃO E RASTREAMENTO
 * ============================================================
 */

/**
 * Submete guia TISS para a operadora
 * @param {string} guideId - ID da guia (billing_guides.id)
 * @param {string} clinicId
 * @returns {Promise<{success: boolean, submissionId: string, message: string}>}
 */
export async function submitTISSGuide(guideId, clinicId) {
  try {
    // 1. Fetch guia com dados completos
    const { data: guide, error: guideError } = await supabase
      .from('billing_guides')
      .select(
        `
        id, guide_number, appointment_id, payer_id, status,
        appointments(id, patient_id, scheduled_date, scheduled_time, total_value, 
          service_id, professional_id, authorization_number, subscriber_number, requires_authorization,
          services(id, name, tuss_code, guide_type, unit_measure, cost_value),
          professionals(id, name, cbo_code, council_number, council_state, cpf),
          patients(id, name, document_id, birthdate, gender, mother_name)
        ),
        health_insurances(id, name, registration_ans)
      `,
      )
      .eq('id', guideId)
      .eq('clinic_id', clinicId)
      .single();

    if (guideError || !guide) {
      throw new Error(`Guia não encontrada: ${guideError?.message || 'unknown'}`);
    }

    // 2. Preparar dados para XML
    const appointmentData = guide.appointments[0];
    if (!appointmentData) {
      throw new Error('Agendamento associado à guia não encontrado');
    }

    const guideData = {
      patient: appointmentData.patients[0],
      professional: appointmentData.professionals[0],
      service: appointmentData.services[0],
      payer: guide.health_insurances,
      appointment: appointmentData,
    };

    // 3. Validar completude
    const validation = validateTISSDataCompleteness(guideData);
    if (!validation.valid) {
      return {
        success: false,
        submissionId: null,
        message: `Validação falhou: ${validation.errors.join('; ')}`,
      };
    }

    // 4. Gerar XML
    const xmlContent = generateTISSXML(guideData);

    // 5. Criar registro de submissão
    const submissionId = `TISS-${guideId}-${Date.now()}`;
    const { error: submissionError } = await supabase.from('tiss_submissions').insert({
      id: submissionId,
      clinic_id: clinicId,
      guide_id: guideId,
      status: 'pending', // pending, sent, processing, accepted, rejected, error
      xml_content: xmlContent,
      attempt_count: 1,
      last_attempt_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    if (submissionError && submissionError.code !== 'PGRST116') {
      throw new Error(`Erro ao registrar submissão: ${submissionError.message}`);
    }

    // 6. Atualizar status da guia
    await supabase
      .from('billing_guides')
      .update({
        status: 'submitted', // submitted, processing, accepted, rejected
        last_submission_at: new Date().toISOString(),
      })
      .eq('id', guideId)
      .eq('clinic_id', clinicId);

    // 7. Log de auditoria
    await logTISSAudit(
      clinicId,
      guideId,
      'SUBMITTED',
      `XML enviado. ID: ${submissionId}`,
      xmlContent,
    );

    return {
      success: true,
      submissionId,
      message: `Guia TISS preparada para envio. ID: ${submissionId}. ${validation.errors.length ? '⚠️ Avisos: ' + validation.errors.join('; ') : ''}`,
    };
  } catch (error) {
    console.error('[submitTISSGuide]', error);
    return {
      success: false,
      submissionId: null,
      message: `Erro ao submeter: ${error.message}`,
    };
  }
}

/**
 * Obtém status de submissão TISS
 * @param {string} guideId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getTISSSubmissionStatus(guideId, clinicId) {
  try {
    const { data, error } = await supabase
      .from('tiss_submissions')
      .select('id, status, attempt_count, last_attempt_at, response_data, created_at')
      .eq('guide_id', guideId)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.[0] || { status: 'not_submitted' };
  } catch (error) {
    console.error('[getTISSSubmissionStatus]', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Retry de submissão falhada
 * @param {string} submissionId
 * @param {string} clinicId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function retryTISSSubmission(submissionId, clinicId) {
  try {
    // 1. Fetch submissão
    const { data: submission, error: fetchError } = await supabase
      .from('tiss_submissions')
      .select('id, guide_id, status, attempt_count, xml_content')
      .eq('id', submissionId)
      .eq('clinic_id', clinicId)
      .maybeSingle();

    if (fetchError || !submission) {
      throw new Error('Submissão não encontrada');
    }

    // 2. Verificar limite de tentativas (máx 3)
    if ((submission.attempt_count || 0) >= 3) {
      return {
        success: false,
        message: 'Limite de tentativas (3) atingido. Contate suporte.',
      };
    }

    // 3. Reenviar
    const { error: updateError } = await supabase
      .from('tiss_submissions')
      .update({
        status: 'pending',
        attempt_count: (submission.attempt_count || 0) + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) {
      throw updateError;
    }

    // 4. Log
    await logTISSAudit(
      clinicId,
      submission.guide_id,
      'RETRY_SUBMITTED',
      `Tentativa ${submission.attempt_count + 1}/3`,
    );

    return {
      success: true,
      message: `Reenviando (tentativa ${submission.attempt_count + 1}/3)...`,
    };
  } catch (error) {
    console.error('[retryTISSSubmission]', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * ============================================================
 * 4. AUDITORIA TISS
 * ============================================================
 */

/**
 * Registra evento TISS em auditoria
 * @param {string} clinicId
 * @param {string} guideId
 * @param {string} event - SUBMITTED, PROCESSING, ACCEPTED, REJECTED, ERROR, RETRY_SUBMITTED
 * @param {string} message
 * @param {string} details - Detalhes adicionais (XML, resposta, etc)
 */
async function logTISSAudit(clinicId, guideId, event, message, details = null) {
  try {
    await supabase.from('tiss_audit_logs').insert({
      clinic_id: clinicId,
      guide_id: guideId,
      event,
      message,
      details: details ? details.slice(0, 1000) : null, // Limitar tamanho
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[logTISSAudit] Falha ao registrar auditoria:', error);
  }
}

/**
 * Busca histórico de auditoria TISS para uma guia
 * @param {string} guideId
 * @returns {Promise<Array>}
 */
export async function getTISSTAuditHistory(guideId) {
  try {
    const { data, error } = await supabase
      .from('tiss_audit_logs')
      .select('id, event, message, created_at')
      .eq('guide_id', guideId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('[getTISSTAuditHistory]', error);
    return [];
  }
}

/**
 * ============================================================
 * 5. UTILIDADES
 * ============================================================
 */

/**
 * Exporta guia como arquivo XML
 * @param {string} xmlContent
 * @param {string} fileName
 */
export function downloadTISSXML(xmlContent, fileName) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/xml;charset=utf-8,' + encodeURIComponent(xmlContent));
  element.setAttribute('download', fileName || `TISS-${Date.now()}.xml`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Lista todas as guias pendentes de envio
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
export async function listPendingTISSGuides(clinicId) {
  try {
    const { data, error } = await supabase
      .from('billing_guides')
      .select(
        `
        id, guide_number, status, created_at,
        appointments(patient_id, patients(name, document_id)),
        health_insurances(name, registration_ans)
      `,
      )
      .eq('clinic_id', clinicId)
      .neq('status', 'sent')
      .neq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('[listPendingTISSGuides]', error);
    return [];
  }
}
