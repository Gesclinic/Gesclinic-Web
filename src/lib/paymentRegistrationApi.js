/**
 * Payment Registration & Accounts Integration
 *
 * Integra pagamento com:
 * - Contas a Receber canonicas (ar_invoices/receivable_payments)
 * - Plano de Contas (chart_of_accounts)
 * - Caixa (cash_register)
 * - Auditoria (financial_audits)
 */

import { supabase } from '@/lib/customSupabaseClient';
import { createReceivable, registerReceivablePayment } from '@/lib/receivablesApi';
import { getAccountingAccountForPayment } from '@/lib/paymentMethodsConfig';
import cashDrawerApi from '@/lib/cashDrawerApi';

function normalizeCashPaymentMethod(paymentMethod) {
  const method = String(paymentMethod || '').toUpperCase();

  if (['DINHEIRO', 'CARTAO', 'PIX', 'CHEQUE'].includes(method)) {
    return method;
  }

  if (['BOLETO'].includes(method)) {
    return 'CHEQUE';
  }

  if (['DOC', 'TED', 'DEPOSITO', 'TRANSFERENCIA', 'BANCO'].includes(method)) {
    return 'BANCO';
  }

  return 'DINHEIRO';
}

function buildPaymentMethodsForReceivable(paymentMethod, amount, paymentData = {}) {
  const splitRows = Array.isArray(paymentData?.payment_splits) ? paymentData.payment_splits : [];
  const normalizedSplits = splitRows
    .map((split) => ({
      method: split.payment_method || split.method || paymentMethod,
      amount: Number(split.value ?? split.amount ?? 0),
      reference: split.pix_transaction_id || split.cheque_number || split.boleto_number || split.reference || null,
      installments: split.installments || null,
      installment_dates: split.card_installment_dates || null,
      payment_due_date: split.payment_due_date || split.cheque_due_date || null,
      card_brand: split.card_brand || null,
      observation: split.observation || null,
    }))
    .filter((split) => split.method && split.amount > 0);

  if (normalizedSplits.length > 0) {
    return normalizedSplits;
  }

  const paymentReference = paymentData?.reference
    || paymentData?.transaction_id
    || paymentData?.authorization_code
    || paymentData?.nsu
    || null;

  return [{
    method: paymentMethod,
    amount: Number(amount || 0),
    reference: paymentReference,
    installments: paymentData?.installments || null,
    installment_dates: paymentData?.card_installment_dates || null,
    payment_due_date: paymentData?.payment_due_date || null,
    card_brand: paymentData?.card_brand || null,
    observation: paymentData?.observation || paymentData?.notes || null,
  }];
}

/**
 * 1️⃣ CRIAR/ATUALIZAR CONTA A RECEBER
 * Registra o pagamento como conta a receber ou marca como recebida
 */
export async function registerOrUpdateReceivable({
  clinicId,
  appointmentId,
  patientId,
  amount,
  paymentMethod,
  paymentData,
  receivedBy, // ID do operador/caixa
  appointmentDetails = null,
}) {
  try {
    console.log('💰 Registrando conta a receber...', {
      appointmentId,
      amount,
      paymentMethod,
      receivedBy,
    });

    // Verificar se ja existe conta a receber canonica para este agendamento
    const { data: existing, error: existingError } = await supabase
      .from('ar_invoices')
      .select('id, status, amount, net_value, received_value, paid_total')
      .eq('clinic_id', clinicId)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (normal)
      console.error('❌ Erro ao buscar conta existente:', existingError);
      throw new Error(`Erro de autorização ao buscar conta: ${existingError.message}`);
    }

    const now = new Date().toISOString();
    const paymentDate = now.split('T')[0];
    const paymentAmount = Number(amount || 0);
    const receivablePayments = buildPaymentMethodsForReceivable(paymentMethod, paymentAmount, paymentData);
    const patientName = appointmentDetails?.patientName || paymentData?.patientName || null;
    const serviceName = appointmentDetails?.serviceName || paymentData?.serviceName || null;
    const totalInstallments = Math.max(
      0,
      ...receivablePayments.map((payment) => Number.parseInt(payment.installments || 0, 10) || 0),
    );
    const receivableDescription = serviceName && patientName
      ? `${serviceName} - ${patientName}`
      : patientName
        ? `Recebimento de ${patientName}`
        : 'Recebimento registrado pela agenda';

    if (existing) {
      // Baixar conta existente no fluxo canonico
      console.log('📝 Atualizando conta a receber existente:', existing.id);

      if (paymentAmount <= 0) {
        return existing;
      }

      return registerReceivablePayment({
        clinicId,
        receivableId: existing.id,
        receivable: existing,
        amount: paymentAmount,
        paymentDate,
        payments: receivablePayments,
        notes: paymentData?.notes || 'Pagamento registrado pela agenda',
        createdBy: receivedBy || 'system',
      });
    }

    // Criar nova conta a receber canonica
    console.log('✨ Criando nova conta a receber', { clinicId, appointmentId, amount });

    const created = await createReceivable(clinicId, {
      appointment_id: appointmentId,
      patient_id: patientId,
      patient_name: patientName,
      payer_name: patientName,
      payer_type: 'PARTICULAR',
      payer_id: appointmentDetails?.payerId || paymentData?.payerId || null,
      professional_id: appointmentDetails?.professionalId || paymentData?.professionalId || null,
      professional_name: appointmentDetails?.professionalName || paymentData?.professionalName || null,
      amount: paymentAmount,
      net_value: paymentAmount,
      status: 'open',
      due_date: paymentDate,
      payment_method: paymentMethod,
      payment_split: receivablePayments,
      total_parcelas: totalInstallments > 1 ? totalInstallments : null,
      description: receivableDescription,
      service_description: serviceName || receivableDescription,
      procedure_name: serviceName,
      service_group: appointmentDetails?.serviceGroup || paymentData?.serviceGroup || null,
      specialty_name: appointmentDetails?.specialtyName || paymentData?.specialtyName || null,
      unit_id: appointmentDetails?.unitId || paymentData?.unitId || null,
      unit_name: appointmentDetails?.unitName || appointmentDetails?.roomName || paymentData?.unitName || paymentData?.roomName || null,
      metadata: {
        source: 'payment_registration_api',
        payment_data: paymentData || {},
        appointment: appointmentDetails || {},
        received_by: receivedBy || null,
        received_at: now,
      },
    });

    if (paymentAmount <= 0) {
      return created;
    }

    const receivable = await registerReceivablePayment({
      clinicId,
      receivableId: created.id,
      receivable: created,
      amount: paymentAmount,
      paymentDate,
      payments: receivablePayments,
      notes: paymentData?.notes || 'Pagamento registrado pela agenda',
      createdBy: receivedBy || 'system',
    });

    console.log('✅ Conta a receber registrada:', receivable.id);
    return receivable;
  } catch (error) {
    console.error('❌ Erro ao registrar conta a receber:', error);
    throw error;
  }
}

/**
 * 2️⃣ REGISTRAR LANÇAMENTO NO PLANO DE CONTAS
 * Cria entrada contábil para o pagamento
 */
export async function recordFinancialEntry({
  clinicId,
  appointmentId,
  amount,
  paymentMethod,
  description,
  cashRegisterId = null,
}) {
  try {
    console.log('📊 Registrando lançamento contábil...', {
      appointmentId,
      amount,
      paymentMethod,
    });

    const accountingAccount = getAccountingAccountForPayment(paymentMethod);
    const now = new Date().toISOString();

    // Mapear forma de pagamento para conta contábil
    const accountMap = {
      CAIXA: '1.1.1.01', // Ativo > Caixa
      CARTAO_RECEBER: '1.1.2.01', // Ativo > Cartões a Receber
      PIX_RECEBER: '1.1.2.02', // Ativo > PIX a Receber
      CHEQUES_RECEBER: '1.1.2.03', // Ativo > Cheques a Receber
      BOLETOS_RECEBER: '1.1.2.04', // Ativo > Boletos a Receber
    };

    const chartAccount = accountMap[accountingAccount] || '1.1.1.01';

    const entryData = {
      clinic_id: clinicId,
      appointment_id: appointmentId,
      chart_account: chartAccount,
      debit_amount: amount, // Débito = receita entra (aumenta ativo)
      credit_amount: 0,
      description:
        description || `Recebimento via ${paymentMethod} - Agendamento #${appointmentId}`,
      entry_date: now,
      entry_type: 'RECEIPT',
      payment_method: paymentMethod,
      cash_register_id: cashRegisterId,
    };

    const { data: existingEntry, error: existingError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('appointment_id', appointmentId)
      .eq('entry_type', 'RECEIPT')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    const query = existingEntry
      ? supabase.from('journal_entries').update(entryData).eq('id', existingEntry.id)
      : supabase.from('journal_entries').insert({
          ...entryData,
          created_at: now,
        });

    const { data, error } = await query.select().single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Record not found');
    }

    console.log('✅ Lançamento contábil registrado:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Erro ao registrar lançamento contábil:', error);
    throw error;
  }
}

/**
 * 3️⃣ REGISTRAR NO CAIXA
 * Atualiza o saldo do caixa e registra quem recebeu
 */
export async function recordToCashRegister({
  clinicId,
  amount,
  paymentMethod,
  receivedBy, // ID do operador
  appointmentDetails = null,
}) {
  try {
    console.log('💵 Registrando no caixa...', {
      clinicId,
      amount,
      paymentMethod,
      receivedBy,
    });

    const now = new Date().toISOString();

    // Obter ou criar caixa do dia
    const today = new Date().toISOString().split('T')[0];

    const { data: cashSession, error: cashError } = await supabase
      .from('cash_register_sessions')
      .select('id, opening_balance, current_balance')
      .eq('clinic_id', clinicId)
      .eq('session_date', today)
      .eq('status', 'open')
      .maybeSingle();

    // PGRST116 = no rows (normal), outros erros = problema
    if (cashError && cashError.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar caixa: ${cashError.message}`);
    }

    let sessionId;

    if (cashSession) {
      sessionId = cashSession.id;
      // Atualizar saldo
      const newBalance = (parseFloat(cashSession.current_balance) || 0) + parseFloat(amount);
      await supabase
        .from('cash_register_sessions')
        .update({ current_balance: newBalance })
        .eq('id', sessionId);
    } else {
      // Criar novo caixa do dia
      const { data: newSession, error: sessionError } = await supabase
        .from('cash_register_sessions')
        .insert({
          clinic_id: clinicId,
          session_date: today,
          opening_balance: 0,
          current_balance: amount,
          status: 'open',
          opened_at: now,
        })
        .select('id');

      if (sessionError) {
        throw sessionError;
      }

      if (!newSession || newSession.length === 0) {
        throw new Error('Record not found');
      }

      sessionId = newSession[0].id;
    }

    // Registrar movimento específico
    const { data: movement, error: movementError } = await supabase
      .from('cash_register_movements')
      .insert({
        cash_session_id: sessionId,
        clinic_id: clinicId,
        movement_type: 'INCOME', // Receita
        amount: amount,
        payment_method: paymentMethod,
        received_by: receivedBy,
        created_by: receivedBy,
        description: appointmentDetails?.patientName
          ? `Recebimento de ${appointmentDetails.patientName} - ${paymentMethod}`
          : `Recebimento via ${paymentMethod}`,
        recorded_at: now,
      })
      .select();

    if (movementError) {
      throw movementError;
    }

    if (!movement || movement.length === 0) {
      throw new Error('Record not found');
    }

    console.log('✅ Caixa atualizado:', { sessionId, movementId: movement[0].id });
    return { sessionId, movementId: movement[0].id };
  } catch (error) {
    console.error('❌ Erro ao registrar no caixa:', error);
    throw error;
  }
}

async function recordToOperatorCashDrawer({
  clinicId,
  appointmentId,
  patientId,
  amount,
  paymentMethod,
  paymentData,
  receivedBy,
  appointmentDetails = null,
}) {
  if (!clinicId || !receivedBy || !appointmentId) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const drawer = await cashDrawerApi.getOrCreateDrawer(clinicId, receivedBy, today);
  const patientName = appointmentDetails?.patientName || paymentData?.patientName || null;
  const serviceName = appointmentDetails?.serviceName || paymentData?.serviceName || null;
  const baseDescription = [
    `Atendimento #${appointmentId}`,
    patientName ? `Paciente: ${patientName}` : null,
    serviceName ? `Serviço: ${serviceName}` : null,
  ].filter(Boolean).join(' - ');

  const paymentsByMethod = buildPaymentMethodsForReceivable(paymentMethod, amount, paymentData).reduce(
    (acc, payment) => {
      const method = normalizeCashPaymentMethod(payment.method || paymentMethod);
      acc[method] = (acc[method] || 0) + Number(payment.amount || 0);
      return acc;
    },
    {},
  );

  const registeredMovements = [];

  for (const [cashMethod, paymentAmount] of Object.entries(paymentsByMethod)) {
    if (paymentAmount <= 0) {
      continue;
    }

    const description = `${baseDescription} - ${cashMethod}`;

    const { data: existingDrawerMovement, error: drawerLookupError } = await supabase
      .from('drawer_movements')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('drawer_id', drawer.id)
      .eq('appointment_id', appointmentId)
      .eq('payment_method', cashMethod)
      .eq('payment_type', 'entrada')
      .limit(1)
      .maybeSingle();

    if (drawerLookupError && drawerLookupError.code !== 'PGRST116') {
      throw drawerLookupError;
    }

    const drawerPayload = {
      drawer_id: drawer.id,
      clinic_id: clinicId,
      appointment_id: appointmentId,
      payment_method: cashMethod,
      payment_type: 'entrada',
      amount: paymentAmount,
      description,
    };

    const drawerQuery = existingDrawerMovement
      ? supabase.from('drawer_movements').update(drawerPayload).eq('id', existingDrawerMovement.id)
      : supabase.from('drawer_movements').insert(drawerPayload);

    const { data: drawerMovement, error: drawerError } = await drawerQuery.select('id').single();

    if (drawerError) {
      throw drawerError;
    }

    const { data: existingCashMovement, error: cashLookupError } = await supabase
      .from('cash_movements')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('drawer_id', drawer.id)
      .eq('origin', 'agenda')
      .eq('payment_method', cashMethod)
      .eq('description', description)
      .limit(1)
      .maybeSingle();

    if (cashLookupError && cashLookupError.code !== 'PGRST116') {
      throw cashLookupError;
    }

    const cashPayload = {
      drawer_id: drawer.id,
      clinic_id: clinicId,
      type: 'entrada',
      amount: paymentAmount,
      patient_id: patientId || null,
      professional_id: appointmentDetails?.professionalId || paymentData?.professionalId || null,
      payer_type: appointmentDetails?.payerId || paymentData?.payerId ? 'convenio' : 'particular',
      payer_id: appointmentDetails?.payerId || paymentData?.payerId || null,
      status: 'confirmado',
      payment_method: cashMethod,
      description,
      origin: 'agenda',
      created_by: receivedBy,
    };

    const cashQuery = existingCashMovement
      ? supabase.from('cash_movements').update(cashPayload).eq('id', existingCashMovement.id)
      : supabase.from('cash_movements').insert(cashPayload);

    const { data: cashMovement, error: cashError } = await cashQuery.select('id').single();

    if (cashError) {
      throw cashError;
    }

    registeredMovements.push({
      drawerId: drawer.id,
      drawerMovementId: drawerMovement?.id || null,
      cashMovementId: cashMovement?.id || null,
      paymentMethod: cashMethod,
      amount: paymentAmount,
    });
  }

  return {
    drawerId: drawer.id,
    movements: registeredMovements,
  };
}

/**
 * 4️⃣ REGISTRAR AUDITORIA
 * Log completo para rastreabilidade
 */
export async function auditPaymentRecord({
  clinicId,
  appointmentId,
  patientId,
  amount,
  paymentMethod,
  paymentDetails,
  performedBy, // ID do operador que registrou
  action = 'PAYMENT_RECORDED',
}) {
  try {
    console.log('🔍 Registrando auditoria...', {
      appointmentId,
      amount,
      action,
    });

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('financial_audits')
      .insert({
        clinic_id: clinicId,
        appointment_id: appointmentId,
        patient_id: patientId,
        action: action,
        amount: amount,
        payment_method: paymentMethod,
        object_data: JSON.stringify(paymentDetails),
        performed_by: performedBy,
        performed_at: now,
        ip_address: null, // Pode capturar do navegador se necessário
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      .select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }

    console.log('✅ Auditoria registrada:', data[0].id);
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao registrar auditoria:', error);
    throw error;
  }
}

/**
 * 5️⃣ PROCESSAR PAGAMENTO COMPLETO
 * Orquestra todos os registros acima
 */
export async function processPaymentComplete({
  clinicId,
  appointmentId,
  patientId,
  amount,
  paymentMethod,
  paymentData,
  operatorId, // Quem recebeu
  appointmentDetails = null,
}) {
  try {
    console.log('🚀 Iniciando processamento completo de pagamento...');

    // 1. Registrar/atualizar conta a receber
    const receivable = await registerOrUpdateReceivable({
      clinicId,
      appointmentId,
      patientId,
      amount,
      paymentMethod,
      paymentData,
      receivedBy: operatorId,
      appointmentDetails,
    });

    // 2. Registrar lançamento contábil
    const financialEntry = await recordFinancialEntry({
      clinicId,
      appointmentId,
      amount,
      paymentMethod,
      description: appointmentDetails?.patientName
        ? `Recebimento de ${appointmentDetails.patientName}`
        : undefined,
    });

    // 3. Registrar no caixa (complementar; nao bloqueia o financeiro principal)
    let cashEntry = null;
    let cashWarning = null;
    try {
      cashEntry = await recordToCashRegister({
        clinicId,
        amount,
        paymentMethod,
        receivedBy: operatorId,
        appointmentDetails,
      });
    } catch (cashError) {
      cashWarning = cashError?.message || 'Falha ao registrar no caixa';
      console.warn('⚠️ Caixa nao registrado, financeiro principal mantido:', cashWarning);
    }

    let operatorCashEntry = null;
    let operatorCashWarning = null;
    try {
      operatorCashEntry = await recordToOperatorCashDrawer({
        clinicId,
        appointmentId,
        patientId,
        amount,
        paymentMethod,
        paymentData,
        receivedBy: operatorId,
        appointmentDetails,
      });
    } catch (operatorCashError) {
      operatorCashWarning = operatorCashError?.message || 'Falha ao registrar no caixa individual';
      console.warn('⚠️ Caixa individual nao registrado, financeiro principal mantido:', operatorCashWarning);
    }

    // 4. Registrar auditoria (complementar; nao bloqueia o financeiro principal)
    let audit = null;
    let auditWarning = null;
    try {
      audit = await auditPaymentRecord({
        clinicId,
        appointmentId,
        patientId,
        amount,
        paymentMethod,
        paymentDetails: paymentData,
        performedBy: operatorId,
      });
    } catch (auditError) {
      auditWarning = auditError?.message || 'Falha ao registrar auditoria';
      console.warn('⚠️ Auditoria nao registrada, financeiro principal mantido:', auditWarning);
    }

    console.log('✅ Pagamento processado com sucesso!', {
      receivableId: receivable.id,
      entryId: financialEntry.id,
      cashMovementId: cashEntry?.movementId || null,
      operatorCashDrawerId: operatorCashEntry?.drawerId || null,
      auditId: audit?.id || null,
    });

    return {
      receivableId: receivable.id,
      entryId: financialEntry.id,
      cashMovementId: cashEntry?.movementId || null,
      operatorCashDrawerId: operatorCashEntry?.drawerId || null,
      operatorCashMovements: operatorCashEntry?.movements || [],
      auditId: audit?.id || null,
      warnings: [cashWarning, operatorCashWarning, auditWarning].filter(Boolean),
      success: true,
    };
  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 6️⃣ LISTAR MOVIMENTOS DO CAIXA (para fechamento)
 */
export async function getCashRegisterMovements(clinicId, sessionDate) {
  try {
    const { data, error } = await supabase
      .from('cash_register_movements')
      .select(
        `
        *,
        operator:received_by(id, name)
      `,
      )
      .eq('clinic_id', clinicId)
      .filter('recorded_at', 'gte', sessionDate)
      .order('recorded_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao listar movimentos do caixa:', error);
    return [];
  }
}

/**
 * 7️⃣ FECHAR CAIXA
 * Finaliza caixa do dia e gera relatório
 */
export async function closeCashRegister(sessionId, closedBy, discrepancy = 0) {
  try {
    console.log('🔐 Fechando caixa...', { sessionId });

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .update({
        status: 'closed',
        closed_at: now,
        closed_by: closedBy,
        discrepancy: discrepancy,
      })
      .eq('id', sessionId)
      .select();

    if (!data || data.length === 0) {
      throw new Error('Record not found');
    }
    return data[0];

    if (error) {
      throw error;
    }

    console.log('✅ Caixa fechado:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Erro ao fechar caixa:', error);
    throw error;
  }
}
