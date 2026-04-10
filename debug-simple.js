// 🔍 Debug simples - Cole no console
(async () => {
  // Usar supabase do app
  const { supabase } = window.__app || {};
  
  if (!supabase) {
    console.log('Tentando usar fetch direto...');
    const SUPABASE_URL = 'https://xpyxvjvqtlfpsqfwomne.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXh2anZxdGxmcHNxZndvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0NzIyMzAsImV4cCI6MjA0OTA0ODIzMH0.2sLLHg2dXm5CG3Lf_2KXhLvZWLx0MnpWMhgLJItzz8M';

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/holidays?scope=eq.NACIONAL&date=gte.2026-04-01&date=lte.2026-04-10`,
      { headers: { 'apikey': SUPABASE_KEY } }
    );
    const data = await res.json();
    console.table(data);
    return;
  }

  console.log('✅ Usando supabase do app');
  const { data } = await supabase
    .from('holidays')
    .select('*')
    .eq('scope', 'NACIONAL')
    .gte('date', '2026-04-01')
    .lte('date', '2026-04-10');
  
  console.table(data);
})();
