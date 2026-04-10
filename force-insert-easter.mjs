#!/usr/bin/env node

// 🔧 Force insert Sexta-feira Santa direto no banco
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpyxvjvqtlfpsqfwomne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXh2anZxdGxmcHNxZndvbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0NzIyMzAsImV4cCI6MjA0OTA0ODIzMH0.2sLLHg2dXm5CG3Lf_2KXhLvZWLx0MnpWMhgLJItzz8M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  console.log('🔍 Buscando Sexta-feira Santa...');
  
  const { data: existing, error: selectError } = await supabase
    .from('holidays')
    .select('*')
    .eq('date', '2026-04-03')
    .eq('scope', 'NACIONAL');

  if (selectError) {
    console.error('❌ Erro ao buscar:', selectError);
    return;
  }

  if (existing.length > 0) {
    console.log('✅ Sexta-feira Santa já existe:', existing[0]);
    
    // Verificar se está correta
    const holiday = existing[0];
    if (holiday.is_blocked === true && holiday.is_mandatory === true) {
      console.log('✅ Valores estão corretos!');
    } else {
      console.log('⚠️  Corrigindo valores...');
      const { error: updateError } = await supabase
        .from('holidays')
        .update({
          is_blocked: true,
          is_mandatory: true
        })
        .eq('id', holiday.id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError);
      } else {
        console.log('✅ Corrigido!');
      }
    }
  } else {
    console.log('❌ Sexta-feira Santa NÃO EXISTE. Inserindo...');
    
    const { data: inserted, error: insertError } = await supabase
      .from('holidays')
      .insert({
        date: '2026-04-03',
        name: 'Sexta-feira Santa',
        scope: 'NACIONAL',
        is_blocked: true,
        is_mandatory: true,
        clinic_id: null
      })
      .select();

    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
    } else {
      console.log('✅ Inserido com sucesso:', inserted[0]);
    }
  }
})();
