import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Get clinic context
const { data: { user } } = await supabase.auth.getUser();
console.log('🔍 Usuário:', user?.email);

// Get clinic ID from first clinic user has access to
const { data: userClinic } = await supabase
  .from('user_clinic_roles')
  .select('clinic_id')
  .limit(1)
  .single();

const clinicId = 'dcee437c-fd14-463c-b25e-a318f5da60b7'; // From error message
console.log('🏥 Clinic ID:', clinicId);

// Create a test supplier with street and number (simulating XML import)
const testSupplier = {
  clinic_id: clinicId,
  name: '🧪 TEST SUPPLIER - RUA PREENCHIDA LTDA',
  cnpj: '12345678000199',
  street: 'Rua das Flores',
  number: '123',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zip_code: '01234567',
  contact_person: 'João Silva',
  contact_email: 'joao@teste.com',
  contact_phone: '1199999999',
  address: 'Rua das Flores, 123 - Centro - São Paulo, SP - 01234567',
  active: true,
};

console.log('\n📋 Tentando inserir fornecedor com street e number:');
console.log(JSON.stringify(testSupplier, null, 2));

const { data: inserted, error: insertError } = await supabase
  .from('stock_suppliers')
  .insert([testSupplier])
  .select();

if (insertError) {
  console.log('❌ Erro ao inserir:', insertError.message);
} else {
  console.log('✅ Fornecedor criado com sucesso!');
  console.log('\n📊 Dados inseridos:');
  console.log(JSON.stringify(inserted[0], null, 2));
  
  // Verify street and number were saved
  const supplier = inserted[0];
  console.log('\n✓ street:', supplier.street);
  console.log('✓ number:', supplier.number);
  console.log('✓ address:', supplier.address);
  
  if (supplier.street === 'Rua das Flores' && supplier.number === '123') {
    console.log('\n✅ SUCCESS: Street e number foram persistidos corretamente!');
  } else {
    console.log('\n❌ FAIL: Street/number não foram salvos');
  }
}
