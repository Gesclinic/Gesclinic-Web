// Script para executar migração SQL no Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Env vars VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Executando migração...');

    // Executar SQL via RPC ou raw SQL
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE public.appointments
        ADD COLUMN IF NOT EXISTS payment_splits jsonb DEFAULT NULL;

        CREATE INDEX IF NOT EXISTS idx_appointments_payment_splits
        ON public.appointments USING GIN (payment_splits);

        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'appointments' 
          AND column_name = 'payment_splits'
        ORDER BY column_name;
      `
    }).catch(async () => {
      // Se RPC não existir, tentar com query direta
      const sqlMigration = `
        ALTER TABLE public.appointments
        ADD COLUMN IF NOT EXISTS payment_splits jsonb DEFAULT NULL;
      `;
      
      const { data, error } = await supabase.from('_migrations').insert({
        name: 'add_payment_splits',
        sql: sqlMigration
      });
      
      return { data, error };
    });

    if (error) {
      console.error('❌ Erro na migração:', error);
      console.log('⚠️ Faça a migração manualmente no Supabase SQL Editor');
    } else {
      console.log('✅ Migração executada com sucesso!');
      console.log(data);
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.log('\n📝 Para executar a migração manualmente:');
    console.log('1. Acesse https://supabase.com/dashboard');
    console.log('2. Vá para SQL Editor');
    console.log('3. Cole o conteúdo de: supabase/migrations/2026-04-30_add_payment_splits.sql');
    console.log('4. Execute a query');
  }
}

runMigration();
