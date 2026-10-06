import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function PaymentConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // 'checking' | 'success' | 'failed' | 'pending'
  const [message, setMessage] = useState('Verificando seu pagamento...');
  const [error, setError] = useState('');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setStatus('failed');
        setError('Session ID não encontrado');
        return;
      }

      const { data, error: verifyError } = await supabase.functions.invoke('verify-stripe-session', {
        body: { session_id: sessionId },
      });
      if (verifyError || !data?.paid) {
        setStatus('pending');
        setMessage('O pagamento ainda não foi confirmado. Consulte novamente em alguns instantes.');
        return;
      }

      setStatus('success');
      setMessage('Pagamento confirmado com sucesso!');

      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        navigate('/clinica/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {status === 'checking' && (
          <>
            <div className="mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processando Pagamento</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Por favor, aguarde...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Confirmado!</h1>
            <p className="text-green-600 font-semibold mb-2">{message}</p>
            <p className="text-sm text-gray-600">Sua clínica está ativada e pronta para usar.</p>
            <p className="text-xs text-gray-500 mt-4">Redirecionando para o dashboard...</p>
          </>
        )}

        {status === 'pending' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento em processamento</h1>
            <p className="text-gray-600">{message}</p>
            <button type="button" onClick={verifyPayment} className="mt-6 rounded bg-blue-600 px-4 py-2 text-white">
              Verificar novamente
            </button>
          </div>
        )}
        {status === 'failed' && (
          <>
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro no Pagamento</h1>
            <p className="text-red-600 font-semibold mb-4">
              {error || 'Ocorreu um erro ao processar seu pagamento.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={verifyPayment}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Voltar para Checkout
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
              >
                Ir para Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
