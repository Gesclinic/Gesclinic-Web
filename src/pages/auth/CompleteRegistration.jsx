import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function CompleteRegistration() {
  const [status, setStatus] = useState('Verificando a confirmação da conta...');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let active = true;
    async function complete() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        setStatus('Confirme sua conta pelo link recebido por e-mail. Depois, volte a esta página pelo link.');
        return;
      }
      const { data: { user }, error: identityError } = await supabase.auth.getUser();
      if (identityError || !user?.email) {
        setStatus('Não foi possível confirmar sua identidade. Abra novamente o link de confirmação.');
        return;
      }
      const { data: existing, error: existingError } = await supabase.from('users')
        .select('clinic_id').eq('id', user.id).maybeSingle();
      if (existingError) {
        setStatus('Não foi possível verificar o cadastro. Tente novamente em alguns instantes.');
        return;
      }
      if (existing?.clinic_id) {
        window.location.replace('/checkout');
        return;
      }
      const pending = user.user_metadata || {};
      if (!pending.pending_clinic_name || !pending.pending_clinic_cnpj ||
          !pending.pending_admin_name || !pending.pending_plan_id ||
          pending.pending_terms_accepted !== true) {
        setStatus('Os dados do cadastro estão incompletos. Contate o suporte antes de criar outra conta.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-clinic-from-signup', {
        body: {
          userId: user.id,
          clinicName: pending.pending_clinic_name,
          clinicCnpj: pending.pending_clinic_cnpj,
          planId: pending.pending_plan_id,
          adminName: pending.pending_admin_name,
          adminEmail: user.email,
          termsAccepted: true,
        },
      });
      if (!active) return;
      if (error || !data?.success) {
        setStatus('Não foi possível concluir a clínica. Tente novamente ou contate o suporte.');
        return;
      }
      window.location.replace(`/checkout?planId=${encodeURIComponent(pending.pending_plan_id)}`);
    }
    complete();
    return () => { active = false; };
  }, []);

  const resend = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    await supabase.auth.resend({ type: 'signup', email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/complete-registration` } });
    setStatus('Se o endereço estiver cadastrado, você receberá um novo link de confirmação.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">Concluir cadastro</h1>
        <p className="mt-4 text-gray-700">{status}</p>
        <form onSubmit={resend} className="mt-6 space-y-3">
          <label htmlFor="confirmation-email" className="block text-sm font-medium text-gray-700">Reenviar confirmação</label>
          <input id="confirmation-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Seu e-mail" />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">Reenviar link</button>
        </form>
        <Link to="/" className="mt-6 inline-block text-sm text-blue-700">Voltar à página inicial</Link>
      </div>
    </main>
  );
}
