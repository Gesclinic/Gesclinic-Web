/**
 * 🎬 Exemplo de Integração: AppointmentFinalizationModal
 *
 * Demonstrates complete integration of invoiceService
 * into a real appointment finalization flow.
 *
 * Workflow: Appointment Finished → Invoice Creation → Emission → Payment
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import invoiceService, { INVOICE_STATUS, validateInvoiceData } from '@/lib/invoiceService';
import { appointmentsApi } from '@/lib/appointmentsApi';

// Componente principal de finalização com faturamento
export function AppointmentFinalizationModal({ appointmentId, onClose, onSuccess }) {
  // ====== STATE ======
  const { user } = useAuth();
  const { clinic, clinicId } = useClinicContext();

  const [step, setStep] = useState('loading'); // loading, prepare, invoice, emit, payment, success, error
  const [appointmentData, setAppointmentData] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'pix', // dinheiro, pix, credito, debito, boleto
    date: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // ====== LIFECYCLE ======

  useEffect(() => {
    loadAppointmentData();
  }, [appointmentId]);

  // ====== FUNCTIONS ======

  /**
   * PASSO 1: Carregar dados do agendamento
   */
  async function loadAppointmentData() {
    try {
      setStep('loading');
      setErrorMessage(null);

      // Buscar agendamento completo
      const { data, error } = await appointmentsApi.listAppointments({
        clinicId,
        appointmentIds: [appointmentId],
      });

      if (error || !data?.[0]) {
        throw new Error('Agendamento não encontrado');
      }

      const appt = data[0];

      // Validar dados necessários
      if (!appt.patient_id) {
        throw new Error('Paciente não identificado');
      }
      if (!appt.professional_id) {
        throw new Error('Profissional não identificado');
      }
      if (!appt.services || appt.services.length === 0) {
        throw new Error('Nenhum serviço associado');
      }

      setAppointmentData(appt);
      setStep('prepare');
    } catch (err) {
      setErrorMessage(err.message);
      setStep('error');
    }
  }

  /**
   * PASSO 2: Preparar dados para invoice
   * Calcula valor bruto e cria estrutura de itens
   */
  function prepareInvoiceData() {
    try {
      if (!appointmentData) {
        throw new Error('Dados do agendamento não carregados');
      }

      // Montar itens de serviço
      const items = appointmentData.services.map((service) => ({
        serviceId: service.id,
        description: service.name,
        amount: service.price || 0,
        quantity: 1,
        unitPrice: service.price || 0,
        isHospitalService: service.requires_anesthesia || service.is_hospital_procedure,
      }));

      // Validar
      const invoiceDataForValidation = {
        clinicId,
        appointmentId,
        patientId: appointmentData.patient_id,
        payerId: appointmentData.insurance_id || appointmentData.patient_id,
        payerType: appointmentData.insurance_id ? 'insurance' : 'patient',
        items,
        discountAmount: appointmentData.discount_amount || 0,
      };

      const errors = validateInvoiceData(invoiceDataForValidation);
      if (errors.length > 0) {
        throw new Error(`Validação falhou: ${errors[0]}`);
      }

      setInvoiceData(invoiceDataForValidation);

      // Calcular valor total para pagamento
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      setPaymentData((prev) => ({
        ...prev,
        amount: totalAmount,
      }));

      setStep('invoice');
    } catch (err) {
      setErrorMessage(err.message);
      setStep('error');
    }
  }

  /**
   * PASSO 3: Criar invoice em draft
   */
  async function handleCreateInvoice() {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!invoiceData) {
        throw new Error('Dados não preparados');
      }

      const result = await invoiceService.createInvoiceWithItems(invoiceData);

      console.log('✅ Invoice criada:', {
        id: result.invoice.id,
        number: result.invoice.invoice_number,
        net_amount: result.totals.net,
      });

      setInvoiceData((prev) => ({
        ...prev,
        invoiceResult: result,
      }));

      setPaymentData((prev) => ({
        ...prev,
        amount: result.totals.net, // Atualizar com valor líquido
      }));

      setStep('emit');
    } catch (err) {
      setErrorMessage(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * PASSO 4: Emitir invoice + criar AR
   */
  async function handleEmitInvoice() {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!invoiceData?.invoiceResult?.invoice?.id) {
        throw new Error('Invoice não foi criada');
      }

      const result = await invoiceService.issueInvoiceAndCreateReceivable(
        invoiceData.invoiceResult.invoice.id,
        {
          // Dados adicionais para AR (opcional)
          obs: `Emitida via AppointmentModal - ${appointmentData?.patient_name}`,
        },
      );

      console.log('✅ Invoice emitida + AR criada:', {
        invoice_number: result.invoice.invoice_number,
        receivable_id: result.receivable.id,
      });

      setInvoiceData((prev) => ({
        ...prev,
        issuedResult: result,
      }));

      setStep('payment');
    } catch (err) {
      setErrorMessage(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * PASSO 5: Registrar pagamento
   */
  async function handleRecordPayment() {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!invoiceData?.issuedResult?.invoice?.id) {
        throw new Error('Invoice não foi emitida');
      }

      if (paymentData.amount <= 0) {
        throw new Error('Valor do pagamento deve ser maior que 0');
      }

      const result = await invoiceService.recordInvoicePayment(
        invoiceData.issuedResult.invoice.id,
        paymentData.amount,
        paymentData.method,
        paymentData.date,
      );

      console.log('✅ Pagamento registrado:', {
        invoice: result.invoice.invoice_number,
        amount: paymentData.amount,
        method: paymentData.method,
      });

      setInvoiceData((prev) => ({
        ...prev,
        paymentResult: result,
      }));

      setStep('success');
    } catch (err) {
      setErrorMessage(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Voltar para a invoice (se erro no pagamento)
   */
  function handleBackToPayment() {
    setErrorMessage(null);
    setStep('payment');
  }

  /**
   * Fechar modal e chamar callback
   */
  function handleClose() {
    if (invoiceData?.invoiceResult?.invoice?.id) {
      onSuccess?.({
        invoiceId: invoiceData.invoiceResult.invoice.id,
        invoiceNumber: invoiceData.invoiceResult.invoice.invoice_number,
        totalAmount: invoiceData.issuedResult?.invoice?.net_amount,
      });
    }
    onClose?.();
  }

  // ====== RENDER ======

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h2 className="text-2xl font-bold">Finalizar Atendimento</h2>
          <p className="text-blue-100 text-sm mt-1">Agendamento #{appointmentId?.slice(0, 8)}</p>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6">
          {/* STEP INDICATOR */}
          <StepIndicator currentStep={step} />

          {/* ERROR DISPLAY */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">❌ Erro</p>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {/* LOADING STEP */}
          {step === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <p className="ml-3 text-gray-700">Carregando agendamento...</p>
            </div>
          )}

          {/* PREPARE STEP */}
          {step === 'prepare' && appointmentData && (
            <div className="space-y-4">
              <AppointmentSummary appointment={appointmentData} />
              <button
                onClick={prepareInvoiceData}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Continuar para Faturamento
              </button>
            </div>
          )}

          {/* INVOICE CREATION STEP */}
          {step === 'invoice' && invoiceData && !invoiceData.invoiceResult && (
            <div className="space-y-4">
              <InvoicePreview invoiceData={invoiceData} />
              <button
                onClick={handleCreateInvoice}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? 'Criando Invoice...' : 'Criar Invoice'}
              </button>
            </div>
          )}

          {/* INVOICE CREATED - READY TO EMIT */}
          {step === 'invoice' && invoiceData?.invoiceResult && (
            <div className="space-y-4">
              <InvoiceCreatedSummary result={invoiceData.invoiceResult} />
              <button
                onClick={handleEmitInvoice}
                disabled={loading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? 'Emitindo Invoice...' : 'Emitir Invoice + Criar AR'}
              </button>
            </div>
          )}

          {/* EMIT STEP */}
          {step === 'emit' && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <p className="ml-3 text-gray-700">Emitindo Invoice...</p>
            </div>
          )}

          {/* PAYMENT STEP */}
          {step === 'payment' && invoiceData?.issuedResult && (
            <div className="space-y-4">
              <InvoiceEmittedSummary result={invoiceData.issuedResult} />

              <PaymentForm
                value={paymentData}
                onChange={setPaymentData}
                totalAmount={invoiceData.invoiceResult?.totals?.net || 0}
              />

              <button
                onClick={handleRecordPayment}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? 'Registrando Pagamento...' : 'Registrar Pagamento'}
              </button>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && invoiceData?.paymentResult && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-800">Atendimento Finalizado!</h3>
                <p className="text-green-700 mt-2">Todos os passos foram concluídos com sucesso.</p>
              </div>

              <PaymentSuccessSummary result={invoiceData.paymentResult} />

              <button
                onClick={handleClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          )}

          {/* ERROR STEP */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-red-800">Erro ao Processar</h3>
                <p className="text-red-700 mt-2">{errorMessage}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Recarregar
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function StepIndicator({ currentStep }) {
  const steps = [
    { id: 'loading', label: 'Carregando', icon: '⏳' },
    { id: 'prepare', label: 'Preparar', icon: '📋' },
    { id: 'invoice', label: 'Invoice', icon: '📝' },
    { id: 'emit', label: 'Emitir', icon: '📄' },
    { id: 'payment', label: 'Pagamento', icon: '💳' },
    { id: 'success', label: 'Sucesso', icon: '✅' },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition ${
              idx <= currentIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {step.icon}
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-1 ${idx < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`}
            ></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function AppointmentSummary({ appointment }) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
      <p className="font-semibold text-gray-800">📋 Resumo do Atendimento</p>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Paciente</p>
          <p className="font-medium">{appointment.patient_name}</p>
        </div>
        <div>
          <p className="text-gray-600">Profissional</p>
          <p className="font-medium">{appointment.professional_name}</p>
        </div>
        <div>
          <p className="text-gray-600">Data</p>
          <p className="font-medium">
            {new Date(appointment.appointment_date).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Serviços</p>
          <p className="font-medium">{appointment.services?.length || 0} serviço(s)</p>
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ invoiceData }) {
  const totalAmount = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <p className="font-semibold text-gray-800">📝 Prévia da Invoice</p>
      <div className="space-y-2 text-sm">
        {invoiceData.items.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <p className="text-gray-700">{item.description}</p>
            <p className="font-medium">R$ {item.amount.toFixed(2)}</p>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between font-semibold">
          <p>Total</p>
          <p>R$ {totalAmount.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function InvoiceCreatedSummary({ result }) {
  return (
    <div className="bg-green-50 rounded-lg p-4 space-y-2">
      <p className="font-semibold text-green-800">✅ Invoice Criada em Draft</p>
      <div className="text-sm space-y-1">
        <p className="text-gray-700">
          <span className="font-medium">Número:</span> {result.invoice.invoice_number}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Status:</span> {result.invoice.status}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Valor Líquido:</span> R$ {result.totals.net.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function InvoiceEmittedSummary({ result }) {
  return (
    <div className="bg-yellow-50 rounded-lg p-4 space-y-2">
      <p className="font-semibold text-yellow-800">📄 Invoice Emitida</p>
      <div className="text-sm space-y-1">
        <p className="text-gray-700">
          <span className="font-medium">Número:</span> {result.invoice.invoice_number}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Data de Emissão:</span>{' '}
          {new Date(result.invoice.issue_date).toLocaleDateString()}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">AR Criada:</span> ID {result.receivable.id.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}

function PaymentForm({ value, onChange, totalAmount }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <p className="font-semibold text-gray-800">💳 Registrar Pagamento</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Valor a Receber: <span className="text-green-600">R$ {totalAmount.toFixed(2)}</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max={totalAmount}
          value={value.amount}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              amount: parseFloat(e.target.value) || 0,
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pagamento</label>
        <select
          value={value.method}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              method: e.target.value,
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="dinheiro">💵 Dinheiro</option>
          <option value="pix">📱 PIX</option>
          <option value="credito">💳 Cartão de Crédito</option>
          <option value="debito">🏧 Cartão de Débito</option>
          <option value="boleto">📋 Boleto</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Data do Pagamento</label>
        <input
          type="date"
          value={value.date.toISOString().split('T')[0]}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              date: new Date(e.target.value),
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

function PaymentSuccessSummary({ result }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
      <p className="font-semibold text-green-800">💰 Pagamento Registrado</p>
      <div className="text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-700">Invoice:</span>
          <span className="font-medium">{result.invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Valor:</span>
          <span className="font-medium text-green-600">
            R$ {result.invoice.net_amount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Método:</span>
          <span className="font-medium">{result.cashMovement?.method}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Status:</span>
          <span className="font-medium text-green-600">{result.invoice.status.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

export default AppointmentFinalizationModal;
