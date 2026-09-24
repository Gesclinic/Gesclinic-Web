import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// Retired: this endpoint accepted a reversible Base64 password and could overwrite
// Supabase Auth credentials. Keep the route closed during the migration window.
serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      },
    });
  }
  return new Response(JSON.stringify({ error: 'Endpoint desativado' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
});
