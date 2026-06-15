/**
 * 📄 Invoice Service - Emissão Completa de Notas Fiscais
 *
 * Fluxo End-to-End:
 * Appointment Completo → Invoice com Itens → Tributação por Item
 * → AR → Caixa → Repasse → DRE
 *
 * Integra com:
 * - Tax Calculation (tributação por item com equiparação)
 * - Receivables (contas a receber)
 * - Medical Repasse (repasse profissional)
 * - Financial Audit (auditoria financeira append-only)
 * - Cash Movements (fluxo de caixa)
 */

import { supabase } from '@/lib/customSupabaseClient';
import { calculateItemTaxes } from '@/lib/taxCalculationApi';
import { logReceivableCreated, logPaymentReceived } from '@/lib/auditFinancialIntegration';
import { logAppointmentFinancialAudit, FINANCIAL_EVENT_TYPES } from '@/lib/auditFinancialApi';
import { createReceivable, registerReceivablePayment } from '@/lib/receivablesApi.js';

// ============================================================
// ⚙️ CONSTANTES E HELPERS
// ============================================================

const INVOICE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  SENT: 'sent',
  CANCELED: 'canceled',
  PAID: 'paid',
};

const INVOICE_STATUSES = Object.values(INVOICE_STATUS);

/**
 * Normaliza status de invoice
 */
function normalizeInvoiceStatus(status) {
  if (!status) {
    return INVOICE_STATUS.DRAFT;
  }
  const s = String(status).toLowerCase().trim();
  if (['draft', 'rascunho'].includes(s)) {
    return INVOICE_STATUS.DRAFT;
  }
  if (['issued', 'emitida', 'emitido'].includes(s)) {
    return INVOICE_STATUS.ISSUED;
  }
  if (['sent', 'enviada', 'enviado'].includes(s)) {
    return INVOICE_STATUS.SENT;
  }
  if (['canceled', 'cancelada', 'cancelado'].includes(s)) {
    return INVOICE_STATUS.CANCELED;
  }
  if (['paid', 'pago', 'quitado'].includes(s)) {
    return INVOICE_STATUS.PAID;
  }
  return INVOICE_STATUS.DRAFT;
}

/**
 * Arredonda valor monetário
 */
function roundMoney(value) {
  return Math.round(parseFloat(value) * 100) / 100;
}

function dateOnly(value = new Date()) {
  return new Date(value).toISOString().split('T')[0];
}

async function findReceivableByInvoice(invoice) {
  const { data, error } = await supabase
    .from('ar_invoices')
    .select('*')
    .eq('clinic_id', invoice.clinic_id)
    .filter('metadata->>invoice_id', 'eq', invoice.id)
    .limit(1);

  if (!error && data?.[0]) {
    return data[0];
  }

  const fallback = await supabase
    .from('ar_invoices')
    .select('*')
    .eq('clinic_id', invoice.clinic_id)
    .eq('appointment_id', invoice.appointment_id)
    .ilike('description', `%${invoice.invoice_number}%`)
    .limit(1);

  return fallback.data?.[0] || null;
}

// ============================================================
// 📝 CRIAR INVOICE COM MÚLTIPLOS ITENS
// ============================================================

/**
 * Cria invoice com múltiplos itens e calcula tributação
 *
 * @param {Object} params
 * @param {string} params.clinicId - ID da clínica
 * @param {string} params.appointmentId - ID do agendamento
 * @param {string} params.patientId - ID do paciente
 * @param {string} params.payerId - ID do pagador
 * @param {string} params.payerType - 'patient' | 'insurance' | 'company'
 * @param {Array} params.items - Array de itens:
 *   - { serviceId, description, amount, quantity, unitPrice, isHospitalService }
 * @param {number} params.discountAmount - Desconto total (opcional)
 * @param {string} params.notes - Notas (opcional)
 *
 * @returns {Object} { invoice, items: [{...taxData}], totals }
 * @throws {Error}
 */
export async function createInvoiceWithItems({
  clinicId,
  appointmentId,
  patientId,
  payerId,
  payerType = 'insurance',
  items = [],
  discountAmount = 0,
  notes = '',
}) {
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
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Deve ter pelo menos 1 item');
    }

    // ✅ Carregar dados da clínica (regime, ISS)
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('tax_regime, iss_rate')
      .eq('id', clinicId)
      .single();

    if (clinicError || !clinic) {
      throw new Error('Clínica não encontrada');
    }

    const taxRegime = clinic.tax_regime || 'lucro_presumido';
    const issRate = clinic.iss_rate || 3.0;

    // 📊 Processar itens e calcular tributação
    const processedItems = [];
    let grossAmount = 0;
    let totalTaxes = 0;

    for (const item of items) {
      const quantity = item.quantity || 1;
      const unitPrice = item.unitPrice || item.amount || 0;
      const amount = roundMoney(quantity * unitPrice);

      grossAmount += amount;

      // 🧮 Calcular tributação do item
      const taxData = await calculateItemTaxes({
        amount,
        isHospitalService: !!item.isHospitalService,
        taxRegime,
        issRate,
      });

      const itemTotal = {
        ...item,
        quantity,
        unitPrice,
        amount,
        ...taxData,
        totalTaxes: roundMoney(
          taxData.irpj.value +
            taxData.csll.value +
            taxData.pis.value +
            taxData.cofins.value +
            taxData.iss.value,
        ),
      };

      totalTaxes += itemTotal.totalTaxes;
      processedItems.push(itemTotal);
    }

    grossAmount = roundMoney(grossAmount);
    discountAmount = roundMoney(discountAmount);
    const netAmount = roundMoney(grossAmount - discountAmount - totalTaxes);

    // 📝 Gerar número da NF
    const invoiceNumber = await generateInvoiceNumber(clinicId);

    // 💾 Criar invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        clinic_id: clinicId,
        appointment_id: appointmentId,
        patient_id: patientId,
        payer_id: payerId,
        payer_type: payerType,
        invoice_number: invoiceNumber,
        gross_amount: grossAmount,
        discount_amount: discountAmount,
        total_taxes: totalTaxes,
        net_amount: netAmount,
        status: INVOICE_STATUS.DRAFT,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Erro ao criar invoice: ${invoiceError.message}`);
    }

    // 💾 Criar invoice_items (se tabela existir)
    try {
      const invoiceItems = processedItems.map((item) => ({
        invoice_id: invoice.id,
        service_id: item.serviceId || null,
        description: item.description,
        amount: item.amount,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        is_hospital_service: !!item.isHospitalService,
        tax_base: item.taxBase || item.amount,
        irpj_value: item.irpj?.value || 0,
        irpj_rate: item.irpj?.rate || 0,
        csll_value: item.csll?.value || 0,
        csll_rate: item.csll?.rate || 0,
        pis_value: item.pis?.value || 0,
        pis_rate: item.pis?.rate || 0,
        cofins_value: item.cofins?.value || 0,
        cofins_rate: item.cofins?.rate || 0,
        iss_value: item.iss?.value || 0,
        iss_rate: item.iss?.rate || issRate,
        total_taxes: item.totalTaxes,
        tax_regime: taxRegime,
        tax_calculated_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

      if (itemsError) {
        console.warn('⚠️ Aviso ao inserir invoice_items:', itemsError.message);
        // Não falhar o fluxo se tabela não existir
      } else {
        console.log(`✅ ${invoiceItems.length} itens criados`);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao criar invoice_items:', err.message);
    }

    // 🎉 Log de sucesso
    console.log('✅ Invoice criada:', {
      id: invoice.id,
      number: invoice.invoice_number,
      items: processedItems.length,
      gross: grossAmount,
      taxes: totalTaxes,
      net: netAmount,
    });

    // 📝 Auditoria
    await logAppointmentFinancialAudit({
      appointmentId,
      financialEventType: FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
      amount: netAmount,
      status: INVOICE_STATUS.DRAFT,
      context: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        gross_amount: grossAmount,
        total_items: processedItems.length,
      },
    }).catch(() => {});

    return {
      invoice,
      items: processedItems,
      totals: {
        gross: grossAmount,
        discount: discountAmount,
        taxes: totalTaxes,
        net: netAmount,
      },
    };
  } catch (err) {
    console.error('❌ Erro ao criar invoice:', err.message);
    throw err;
  }
}

// ============================================================
// 📄 EMITIR INVOICE (Draft → Issued)
// ============================================================

/**
 * Emite invoice (muda status para 'issued')
 * Sem criar AR automaticamente (fica como opção separada)
 *
 * @param {string} invoiceId - ID da invoice
 * @returns {Object} Invoice atualizada
 */
export async function issueInvoice(invoiceId) {
  try {
    if (!invoiceId) {
      throw new Error('Invoice ID obrigatório');
    }

    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: INVOICE_STATUS.ISSUED,
        issue_date: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao emitir: ${updateError.message}`);
    }

    console.log('✅ Invoice emitida:', {
      id: invoice.id,
      number: invoice.invoice_number,
      status: invoice.status,
    });

    return invoice;
  } catch (err) {
    console.error('❌ Erro ao emitir invoice:', err.message);
    throw err;
  }
}

// ============================================================
// 💰 EMITIR INVOICE + CRIAR AR (Integração Completa)
// ============================================================

/**
 * Emite invoice E cria Conta a Receber automaticamente
 * Fluxo completo: Invoice → AR
 *
 * @param {string} invoiceId - ID da invoice
 * @param {Object} options - Opções de AR (opcional)
 * @returns {Object} { invoice, receivable }
 */
export async function issueInvoiceAndCreateReceivable(invoiceId, options = {}) {
  try {
    // 1️⃣ Buscar invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      throw new Error('Invoice não encontrada');
    }

    // 2️⃣ Emitir invoice
    const issued = await issueInvoice(invoiceId);

    // 3️⃣ Criar Conta a Receber canonica em ar_invoices
    const receivable = await createReceivable(invoice.clinic_id, {
      appointment_id: invoice.appointment_id,
      patient_id: invoice.patient_id,
      payer_id: invoice.payer_id,
      payer_type: invoice.payer_type,
      amount: invoice.net_amount,
      net_value: invoice.net_amount,
      gross_amount: invoice.gross_amount,
      taxes_value: invoice.total_taxes,
      description: `Invoice ${invoice.invoice_number}`,
      invoice_date: invoice.issue_date?.split('T')[0] || dateOnly(),
      due_date: invoice.due_date || options.due_date || null,
      status: 'open',
      origem: 'Invoice',
      metadata: {
        ...(options.metadata || {}),
        source: 'invoice_service',
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
      },
      ...options,
    });

    console.log('✅ AR criada:', {
      id: receivable.id,
      amount: receivable.amount,
      status: receivable.status,
    });

    // 📝 Auditoria
    await logReceivableCreated(invoice.appointment_id, receivable.id, receivable.amount, {
      invoice_number: invoice.invoice_number,
      gross_amount: invoice.gross_amount,
      total_taxes: invoice.total_taxes,
    }).catch(() => {});

    return {
      invoice: issued,
      receivable,
    };
  } catch (err) {
    console.error('❌ Erro ao emitir + criar AR:', err.message);
    throw err;
  }
}

// ============================================================
// 📋 CONSULTAR INVOICES
// ============================================================

/**
 * Busca invoice por ID com itens e totais
 *
 * @param {string} invoiceId - ID da invoice
 * @returns {Object} Invoice com detalhes completos
 */
export async function getInvoiceWithDetails(invoiceId) {
  try {
    if (!invoiceId) {
      throw new Error('Invoice ID obrigatório');
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) {
      throw new Error(`Invoice não encontrada: ${error.message}`);
    }

    // Tentar buscar itens (tabela pode não existir)
    let items = [];
    try {
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      items = itemsData || [];
    } catch (e) {
      // Tabela pode não existir
    }

    return {
      ...invoice,
      items,
    };
  } catch (err) {
    console.error('❌ Erro ao buscar invoice:', err.message);
    throw err;
  }
}

/**
 * Lista invoices da clínica com filtros
 *
 * @param {string} clinicId - ID da clínica
 * @param {Object} filters - Filtros opcionais
 *   - status: 'draft' | 'issued' | 'sent' | 'canceled' | 'paid'
 *   - appointmentId: string
 *   - startDate: date string
 *   - endDate: date string
 * @returns {Array} Array de invoices
 */
export async function listInvoices(clinicId, filters = {}) {
  try {
    if (!clinicId) {
      throw new Error('Clinic ID obrigatório');
    }

    let query = supabase.from('invoices').select('*').eq('clinic_id', clinicId);

    if (filters.status && INVOICE_STATUSES.includes(filters.status)) {
      query = query.eq('status', normalizeInvoiceStatus(filters.status));
    }

    if (filters.appointmentId) {
      query = query.eq('appointment_id', filters.appointmentId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

    if (error) {
      throw new Error(`Erro ao listar: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    console.error('❌ Erro ao listar invoices:', err.message);
    throw err;
  }
}

// ============================================================
// 🏥 REGISTRAR PAGAMENTO
// ============================================================

/**
 * Registra pagamento de invoice
 * Atualiza AR e fluxo de caixa
 *
 * @param {string} invoiceId - ID da invoice
 * @param {number} amount - Valor pago
 * @param {string} paymentMethod - 'dinheiro' | 'pix' | 'credito' | 'debito' | 'boleto'
 * @param {Date} paymentDate - Data do pagamento (optional, default: now)
 *
 * @returns {Object} { invoice, receivable, cashMovement }
 */
export async function recordInvoicePayment(
  invoiceId,
  amount,
  paymentMethod,
  paymentDate = new Date(),
) {
  try {
    if (!invoiceId) {
      throw new Error('Invoice ID obrigatório');
    }
    if (!amount || amount <= 0) {
      throw new Error('Valor deve ser maior que 0');
    }
    if (!paymentMethod) {
      throw new Error('Método de pagamento obrigatório');
    }

    // 1️⃣ Buscar invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      throw new Error('Invoice não encontrada');
    }

    // 2️⃣ Baixar AR canonico em ar_invoices
    let receivable = await findReceivableByInvoice(invoice);
    if (receivable) {
      receivable = await registerReceivablePayment({
        clinicId: invoice.clinic_id,
        receivableId: receivable.id,
        amount: roundMoney(amount),
        payments: [{ method: paymentMethod, amount: roundMoney(amount) }],
        paymentDate: dateOnly(paymentDate),
        notes: `Pagamento de ${invoice.invoice_number}`,
        createdBy: 'invoice_service',
      });
    } else {
      console.warn('⚠️ Recebivel canonico nao encontrado para invoice:', invoiceId);
    }

    // 3️⃣ Registrar movimento de caixa
    const { data: cashMovement, error: cashError } = await supabase
      .from('cash_movements')
      .insert({
        clinic_id: invoice.clinic_id,
        type: 'entrada',
        origin: 'invoice',
        method: paymentMethod,
        value: roundMoney(amount),
        invoice_id: invoice.id,
        appointment_id: invoice.appointment_id,
        patient_id: invoice.patient_id,
        description: `Pagamento de ${invoice.invoice_number}`,
        movement_date: paymentDate.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (cashError) {
      console.warn('⚠️ Movimento de caixa não registrado:', cashError.message);
    }

    // 4️⃣ Atualizar invoice para 'paid'
    await supabase
      .from('invoices')
      .update({ status: INVOICE_STATUS.PAID })
      .eq('id', invoiceId)
      .catch(() => {});

    console.log('✅ Pagamento registrado:', {
      invoice: invoice.invoice_number,
      amount: roundMoney(amount),
      method: paymentMethod,
    });

    // 📝 Auditoria
    await logPaymentReceived(
      invoice.appointment_id,
      receivable?.id,
      roundMoney(amount),
      invoice.net_amount,
      'received',
      {
        payment_method: paymentMethod,
        invoice_number: invoice.invoice_number,
      },
    ).catch(() => {});

    return {
      invoice,
      receivable,
      cashMovement,
    };
  } catch (err) {
    console.error('❌ Erro ao registrar pagamento:', err.message);
    throw err;
  }
}

// ============================================================
// 🔧 HELPERS
// ============================================================

/**
 * Gera número sequencial de invoice
 * Formato: YYYY-XXXXXX (ex: 2026-000001)
 */
async function generateInvoiceNumber(clinicId) {
  try {
    const year = new Date().getFullYear();
    const prefix = `${year}-`;

    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('clinic_id', clinicId)
      .ilike('invoice_number', `${prefix}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (data?.invoice_number) {
      const lastNum = parseInt(data.invoice_number.split('-')[1], 10);
      nextNumber = lastNum + 1;
    }

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  } catch (err) {
    console.warn('⚠️ Erro ao gerar número:', err.message);
    return `${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`;
  }
}

/**
 * Valida dados de invoice
 */
export function validateInvoiceData(data) {
  const errors = [];

  if (!data.clinicId) {
    errors.push('Clínica obrigatória');
  }
  if (!data.appointmentId) {
    errors.push('Agendamento obrigatório');
  }
  if (!data.patientId) {
    errors.push('Paciente obrigatório');
  }
  if (!data.payerId) {
    errors.push('Pagador obrigatório');
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Pelo menos 1 item obrigatório');
  }

  data.items?.forEach((item, idx) => {
    if (!item.description) {
      errors.push(`Item ${idx + 1}: descrição obrigatória`);
    }
    if (!item.amount || item.amount <= 0) {
      errors.push(`Item ${idx + 1}: valor deve ser > 0`);
    }
  });

  return errors;
}

// ============================================================
// 📊 EXPORTAR RESUMO
// ============================================================

export const invoiceService = {
  createInvoiceWithItems,
  issueInvoice,
  issueInvoiceAndCreateReceivable,
  getInvoiceWithDetails,
  listInvoices,
  recordInvoicePayment,
  validateInvoiceData,
  INVOICE_STATUS,
};

export default invoiceService;
