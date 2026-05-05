/**
 * 📌 EXEMPLO PRÁTICO - Integrando InvoiceModal em AppointmentModal
 *
 * Este arquivo mostra como usar o novo InvoiceModal dentro de um
 * fluxo de agendamentos real.
 */

// ============================================================================
// 1️⃣ VERSÃO SIMPLES (recomendado para começar)
// ============================================================================

import React, { useState } from 'react';
import InvoiceModal from '@/components/invoices/InvoiceModal';

export function AppointmentModalSimple({ appointment, onClose }) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  return (
    <>
      {/* Seu modal de agendamento */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">{appointment.patient_name}</h2>
          <p className="text-gray-600 mb-6">
            {new Date(appointment.scheduled_date).toLocaleString('pt-BR')}
          </p>

          {/* Botão para abrir invoice modal */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              📄 Emitir NF
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          appointment={appointment}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={(result) => {
            console.log('NF emitida:', result.invoiceNumber);
            // Opcional: fechar modal de agendamento também
            // onClose();
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// 2️⃣ VERSÃO COM MAIS FEATURES (tabs, histórico, etc)
// ============================================================================

import { useEffect } from 'react';
import { toast } from 'sonner'; // ou outro toast library

export function AppointmentModalAdvanced({ appointment, onClose }) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carregar histórico de invoices do agendamento
  useEffect(() => {
    loadInvoices();
  }, [appointment.id]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      // Buscar invoices do agendamento
      const response = await fetch(`/api/invoices?appointment_id=${appointment.id}`);
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Erro ao carregar invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSuccess = (result) => {
    toast.success(`NF ${result.invoiceNumber} emitida com sucesso! 🎉`);

    // Recarregar lista de invoices
    loadInvoices();

    // Fechar modal de invoice
    setShowInvoiceModal(false);
  };

  const hasInvoice = invoices.some((inv) => inv.status !== 'canceled');

  return (
    <>
      {/* Modal de agendamento */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{appointment.patient_name}</h2>
                <p className="text-blue-100 mt-1">
                  {new Date(appointment.scheduled_date).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white text-2xl hover:bg-white/20 rounded-lg p-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info do agendamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Profissional</p>
                <p className="font-medium">{appointment.professional_name}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Sala</p>
                <p className="font-medium">{appointment.room_name}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <p className="font-medium">{appointment.status}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Tipo de Pagador</p>
                <p className="font-medium">
                  {appointment.payer_type === 'insurance' ? '🏥 Convênio' : '👤 Particular'}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="border-t pt-6">
              <h3 className="font-bold mb-4">💰 Faturamento</h3>

              {hasInvoice ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-semibold">✅ Invoice emitida</p>
                  <p className="text-green-700 text-sm mt-1">
                    Número: {invoices[0].invoice_number}
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 font-semibold">⚠️ Sem invoice</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Clique em "Emitir NF" para criar uma nota fiscal
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowInvoiceModal(true)}
                disabled={hasInvoice}
                className={`w-full px-4 py-3 rounded-lg font-bold transition ${
                  hasInvoice
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                📄 {hasInvoice ? 'Invoice já emitida' : 'Emitir NF'}
              </button>
            </div>

            {/* Histórico de invoices */}
            {invoices.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-bold mb-4">📋 Histórico</h3>
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{inv.invoice_number}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R$ {inv.net_amount.toFixed(2)}</p>
                        <span
                          className={`inline-block text-xs px-2 py-1 rounded mt-1 ${
                            inv.status === 'issued'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {inv.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botão fechar */}
            <button
              onClick={onClose}
              className="w-full bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-bold hover:bg-gray-400 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal - sobreposto */}
      {showInvoiceModal && (
        <InvoiceModal
          appointment={appointment}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </>
  );
}

// ============================================================================
// 3️⃣ INTEGRAÇÃO COM REACT QUERY (para fetch automático)
// ============================================================================

import { useQuery } from '@tanstack/react-query';

export function AppointmentModalWithReactQuery({ appointmentId, onClose }) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Query para dados do agendamento
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      return res.json();
    },
  });

  // Query para invoices
  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?appointment_id=${appointmentId}`);
      return res.json();
    },
    enabled: !!appointmentId,
  });

  const handleInvoiceSuccess = (result) => {
    toast.success(`NF ${result.invoiceNumber} emitida! 🎉`);

    // Recarregar invoices
    refetchInvoices();

    // Fechar modal
    setShowInvoiceModal(false);
  };

  if (appointmentLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      {/* ... mesmo conteúdo da versão anterior ... */}
      {showInvoiceModal && appointment && (
        <InvoiceModal
          appointment={appointment}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </>
  );
}

// ============================================================================
// 4️⃣ COMO USAR NOS SEUS COMPONENTES
// ============================================================================

/**
 * Escolha uma das versões acima e use:
 */

// Versão 1 - Simples (recomendado):
// import AppointmentModal from './AppointmentModalSimple';
// <AppointmentModal appointment={appt} onClose={handleClose} />

// Versão 2 - Avançada com histórico:
// import AppointmentModal from './AppointmentModalAdvanced';
// <AppointmentModal appointment={appt} onClose={handleClose} />

// Versão 3 - Com React Query:
// import AppointmentModal from './AppointmentModalWithReactQuery';
// <AppointmentModal appointmentId={id} onClose={handleClose} />

// ============================================================================
// 5️⃣ PASSO A PASSO PARA ADICIONAR AO SEU PROJETO
// ============================================================================

/**
 * 1. Copie este arquivo para: src/components/appointments/AppointmentModal.jsx
 *
 * 2. Escolha uma das 3 versões (simples recomendada)
 *
 * 3. Importe em seu componente pai (ex: AgendaPage.jsx):
 *    import AppointmentModal from '@/components/appointments/AppointmentModal';
 *
 * 4. Use assim:
 *    const [selectedAppointment, setSelectedAppointment] = useState(null);
 *
 *    return (
 *      <>
 *        <button onClick={() => setSelectedAppointment(appt)}>
 *          Ver Agendamento
 *        </button>
 *
 *        {selectedAppointment && (
 *          <AppointmentModal
 *            appointment={selectedAppointment}
 *            onClose={() => setSelectedAppointment(null)}
 *          />
 *        )}
 *      </>
 *    );
 *
 * 5. Pronto! O modal de invoice abrirá quando clicar em "Emitir NF"
 */

// ============================================================================
// 6️⃣ CUSTOMIZAÇÕES COMUNS
// ============================================================================

/**
 * ❓ Como desabilitar emissão de NF?
 * → Remova o botão ou adicione: disabled={true}
 *
 * ❓ Como recarregar dados após emitir NF?
 * → No onSuccess, chame a query refetch:
 *    onSuccess={() => {
 *      refetchAppointment(); // recarregar agendamento
 *      refetchInvoices();    // recarregar invoices
 *    }}
 *
 * ❓ Como mostrar notificação?
 * → Use toast ou snackbar:
 *    onSuccess={(result) => {
 *      toast.success(`NF ${result.invoiceNumber} emitida!`);
 *    }}
 *
 * ❓ Como registrar no Sentry/logging?
 * → No onSuccess:
 *    onSuccess={(result) => {
 *      console.log('Invoice emitida:', result);
 *      logEvent('invoice_created', result);
 *    }}
 */

// ============================================================================
// 7️⃣ DEBUGGING
// ============================================================================

/**
 * Se algo não funcionar:
 *
 * ✅ Verifique se InvoiceModal.jsx existe em src/components/invoices/
 * ✅ Verifique se useInvoiceForm.js existe em src/hooks/
 * ✅ Verifique se invoiceService.js existe em src/lib/
 * ✅ Verifique se ClinicProvider está em App.jsx
 * ✅ Verifique console para erros
 * ✅ Tente a versão simples primeiro
 */

// ============================================================================

export { AppointmentModalSimple, AppointmentModalAdvanced, AppointmentModalWithReactQuery };
