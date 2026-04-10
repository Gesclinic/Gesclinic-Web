// 🔍 Copie e cole TUDO isto no Console (F12) do seu browser para DEBUG

(async () => {
  console.group('🔧 VERIFICAÇÃO DE DEBUG - CARTEIRINHA');
  
  // 1. Verificar se Supabase está carregado
  const supabaseAvailable = typeof window !== 'undefined' && window.supabase !== undefined;
  console.log('✅ Supabase disponível?', supabaseAvailable);
  
  // 2. Verificar um appointment
  if (supabaseAvailable) {
    try {
      const { data, error } = await window.supabase
        .from('appointments')
        .select('id, card_number, authorization_number, clinic_id')
        .limit(1)
        .single();
      
      console.log('📥 Último appointment:', { data, error });
      
      // 3. Tentar update
      if (data && data.id) {
        console.log('\n📤 Testando UPDATE com ID:', data.id);
        
        const { data: updateData, error: updateError } = await window.supabase
          .from('appointments')
          .update({ card_number: 'TESTE_' + new Date().getTime() })
          .eq('id', data.id)
          .select();
        
        console.log('📥 Resultado UPDATE:', { 
          sucesso: !updateError,
          cardNumberNovo: updateData?.[0]?.card_number,
          erro: updateError?.message
        });
      }
    } catch (err) {
      console.error('❌ Erro:', err);
    }
  }
  
  console.groupEnd();
})();
