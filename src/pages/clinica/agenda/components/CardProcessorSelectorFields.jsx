import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import { calculateProcessingFee } from '@/lib/processingFeeCalculator';
import {
  validateFeePercentRange,
  validateFeeRateReasonableness,
} from '@/lib/processorFeeValidations';

/**
 * CardProcessorSelectorFields
 * 
 * Componente para selecionar processadora de cartão e forma de recebimento
 * Calcula taxa automaticamente
 */
export default function CardProcessorSelectorFields({
  clinicId,
  paymentMethod,
  grossAmount,
  processorId,
  cardBrand,
  settlementType,
  onProcessorChange,
  onCardBrandChange,
  onSettlementTypeChange,
  onFeeCalculated,
}) {
  const [processors, setProcessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feeData, setFeeData] = useState(null);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Load processors
  useEffect(() => {
    if (!clinicId || paymentMethod !== 'CARTAO') {
      setProcessors([]);
      return;
    }

    const loadProcessors = async () => {
      try {
        setLoading(true);
        const data = await listCardProcessors(clinicId);
        setProcessors(data || []);
      } catch (error) {
        console.error('❌ Error loading processors:', error);
        setProcessors([]);
      } finally {
        setLoading(false);
      }
    };

    loadProcessors();
  }, [clinicId, paymentMethod]);

  // Calculate fee when relevant fields change
  useEffect(() => {
    if (!paymentMethod || paymentMethod !== 'CARTAO' || !processorId || !grossAmount) {
      setFeeData(null);
      setValidationWarnings([]);
      onFeeCalculated?.(null);
      return;
    }

    const calculateFee = async () => {
      try {
        const fee = await calculateProcessingFee({
          clinicId,
          processorId,
          cardBrand: cardBrand || 'VISA',
          settlementType: settlementType || 'D+1',
          grossAmount: parseFloat(grossAmount) || 0,
        });

        // 🔍 VALIDAÇÃO: Validar range da taxa
        const rangeValidation = validateFeePercentRange(fee.feePercent);
        if (!rangeValidation.isValid) {
          console.warn('⚠️ Aviso de validação:', rangeValidation.error);
          setValidationWarnings([rangeValidation.error]);
          setFeeData(null);
          return;
        }

        // ⚠️ VALIDAÇÃO: Verificar taxa suspeita
        const warnings = validateFeeRateReasonableness(fee.feePercent);
        setValidationWarnings(warnings);

        setFeeData(fee);
        onFeeCalculated?.(fee);
      } catch (error) {
        console.error('❌ Error calculating fee:', error);
        setFeeData(null);
        setValidationWarnings(['Erro ao calcular taxa: ' + error.message]);
      }
    };

    calculateFee();
  }, [clinicId, paymentMethod, processorId, cardBrand, settlementType, grossAmount, onFeeCalculated]);

  // Only show if payment method is CARTAO
  if (paymentMethod !== 'CARTAO') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-900">💳 Taxas de Processamento</p>
          <p className="text-xs text-blue-700 mt-1">Configure a processadora e forma de recebimento para calcular a taxa automaticamente</p>
        </div>
      </div>

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          {validationWarnings.map((warning, idx) => (
            <p key={idx} className="text-sm text-yellow-700 mb-1 last:mb-0">
              {warning}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Processor Selector */}
        <div>
          <Label className="text-sm font-medium">Processadora</Label>
          <select
            className="w-full border rounded h-9 px-2 text-sm mt-1"
            value={processorId || ''}
            onChange={(e) => onProcessorChange?.(e.target.value)}
            disabled={loading}
          >
            <option value="">Selecione uma processadora</option>
            {processors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.settlement_day ? `(D+${p.settlement_day})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Card Brand Selector */}
        <div>
          <Label className="text-sm font-medium">Bandeira</Label>
          <select
            className="w-full border rounded h-9 px-2 text-sm mt-1"
            value={cardBrand || 'VISA'}
            onChange={(e) => onCardBrandChange?.(e.target.value)}
          >
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="ELO">Elo</option>
            <option value="AMEX">Amex</option>
            <option value="HIPERCARD">Hipercard</option>
            <option value="DISCOVER">Discover</option>
          </select>
        </div>

        {/* Settlement Type Selector */}
        <div>
          <Label className="text-sm font-medium">Forma de Recebimento</Label>
          <select
            className="w-full border rounded h-9 px-2 text-sm mt-1"
            value={settlementType || 'D+1'}
            onChange={(e) => onSettlementTypeChange?.(e.target.value)}
          >
            <option value="D+0">D+0 (Hoje)</option>
            <option value="D+1">D+1 (1 dia)</option>
            <option value="D+30">D+30 (30 dias)</option>
            <option value="Payment Day">Payment Day (Agendado)</option>
          </select>
        </div>
      </div>

      {/* Fee Calculation Display */}
      {feeData && (
        <div className="bg-white border border-blue-300 rounded p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-xs text-gray-600 mb-1">Taxa</p>
              <p className="text-lg font-bold text-blue-600">{feeData.feePercent}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Desconto</p>
              <p className="text-lg font-bold text-red-600">
                -R$ {feeData.feeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Recebimento</p>
              <p className="text-lg font-bold text-green-600">
                R$ {feeData.netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
