// Script para aplicar a migração de split address direto no Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('⏳ Aplicando migração para adicionar street e number campos...\n');

    // Execute the raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.stock_suppliers
        ADD COLUMN IF NOT EXISTS street TEXT,
        ADD COLUMN IF NOT EXISTS number TEXT;

        COMMENT ON COLUMN public.stock_suppliers.street IS 'Rua/Logradouro do fornecedor (extraído do endereço ou XML)';
        COMMENT ON COLUMN public.stock_suppliers.number IS 'Número do logradouro';
        COMMENT ON COLUMN public.stock_suppliers.address IS 'Endereço completo - Mantido para compatibilidade legada';
      `
    });

    if (error) {
      console.error('❌ Erro ao aplicar migração:', error.message);
      process.exit(1);
    }

    console.log('✅ Migração aplicada com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Importe um fornecedor via XML do módulo de Contas a Pagar');
    console.log('2. Verifique se o campo "Rua" agora é preenchido automaticamente');
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
  }
}

applyMigration();
