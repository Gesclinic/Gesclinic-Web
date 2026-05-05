/**
 * 🎣 useInvoiceForm Hook
 *
 * Custom React hook para gerenciar estado de invoice form
 * Integrado com invoiceService para tributação automática
 *
 * Suporta:
 * - Múltiplos itens
 * - Tributação automática (IRPJ, CSLL, PIS, COFINS, ISS)
 * - Equiparação hospitalar
 * - Descontos e parcelamento
 * - Validação em tempo real
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import invoiceService, { validateInvoiceData } from '@/lib/invoiceService';

/**
 * Hook para gerenciar invoice form
 *
 * @param {Object} appointment - Dados do agendamento
 * @param {Object} clinic - Dados da clínica (tax_regime, iss_rate)
 * @returns {Object} Form state e métodos
 */
export function useInvoiceForm(appointment, clinic) {
  // ====== STATE ======
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxBreakdown, setTaxBreakdown] = useState(null);
  const [totals, setTotals] = useState({
    gross: 0,
    taxes: 0,
    net: 0,
  });
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  // ====== INITIALIZE ======

  useEffect(() => {
    if (appointment?.services) {
      const initialItems = appointment.services.map((service) => ({
        serviceId: service.id,
        description: service.name,
        amount: service.price || 0,
        quantity: 1,
        unitPrice: service.price || 0,
        isHospitalService: service.requires_anesthesia || service.is_hospital_procedure || false,
      }));

      setItems(initialItems);
    }
  }, [appointment]);

  // ====== CALCULATE TOTALS ======

  useEffect(() => {
    calculateTotals();
  }, [items, discount]);

  const calculateTotals = useCallback(async () => {
    if (!clinic || items.length === 0) {
      setTotals({ gross: 0, taxes: 0, net: 0 });
      setTaxBreakdown(null);
      return;
    }

    try {
      const taxRegime = clinic.tax_regime || 'lucro_presumido';
      const issRate = clinic.iss_rate || 3.0;

      let totalGross = 0;
      let totalTaxes = 0;
      const itemsWithTaxes = [];

      // Calcular tributação para cada item
      for (const item of items) {
        const amount = item.amount;
        totalGross += amount;

        // Usar invoiceService para calcular tributação
        const taxData = await invoiceService
          .calculateItemTaxes?.({
            amount,
            isHospitalService: item.isHospitalService,
            taxRegime,
            issRate,
          })
          .catch(() => {
            // Fallback if calculateItemTaxes não disponível
            return {
              irpj: { rate: 0, value: 0 },
              csll: { rate: 0, value: 0 },
              pis: { rate: 0, value: 0 },
              cofins: { rate: 0, value: 0 },
              iss: { rate: issRate, value: (amount * issRate) / 100 },
              totalTaxes: (amount * issRate) / 100,
            };
          });

        const itemTaxes = taxData?.totalTaxes || 0;
        totalTaxes += itemTaxes;

        itemsWithTaxes.push({
          ...item,
          ...taxData,
        });
      }

      const netAmount = totalGross - discount - totalTaxes;

      setTotals({
        gross: roundMoney(totalGross),
        taxes: roundMoney(totalTaxes),
        net: roundMoney(netAmount),
      });

      setTaxBreakdown(itemsWithTaxes);
    } catch (err) {
      console.error('Erro ao calcular totais:', err);
      setTotals({ gross: 0, taxes: 0, net: 0 });
      setTaxBreakdown(null);
    }
  }, [items, discount, clinic]);

  // ====== ITEM MANAGEMENT ======

  const addItem = useCallback((newItem) => {
    const item = {
      serviceId: newItem.serviceId || '',
      description: newItem.description || '',
      amount: newItem.amount || 0,
      quantity: newItem.quantity || 1,
      unitPrice: newItem.unitPrice || newItem.amount || 0,
      isHospitalService: newItem.isHospitalService || false,
    };

    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((index, updates) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ...updates,
        // Recalcular amount se quantity ou unitPrice mudou
        amount:
          updates.quantity !== undefined || updates.unitPrice !== undefined
            ? roundMoney(
                (updates.quantity || updated[index].quantity) *
                  (updates.unitPrice || updated[index].unitPrice),
              )
            : updated[index].amount,
      };
      return updated;
    });
  }, []);

  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  // ====== VALIDATION ======

  const validateForm = useCallback(() => {
    const errors = [];

    if (!appointment?.id) {
      errors.push('Agendamento obrigatório');
    }
    if (!clinic?.id) {
      errors.push('Clínica obrigatória');
    }
    if (items.length === 0) {
      errors.push('Deve ter pelo menos 1 item');
    }
    if (discount < 0) {
      errors.push('Desconto não pode ser negativo');
    }
    if (totals.net <= 0) {
      errors.push('Valor líquido deve ser maior que 0');
    }

    items.forEach((item, idx) => {
      if (!item.description) {
        errors.push(`Item ${idx + 1}: descrição obrigatória`);
      }
      if (item.amount <= 0) {
        errors.push(`Item ${idx + 1}: valor deve ser > 0`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [appointment, clinic, items, discount, totals]);

  // ====== CREATE INVOICE ======

  const createInvoice = useCallback(
    async (payerId, payerType = 'insurance') => {
      try {
        setLoading(true);
        setValidationErrors([]);

        // Validar
        if (!validateForm()) {
          throw new Error('Validação falhou');
        }

        // Preparar dados
        const invoiceData = {
          clinicId: clinic.id,
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          payerId,
          payerType,
          items,
          discountAmount: discount,
          notes: `Faturamento via form - ${appointment.service_name || 'Atendimento'}`,
        };

        // Chamar invoiceService
        const result = await invoiceService.createInvoiceWithItems(invoiceData);

        console.log('✅ Invoice criada:', {
          id: result.invoice.id,
          number: result.invoice.invoice_number,
        });

        return result;
      } catch (err) {
        const errorMsg = err.message || 'Erro ao criar invoice';
        setValidationErrors([errorMsg]);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinic, appointment, items, discount, validateForm],
  );

  // ====== HELPER FUNCTIONS ======

  const roundMoney = (value) => {
    return Math.round(parseFloat(value) * 100) / 100;
  };

  const getTaxBreakdownByItem = useCallback(
    (itemIndex) => {
      if (!taxBreakdown || !taxBreakdown[itemIndex]) {
        return {
          irpj: { rate: 0, value: 0 },
          csll: { rate: 0, value: 0 },
          pis: { rate: 0, value: 0 },
          cofins: { rate: 0, value: 0 },
          iss: { rate: clinic?.iss_rate || 0, value: 0 },
        };
      }

      return {
        irpj: taxBreakdown[itemIndex].irpj || { rate: 0, value: 0 },
        csll: taxBreakdown[itemIndex].csll || { rate: 0, value: 0 },
        pis: taxBreakdown[itemIndex].pis || { rate: 0, value: 0 },
        cofins: taxBreakdown[itemIndex].cofins || { rate: 0, value: 0 },
        iss: taxBreakdown[itemIndex].iss || { rate: 0, value: 0 },
      };
    },
    [taxBreakdown, clinic],
  );

  const getEffectiveTaxRate = useMemo(() => {
    if (totals.gross === 0) {
      return 0;
    }
    return ((totals.taxes / totals.gross) * 100).toFixed(2);
  }, [totals]);

  // ====== RETURN ======

  return {
    // Data
    items,
    discount,
    totals,
    taxBreakdown,
    validationErrors,
    loading,

    // Item management
    addItem,
    updateItem,
    removeItem,
    clearItems,

    // Validation & Creation
    validateForm,
    createInvoice,

    // Helpers
    getTaxBreakdownByItem,
    getEffectiveTaxRate,
    roundMoney,
  };
}

// ============================================================
// EXEMPLO DE USO
// ============================================================

/**
 * Exemplo de como usar o hook em um componente
 */
export function InvoiceFormExample() {
  const { clinic, clinicId } = useClinicContext(); // seu contexto
  const { data: appointment } = useQuery(['appointment', appointmentId], () =>
    fetchAppointment(appointmentId),
  );

  const invoice = useInvoiceForm(appointment, clinic);

  const handleAddService = (service) => {
    invoice.addItem({
      serviceId: service.id,
      description: service.name,
      amount: service.price,
      isHospitalService: service.requires_anesthesia,
    });
  };

  const handleCreateInvoice = async () => {
    try {
      const result = await invoice.createInvoice(appointment.payer_id, 'insurance');

      alert(`✅ Invoice ${result.invoice.invoice_number} criada!`);
    } catch (err) {
      alert(`❌ Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Errors */}
      {invoice.validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <ul className="text-red-700 text-sm">
            {invoice.validationErrors.map((err, idx) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Items */}
      <div className="border rounded p-4">
        <h3 className="font-bold mb-3">Itens</h3>

        {invoice.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center mb-2 p-2 bg-gray-50 rounded">
            <div className="flex-1">
              <p className="font-medium">{item.description}</p>
              <p className="text-sm text-gray-600">
                R$ {item.amount.toFixed(2)}
                {item.isHospitalService && ' (com equiparação)'}
              </p>
            </div>
            <button
              onClick={() => invoice.removeItem(idx)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Discount */}
      <div>
        <label className="block text-sm font-medium mb-1">Desconto</label>
        <input
          type="number"
          value={invoice.discount}
          onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Totals */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
        <div className="flex justify-between">
          <span>Bruto:</span>
          <span className="font-medium">R$ {invoice.totals.gross.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Impostos ({invoice.getEffectiveTaxRate}%):</span>
          <span className="font-medium">R$ {invoice.totals.taxes.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between text-lg font-bold">
          <span>Líquido:</span>
          <span>R$ {invoice.totals.net.toFixed(2)}</span>
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreateInvoice}
        disabled={invoice.loading || invoice.validationErrors.length > 0}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
      >
        {invoice.loading ? 'Criando...' : 'Criar Invoice'}
      </button>
    </div>
  );
}

export default useInvoiceForm;
