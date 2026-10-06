import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Keep the public response generic even if the mail service is unavailable.
    } finally {
      // The same response is shown whether an account exists or not.
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Recuperar senha</h1>
        {sent ? (
          <p>Se o endereço estiver cadastrado, enviaremos um link de recuperação.</p>
        ) : (
          <form method="post" onSubmit={submit}>
            <label htmlFor="recovery-email" className="block mb-2">E-mail da conta</label>
            <input id="recovery-email" type="email" required value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full p-2 border rounded mb-4" />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold">
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}
        <Link to="/login" className="block mt-4 text-center text-blue-600 hover:underline">
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
