import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  try {
    console.log('🔍 Checando colunas de stock_suppliers...\n');
    
    // Try a simple query first
    const { data: testData, error: testError } = await supabase
      .from('stock_suppliers')
      .select('id, name, cnpj, address')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erro ao queryar (sem street/number):', testError.message);
      console.log('\nPossível causa: street/number colunas faltam');
    } else {
      console.log('✅ Query básica funcionou (id, name, cnpj, address)');
    }
    
    // Try with street/number
    const { data: withStreet, error: streetError } = await supabase
      .from('stock_suppliers')
      .select('id, name, street, number')
      .limit(1);
    
    if (streetError) {
      console.log('❌ Erro ao queryar com street/number:', streetError.message);
      console.log('\n⚠️  As colunas street e number NÃO foram criadas!');
    } else {
      console.log('✅ Query com street/number funcionou');
      console.log('Primeira linha:', withStreet[0]);
    }
    
  } catch (e) {
    console.error('❌ Erro:', e.message);
  }
  process.exit(0);
})();
