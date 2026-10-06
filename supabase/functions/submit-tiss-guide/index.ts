import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { authorizeClinic } from '../_shared/authorize-clinic.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Método inválido.' });
  let body: { clinic_id?: string; guide_id?: string };
  try { body = await req.json(); } catch { return reply(400, { error: 'Dados inválidos.' }); }
  const clinicId = String(body.clinic_id || '');
  const guideId = String(body.guide_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(clinicId) || !guideId || guideId.length > 100) {
    return reply(400, { error: 'Dados inválidos.' });
  }
  const access = await authorizeClinic(req, clinicId, ['admin', 'gestor', 'financeiro', 'faturamento']);
  if (access.status !== 200 || !access.admin) return reply(access.status, { error: 'Acesso negado.' });
  const db = access.admin;
  const { data: guide, error: guideError } = await db.from('billing_guides')
    .select('id, health_insurances(id, name, tiss_endpoint, tiss_username, tiss_password, submission_method)')
    .eq('id', guideId).eq('clinic_id', clinicId).maybeSingle();
  if (guideError || !guide) return reply(404, { error: 'Guia indisponível.' });
  const payer = Array.isArray(guide.health_insurances)
    ? guide.health_insurances[0] : guide.health_insurances;
  if (!payer || !['', 'api', 'http'].includes(String(payer.submission_method || '').toLowerCase())) {
    return reply(400, { error: 'Envio HTTP não configurado.' });
  }
  let endpoint: URL;
  try { endpoint = new URL(payer.tiss_endpoint); } catch { return reply(400, { error: 'Endpoint inválido.' }); }
  const allowedHosts = (Deno.env.get('TISS_ALLOWED_HOSTS') || '').split(',')
    .map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (endpoint.protocol !== 'https:' || !allowedHosts.includes(endpoint.hostname.toLowerCase()) ||
      endpoint.username || endpoint.password) {
    return reply(503, { error: 'Operadora não autorizada para envio.' });
  }
  const { data: submission, error: submissionError } = await db.from('tiss_submissions')
    .select('id, xml_content').eq('guide_id', guideId).eq('clinic_id', clinicId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (submissionError || !submission?.xml_content || submission.xml_content.length > 2_000_000) {
    return reply(400, { error: 'Guia TISS não preparada.' });
  }
  try {
    const provider = await fetch(endpoint, {
      method: 'POST', redirect: 'error',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${btoa(`${payer.tiss_username}:${payer.tiss_password}`)}`,
      },
      body: submission.xml_content,
      signal: AbortSignal.timeout(30_000),
    });
    if (!provider.ok) return reply(502, { error: 'Operadora recusou a guia.' });
    const raw = await provider.text();
    let providerResult: Record<string, unknown> = {};
    try { providerResult = JSON.parse(raw.slice(0, 100_000)); } catch { providerResult = { acknowledged: true }; }
    const { error: updateError } = await db.from('tiss_submissions').update({
      status: 'sent', response_data: providerResult,
    }).eq('id', submission.id).eq('clinic_id', clinicId);
    if (updateError) throw updateError;
    const { error: guideUpdateError } = await db.from('billing_guides').update({
      status: 'submitted', last_submission_at: new Date().toISOString(),
    }).eq('id', guideId).eq('clinic_id', clinicId);
    if (guideUpdateError) throw guideUpdateError;
    return reply(200, { success: true, method: 'http', submissionId: submission.id,
      message: 'Guia enviada via HTTP API' });
  } catch {
    return reply(502, { error: 'Falha ao enviar guia à operadora.' });
  }
});
