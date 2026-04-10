/**
 * Script de correção para Carnaval 2026
 * Execute no console do navegador: copy/paste todo o código
 */

// Usando fetch direto para a API do Supabase (sem precisa de autenticação prévia)
const SUPABASE_URL = 'https://xpyxvjvqtlfpsqfwomne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXh2anZxdGxmcHNxZndvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxNzcxODYsImV4cCI6MTc3MDcxMzE4Nn0.rn8Hg0U4eT3LXdPVK_8_6Uh-k8sOo_9K9LLQ9JfErMQ';

async function fixCarnival() {
  try {
    console.log('🎭 Iniciando correção de Carnaval...');

    // Delete Carnaval antigos
    const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/holidays?date=in.("2026-02-13","2026-02-14","2026-02-17")&scope=eq.NACIONAL`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    });

    console.log(`🗑️ Delete response:`, deleteRes.status);

    // Insert novos Carnaval
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/holidays`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify([
        { date: '2026-02-13', name: 'Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null },
        { date: '2026-02-14', name: 'Sexta-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null },
        { date: '2026-02-17', name: 'Terça-feira de Carnaval', scope: 'NACIONAL', is_blocked: false, is_mandatory: false, clinic_id: null },
      ]),
    });

    const insertData = await insertRes.json();
    console.log(`✅ Insert response:`, insertRes.status, insertData);

    if (insertRes.ok) {
      console.log('✅ Carnaval corrigido! Recarregando em 2s...');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      console.error('❌ Erro na inserção:', insertData);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
fixCarnival();
