/**
 * Invoice API - Emissão de Notas Fiscais
 *
 * Fluxo: Appointment Completo → NF → AR → Repasse
 *
 * Funcionalidades:
 * - Criar NF vinculada a agendamento
 * - Vincular a serviço e profissional
 * - Gerar AR automaticamente
 * - Disparar cálculo de repasse
 */

import { supabase } from '@/lib/customSupabaseClient';
import { createReceivable } from '@/lib/receivablesApi';

async function cancelReceivablesForInvoice(invoice) {
  const basePatch = {
    status: 'canceled',
    enterprise_status: 'CANCELADO',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ar_invoices')
    .update(basePatch)
    .eq('clinic_id', invoice.clinic_id)
    .filter('metadata->>invoice_id', 'eq', invoice.id)
    .select('id');

  if (error) {
    return { error };
  }

  if (data?.length) {
    return { data };
  }

  return supabase
    .from('ar_invoices')
    .update(basePatch)
    .eq('clinic_id', invoice.clinic_id)
    .eq('appointment_id', invoice.appointment_id)
    .ilike('description', `%${invoice.invoice_number}%`)
    .select('id');
}

// ============================================================
// NORMALIZAÇÃO: Status e Estados
// ============================================================

function normalizeInvoiceStatus(status) {
  if (!status) {
    return 'draft';
  }
  const s = String(status).toLowerCase().trim();
  if (['draft', 'rascunho'].includes(s)) {
    return 'draft';
  }
  if (['issued', 'emitida', 'emitido'].includes(s)) {
    return 'issued';
  }
  if (['sent', 'enviada', 'enviado'].includes(s)) {
    return 'sent';
  }
  if (['canceled', 'cancelada', 'cancelado'].includes(s)) {
    return 'canceled';
  }
  return 'draft';
}

// ============================================================
// CRIAR / ATUALIZAR NF
// ============================================================

/**
 * Cria nova nota fiscal vinculada ao agendamento
 *
 * @param {Object} params
 * @param {string} params.clinicId - ID da clínica
 * @param {string} params.appointmentId - ID do agendamento
 * @param {string} params.patientId - ID do paciente
 * @param {string} params.payerId - ID do pagador (convenio/empresa/paciente)
 * @param {string} params.payerType - Tipo: 'patient', 'insurance', 'company'
 * @param {number} params.grossAmount - Valor bruto
 * @param {number} params.discountAmount - Desconto (opcional)
 * @param {string} params.description - Descrição dos serviços
 * @param {string} params.professionalId - ID do profissional
 * @param {string} params.serviceId - ID do serviço
 * @param {Date} params.emissionDate - Data de emissão
 * @param {Date} params.dueDate - Data de vencimento
 * @param {string} params.notes - Notas adicionais
 *
 * @returns {Object} { id, invoice_number, ...dados criados }
 * @throws {Error}
 */
export async function createInvoice({
  clinicId,
  clinic_id,
  appointmentId,
  appointment_id,
  patientId,
  patient_id,
  payerId,
  payer_id,
  payerType, // 'patient', 'insurance', 'company'
  payer_type,
  grossAmount,
  gross_amount,
  discountAmount = 0,
  discount_amount,
  description,
  professionalId,
  professional_id,
  serviceId,
  service_id,
  emissionDate,
  emission_date,
  dueDate,
  due_date,
  notes = '',
  fiscal = {},
  financial = {},
  emission = {},
} = {}) {
  try {
    const resolvedClinicId = clinicId || clinic_id;
    const resolvedAppointmentId = appointmentId || appointment_id;
    const resolvedPatientId = patientId || patient_id;
    const resolvedPayerId = payerId || payer_id || null;
    const resolvedPayerType = payerType || payer_type || emission.payer_type || 'insurance';
    const resolvedGrossAmount = Number(grossAmount ?? gross_amount ?? financial.gross_value ?? financial.net_value ?? 0);
    const resolvedDiscountAmount = Number(discountAmount ?? discount_amount ?? financial.discount ?? 0);
    const resolvedDescription = description || fiscal.description || '';
    const resolvedProfessionalId = professionalId || professional_id || null;
    const resolvedServiceId = serviceId || service_id || null;
    const resolvedEmissionDate = emissionDate || emission_date || emission.emission_date || new Date();
    const resolvedDueDate = dueDate || due_date || emission.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const resolvedNotes = notes || emission.notes || '';

    // 🔍 VALIDAÇÕES
    if (!resolvedClinicId) {
      throw new Error('Clínica obrigatória');
    }
    if (!resolvedAppointmentId) {
      throw new Error('Agendamento obrigatório');
    }
    if (!resolvedPatientId) {
      throw new Error('Paciente obrigatório');
    }
    if (!resolvedGrossAmount || resolvedGrossAmount <= 0) {
      throw new Error('Valor bruto deve ser maior que 0');
    }
    if (!resolvedDescription) {
      throw new Error('Descrição dos serviços obrigatória');
    }

    const netAmount = Math.max(0, resolvedGrossAmount - (resolvedDiscountAmount || 0));
    const emissionDateStr = new Date(resolvedEmissionDate).toISOString().split('T')[0];
    const dueDateStr = new Date(resolvedDueDate).toISOString().split('T')[0];

    // 📝 Gerar número sequencial da NF
    const invoiceNumber = await generateInvoiceNumber(resolvedClinicId);

    // 💾 Inserir na tabela invoices
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        clinic_id: resolvedClinicId,
        appointment_id: resolvedAppointmentId,
        patient_id: resolvedPatientId,
        payer_id: resolvedPayerId,
        payer_type: resolvedPayerType,
        invoice_number: invoiceNumber,
        gross_amount: resolvedGrossAmount,
        discount_amount: resolvedDiscountAmount || 0,
        net_amount: netAmount,
        description: resolvedDescription,
        professional_id: resolvedProfessionalId,
        service_id: resolvedServiceId,
        emission_date: emissionDateStr,
        due_date: dueDateStr,
        notes: resolvedNotes || '',
        status: 'draft',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar NF: ${error.message}`);
    }

    console.log('✅ NF criada:', {
      invoiceId: data.id,
      invoiceNumber: data.invoice_number,
      netAmount: data.net_amount,
    });

    return data;
  } catch (err) {
    console.error('❌ Erro ao criar NF:', err.message);
    throw err;
  }
}

export async function linkExternalInvoiceToAppointment({
  clinicId,
  appointmentId,
  patientId,
  invoiceNumber,
  amount = 0,
  description = 'NF emitida fora do sistema',
  issuedDate = new Date(),
  dueDate = new Date(),
} = {}) {
  const resolvedInvoiceNumber = String(invoiceNumber || '').trim();

  if (!clinicId) {
    throw new Error('Clínica obrigatória');
  }
  if (!appointmentId) {
    throw new Error('Agendamento obrigatório');
  }
  if (!resolvedInvoiceNumber) {
    throw new Error('Informe o número da NF');
  }

  const { data: existing, error: existingError } = await supabase
    .from('invoices')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('invoice_number', resolvedInvoiceNumber)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar NF existente: ${existingError.message}`);
  }

  if (existing) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        appointment_id: appointmentId,
        patient_id: patientId || existing.patient_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao vincular NF existente: ${error.message}`);
    }

    return data;
  }

  const dateStr = new Date(issuedDate).toISOString().split('T')[0];
  const dueDateStr = new Date(dueDate).toISOString().split('T')[0];
  const numericAmount = Number(amount || 0);

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      clinic_id: clinicId,
      appointment_id: appointmentId,
      patient_id: patientId || null,
      invoice_number: resolvedInvoiceNumber,
      description,
      amount: numericAmount,
      total: numericAmount,
      issued_date: dateStr,
      due_date: dueDateStr,
      status: 'issued',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao vincular NF externa: ${error.message}`);
  }

  return data;
}

/**
 * Gera número sequencial para NF (formato: YYYY-001, YYYY-002, etc)
 * @param {string} clinicId - ID da clínica
 * @returns {string} Número da NF
 */
async function generateInvoiceNumber(clinicId) {
  try {
    const year = new Date().getFullYear();
    const prefix = `${year}-`;

    // Buscar última NF do ano
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('clinic_id', clinicId)
      .ilike('invoice_number', `${prefix}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (data && data.invoice_number) {
      const lastNum = parseInt(data.invoice_number.split('-')[1], 10);
      nextNumber = lastNum + 1;
    }

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  } catch (err) {
    console.warn('⚠️ Erro ao gerar número NF, usando fallback:', err.message);
    return `${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`;
  }
}

/**
 * Atualiza status da NF
 * @param {string} invoiceId - ID da NF
 * @param {string} newStatus - Novo status (draft, issued, sent, canceled)
 * @returns {Object} NF atualizada
 */
export async function updateInvoiceStatus(invoiceId, newStatus) {
  try {
    const status = normalizeInvoiceStatus(newStatus);

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar NF: ${error.message}`);
    }

    console.log('✅ NF atualizada:', { invoiceId, status });
    return data;
  } catch (err) {
    console.error('❌ Erro ao atualizar NF:', err.message);
    throw err;
  }
}

// ============================================================
// EMITIR NF E GERAR AR
// ============================================================

/**
 * Emite NF (muda status para issued) e cria registro em AR automaticamente
 *
 * @param {string} invoiceId - ID da NF
 * @param {Object} options - Opções adicionais
 * @returns {Object} { invoice, receivable, repasse }
 */
export async function emitInvoiceAndCreateAR(invoiceId, options = {}) {
  try {
    // 1️⃣ Atualizar NF para 'issued'
    const invoice = await updateInvoiceStatus(invoiceId, 'issued');

    // 2️⃣ Buscar dados completos da NF
    const { data: fullInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(
        `
        *,
        appointments(id, patient_id, professional_id, appointment_date),
        patients(name)
      `,
      )
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      throw new Error(`Erro ao buscar NF: ${invoiceError.message}`);
    }

    // 3️⃣ Criar AR automaticamente
    const receivable = await createReceivable(fullInvoice.clinic_id, {
      patient_id: fullInvoice.patient_id,
      description: `NF ${fullInvoice.invoice_number}: ${fullInvoice.description}`,
      amount: fullInvoice.net_amount,
      net_value: fullInvoice.net_amount,
      gross_amount: fullInvoice.gross_amount,
      payer_id: fullInvoice.payer_id,
      payer_type: fullInvoice.payer_type,
      appointment_id: fullInvoice.appointment_id,
      due_date: fullInvoice.due_date,
      invoice_date: fullInvoice.emission_date,
      origem: 'nf',
      professional_id: fullInvoice.professional_id,
      procedure_id: fullInvoice.service_id,
      status: 'open',
      metadata: {
        ...(options.metadata || {}),
        source: 'invoice_api',
        invoice_id: invoiceId,
        invoice_number: fullInvoice.invoice_number,
      },
      ...options,
    });

    console.log('✅ AR criado a partir de NF:', {
      receivableId: receivable.id,
      amount: receivable.amount,
    });

    // 4️⃣ Gerar repasse do profissional (se configurado)
    let repasseData = null;
    if (fullInvoice.professional_id) {
      try {
        repasseData = await triggerProfessionalRepasse({
          clinicId: fullInvoice.clinic_id,
          professionalId: fullInvoice.professional_id,
          appointmentId: fullInvoice.appointment_id,
          invoiceId: invoiceId,
          amount: fullInvoice.net_amount,
        });
      } catch (repasseErr) {
        console.warn('⚠️ Erro ao calcular repasse:', repasseErr.message);
        // Não falhar o fluxo principal
      }
    }

    return {
      invoice: fullInvoice,
      receivable,
      repasse: repasseData,
    };
  } catch (err) {
    console.error('❌ Erro ao emitir NF e criar AR:', err.message);
    throw err;
  }
}

// ============================================================
// REPASSE AUTOMÁTICO
// ============================================================

/**
 * Dispara cálculo de repasse ao profissional
 *
 * @param {Object} params
 * @returns {Object} Dados de repasse gerado
 */
async function triggerProfessionalRepasse({
  clinicId,
  professionalId,
  appointmentId,
  invoiceId,
  amount,
} = {}) {
  try {
    // Buscar configuração de repasse do profissional
    const { data: config, error: configError } = await supabase
      .from('medical_repasse_config')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .single();

    if (configError || !config) {
      console.warn('⚠️ Sem configuração de repasse para profissional:', professionalId);
      return null;
    }

    // Calcular valor do repasse
    const repassePercentage = config.percentage || 0.7; // 70% padrão
    const repasseAmount = amount * repassePercentage;
    const clinicAmount = amount * (1 - repassePercentage);

    // Registrar produção do profissional
    const { data: production, error: productionError } = await supabase
      .from('medical_production')
      .insert({
        clinic_id: clinicId,
        professional_id: professionalId,
        appointment_id: appointmentId,
        invoice_id: invoiceId,
        amount: amount,
        repasse_percentage: repassePercentage * 100,
        repasse_amount: repasseAmount,
        clinic_amount: clinicAmount,
        status: 'registered',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (productionError) {
      console.error('❌ Erro ao registrar produção:', productionError.message);
    }

    console.log('✅ Repasse registrado:', {
      professionalId,
      amount,
      repasseAmount,
      percentage: repassePercentage * 100,
    });

    return {
      amount,
      repasseAmount,
      clinicAmount,
      percentage: repassePercentage * 100,
      production,
    };
  } catch (err) {
    console.error('❌ Erro ao calcular repasse:', err.message);
    throw err;
  }
}

// ============================================================
// LISTAR E BUSCAR NF
// ============================================================

/**
 * Lista todas as NF de uma clínica
 * @param {string} clinicId - ID da clínica
 * @param {Object} filters - Filtros (appointmentId, patientId, status, etc)
 * @returns {Array} Lista de NF
 */
export async function listInvoices(clinicId, filters = {}) {
  try {
    let query = supabase
      .from('invoices')
      .select(
        `
        *,
        patients(id, name),
        appointments(id, appointment_date)
      `,
      )
      .eq('clinic_id', clinicId)
      .order('emission_date', { ascending: false });

    if (filters.appointmentId) {
      query = query.eq('appointment_id', filters.appointmentId);
    }
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }
    if (filters.status) {
      query = query.eq('status', normalizeInvoiceStatus(filters.status));
    }
    if (filters.payerType) {
      query = query.eq('payer_type', filters.payerType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar NF: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    console.error('❌ Erro ao listar NF:', err.message);
    throw err;
  }
}

/**
 * Busca uma NF específica
 * @param {string} invoiceId - ID da NF
 * @returns {Object} Dados da NF
 */
export async function getInvoice(invoiceId) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        patients(id, name, email, phone),
        appointments(id, appointment_date, professional_id, service_id),
        professionals(id, name, license_number)
      `,
      )
      .eq('id', invoiceId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar NF: ${error.message}`);
    }

    return data;
  } catch (err) {
    console.error('❌ Erro ao buscar NF:', err.message);
    throw err;
  }
}

// ============================================================
// CANCELAR NF
// ============================================================

/**
 * Cancela uma NF (e reversa AR se necessário)
 * @param {string} invoiceId - ID da NF
 * @param {string} cancellationReason - Motivo do cancelamento
 * @returns {Object} NF cancelada
 */
export async function cancelInvoice(invoiceId, cancellationReason = '') {
  try {
    // 1️⃣ Atualizar NF
    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'canceled',
        cancellation_reason: cancellationReason,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao cancelar NF: ${updateError.message}`);
    }

    // 2️⃣ Cancelar AR canonico relacionado (se houver)
    const { error: arError } = await cancelReceivablesForInvoice(invoice);

    if (arError) {
      console.warn('⚠️ Erro ao cancelar AR relacionado:', arError.message);
    }

    console.log('✅ NF cancelada:', { invoiceId });
    return invoice;
  } catch (err) {
    console.error('❌ Erro ao cancelar NF:', err.message);
    throw err;
  }
}

// ============================================================
// EXPORT
// ============================================================

export default {
  createInvoice,
  emitInvoiceAndCreateAR,
  updateInvoiceStatus,
  listInvoices,
  getInvoice,
  cancelInvoice,
};
