/**
 * SCRIPT DE DIAGNÓSTICO - Verificar appointment_id em ar_receivables
 * Copie a saída e compartilhe o resultado
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnostico() {
  console.log('🔍 DIAGNÓSTICO: Verificando appointment_id em ar_receivables...\n');
  
  try {
    const { data, error } = await supabase
      .from('ar_receivables')
      .select('id, appointment_id, payer_name, valor_bruto')
      .limit(5);
    
    if (error) {
      console.log('❌ ERRO:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum registro encontrado em ar_receivables');
      return;
    }
    
    console.log(`✅ Encontrados ${data.length} registros:\n`);
    console.log('═══════════════════════════════════════════════════════════');
    
    data.forEach((row, idx) => {
      console.log(`\n📋 REGISTRO #${idx + 1}:`);
      console.log(`   ID da Conta:     ${row.id}`);
      console.log(`   Appointment ID:  ${row.appointment_id || '❌ NULL (PROBLEMA!)'}`);
      console.log(`   Nome Pagador:    ${row.payer_name}`);
      console.log(`   Valor:           R$ ${row.valor_bruto}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════');
    
    // DIAGNÓSTICO
    const comAppointmentId = data.filter(r => r.appointment_id).length;
    const semAppointmentId = data.filter(r => !r.appointment_id).length;
    
    console.log('\n📊 RESULTADO DO DIAGNÓSTICO:');
    console.log(`   ✅ Com appointment_id:    ${comAppointmentId}`);
    console.log(`   ❌ SEM appointment_id:    ${semAppointmentId}`);
    
    if (semAppointmentId > 0) {
      console.log('\n⚠️ PROBLEMA ENCONTRADO: appointment_id está vazio!');
      console.log('   Próximo passo: Revisar financialCheckInApi.js');
    } else {
      console.log('\n✅ NAVEGAÇÃO DEVERIA FUNCIONAR: appointment_id está preenchido!');
      console.log('   Problema está em outro lugar (componente Agenda)');
    }
    
  } catch (err) {
    console.error('❌ ERRO FATAL:', err.message);
  }
}

diagnostico();
