import React, { useState } from 'react';
import { Send, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendBatchConfirmations } from '@/lib/whatsappConfirmationApi';
import { useClinicContext } from '@/contexts/ClinicContext';

export function SendWhatsAppConfirmationsButton() {
  const { clinicId } = useClinicContext();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!window.confirm(
      'Enviar confirmações de WhatsApp para todos os agendamentos de amanhã?\n\n' +
      'Isso enviará mensagens para todos os pacientes com agendamentos não confirmados.'
    )) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await sendBatchConfirmations(clinicId);
      setResult(response);
    } catch (err) {
      setError(err.message || 'Erro ao enviar confirmações');
      console.error('❌ Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSend}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
      >
        {loading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {loading ? 'Enviando...' : 'Enviar Confirmações WhatsApp'}
      </button>

      {error && (
        <div className="flex gap-2 items-start p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Erro ao enviar:</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className={`${
          result.failed === 0
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
        } p-3 rounded-lg text-sm`}>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Resultado:</strong>
              <ul className="mt-1 space-y-1">
                <li>✅ Enviadas: {result.sent}/{result.total}</li>
                {result.failed > 0 && <li>❌ Falhas: {result.failed}</li>}
              </ul>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold">
                    Ver erros ({result.errors.length})
                  </summary>
                  <div className="mt-1 space-y-1 text-xs">
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-red-600">
                        • {err.appointmentId}: {err.error}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SendWhatsAppConfirmationsButton;
