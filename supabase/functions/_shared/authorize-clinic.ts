import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

export async function authorizeClinic(req: Request, clinicId: string, roles: string[]) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return { status: 503 as const, admin: null };
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { status: 401 as const, admin: null };
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return { status: 401 as const, admin: null };
  const { data: profile, error: profileError } = await admin.from('users')
    .select('clinic_id, role, status').eq('id', user.id).maybeSingle();
  if (profileError || !profile || (profile.status && !['ativo', 'active'].includes(profile.status)) ||
      profile.clinic_id !== clinicId || !roles.includes(profile.role)) {
    return { status: 403 as const, admin: null };
  }
  const { data: company, error: companyError } = await admin.from('companies')
    .select('id').eq('clinic_id', clinicId).maybeSingle();
  if (companyError) return { status: 503 as const, admin: null };
  if (company) {
    const { data: membership, error: membershipError } = await admin.from('user_companies')
      .select('role, is_active').eq('company_id', company.id).eq('user_id', user.id).maybeSingle();
    if (membershipError || !membership?.is_active || !roles.includes(membership.role)) {
      return { status: 403 as const, admin: null };
    }
  }
  return { status: 200 as const, admin, user };
}
