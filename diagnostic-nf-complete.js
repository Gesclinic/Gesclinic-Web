#!/usr/bin/env node
/**
 * Comprehensive diagnostic for NF/invoice_number extraction from XML imports
 * Checks: schema, actual data, metadata structure, extraction functions
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

async function checkTableSchema() {
  console.log('\n=== 1. AR_INVOICES TABLE SCHEMA ===\n');
  
  try {
    const { data, error } = await supabase
      .from('ar_invoices')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const cols = Object.keys(data[0]);
      console.log('✅ Columns found:');
      cols.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log(`\n✅ Total: ${cols.length} columns`);
    } else {
      console.log('⚠️  Table is EMPTY (0 records)');
    }
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

async function checkSampleData() {
  console.log('\n=== 2. SAMPLE DATA FROM AR_INVOICES ===\n');
  
  try {
    const { data, error, count } = await supabase
      .from('ar_invoices')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log(`📊 Total records in ar_invoices: ${count || 0}`);
    
    if (data && data.length > 0) {
      data.forEach((row, idx) => {
        console.log(`\n[${idx + 1}] Record ID: ${row.id?.substring(0, 8)}...`);
        console.log(`    guide_number: ${row.guide_number || '❌ NULL'}`);
        console.log(`    nf_document_name: ${row.nf_document_name || 'N/A'}`);
        console.log(`    description: ${(row.description || '').substring(0, 50)}`);
        console.log(`    amount: ${row.amount}`);
        console.log(`    created_at: ${row.created_at?.substring(0, 19)}`);
        
        if (row.metadata && typeof row.metadata === 'object') {
          console.log(`    \nmetadata structure:`);
          console.log(`      Keys: ${Object.keys(row.metadata).join(', ')}`);
          
          if (row.metadata.document_extraction?.fields) {
            const fields = row.metadata.document_extraction.fields;
            console.log(`      ✓ document_extraction.fields exists`);
            console.log(`        - guide_number: ${fields.guide_number || '❌'}`);
            console.log(`        - invoice_number: ${fields.invoice_number || '❌'}`);
            console.log(`        - nf_number: ${fields.nf_number || '❌'}`);
            console.log(`        - numero_guia: ${fields.numero_guia || '❌'}`);
            console.log(`        - (total fields: ${Object.keys(fields).length})`);
          } else {
            console.log(`      ❌ document_extraction.fields NOT FOUND`);
          }

          if (row.metadata.source_file_name) {
            console.log(`      - source_file_name: ${row.metadata.source_file_name}`);
          }
        }
      });
    }
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

async function checkDataDistribution() {
  console.log('\n=== 3. DATA DISTRIBUTION & NF STATUS ===\n');
  
  try {
    const { data, error } = await supabase
      .from('ar_invoices')
      .select('guide_number, nf_document_name, metadata');

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ No data to analyze');
      return;
    }

    const total = data.length;
    const withGuideNumber = data.filter(r => r.guide_number).length;
    const withNfDocName = data.filter(r => r.nf_document_name).length;
    const withMetadata = data.filter(r => r.metadata && typeof r.metadata === 'object').length;
    const withExtraction = data.filter(r => r.metadata?.document_extraction?.fields).length;
    const withExtractedGuide = data.filter(r => r.metadata?.document_extraction?.fields?.guide_number).length;

    console.log(`Total records: ${total}`);
    console.log(`  ✓ With guide_number: ${withGuideNumber} (${((withGuideNumber/total)*100).toFixed(1)}%)`);
    console.log(`  ✓ With nf_document_name: ${withNfDocName} (${((withNfDocName/total)*100).toFixed(1)}%)`);
    console.log(`  ✓ With metadata object: ${withMetadata} (${((withMetadata/total)*100).toFixed(1)}%)`);
    console.log(`  ✓ With document_extraction.fields: ${withExtraction} (${((withExtraction/total)*100).toFixed(1)}%)`);
    console.log(`  ✓ With extracted guide_number: ${withExtractedGuide} (${((withExtractedGuide/total)*100).toFixed(1)}%)`);

    console.log('\n📋 Data Quality Issues:');
    const missingGuide = total - withGuideNumber;
    const missingExtraction = total - withExtraction;
    console.log(`  ⚠️  Missing guide_number: ${missingGuide} records`);
    console.log(`  ⚠️  Missing extraction data: ${missingExtraction} records`);
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

async function checkAppointmentsTable() {
  console.log('\n=== 4. APPOINTMENTS TABLE (for comparison) ===\n');
  
  try {
    const { data, error, count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .limit(3);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log(`📊 Total records in appointments: ${count || 0}`);
    
    if (data && data.length > 0) {
      console.log(`✓ Sample columns: ${Object.keys(data[0]).slice(0, 10).join(', ')}`);
      
      // Check if guide_number exists in appointments
      if ('guide_number' in data[0]) {
        const withGuide = data.filter(a => a.guide_number).length;
        console.log(`  - guide_number column exists`);
        console.log(`    Sample records with guide_number: ${withGuide}/${data.length}`);
      } else {
        console.log(`  - guide_number column NOT FOUND in appointments`);
      }
    }
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

async function explainNFExtraction() {
  console.log('\n=== 5. HOW NF IS EXTRACTED FROM XML ===\n');
  
  console.log(`The receivableDocumentExtractor.js looks for NF in this order:
  
1. In XML tags: nNF, Numero, NumeroNfse, numero, numero_nfse, numero_nfs, numero_nota, numeroNota, numNota
2. From filename pattern: NFSE_27244_1784300_1_1.xml → extracts "27244"
3. From observation/labels: "MEDICO: Dr. Silva" type patterns
  
Expected data flow:
  ┌─────────────────┐
  │  XML File       │
  │  (imported)     │
  └────────┬────────┘
           │
           ↓
  ┌─────────────────────────────────┐
  │ receivableDocumentExtractor.js  │
  │ parseXmlText() function         │
  └────────┬────────────────────────┘
           │ Returns fields object:
           │ {
           │   guide_number: "12345"
           │   invoice_number: "12345"
           │   ...
           │ }
           ↓
  ┌──────────────────────────────────┐
  │ createReceivable()               │
  │ Saves to ar_invoices.metadata:   │
  │ {                                │
  │   document_extraction: {         │
  │     fields: { guide_number: "..." }
  │   }                              │
  │ }                                │
  └────────┬─────────────────────────┘
           │
           ↓
  ┌──────────────────────────────────┐
  │ getReceivableNfDisplay()         │
  │ (ContasReceber.jsx:366)          │
  │ Looks for:                       │
  │ - metadata.document_extraction   │
  │   .fields.guide_number ✓         │
  │ - metadata.document_extraction   │
  │   .fields.invoice_number         │
  │ - row.guide_number               │
  │ - row.metadata.guide_number      │
  └──────────────────────────────────┘
           │
           ↓
  Shows in UI: "27244" or "Não identificado no XML"
  `);
}

async function runAll() {
  try {
    await checkTableSchema();
    await checkSampleData();
    await checkDataDistribution();
    await checkAppointmentsTable();
    await explainNFExtraction();

    console.log('\n=== SUMMARY & RECOMMENDATIONS ===\n');
    console.log(`1️⃣  If ar_invoices is EMPTY: Check where data is being created`);
    console.log(`   - Is it coming from appointments table?`);
    console.log(`   - Is there a migration that creates records?`);
    console.log(`   - Check create/import logs in browser console\n`);

    console.log(`2️⃣  If metadata.document_extraction is EMPTY: XML wasn't parsed`);
    console.log(`   - Check receivableDocumentExtractor.js is being called`);
    console.log(`   - Verify XML format matches expected tags\n`);

    console.log(`3️⃣  If guide_number IS present in database: UI extraction issue`);
    console.log(`   - Check getReceivableNfDisplay() function (line 366)`);
    console.log(`   - Verify field names match exactly\n`);

    console.log(`4️⃣  NF not showing = one of:`);
    console.log(`   - guide_number column NULL in database`);
    console.log(`   - metadata.document_extraction.fields is empty`);
    console.log(`   - Field key is named differently than code expects\n`);

    console.log('✅ Diagnostic complete.\n');
  } catch (e) {
    console.error('❌ Fatal error:', e);
  } finally {
    process.exit(0);
  }
}

runAll();
