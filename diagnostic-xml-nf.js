#!/usr/bin/env node
/**
 * Diagnostic script to investigate NF/invoice_number data in ar_invoices
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = new URL('.env', import.meta.url);
const env = {};
fs.readFileSync(envFile, 'utf-8')
  .split('\n')
  .forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDiagnostics() {
  console.log('\n=== 📋 CHECKING TABLE STRUCTURE ===\n');

  // List of potential tables to check
  const tablesToCheck = ['ar_invoices', 'ar_receivables', 'receivables', 'invoices', 'financial_receivables'];

  for (const table of tablesToCheck) {
    try {
      const { data: sample, error: err } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (err) {
        console.log(`❌ ${table}: ${err.message}`);
      } else if (sample && sample.length > 0) {
        console.log(`✅ ${table}: EXISTS and HAS DATA`);
        console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
      } else {
        console.log(`⚠️  ${table}: Exists but appears empty`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
    }
  }

  console.log('\n=== 🔍 QUERYING EACH TABLE ===\n');

  // Now check the tables that exist
  for (const table of tablesToCheck) {
    try {
      const { data: rows, error: err, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(3);

      if (!err && rows && rows.length > 0) {
        console.log(`\n${table} (${count} total rows):`);
        console.log(`Available columns: ${Object.keys(rows[0]).join(', ')}\n`);
        
        rows.forEach((row, idx) => {
          console.log(`  [${idx + 1}]`);
          console.log(`    guide_number: ${row.guide_number || '❌'}`);
          console.log(`    invoice_number: ${row.invoice_number || '(N/A)'}`);
          console.log(`    nf_document_name: ${row.nf_document_name || '(N/A)'}`);
          
          // Check for metadata
          if (row.metadata) {
            const meta = row.metadata;
            if (typeof meta === 'object') {
              console.log(`    metadata.document_extraction.fields:`);
              if (meta.document_extraction?.fields) {
                const f = meta.document_extraction.fields;
                console.log(`      - guide_number: ${f.guide_number || '❌'}`);
                console.log(`      - invoice_number: ${f.invoice_number || '❌'}`);
                console.log(`      - nf_number: ${f.nf_number || '❌'}`);
              } else {
                console.log(`      (no document_extraction.fields)`);
              }
            }
          }
        });
      }
    } catch (e) {
      // Table may not exist
    }
  }

  console.log('\n✅ Diagnostic complete.\n');
}

runDiagnostics().catch(console.error).finally(() => process.exit(0));
