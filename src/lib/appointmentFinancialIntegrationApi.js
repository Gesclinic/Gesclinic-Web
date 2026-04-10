/**
 * Appointment Financial Integration API
 * Integra finalizações de atendimentos com:
 * - Produção Médica
 * - Repasse Médico  
 * - Transações Financeiras
 * - Contas a Receber / Guias de Faturamento
 */

import { supabase } from './customSupabaseClient';

/**
 * Quando um atendimento é finalizado, processa automaticamente:
 * 1. Cria registro de produção médica
 * 2. Calcula repasse (70/30)
 * 3. Cria transações financeiras
 * 4. Cria contas a receber ou guia de faturamento
 */
export const finalizeAppointmentWithFinancials = async (appointmentId, financialData = {}) => {
  try {
    console.log('🚀 [finalizeAppointmentWithFinancials] Iniciando...', {
      appointmentId,
      financialData
    });

    // 0️⃣ Buscar dados completos do appointment e paciente
    console.log('📊 Buscando dados completos do appointment...');
    const { data: apt, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id, 
        value, 
        service_id, 
        patient_id,
        clinic_id,
        professional_id,
        appointment_date,
        payer_type,
        health_plan,
        authorization_number,
        card_number,
        guide_number,
        payment_method,
        status
      `)
      .eq('id', appointmentId)
      .single();
    
    if (aptError || !apt) {
      console.error('❌ Appointment não encontrado:', aptError?.message);
      return {
        success: false,
        message: 'Appointment não encontrado',
        error: aptError
      };
    }

    console.log('✅ Appointment carregado:', { id: apt.id, value: apt.value });

    // 🆕 Buscar dados do paciente se não tiverem vindo em financialData
    let patientName = financialData.patient_name;
    let patientEmail = financialData.patient_email;
    let patientCpf = financialData.patient_cpf;
    let patientPhone = financialData.patient_phone;

    if (!patientName || !patientEmail || !patientCpf || !patientPhone) {
      console.log('👤 Buscando dados do paciente...');
      const { data: patient } = await supabase
        .from('patients')
        .select('name, email, cpf, phone')
        .eq('id', apt.patient_id)
        .single();

      if (patient) {
        patientName = patientName || patient.name;
        patientEmail = patientEmail || patient.email;
        patientCpf = patientCpf || patient.cpf;
        patientPhone = patientPhone || patient.phone;
        console.log(`✅ Paciente: ${patientName}`);
      }
    }

    // Determinar valor com prioridade correta
    let appointmentValue = financialData.value || apt.value || 0;
    
    if (!appointmentValue || appointmentValue === 0) {
      console.log('💰 Valor = 0, buscando no serviço...');
      if (apt.service_id) {
        const { data: svc } = await supabase
          .from('services')
          .select('price')
          .eq('id', apt.service_id)
          .single();
        
        if (svc?.price) {
          appointmentValue = svc.price;
          console.log(`   ✅ Valor no serviço: R$ ${appointmentValue}`);
        }
      }
    }

    console.log('📋 Dados finais:', { 
      appointmentId, 
      value: appointmentValue, 
      patientName, 
      payer_type: apt.payer_type 
    });

    // 1️⃣ Chamar função RPC para processamento financeiro
    console.log('💰 [Etapa 1] Processando produção + repasse...');
    const { data: financialResult, error: financialError } = await supabase.rpc(
      'finalize_appointment_financial',
      { 
        p_appointment_id: appointmentId,
        p_appointment_value: appointmentValue
      }
    );

    if (financialError) {
      console.error('❌ Erro ao processar financeiro:', financialError);
      return {
        success: false,
        message: `Erro ao processar dados financeiros: ${financialError.message}`,
        error: financialError
      };
    }

    console.log('✅ Processamento financeiro concluído:', financialResult);

    // 2️⃣ Se houver dados de check-in, criar contas a receber ou guia de faturamento
    if (appointmentValue > 0) {
      console.log('📋 [Etapa 2] Processando documentos (AR/Billing)...');
      const { saveCheckInFinancialData } = await import('./financialCheckInApi');
      
      // Montar dados financeiros completos garantindo todos os campos
      const completeFinancialData = {
        payer_type: apt.payer_type || 'PARTICULAR',
        patient_name: patientName || 'Paciente',
        patient_email: patientEmail,
        patient_cpf: patientCpf,
        patient_phone: patientPhone,
        payment_method: financialData.payment_method || apt.payment_method,
        health_plan: financialData.health_plan || apt.health_plan,
        authorization_number: financialData.authorization_number || apt.authorization_number,
        card_number: financialData.card_number || apt.card_number,
        guide_number: financialData.guide_number || apt.guide_number,
        card_verified: financialData.card_verified || false,
        authorization_verified: financialData.authorization_verified || false,
        value: appointmentValue,
        copayment: financialData.copayment || 0,
        discount: financialData.discount || 0,
      };
      
      const checkInResult = await saveCheckInFinancialData(appointmentId, completeFinancialData);
      
      if (checkInResult.error) {
        console.warn('⚠️  Aviso ao processar check-in:', checkInResult.message);
      } else {
        console.log('✅ Documentos processados:', checkInResult);
      }

      // 🚀 BLOCKER 2 FIX: Auto-create billing guide after AR (if applicable)
      if (checkInResult.type === 'receivable' || appointmentValue > 0) {
        console.log('📝 [AUTO-GUIDE] Tentando criar guia automaticamente...');
        try {
          const { criarGuia } = await import('./guiasApi');
          const guideData = {
            appointment_id: appointmentId,
            paciente_nome: patientName,
            payer_name: apt.payer_type === 'PARTICULAR' ? null : apt.health_plan,
            plan_name: apt.health_plan,
            card_number: apt.card_number,
            professional_name: apt.professional_id ? `Professional ${apt.professional_id}` : null,
            service_code: apt.service_id ? `Service ${apt.service_id}` : null,
            value: appointmentValue,
          };
          
          const guide = await criarGuia(apt.clinic_id, guideData);
          console.log('✅ Guia criada automaticamente:', guide);
          
          return {
            success: true,
            message: '✅ Atendimento finalizado com documentos (AR + Guia)',
            financial: financialResult,
            documents: checkInResult,
            guide: guide
          };
        } catch (guideErr) {
          console.warn('⚠️  Aviso ao criar guia automaticamente:', guideErr.message);
        }
      }

      return {
        success: true,
        message: '✅ Atendimento finalizado com processamento financeiro completo',
        financial: financialResult,
        documents: checkInResult
      };
    }

    return {
      success: true,
      message: '✅ Atendimento finalizado com produção + repasse',
      financial: financialResult
    };

  } catch (error) {
    console.error('❌ Erro em finalizeAppointmentWithFinancials:', error);
    return {
      success: false,
      message: `Erro: ${error.message}`,
      error
    };
  }
};

/**
 * Calcular repasse médico para um período específico
 */
export const calculateMonthlyRepasse = async (clinicId, professionalId, month = new Date()) => {
  try {
    console.log('📊 [calculateMonthlyRepasse] Calculando repasse...', {
      clinicId,
      professionalId,
      month
    });

    const monthDate = month.toISOString().split('T')[0];

    const { data: result, error } = await supabase.rpc(
      'calculate_monthly_repasse',
      {
        p_clinic_id: clinicId,
        p_professional_id: professionalId,
        p_month: monthDate
      }
    );

    if (error) throw error;

    console.log('✅ Repasse calculado:', result);
    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('❌ Erro ao calcular repasse:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * Processar apenas a produção médica
 */
export const processAppointmentProduction = async (appointmentId, appointmentValue = 0) => {
  try {
    console.log('🏥 [processAppointmentProduction] Criando produção médica...', {
      appointmentId,
      appointmentValue
    });

    const { data: result, error } = await supabase.rpc(
      'process_appointment_medical_production',
      {
        p_appointment_id: appointmentId,
        p_appointment_value: appointmentValue
      }
    );

    if (error) throw error;

    console.log('✅ Produção criada:', result);
    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('❌ Erro ao criar produção:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * Reprocessar atendimento (caso tenha sido atualizado)
 * Remove dados antigos e recria com novos valores
 */
export const reprocessAppointmentFinancials = async (appointmentId, financialData = {}) => {
  try {
    console.log('🔄 [reprocessAppointmentFinancials] Reprocessando...', {
      appointmentId,
      financialData
    });

    // 1️⃣ Obter dados do appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('id, clinic_id, professional_id, appointment_date, value')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      throw new Error('Aparecimento não encontrado');
    }

    // 2️⃣ Remover registros antigos
    console.log('🗑️  Removendo registros anteriores...');
    
    await Promise.all([
      supabase
        .from('medical_production')
        .delete()
        .eq('atendimento_id', appointmentId),
      
      supabase
        .from('financial_transactions')
        .delete()
        .eq('appointment_id', appointmentId)
        .eq('category', 'appointment')
    ]);

    console.log('✅ Registros removidos');

    // 3️⃣ Reprocessar
    return await finalizeAppointmentWithFinancials(appointmentId, financialData);

  } catch (error) {
    console.error('❌ Erro ao reprocessar:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

/**
 * Dashboard: Resumo de produção e repasse
 */
export const getProductionAndRepasseSummary = async (clinicId, month = new Date()) => {
  try {
    const monthStr = month.toISOString().slice(0, 7); // YYYY-MM
    const start = monthStr + '-01';
    const end = new Date(new Date(monthStr + '-01').setMonth(
      new Date(monthStr + '-01').getMonth() + 1
    )).toISOString().slice(0, 10);

    // Produção
    const { data: production, error: prodError } = await supabase
      .from('medical_production')
      .select('professional_id, valor_bruto, valor_liquido')
      .eq('clinic_id', clinicId)
      .gte('data_atendimento', start)
      .lt('data_atendimento', end);

    // Repassos
    const { data: repassos, error: repError } = await supabase
      .from('medical_repasse')
      .select('professional_id, valor_profissional, valor_clinica')
      .eq('clinic_id', clinicId)
      .gte('periodo_inicio', start)
      .lt('periodo_fim', end);

    if (prodError || repError) throw prodError || repError;

    // Agregar por profissional
    const summary = {};
    
    (production || []).forEach(p => {
      if (!summary[p.professional_id]) {
        summary[p.professional_id] = {
          producao_bruta: 0,
          producao_liquida: 0,
          repasse_prof: 0,
          repasse_clinic: 0
        };
      }
      summary[p.professional_id].producao_bruta += p.valor_bruto;
      summary[p.professional_id].producao_liquida += p.valor_liquido;
    });

    (repassos || []).forEach(r => {
      if (!summary[r.professional_id]) {
        summary[r.professional_id] = {
          producao_bruta: 0,
          producao_liquida: 0,
          repasse_prof: 0,
          repasse_clinic: 0
        };
      }
      summary[r.professional_id].repasse_prof += r.valor_profissional;
      summary[r.professional_id].repasse_clinic += r.valor_clinica;
    });

    return {
      success: true,
      month: monthStr,
      summary
    };

  } catch (error) {
    console.error('❌ Erro ao get summary:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};
