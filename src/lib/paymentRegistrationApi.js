/**
 * Payment Registration & Accounts Integration
 *
 * Integra pagamento com:
 * - Contas a Receber (accounts_receivable)
 * - Plano de Contas (chart_of_accounts)
 * - Caixa (cash_register)
 * - Auditoria (financial_audits)
 */

import { supabase } from '@/lib/customSupabaseClient';
import {
  getAccountingAccountForPayment,
  getReceivableTypeForPayment,
  PAYMENT_METHODS,
} from '@/lib/paymentMethodsConfig';

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
}) {
  try {
    console.log('💰 Registrando conta a receber...', {
      appointmentId,
      amount,
      paymentMethod,
      receivedBy,
    });

    // Verificar se já existe conta a receber para este agendamento
    const { data: existing, error: existingError } = await supabase
      .from('accounts_receivable')
      .select('id, status, amount_remaining')
      .eq('appointment_id', appointmentId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (normal)
      console.error('❌ Erro ao buscar conta existente:', existingError);
      throw new Error(`Erro de autorização ao buscar conta: ${existingError.message}`);
    }

    const receivableType = getReceivableTypeForPayment(paymentMethod);
    const now = new Date().toISOString();

    let receivable;

    if (existing) {
      // Atualizar conta existente
      console.log('📝 Atualizando conta a receber existente:', existing.id);

      const { data, error } = await supabase
        .from('accounts_receivable')
        .update({
          status: 'received',
          amount_received: amount,
          amount_remaining: 0,
          payment_method: paymentMethod,
          received_by: receivedBy,
          received_at: now,
          payment_details: JSON.stringify(paymentData),
          updated_at: now,
        })
        .eq('id', existing.id)
        .select();


      if (error) {
        console.error('❌ Erro UPDATE accounts_receivable:', error);
        throw new Error(`Falha ao atualizar conta: ${error.message}. Verifique RLS policies.`);
      }
      receivable = data;
    } else {
      // Criar nova conta a receber
      console.log('✨ Criando nova conta a receber', { clinicId, appointmentId, amount });

      const { data, error } = await supabase
        .from('accounts_receivable')
        .insert({
          clinic_id: clinicId,
          appointment_id: appointmentId,
          patient_id: patientId,
          amount: amount,
          amount_received: amount,
          amount_remaining: 0,
          status: 'received',
          receivable_type: receivableType,
          payment_method: paymentMethod,
          received_by: receivedBy,
          received_at: now,
          payment_details: JSON.stringify(paymentData),
          due_date: now,
          created_at: now,
          updated_at: now,
        })
        .select();


      if (error) {
        console.error('❌ Erro INSERT accounts_receivable:', error);
        console.error('📋 Detalhes:', { code: error.code, message: error.message });
        throw new Error(
          `Falha ao criar conta: ${error.message}. Verifique RLS policies. (${error.code})`,
        );
      }
      receivable = data;
    }

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

    // Criar lançamento (assuming journal_entries table exists)
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
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
        created_at: now,
      })
      .select();


    if (error) {
      throw error;
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
      sessionId = newSession.id;
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
        description: appointmentDetails?.patientName
          ? `Recebimento de ${appointmentDetails.patientName} - ${paymentMethod}`
          : `Recebimento via ${paymentMethod}`,
        recorded_at: now,
      })
      .select();


    if (movementError) {
      throw movementError;
    }

    console.log('✅ Caixa atualizado:', { sessionId, movementId: movement.id });
    return { sessionId, movementId: movement.id };
  } catch (error) {
    console.error('❌ Erro ao registrar no caixa:', error);
    throw error;
  }
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

    console.log('✅ Auditoria registrada:', data.id);
    return data;
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

    // 3. Registrar no caixa
    const cashEntry = await recordToCashRegister({
      clinicId,
      amount,
      paymentMethod,
      receivedBy: operatorId,
      appointmentDetails,
    });

    // 4. Registrar auditoria
    const audit = await auditPaymentRecord({
      clinicId,
      appointmentId,
      patientId,
      amount,
      paymentMethod,
      paymentDetails: paymentData,
      performedBy: operatorId,
    });

    console.log('✅ Pagamento processado com sucesso!', {
      receivableId: receivable.id,
      entryId: financialEntry.id,
      cashMovementId: cashEntry.movementId,
      auditId: audit.id,
    });

    return {
      receivableId: receivable.id,
      entryId: financialEntry.id,
      cashMovementId: cashEntry.movementId,
      auditId: audit.id,
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
