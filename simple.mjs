import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://gvdkdjyupktlflwurike.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A');

// Listar todos os convênios
console.log('=== PAYERS ===');
const { data: payers } = await supabase.from('payers').select('*').order('name');
payers?.forEach(p => console.log(`${p.name} - ID: ${p.id} - Ativo: ${p.active}`));

// Listar appointements com patients
console.log('\n=== APPOINTMENTS ===');
const { data: apts } = await supabase.from('appointments').select('id, scheduled_date, scheduled_time, payer_id, patients(name)').limit(10);
apts?.forEach(a => console.log(`${a.scheduled_date} ${a.scheduled_time} - ${a.patients?.name} - Payer: ${a.payer_id}`));

