/**
 * Fix para Sexta-feira Santa - Garantir que seja obrigatória
 * Execute no console: copy/paste todo código
 */

const SUPABASE_URL = 'https://xpyxvjvqtlfpsqfwomne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXh2anZxdGxmcHNxZndvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxNzcxODYsImV4cCI6MTc3MDcxMzE4Nn0.rn8Hg0U4eT3LXdPVK_8_6Uh-k8sOo_9K9LLQ9JfErMQ';

async function fixEasterFriday() {
  try {
    console.log('🎭 Verificando Sexta-feira Santa...');

    // DELETE
    const deleteUrl = `${SUPABASE_URL}/rest/v1/holidays?date=eq.2026-04-03&scope=eq.NACIONAL`;
    const delRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
    });
    console.log('🗑️ Delete:', delRes.status);

    // INSERT
    const insertUrl = `${SUPABASE_URL}/rest/v1/holidays`;
    const insRes = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        { date: '2026-04-03', name: 'Sexta-feira Santa', scope: 'NACIONAL', is_blocked: true, is_mandatory: true, clinic_id: null },
      ]),
    });
    console.log('✅ Insert:', insRes.status);

    if (insRes.ok) {
      console.log('✅ Sexta-feira Santa corrigida! Recarregando...');
      setTimeout(() => window.location.reload(), 1500);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixEasterFriday();
