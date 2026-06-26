import { createClient } from '@supabase/supabase-js';

const url = 'https://gvdkdjyupktlflwurike.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA';
const client = createClient(url, key);

(async () => {
  console.log('🔍 Looking for ar_invoices (table vs view)...\n');
  
  // Check what type of object ar_invoices is
  const { data: tables } = await client
    .from('information_schema.tables')
    .select('table_name, table_schema, table_type')
    .eq('table_schema', 'public')
    .in('table_name', ['ar_invoices', 'ar_receivables', 'receivable_invoices']);
  
  console.log('📋 Tables found:', tables?.map(t => `${t.table_name} (${t.table_type})`).join(', ') || 'None');
  
  // Check for views
  const { data: views } = await client
    .from('information_schema.views')
    .select('table_name, table_schema')
    .eq('table_schema', 'public')
    .in('table_name', ['ar_invoices', 'ar_receivables', 'receivable_invoices']);
  
  console.log('👁️  Views found:', views?.map(v => v.table_name).join(', ') || 'None');
  
  // If ar_invoices is a view, check its definition
  if (views?.find(v => v.table_name === 'ar_invoices')) {
    const { data: viewDef } = await client
      .from('information_schema.views')
      .select('view_definition')
      .eq('table_name', 'ar_invoices')
      .eq('table_schema', 'public');
    
    console.log('\n🔍 ar_invoices VIEW DEFINITION:');
    console.log(viewDef?.[0]?.view_definition || 'Not found');
  }
  
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
