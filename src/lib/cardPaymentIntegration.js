/**
 * Example: How to integrate fee calculation into receivable creation
 * This shows how to use processingFeeCalculator when recording card payments
 */

import { calculateProcessingFee, formatFeeDisplay } from '@/lib/processingFeeCalculator';

/**
 * Example: Create a receivable from a card payment
 * Integrates fee calculation with receivable recording
 */
export async function createCardPaymentReceivable({
  clinicId,
  appointmentId,
  paymentData, // { processorId, cardBrand, settlementType, amount }
}) {
  try {
    // Step 1: Calculate the processing fee
    const feeCalculation = await calculateProcessingFee({
      clinicId,
      processorId: paymentData.processorId,
      cardBrand: paymentData.cardBrand,
      settlementType: paymentData.settlementType,
      grossAmount: paymentData.amount,
    });

    // Step 2: Prepare receivable data with fee details
    const receivableData = {
      clinic_id: clinicId,
      appointment_id: appointmentId,
      payment_method: 'card',
      payment_processor_id: paymentData.processorId,
      card_brand: paymentData.cardBrand,
      settlement_type: paymentData.settlementType,
      gross_amount: feeCalculation.grossAmount,
      processing_fee_amount: feeCalculation.feeAmount,
      processing_fee_percent: feeCalculation.feePercent,
      net_amount: feeCalculation.netAmount, // Amount clinic actually receives
      settlement_date: calculateSettlementDate(
        new Date(),
        paymentData.settlementType
      ),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Step 3: Insert into receivables table
    // const { data, error } = await supabase
    //   .from('receivables')
    //   .insert([receivableData]);
    //
    // if (error) throw error;
    // return data[0];

    console.log('📋 Receivable prepared:', receivableData);
    console.log('📊', formatFeeDisplay(feeCalculation));
    return receivableData;
  } catch (error) {
    console.error('❌ [createCardPaymentReceivable] Error:', error);
    throw error;
  }
}

/**
 * Calculate settlement date based on settlement type
 */
function calculateSettlementDate(transactionDate, settlementType) {
  const date = new Date(transactionDate);

  switch (settlementType) {
    case 'D+0':
      // Same day
      return date.toISOString().split('T')[0];

    case 'D+1':
      // Next business day (simple: +1 day)
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0];

    case 'D+30':
      // 30 days
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];

    case 'Payment Day':
      // Would need to fetch the payment day from card_processors table
      // For now, assume day 15
      date.setDate(15);
      if (date < transactionDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date.toISOString().split('T')[0];

    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Example usage in a React component:
 * 
 * function PaymentForm() {
 *   const [grossAmount, setGrossAmount] = useState(100);
 *   const [feeInfo, setFeeInfo] = useState(null);
 * 
 *   async function handleCalculateFee() {
 *     const fee = await calculateProcessingFee({
 *       clinicId: 'clinic-123',
 *       processorId: selectedProcessor.id,
 *       cardBrand: selectedBrand,
 *       settlementType: selectedSettlement,
 *       grossAmount,
 *     });
 *     setFeeInfo(fee);
 *   }
 * 
 *   return (
 *     <div>
 *       <input value={grossAmount} onChange={e => setGrossAmount(parseFloat(e.target.value))} />
 *       <button onClick={handleCalculateFee}>Calcular Taxa</button>
 *       {feeInfo && (
 *         <div>
 *           <p>Bruto: R$ {feeInfo.grossAmount}</p>
 *           <p>Taxa: {feeInfo.feePercent}% (R$ {feeInfo.feeAmount})</p>
 *           <p><strong>Líquido: R$ {feeInfo.netAmount}</strong></p>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 */

export { createCardPaymentReceivable };
