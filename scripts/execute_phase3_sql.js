/**
 * PHASE 3: Execute SQL Integrity Validation Queries
 * Clínica: Neuroclinica Cascavel LTDA
 * Clinic ID: dcee437c-fd14-463c-b25e-a318f5da60b7
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: ['.env', '.env.local'] });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const CLINIC_ID = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

async function executePhase3Queries() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PHASE 3: SQL INTEGRITY VALIDATION QUERIES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // QUERY 1: Check Database Timezone
    console.log('📋 QUERY 1: Verificar Timezone do Banco');
    console.log('─────────────────────────────────────────────────────────────');
    const result1 = await supabase.rpc('get_database_timezone');
    if (result1.error) {
      console.log('⚠️  RPC not available, skipping timezone check');
    } else {
      console.log('Timezone:', result1.data);
    }
    console.log();

    // QUERY 2: Check Appointment Date/Time Consistency
    console.log('📋 QUERY 2: Consistência de Datas e Horários');
    console.log('─────────────────────────────────────────────────────────────');
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', CLINIC_ID)
      .neq('status', 'cancelled');

    const stats = {
      total: appointments?.length || 0,
      valid_dates: appointments?.filter(a => a.scheduled_date)?.length || 0,
      valid_times: appointments?.filter(a => a.scheduled_time)?.length || 0,
      earliest_date: appointments?.length > 0 ? appointments.reduce((min, a) => a.scheduled_date < min.scheduled_date ? a : min).scheduled_date : null,
      latest_date: appointments?.length > 0 ? appointments.reduce((max, a) => a.scheduled_date > max.scheduled_date ? a : max).scheduled_date : null,
    };

    console.log(`Total: ${stats.total}`);
    console.log(`Datas válidas: ${stats.valid_dates}`);
    console.log(`Horários válidos: ${stats.valid_times}`);
    console.log(`Earliest: ${stats.earliest_date}`);
    console.log(`Latest: ${stats.latest_date}`);
    console.log();

    // QUERY 3: Check Time Format
    console.log('📋 QUERY 3: Formato de Horários (HH:MM)');
    console.log('─────────────────────────────────────────────────────────────');
    if (appointments && appointments.length > 0) {
      appointments.slice(0, 5).forEach(app => {
        const timeFormat = app.scheduled_time && /^\d{2}:\d{2}/.test(app.scheduled_time) ? 'Valid' : 'Invalid';
        const endTimeFormat = app.end_time && /^\d{2}:\d{2}/.test(app.end_time) ? 'Valid' : 'Invalid';
        console.log(`ID: ${app.id.substring(0, 8)}... Time: ${app.scheduled_time} (${timeFormat}) End: ${app.end_time} (${endTimeFormat})`);
      });
    } else {
      console.log('✅ Nenhum agendamento encontrado');
    }
    console.log();

    // QUERY 4: Check for Future Appointments (> 1 year)
    console.log('📋 QUERY 4: Detectar Problemas de Timezone (Datas futuras demais)');
    console.log('─────────────────────────────────────────────────────────────');
    const futureThreshold = new Date();
    futureThreshold.setFullYear(futureThreshold.getFullYear() + 1);
    
    const futureAppts = appointments?.filter(a => 
      a.scheduled_date && new Date(a.scheduled_date) > futureThreshold
    ) || [];
    
    console.log(`Agendamentos > 1 ano no futuro: ${futureAppts.length}`);
    if (futureAppts.length > 0) {
      console.log(`⚠️  WARNING: Encontrados ${futureAppts.length} agendamentos muito no futuro!`);
    } else {
      console.log('✅ Nenhum agendamento anormalmente no futuro');
    }
    console.log();

    // QUERY 5 & 6: Validate Appointments
    console.log('📋 QUERY 5 & 6: Função de Validação de Timezone');
    console.log('─────────────────────────────────────────────────────────────');
    
    let invalidCount = 0;
    const validationIssues = [];

    appointments?.forEach(app => {
      const issues = [];
      if (!app.scheduled_date) issues.push('scheduled_date is NULL');
      if (!app.scheduled_time) issues.push('scheduled_time is NULL');
      if (app.scheduled_time && app.end_time && app.scheduled_time > app.end_time) {
        issues.push('scheduled_time > end_time');
      }

      if (issues.length > 0) {
        invalidCount++;
        validationIssues.push({
          id: app.id.substring(0, 8),
          issues: issues.join(', ')
        });
      }
    });

    console.log(`✅ Total agendamentos validados: ${appointments?.length || 0}`);
    console.log(`❌ Agendamentos com problemas: ${invalidCount}`);
    if (validationIssues.length > 0) {
      console.log('\n⚠️  Issues encontradas:');
      validationIssues.slice(0, 5).forEach(issue => {
        console.log(`   ID: ${issue.id}... Issues: ${issue.issues}`);
      });
    }
    console.log();

    // QUERY 7: Check for Invalid Times
    console.log('📋 QUERY 7: Agendamentos com Horários Inválidos');
    console.log('─────────────────────────────────────────────────────────────');
    
    let invalidTimes = 0;
    appointments?.forEach(app => {
      if (app.scheduled_time) {
        const timeStr = app.scheduled_time;
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        if (hours > 23 || minutes > 59) {
          invalidTimes++;
          console.log(`   ID: ${app.id.substring(0, 8)}... Time: ${timeStr} (INVALID)`);
        }
      }
    });

    if (invalidTimes === 0) {
      console.log('✅ Nenhum horário inválido encontrado');
    } else {
      console.log(`❌ ${invalidTimes} horários inválidos encontrados`);
    }
    console.log();

    // QUERY 8: Summary Report
    console.log('📋 QUERY 8: Resumo de Timezone - Prontidão para Phase 3');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const summary = {
      'Database Timezone': 'UTC (assumed)',
      'Total Appointments': stats.total.toString(),
      'Valid Dates': stats.valid_dates.toString(),
      'Valid Times': stats.valid_times.toString(),
      'Time Format Issues': appointments?.filter(a => a.scheduled_time && !/^\d{2}:\d{2}/.test(a.scheduled_time))?.length || 0,
      'Invalid Time Values': invalidTimes.toString(),
      'Data Integrity Issues': invalidCount.toString(),
      'Future Appointments (>1 year)': futureAppts.length.toString(),
    };

    Object.entries(summary).forEach(([key, value]) => {
      const status = value === '0' ? '✅' : '⚠️ ';
      console.log(`${status} ${key}: ${value}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ PHASE 3: SQL Validation Complete!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
  }
}

// Run
executePhase3Queries();
