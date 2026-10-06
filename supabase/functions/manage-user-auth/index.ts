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
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !serviceKey) return reply(503, { error: 'Serviço indisponível.' });
  if (!token) return reply(401, { error: 'Não autenticado.' });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user: actor }, error: actorError } = await admin.auth.getUser(token);
  if (actorError || !actor) return reply(401, { error: 'Não autenticado.' });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: 'Dados inválidos.' }); }
  const action = body.action;
  const clinicId = String(body.clinic_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(clinicId)) return reply(400, { error: 'Clínica inválida.' });

  const { data: actorProfile } = await admin.from('users')
    .select('id, clinic_id, role, status').eq('id', actor.id).maybeSingle();
  if (!actorProfile || (actorProfile.status && !['ativo', 'active'].includes(actorProfile.status))) {
    return reply(403, { error: 'Acesso negado.' });
  }
  const canAdmin = async (targetClinicId: string) => {
    const { data: companyAccess } = await admin.from('companies')
      .select('id').eq('clinic_id', targetClinicId).maybeSingle();
    const { data: membership } = companyAccess
      ? await admin.from('user_companies').select('role, is_active')
        .eq('user_id', actor.id).eq('company_id', companyAccess.id).maybeSingle()
      : { data: null };
    return membership
      ? membership.is_active && membership.role === 'admin'
      : actorProfile.role === 'admin' && actorProfile.clinic_id === targetClinicId;
  };
  const authorized = await canAdmin(clinicId);
  if (!authorized) return reply(403, { error: 'Acesso negado.' });

  const password = body.password;
  if ((action === 'create' || action === 'set-password' || password) &&
      (typeof password !== 'string' || password.length < 12 || password.length > 1024)) {
    return reply(400, { error: 'A senha deve ter pelo menos 12 caracteres.' });
  }

  if (action === 'update') {
    const targetId = String(body.user_id || '');
    const { data: target } = await admin.from('users').select('id, email, clinic_id')
      .eq('id', targetId).maybeSingle();
    if (!target || !(await canAdmin(target.clinic_id))) {
      return reply(403, { error: 'Acesso negado.' });
    }
    const fields = body.fields as Record<string, unknown>;
    if (!fields || typeof fields !== 'object' || fields.clinic_id !== clinicId) {
      return reply(400, { error: 'Dados inválidos.' });
    }
    const email = String(fields.email || '').trim().toLowerCase();
    const role = String(fields.role || '');
    if (!/^\S+@\S+\.\S+$/.test(email) ||
        !['admin', 'recepcao', 'gestor', 'medico', 'enfermeiro',
          'tecnico_enfermagem', 'multiprofissional', 'profissional',
          'faturamento', 'estoque', 'financeiro', 'contabilidade'].includes(role)) {
      return reply(400, { error: 'Dados inválidos.' });
    }
    if (email !== target.email) {
      const { error: authEmailError } = await admin.auth.admin.updateUserById(target.id, {
        email, email_confirm: true,
      });
      if (authEmailError) return reply(409, { error: 'Não foi possível atualizar o e-mail.' });
    }
    const { error: updateError } = await admin.from('users').update({
      full_name: String(fields.full_name || ''), email,
      username: String(fields.username || ''), cpf: fields.cpf || null,
      birthdate: fields.birthdate || null, role, clinic_id: clinicId,
      updated_at: new Date().toISOString(),
    }).eq('id', target.id);
    if (updateError) {
      if (email !== target.email) {
        await admin.auth.admin.updateUserById(target.id, { email: target.email, email_confirm: true });
      }
      return reply(409, { error: 'Não foi possível atualizar o usuário.' });
    }
    if (password) {
      const { error: authPasswordError } = await admin.auth.admin.updateUserById(target.id, { password });
      if (authPasswordError) return reply(409, { error: 'Perfil atualizado; senha requer reconciliação.' });
    }
    return reply(200, { success: true });
  }

  if (action === 'set-password') {
    const targetId = String(body.user_id || '');
    const { data: target } = await admin.from('users')
      .select('id').eq('id', targetId).eq('clinic_id', clinicId).maybeSingle();
    if (!target) return reply(404, { error: 'Usuário não encontrado.' });
    const { error } = await admin.auth.admin.updateUserById(target.id, { password });
    return error ? reply(409, { error: 'Conta requer reconciliação no Supabase Auth.' })
      : reply(200, { success: true });
  }

  if (action !== 'create') return reply(400, { error: 'Ação inválida.' });
  const email = String(body.email || '').trim().toLowerCase();
  const username = String(body.username || '').trim();
  const fullName = String(body.full_name || '').trim();
  const role = String(body.role || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !username || !fullName ||
      !['admin', 'recepcao', 'gestor', 'medico', 'enfermeiro', 'tecnico_enfermagem',
        'multiprofissional', 'profissional', 'faturamento', 'estoque', 'financeiro',
        'contabilidade'].includes(role)) {
    return reply(400, { error: 'Dados inválidos.' });
  }
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (createError || !created.user) return reply(409, { error: 'Não foi possível criar a conta.' });

  const { error: insertError } = await admin.from('users').insert({
    id: created.user.id, email, full_name: fullName, name: fullName,
    username, cpf: body.cpf || null, birthdate: body.birthdate || null,
    role, clinic_id: clinicId, status: 'ativo',
  });
  if (insertError) return reply(409, { error: 'Conta Auth criada; perfil requer reconciliação.' });

  const { data: company } = await admin.from('companies')
    .select('id, tenant_id, default_branch_id').eq('clinic_id', clinicId).maybeSingle();
  if (company) {
    await admin.from('user_companies').insert({
      user_id: created.user.id, tenant_id: company.tenant_id,
      company_id: company.id, branch_id: company.default_branch_id,
      role, is_active: true,
    });
  }
  return reply(201, { success: true, user_id: created.user.id });
});
