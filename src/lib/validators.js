/**
 * Validadores centralizados para agenda
 * Validação obrigatória antes de qualquer operação
 */

// ============================================================
// VALIDADORES DE AGENDAMENTO
// ============================================================

export function validateClinicId(clinicId) {
  if (!clinicId || typeof clinicId !== 'string') {
    throw new Error('clinic_id é obrigatório e deve ser string');
  }
  return true;
}

export function validateAppointmentDate(date) {
  if (!date || typeof date !== 'string') {
    throw new Error('Data é obrigatória (YYYY-MM-DD)');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Data inválida - use formato YYYY-MM-DD');
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Data não é válida');
  }

  return true;
}

export function validateAppointmentTime(time) {
  if (!time || typeof time !== 'string') {
    throw new Error('Horário é obrigatório (HH:MM:SS)');
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/;
  if (!timeRegex.test(time)) {
    throw new Error('Horário inválido - use formato HH:MM:SS');
  }

  return true;
}

export function validatePatientId(patientId) {
  if (!patientId || typeof patientId !== 'string') {
    throw new Error('Paciente é obrigatório');
  }
  return true;
}

export function validateAppointmentPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido');
  }

  // CRÍTICO: clinic_id obrigatório
  validateClinicId(payload.clinicId || payload.clinic_id);

  // Validação de data/hora
  if (payload.date || payload.scheduled_date) {
    validateAppointmentDate(payload.date || payload.scheduled_date);
  }

  if (payload.startTime || payload.scheduled_time) {
    validateAppointmentTime(payload.startTime || payload.scheduled_time);
  }

  // Validação de paciente
  if (payload.patientId || payload.patient_id) {
    validatePatientId(payload.patientId || payload.patient_id);
  }

  // Validação de status se presente
  if (payload.status) {
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(payload.status)) {
      throw new Error(`Status inválido. Use: ${validStatuses.join(', ')}`);
    }
  }

  return true;
}

export function validateAppointmentUpdatePayload(payload) {
  if (!payload.id) {
    throw new Error('ID do agendamento é obrigatório para atualizar');
  }
  validateAppointmentPayload(payload);
  return true;
}

// ============================================================
// VALIDADORES FINANCEIROS
// ============================================================

export function validateFinancialValue(value) {
  if (typeof value !== 'number') {
    throw new Error('Valor deve ser numérico');
  }

  if (value < 0) {
    throw new Error('Valor não pode ser negativo');
  }

  return true;
}

export function validateGuiaPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido');
  }

  // CRÍTICO: clinic_id obrigatório
  validateClinicId(payload.clinic_id);

  // Tipo de guia obrigatório
  if (!payload.tipo_guia || typeof payload.tipo_guia !== 'string') {
    throw new Error('Tipo de guia é obrigatório');
  }

  const validTypes = ['SP', 'SADT', 'Internação', 'Internacao'];
  if (!validTypes.includes(payload.tipo_guia)) {
    throw new Error(`Tipo de guia inválido. Use: ${validTypes.join(', ')}`);
  }

  if (!payload.paciente_nome || typeof payload.paciente_nome !== 'string') {
    throw new Error('Nome do paciente é obrigatório');
  }

  if (!payload.numero_carteirinha || typeof payload.numero_carteirinha !== 'string') {
    throw new Error('Número da carteirinha é obrigatório');
  }

  if (payload.valor !== undefined && payload.valor !== null && payload.valor !== '') {
    const numericValue = Number(payload.valor);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      throw new Error('Valor da guia deve ser numérico e não negativo');
    }
  }

  return true;
}

// ============================================================
// VALIDADORES GERAIS
// ============================================================

export function validateUUID(uuid, fieldName = 'ID') {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error(`${fieldName} é obrigatório`);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error(`${fieldName} não é um UUID válido`);
  }

  return true;
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Email inválido');
  }
  return true;
}

export function validatePhoneNumber(phone) {
  // Formato: (XX) XXXXX-XXXX
  const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Telefone inválido - use formato (XX) XXXXX-XXXX');
  }
  return true;
}

// ============================================================
// VALIDADOR DE CONFLITO DE HORÁRIO
// ============================================================

export function validateTimeRange(startTime, endTime) {
  if (!startTime || !endTime) {
    throw new Error('Hora de início e fim são obrigatórias');
  }

  validateAppointmentTime(startTime);
  validateAppointmentTime(endTime);

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes >= endMinutes) {
    throw new Error('Hora de fim deve ser posterior à hora de início');
  }

  // Mínimo de 15 minutos de duração
  const durationMinutes = endMinutes - startMinutes;
  if (durationMinutes < 15) {
    throw new Error('Duração mínima do agendamento é 15 minutos');
  }

  return true;
}

// ============================================================
// FUNÇÃO UTILITÁRIA: Executar validação com try/catch
// ============================================================

export function executeValidation(validatorFn, data, fieldName = 'Campo') {
  try {
    validatorFn(data);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      field: fieldName,
    };
  }
}
