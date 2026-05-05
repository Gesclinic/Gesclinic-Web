import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';
import { confirmAppointmentByToken } from '@/lib/whatsappConfirmationApi';

export function AppointmentConfirmationPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const status = searchParams.get('status') || 'confirmed';

  useEffect(() => {
    const confirm = async () => {
      try {
        setLoading(true);
        const response = await confirmAppointmentByToken(token, status);
        setResult(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      confirm();
    }
  }, [token, status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Processando sua confirmação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-700 mb-2">Erro ao processar</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <p className="text-sm text-gray-600">
            Este link pode ter expirado. Entre em contato com consultório através do WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  const isConfirmed = result?.status === 'confirmed';

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${
        isConfirmed ? 'from-green-50 to-emerald-100' : 'from-orange-50 to-red-100'
      }`}
    >
      <div className="text-center max-w-md px-4">
        {isConfirmed ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4 animate-bounce" />
            <h1 className="text-3xl font-bold text-green-700 mb-2">✅ Confirmado!</h1>
            <p className="text-lg text-gray-700 mb-2">Sua consulta foi confirmada com sucesso</p>
            <p className="text-sm text-gray-600 mb-6">
              Você receberá um lembrete no dia anterior. Obrigado por confirmar!
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-red-700 mb-2">Consultório notificado</h1>
            <p className="text-lg text-gray-700 mb-2">Sua consultação foi cancelada</p>
            <p className="text-sm text-gray-600 mb-6">
              O consultório foi notificado. Se deseja reagendar, entre em contato conosco pelo
              WhatsApp.
            </p>
          </>
        )}

        <div
          className="bg-white rounded-lg p-4 shadow-md border-l-4"
          style={{
            borderColor: isConfirmed ? '#10b981' : '#ef4444',
          }}
        >
          <p className="text-sm text-gray-700">
            <strong>ID da confirmação:</strong>
            <br />
            <code className="text-xs text-gray-500 break-all">{result?.appointmentId}</code>
          </p>
        </div>

        <button
          onClick={() => window.close()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export default AppointmentConfirmationPage;
