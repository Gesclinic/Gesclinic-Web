import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Método inválido.' });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !key) return reply(503, { error: 'Serviço indisponível.' });
  if (!token) return reply(401, { error: 'Não autenticado.' });
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return reply(401, { error: 'Não autenticado.' });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: 'Dados inválidos.' }); }
  const clinicId = String(body.clinic_id || '');
  const { data: profile } = await admin.from('users').select('id, clinic_id, role, status')
    .eq('id', user.id).maybeSingle();
  if (!profile || (profile.status && !['ativo', 'active'].includes(profile.status))) {
    return reply(403, { error: 'Acesso negado.' });
  }
  const { data: company } = await admin.from('companies').select('id')
    .eq('clinic_id', clinicId).maybeSingle();
  const { data: membership } = company
    ? await admin.from('user_companies').select('is_active')
      .eq('user_id', user.id).eq('company_id', company.id).maybeSingle()
    : { data: null };
  const member = membership ? membership.is_active : profile.clinic_id === clinicId;
  if (!member) return reply(403, { error: 'Acesso negado.' });

  if (body.kind === 'whatsapp') {
    const endpoint = Deno.env.get('EVOLUTION_API_URL');
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    const instance = Deno.env.get('EVOLUTION_INSTANCE');
    const number = String(body.number || '');
    const message = String(body.message || '');
    const appointmentId = String(body.appointment_id || '');
    if (!endpoint || !apiKey || !instance) return reply(503, { error: 'Canal indisponível.' });
    if (!/^\d{10,15}$/.test(number) || !message || message.length > 4000) {
      return reply(400, { error: 'Dados inválidos.' });
    }
    const { data: appointment } = await admin.from('appointments').select('id')
      .eq('id', appointmentId).eq('clinic_id', clinicId).maybeSingle();
    if (!appointment) return reply(403, { error: 'Acesso negado.' });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ number, text: message, instance }),
    });
    return response.ok ? reply(200, { success: true })
      : reply(502, { error: 'Falha ao enviar mensagem.' });
  }

  if (body.kind === 'audit-email') {
    if (!['admin', 'gestor', 'financeiro'].includes(profile.role)) {
      return reply(403, { error: 'Acesso negado.' });
    }
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const recipients = Array.isArray(body.emails) ? body.emails.map(String) : [];
    const subject = String(body.subject || '');
    const html = String(body.html || '');
    if (!apiKey) return reply(503, { error: 'Canal indisponível.' });
    if (!recipients.length || recipients.length > 10 ||
        !recipients.every((email) => /^\S+@\S+\.\S+$/.test(email)) ||
        !subject || subject.length > 200 || !html || html.length > 200000) {
      return reply(400, { error: 'Dados inválidos.' });
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL') || 'auditoria@gesclinic.com.br',
        to: recipients, subject, html,
      }),
    });
    if (!response.ok) return reply(502, { error: 'Falha ao enviar relatório.' });
    const result = await response.json();
    return reply(200, { id: result.id });
  }
  return reply(400, { error: 'Ação inválida.' });
});
