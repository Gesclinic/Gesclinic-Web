/**
 * Utilities for calculating card processing fees
 * Integrates with processor fee configuration to calculate discounts
 */

import { getProcessorFeeByCombo } from './processorFeesApi';

/**
 * Calculate processing fee for a payment
 * @param {Object} params - Payment details
 * @param {string} params.clinicId - Clinic ID
 * @param {string} params.processorId - Card processor ID
 * @param {string} params.cardBrand - Card brand (Visa, Mastercard, etc)
 * @param {string} params.settlementType - Settlement type (D+0, D+1, D+30, Payment Day)
 * @param {number} params.grossAmount - Gross amount before fee
 * @returns {Promise<Object>} - Fee details: { feePercent, feeAmount, netAmount }
 */
export async function calculateProcessingFee({
  clinicId,
  processorId,
  cardBrand,
  settlementType,
  grossAmount,
}) {
  try {
    // Fetch the configured fee for this combination
    const fee = await getProcessorFeeByCombo(
      clinicId,
      processorId,
      cardBrand,
      settlementType
    );

    if (!fee) {
      console.warn(
        `⚠️ No fee found for ${processorId} - ${cardBrand} - ${settlementType}. Using default 3%`
      );
      // Fallback to 3% if no fee configured
      return calculateFeeAmount(grossAmount, 3);
    }

    return calculateFeeAmount(grossAmount, fee.fee_percent);
  } catch (error) {
    console.error('❌ [calculateProcessingFee] Error:', error);
    // Fallback: use 3% default
    return calculateFeeAmount(grossAmount, 3);
  }
}

/**
 * Calculate fee amount and net amount
 * @param {number} grossAmount - Amount before fee
 * @param {number} feePercent - Fee percentage (0-100)
 * @returns {Object} - { feePercent, feeAmount, netAmount }
 */
export function calculateFeeAmount(grossAmount, feePercent) {
  const feeAmount = (grossAmount * feePercent) / 100;
  const netAmount = grossAmount - feeAmount;

  return {
    feePercent: parseFloat(feePercent.toFixed(2)),
    feeAmount: parseFloat(feeAmount.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2)),
    grossAmount: parseFloat(grossAmount.toFixed(2)),
  };
}

/**
 * Calculate net amount given gross amount and fee percentage
 * @param {number} grossAmount - Gross amount
 * @param {number} feePercent - Fee percentage
 * @returns {number} - Net amount after fee deduction
 */
export function calculateNetAmount(grossAmount, feePercent) {
  return parseFloat((grossAmount * (1 - feePercent / 100)).toFixed(2));
}

/**
 * Calculate gross amount given net amount and fee percentage
 * Inverse calculation for when you want to receive a net amount
 * @param {number} netAmount - Target net amount
 * @param {number} feePercent - Fee percentage
 * @returns {number} - Gross amount needed to achieve net amount
 */
export function calculateGrossAmount(netAmount, feePercent) {
  // Formula: grossAmount * (1 - fee%) = netAmount
  // grossAmount = netAmount / (1 - fee%)
  return parseFloat((netAmount / (1 - feePercent / 100)).toFixed(2));
}

/**
 * Format fee calculation for display
 * @param {Object} feeCalc - Result from calculateFeeAmount or calculateProcessingFee
 * @returns {string} - Formatted string for display
 */
export function formatFeeDisplay(feeCalc) {
  return `💰 Taxa: ${feeCalc.feePercent}% | Desconto: R$ ${feeCalc.feeAmount.toLocaleString(
    'pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )} | Líquido: R$ ${feeCalc.netAmount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculate fees for multiple payments
 * Batch calculation for reporting
 * @param {Array} payments - Array of payment objects with required fields
 * @param {string} payments[].processorId
 * @param {string} payments[].cardBrand
 * @param {string} payments[].settlementType
 * @param {number} payments[].grossAmount
 * @returns {Promise<Array>} - Array with fee calculations
 */
export async function calculateBatchFees(clinicId, payments) {
  return Promise.all(
    payments.map((payment) =>
      calculateProcessingFee({
        clinicId,
        processorId: payment.processorId,
        cardBrand: payment.cardBrand,
        settlementType: payment.settlementType,
        grossAmount: payment.grossAmount,
      }).then((feeData) => ({
        ...payment,
        feeCalculation: feeData,
      }))
    )
  );
}

/**
 * Summary of fees for a payment
 * @param {Array} feeCalculations - Array of fee calculation results
 * @returns {Object} - Summary totals
 */
export function summarizeFeesCalculations(feeCalculations) {
  return feeCalculations.reduce(
    (acc, calc) => ({
      totalGross: acc.totalGross + (calc.feeCalculation?.grossAmount || 0),
      totalFees: acc.totalFees + (calc.feeCalculation?.feeAmount || 0),
      totalNet: acc.totalNet + (calc.feeCalculation?.netAmount || 0),
      count: acc.count + 1,
      avgFeePercent:
        acc.avgFeePercent +
        (calc.feeCalculation?.feePercent || 0) / feeCalculations.length,
    }),
    { totalGross: 0, totalFees: 0, totalNet: 0, count: 0, avgFeePercent: 0 }
  );
}
