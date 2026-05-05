/**
 * 📋 InvoiceModal.jsx
 *
 * Modal completo para emissão de invoices
 * Integrado com invoiceService + useInvoiceForm
 *
 * Fluxo:
 * 1. Carrega dados do agendamento
 * 2. Prepara itens com tributação
 * 3. Permite ajustar desconto
 * 4. Cria invoice
 * 5. Emite + cria AR
 * 6. Opcional: registra pagamento
 */

import React, { useState } from 'react';
import { useInvoiceForm } from '@/hooks/useInvoiceForm';
import { useClinicContext } from '@/contexts/ClinicContext';
import invoiceService from '@/lib/invoiceService';

export function InvoiceModal({ appointment, onClose, onSuccess }) {
  // ====== CONTEXTO ======
  const { clinic, clinicId } = useClinicContext();

  // ====== HOOK ======
  const invoice = useInvoiceForm(appointment, clinic);

  // ====== STATE LOCAL ======
  const [step, setStep] = useState('form'); // form, review, payment, success
  const [issuedData, setIssuedData] = useState(null);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState({
    method: 'pix',
    amount: 0,
  });

  // ====== HANDLERS ======

  const handleUpdateDiscount = (value) => {
    invoice.setDiscount?.(Math.max(0, value)) || console.warn('setDiscount não disponível');
  };

  const handleCreateInvoice = async () => {
    try {
      setError(null);

      // Validar
      if (!invoice.validateForm()) {
        throw new Error('Formulário inválido');
      }

      // Criar invoice
      const result = await invoice.createInvoice(
        appointment.payer_id || appointment.patient_id,
        appointment.insurance_id ? 'insurance' : 'patient',
      );

      console.log('✅ Invoice criada:', result.invoice.invoice_number);

      // Atualizar payment amount
      setPaymentData((prev) => ({
        ...prev,
        amount: result.totals.net,
      }));

      setStep('review');
    } catch (err) {
      setError(err.message || 'Erro ao criar invoice');
    }
  };

  const handleEmitInvoice = async () => {
    try {
      setError(null);

      if (!invoice.items || invoice.items.length === 0) {
        throw new Error('Nenhuma invoice para emitir');
      }

      // Chamar invoiceService para emitir + criar AR
      // Precisa do invoice ID da criação anterior
      // (salvamos no invoiceData do hook)

      // Emitir
      const emitted = await invoiceService.issueInvoiceAndCreateReceivable(
        invoice.invoiceCreated?.id,
      );

      console.log('✅ Invoice emitida + AR criada');

      setIssuedData(emitted);
      setStep('payment');
    } catch (err) {
      setError(err.message || 'Erro ao emitir invoice');
    }
  };

  const handleRecordPayment = async () => {
    try {
      setError(null);

      if (!issuedData?.invoice?.id) {
        throw new Error('Invoice não foi emitida');
      }

      if (paymentData.amount <= 0) {
        throw new Error('Valor deve ser maior que 0');
      }

      // Registrar pagamento
      await invoiceService.recordInvoicePayment(
        issuedData.invoice.id,
        paymentData.amount,
        paymentData.method,
        new Date(),
      );

      console.log('✅ Pagamento registrado');

      setStep('success');

      // Callback para componente pai
      onSuccess?.({
        invoiceId: issuedData.invoice.id,
        invoiceNumber: issuedData.invoice.invoice_number,
        amount: paymentData.amount,
      });
    } catch (err) {
      setError(err.message || 'Erro ao registrar pagamento');
    }
  };

  // ====== RENDER ======

  if (!appointment || !clinic) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h2 className="text-2xl font-bold">Emissão de Nota Fiscal</h2>
          <p className="text-blue-100 text-sm mt-1">
            {appointment.patient_name} • {new Date(appointment.scheduled_date).toLocaleDateString()}
          </p>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6">
          {/* ERROR ALERT */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">❌ Erro</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* VALIDATION ERRORS */}
          {invoice.validationErrors?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-semibold">⚠️ Validação</p>
              <ul className="text-yellow-700 text-sm mt-2 space-y-1">
                {invoice.validationErrors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* FORM STEP */}
          {step === 'form' && (
            <div className="space-y-6">
              {/* ITEMS */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-4 text-lg">📋 Serviços</h3>

                {invoice.items?.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum serviço adicionado</p>
                ) : (
                  <div className="space-y-3">
                    {invoice.items?.map((item, idx) => {
                      const taxes = invoice.getTaxBreakdownByItem?.(idx) || {};

                      return (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                          {/* Item Info */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.description}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {item.quantity} × R$ {item.unitPrice.toFixed(2)}
                              </p>
                            </div>
                            <span className="text-lg font-bold text-blue-600">
                              R$ {item.amount.toFixed(2)}
                            </span>
                          </div>

                          {/* Hospital Service Badge */}
                          {item.isHospitalService && (
                            <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-3">
                              🏥 Com equiparação
                            </span>
                          )}

                          {/* Taxes Breakdown */}
                          {taxes && Object.keys(taxes).length > 0 && (
                            <div className="text-xs text-gray-600 space-y-1 border-t pt-2">
                              <div className="flex justify-between">
                                <span>IRPJ ({taxes.irpj?.rate?.toFixed(2)}%):</span>
                                <span>R$ {(taxes.irpj?.value || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>CSLL ({taxes.csll?.rate?.toFixed(2)}%):</span>
                                <span>R$ {(taxes.csll?.value || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>PIS ({taxes.pis?.rate?.toFixed(2)}%):</span>
                                <span>R$ {(taxes.pis?.value || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>COFINS ({taxes.cofins?.rate?.toFixed(2)}%):</span>
                                <span>R$ {(taxes.cofins?.value || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-medium border-t pt-1">
                                <span>ISS ({taxes.iss?.rate?.toFixed(2)}%):</span>
                                <span>R$ {(taxes.iss?.value || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PAYER TYPE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Pagador
                </label>
                <select
                  value={appointment.payer_type || 'insurance'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                >
                  <option value="insurance">Convênio</option>
                  <option value="patient">Particular</option>
                  <option value="company">Empresa</option>
                </select>
              </div>

              {/* DISCOUNT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desconto (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoice.discount || 0}
                  onChange={(e) => handleUpdateDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* TOTALS */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Valor Bruto:</span>
                  <span className="font-medium">R$ {invoice.totals?.gross?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Desconto:</span>
                  <span className="font-medium">-R$ {(invoice.discount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Impostos ({invoice.getEffectiveTaxRate}%):</span>
                  <span className="font-medium">-R$ {invoice.totals?.taxes?.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Valor a Receber:</span>
                  <span className="text-green-600">R$ {invoice.totals?.net?.toFixed(2)}</span>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">
                <button
                  onClick={handleCreateInvoice}
                  disabled={invoice.loading || (invoice.validationErrors?.length ?? 0) > 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  {invoice.loading ? '⏳ Criando...' : '✓ Criar Invoice'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
                >
                  ✕ Cancelar
                </button>
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && invoice.invoiceCreated && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold">✅ Invoice Criada em Draft</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Número:</span>{' '}
                    {invoice.invoiceCreated.invoice_number}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> {invoice.invoiceCreated.status}
                  </p>
                  <p>
                    <span className="font-medium">Valor:</span> R${' '}
                    {invoice.invoiceCreated.net_amount?.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleEmitInvoice}
                  disabled={invoice.loading}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  {invoice.loading ? '⏳ Emitindo...' : '📄 Emitir + Criar AR'}
                </button>
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT STEP */}
          {step === 'payment' && issuedData && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-semibold">✅ Invoice Emitida</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Número:</span> {issuedData.invoice.invoice_number}
                  </p>
                  <p>
                    <span className="font-medium">AR Criada:</span> ID{' '}
                    {issuedData.receivable.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* PAYMENT FORM */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-bold">💳 Registrar Pagamento</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor a Receber:{' '}
                    <span className="text-green-600 font-bold">
                      R$ {paymentData.amount?.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={paymentData.amount}
                    value={paymentData.amount}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pagamento
                  </label>
                  <select
                    value={paymentData.method}
                    onChange={(e) =>
                      setPaymentData((prev) => ({
                        ...prev,
                        method: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pix">📱 PIX</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="credito">💳 Crédito</option>
                    <option value="debito">🏧 Débito</option>
                    <option value="boleto">📋 Boleto</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRecordPayment}
                  disabled={invoice.loading || paymentData.amount <= 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  {invoice.loading ? '⏳ Processando...' : '✓ Registrar Pagamento'}
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900">Nota Fiscal Emitida com Sucesso!</h3>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left space-y-2">
                <p>
                  <span className="font-medium">Invoice:</span> {issuedData.invoice.invoice_number}
                </p>
                <p>
                  <span className="font-medium">Status:</span> {issuedData.invoice.status}
                </p>
                <p>
                  <span className="font-medium">Valor:</span> R${' '}
                  {issuedData.invoice.net_amount?.toFixed(2)}
                </p>
                <p>
                  <span className="font-medium">Pagamento:</span> {paymentData.method}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                ✓ Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;
