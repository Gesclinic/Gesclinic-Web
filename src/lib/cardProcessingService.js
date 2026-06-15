/**
 * cardProcessingService.js
 * 
 * Serviço de processamento de pagamentos por cartão
 * - Calcula datas de recebimento baseado em tipo de liquidação
 * - Aplica taxas de cartão conforme bandeira
 * - Gera múltiplas contas a receber para parcelas
 */

import { supabase } from './customSupabaseClient';

/**
 * Busca as taxas de processamento para um cartão específico
 * @param {string} clinicId - ID da clínica
 * @param {string} brand - Bandeira (VISA, MASTERCARD, etc)
 * @returns {Promise<Array>} Array com taxas para cada settlement_type
 */
export async function getCardFees(clinicId, brand) {
  try {
    const { data, error } = await supabase
      .from('card_processing_fees')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('brand', brand)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Erro ao buscar taxas de cartão:', error);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('❌ Erro ao buscar taxas de cartão:', err);
    return null;
  }
}

/**
 * Calcula a data de recebimento baseado na configuração do cartão
 * @param {object} cardConfig - Configuração do cartão (clinic_payment_cards)
 * @param {string} settlementType - Tipo de liquidação (immediate, next_day, scheduled, payment_day)
 * @param {Date} appointmentDate - Data do agendamento/vencimento
 * @returns {Date} Data de recebimento calculada
 */
export function calculateReceiptDate(cardConfig, settlementType, appointmentDate = null) {
  const baseDate = appointmentDate ? new Date(appointmentDate) : new Date();
  let receiptDate = new Date(baseDate);

  switch (settlementType) {
    case 'immediate':
      // D+0: Mesmo dia (mantém a data)
      break;

    case 'next_day':
      // D+1: Próximo dia útil
      receiptDate.setDate(receiptDate.getDate() + 1);
      // Pular fins de semana se necessário
      while (receiptDate.getDay() === 0 || receiptDate.getDay() === 6) {
        receiptDate.setDate(receiptDate.getDate() + 1);
      }
      break;

    case 'scheduled':
      // D+30: 30 dias
      receiptDate.setDate(receiptDate.getDate() + 30);
      break;

    case 'payment_day':
      // Conforme payment_day do cartão
      // Exemplo: se payment_day = 15, recebe no dia 15 do mês
      if (cardConfig?.payment_day) {
        const currentDate = new Date(baseDate);
        const paymentDay = cardConfig.payment_day;
        
        receiptDate.setDate(paymentDay);

        // Se o dia de pagamento já passou este mês, vai pro próximo
        if (receiptDate < currentDate) {
          receiptDate.setMonth(receiptDate.getMonth() + 1);
          receiptDate.setDate(paymentDay);
        }
      }
      break;

    default:
      // Padrão: D+1
      receiptDate.setDate(receiptDate.getDate() + 1);
  }

  return receiptDate;
}

/**
 * Calcula o valor com taxa aplicada
 * @param {number} originalValue - Valor original
 * @param {number} feePercentage - Percentual de taxa
 * @returns {object} {grossValue, feeAmount, netValue}
 */
export function applyCardFee(originalValue, feePercentage) {
  const feeAmount = (originalValue * feePercentage) / 100;
  const netValue = originalValue - feeAmount;

  return {
    grossValue: originalValue,
    feePercentage,
    feeAmount: parseFloat(feeAmount.toFixed(2)),
    netValue: parseFloat(netValue.toFixed(2)),
  };
}

/**
 * Gera múltiplas datas de parcelas baseado em número de instalações
 * @param {Date} firstPaymentDate - Data da primeira parcela
 * @param {number} numInstallments - Número de parcelas
 * @param {number} daysBetweenInstallments - Dias entre parcelas (default: 30)
 * @returns {Array<string>} Array com datas ISO (YYYY-MM-DD)
 */
export function generateInstallmentDates(
  firstPaymentDate,
  numInstallments = 1,
  daysBetweenInstallments = 30
) {
  const dates = [];
  let currentDate = new Date(firstPaymentDate);

  for (let i = 0; i < numInstallments; i++) {
    const dateString = currentDate.toISOString().split('T')[0];
    dates.push(dateString);

    // Próxima parcela
    if (i < numInstallments - 1) {
      currentDate.setDate(currentDate.getDate() + daysBetweenInstallments);
    }
  }

  return dates;
}

/**
 * Calcula todas as informações de processamento de cartão
 * @param {object} params - Parâmetros
 * @returns {Promise<object>} Objeto com cálculos completos
 */
export async function calculateCardProcessing({
  clinicId,
  cardBrand,
  cardConfig, // clinic_payment_cards record
  serviceValue,
  numInstallments = 1,
  appointmentDate,
  settlementType = 'next_day', // immediate, next_day, scheduled, payment_day
}) {
  try {
    // 1. Buscar taxa aplicável
    const fees = await getCardFees(clinicId, cardBrand);
    if (!fees || fees.length === 0) {
      console.warn(`⚠️ Nenhuma taxa configurada para ${cardBrand}`);
      return null;
    }

    // 2. Encontrar taxa para o settlement_type
    let featureConfig = fees.find((f) => f.settlement_type === settlementType);

    // Se não encontrar o tipo exato, usar default
    if (!featureConfig) {
      featureConfig = fees.find((f) => f.settlement_type === 'next_day');
    }

    if (!featureConfig) {
      console.warn(
        `⚠️ Nenhuma taxa padrão configurada para ${cardBrand}. Usando taxa 0%`
      );
      featureConfig = {
        fee_percentage: 0,
      };
    }

    // 3. Aplicar taxa
    const feeCalculation = applyCardFee(serviceValue, featureConfig.fee_percentage);

    // 4. Calcular data de recebimento
    const receiptDate = calculateReceiptDate(cardConfig, settlementType, appointmentDate);

    // 5. Gerar datas de parcelas
    const installmentDates = generateInstallmentDates(
      receiptDate,
      numInstallments,
      30 // 30 dias entre parcelas
    );

    // 6. Calcular valor de cada parcela
    const installmentValue = (feeCalculation.netValue / numInstallments).toFixed(2);

    // Retornar resultado
    return {
      success: true,
      cardBrand,
      settlementType,
      feePercentage: featureConfig.fee_percentage,
      
      // Valores
      serviceValue: parseFloat(serviceValue.toFixed(2)),
      cardFeeAmount: feeCalculation.feeAmount,
      netValue: feeCalculation.netValue,
      
      // Parcelas
      numInstallments,
      installmentValue: parseFloat(installmentValue),
      installmentDates,
      
      // Primeira parcela
      firstPaymentDate: installmentDates[0],
      receiptDate: receiptDate.toISOString().split('T')[0],
      
      // Metadata
      cardConfig,
      notes: `${cardBrand} - ${settlementType} - Taxa: ${featureConfig.fee_percentage}%`,
    };
  } catch (err) {
    console.error('❌ Erro ao calcular processamento de cartão:', err);
    return null;
  }
}

/**
 * Cria múltiplas contas a receber (ARs) para cada parcela
 * @param {object} params - Parâmetros
 * @returns {Promise<Array>} Array com IDs das ARs criadas
 */
export async function createCardInstallmentARs({
  clinicId,
  appointmentId,
  patientId,
  patiendName,
  serviceValue,
  cardBrand,
  cardConfig,
  numInstallments,
  settlementType,
  discount = 0,
  appointmentDate,
}) {
  try {
    // 1. Calcular processamento
    const processing = await calculateCardProcessing({
      clinicId,
      cardBrand,
      cardConfig,
      serviceValue,
      numInstallments,
      appointmentDate,
      settlementType,
    });

    if (!processing?.success) {
      throw new Error('Falha ao calcular processamento de cartão');
    }

    // 2. Criar uma AR para cada parcela
    const createdARs = [];

    for (let i = 0; i < processing.numInstallments; i++) {
      const dueDate = processing.installmentDates[i];
      const installmentNumber = i + 1;

      const arPayload = {
        clinic_id: clinicId,
        patient_id: patientId,
        patient_name: patiendName,
        appointment_id: appointmentId,
        
        // Valores
        service_value: parseFloat(processing.installmentValue),
        discount_value: discount > 0 ? (discount / numInstallments).toFixed(2) : 0,
        discount_percent: discount > 0 ? ((discount / serviceValue) * 100).toFixed(2) : 0,
        
        // Cálculo líquido
        net_value: parseFloat(processing.installmentValue),
        
        // Datas
        invoice_date: appointmentDate || new Date().toISOString().split('T')[0],
        due_date: dueDate,
        
        // Status
        status: 'open',
        
        // Forma de pagamento
        payment_method: `${cardBrand} (${installmentNumber}/${numInstallments})`,
        received_payment_method: cardBrand,
        
        // Descrição e contexto
        description: `Parcela ${installmentNumber}/${numInstallments} - ${cardBrand}`,
        service_description: `Pagamento em ${numInstallments}x - ${cardBrand}`,
        
        // Contexto de processamento
        context: {
          payment_method: 'CARTAO',
          card_brand: cardBrand,
          card_last_digits: cardConfig?.last_4_digits || '',
          installment_number: installmentNumber,
          total_installments: numInstallments,
          settlement_type: settlementType,
          card_fee_percent: processing.feePercentage,
          card_fee_amount: processing.cardFeeAmount,
          payment_day: cardConfig?.payment_day || null,
        },
      };

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('ar_invoices')
        .insert(arPayload)
        .select('id');

      if (error) {
        console.error(
          `❌ Erro ao criar AR parcela ${installmentNumber}/${numInstallments}:`,
          error
        );
        throw error;
      }

      createdARs.push({
        arId: data[0]?.id,
        installmentNumber,
        dueDate,
        amount: parseFloat(processing.installmentValue),
      });

      console.log(
        `✅ AR criada: Parcela ${installmentNumber}/${numInstallments} - Vencimento: ${dueDate}`
      );
    }

    return {
      success: true,
      createdARs,
      processing,
    };
  } catch (err) {
    console.error('❌ Erro ao criar ARs de parcelas:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

export default {
  getCardFees,
  calculateReceiptDate,
  applyCardFee,
  generateInstallmentDates,
  calculateCardProcessing,
  createCardInstallmentARs,
};
