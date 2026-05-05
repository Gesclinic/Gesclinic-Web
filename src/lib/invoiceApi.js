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
  appointmentId,
  patientId,
  payerId,
  payerType = 'insurance', // 'patient', 'insurance', 'company'
  grossAmount,
  discountAmount = 0,
  description,
  professionalId,
  serviceId,
  emissionDate = new Date(),
  dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
  notes = '',
} = {}) {
  try {
    // 🔍 VALIDAÇÕES
    if (!clinicId) {
      throw new Error('Clínica obrigatória');
    }
    if (!appointmentId) {
      throw new Error('Agendamento obrigatório');
    }
    if (!patientId) {
      throw new Error('Paciente obrigatório');
    }
    if (!payerId) {
      throw new Error('Pagador obrigatório');
    }
    if (!grossAmount || grossAmount <= 0) {
      throw new Error('Valor bruto deve ser maior que 0');
    }
    if (!description) {
      throw new Error('Descrição dos serviços obrigatória');
    }

    const netAmount = Math.max(0, grossAmount - (discountAmount || 0));
    const emissionDateStr = new Date(emissionDate).toISOString().split('T')[0];
    const dueDateStr = new Date(dueDate).toISOString().split('T')[0];

    // 📝 Gerar número sequencial da NF
    const invoiceNumber = await generateInvoiceNumber(clinicId);

    // 💾 Inserir na tabela invoices
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        clinic_id: clinicId,
        appointment_id: appointmentId,
        patient_id: patientId,
        payer_id: payerId,
        payer_type: payerType,
        invoice_number: invoiceNumber,
        gross_amount: grossAmount,
        discount_amount: discountAmount || 0,
        net_amount: netAmount,
        description,
        professional_id: professionalId,
        service_id: serviceId,
        emission_date: emissionDateStr,
        due_date: dueDateStr,
        notes: notes || '',
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
    const receivable = await createReceivable({
      clinicId: fullInvoice.clinic_id,
      patientId: fullInvoice.patient_id,
      description: `NF ${fullInvoice.invoice_number}: ${fullInvoice.description}`,
      amount: fullInvoice.net_amount,
      payerId: fullInvoice.payer_id,
      payerType: fullInvoice.payer_type,
      appointmentId: fullInvoice.appointment_id,
      dueDate: fullInvoice.due_date,
      emissionDate: fullInvoice.emission_date,
      invoiceId: invoiceId,
      origem: 'nf',
      professionalId: fullInvoice.professional_id,
      serviceId: fullInvoice.service_id,
      status: 'open',
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

    // 2️⃣ Cancelar AR relacionado (se houver)
    const { error: arError } = await supabase
      .from('ar_receivables')
      .update({ status: 'canceled' })
      .eq('invoice_id', invoiceId);

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
