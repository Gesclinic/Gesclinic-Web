const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Credenciais do Supabase não configuradas');
  console.error('Verificar .env: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('⏳ Conectando ao Supabase...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Read the migration SQL
    const fs = require('fs');
    const migrationSQL = fs.readFileSync('supabase/migrations/20260623_split_stock_suppliers_address.sql', 'utf8');

    console.log('⏳ Aplicando migração...\n');

    // Execute using RPC or raw query
    const { error } = await supabase.rpc('exec', { 
      sql_string: migrationSQL 
    }).then(r => r, e => ({ error: e }));

    if (error && error.message && error.message.includes('exec')) {
      // RPC doesn't exist, try direct query approach
      console.log('ℹ️  RPC não disponível, tentando método alternativo...\n');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed) continue;
        
        const { error: execError } = await supabase.from('stock_suppliers').insert([{fake: true}]).select().then(
          () => ({ error: null }),
          () => ({ error: null }) // Just check connection
        );
      }
      
      console.log('⚠️  Não foi possível aplicar via API Supabase');
      console.log('Por favor execute manualmente no Supabase SQL Editor:\n');
      console.log(migrationSQL);
      process.exit(1);
    }

    if (error) {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    }

    console.log('✅ Migração aplicada com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Atualize a página do navegador (F5)');
    console.log('2. Importe um fornecedor via XML do módulo de Contas a Pagar');
    console.log('3. Verifique se o campo "Rua" agora é preenchido automaticamente\n');

  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    console.log('\nPor favor execute manualmente no Supabase SQL Editor:');
    const fs = require('fs');
    const migrationSQL = fs.readFileSync('supabase/migrations/20260623_split_stock_suppliers_address.sql', 'utf8');
    console.log(migrationSQL);
    process.exit(1);
  }
}

applyMigration();
