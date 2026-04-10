#!/usr/bin/env node
/**
 * 🗑️ SCRIPT DE LIMPEZA - Deletar todos os agendamentos
 * 
 * Uso: npm run clean:appointments
 * ou
 * node scripts/clean-appointments.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAppointments() {
  try {
    console.log('🔍 Verificando agendamentos existentes...');
    
    // 1. Contar antes de deletar
    const { count: countBefore, error: countError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar agendamentos:', countError);
      return;
    }
    
    console.log(`📊 Total de agendamentos antes: ${countBefore}`);
    
    if (countBefore === 0) {
      console.log('✅ Nenhum agendamento para deletar');
      return;
    }
    
    // 2. Deletar todos
    console.log('🗑️  Deletando todos os agendamentos...');
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .neq('id', 'null'); // Delete everything
    
    if (deleteError) {
      console.error('❌ Erro ao deletar agendamentos:', deleteError);
      return;
    }
    
    // 3. Confirmar deleção
    const { count: countAfter, error: countAfterError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true });
    
    if (countAfterError) {
      console.error('❌ Erro ao verificar:', countAfterError);
      return;
    }
    
    console.log(`📊 Total de agendamentos depois: ${countAfter}`);
    console.log('\n✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log(`   ${countBefore} agendamentos foram deletados`);
    
  } catch (err) {
    console.error('💥 Erro inesperado:', err);
    process.exit(1);
  }
}

cleanAppointments();
