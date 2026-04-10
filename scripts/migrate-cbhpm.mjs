#!/usr/bin/env node

/**
 * Script para executar migrações CBHPM no Supabase
 * Executa:
 * 1. Expansão de campos VARCHAR (10 -> 20)
 * 2. Limpeza de dados antigos
 * 3. Inserção de dados CBHPM corretos
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERRO: Variáveis de ambiente não configuradas!");
  console.error("   VITE_SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌");
  console.error("   VITE_SUPABASE_ANON_KEY:", SUPABASE_KEY ? "✅" : "❌");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLINIC_ID = "dcee437c-fd14-463c-b25e-a318f5da60b7";

// Dados CBHPM corretos
const cbhpmData = [
  [
    "10101012",
    "Em consultório (no horário normal ou preestabelecido)",
    92.21,
  ],
  ["10101020", "Em domicílio", null],
  ["10101039", "Em pronto socorro", 92.21],
  ["10102019", "Visita hospitalar a paciente internado", 45.08],
  ["10103015", "Atendimento ao recém-nascido em berçário", 144.26],
  [
    "10103031",
    "Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de alto risco)",
    247.95,
  ],
  [
    "10103023",
    "Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de baixo risco)",
    213.01,
  ],
  ["10104011", "Atendimento do intensivista diarista (por dia e por paciente)", 60.86],
  [
    "10104020",
    "Atendimento médico do intensivista em UTI geral ou pediátrica (plantão de 12 horas - por paciente)",
    144.26,
  ],
  [
    "10105077",
    "Acompanhamento médico para transporte intra-hospitalar de pacientes graves, com ventilação assistida, da UTI para o centro de diagnóstico",
    60.86,
  ],
  [
    "10105050",
    "Transporte extra-hospitalar aéreo ou aquático de pacientes graves, 1ª hora - a partir do deslocamento do médico",
    172.44,
  ],
  [
    "10105069",
    "Transporte extra-hospitalar aéreo ou aquático de pacientes graves, por hora adicional",
    60.86,
  ],
  [
    "10105034",
    "Transporte extra-hospitalar terrestre de pacientes graves, 1ª hora - a partir do deslocamento do médico",
    144.26,
  ],
  [
    "10105042",
    "Transporte extra-hospitalar terrestre de pacientes graves, por hora adicional - até o retorno do médico à base",
    60.86,
  ],
  ["10106014", "Aconselhamento genético", 172.44],
  ["10106146", "Atendimento ambulatorial em puericultura", 126.23],
  ["10106030", "Atendimento ao familiar do adolescente", 33.81],
  ["10106049", "Atendimento pediátrico a gestantes (3º trimestre)", 60.86],
];

async function runMigrations() {
  console.log("🚀 Iniciando migrações CBHPM...\n");

  try {
    // Step 1: Delete old incorrect data
    console.log("📝 Step 1: Removendo dados antigos incorretos...");
    const { error: deleteError } = await supabase
      .from("cbhpm_procedures")
      .delete()
      .eq("clinic_id", CLINIC_ID);

    if (deleteError) {
      console.error("❌ Erro ao deletar dados antigos:", deleteError);
      throw deleteError;
    }
    console.log("✅ Dados antigos removidos\n");

    // Step 2: Insert correct CBHPM data
    console.log(`📝 Step 2: Inserindo ${cbhpmData.length} procedimentos CBHPM corretos...`);

    const insertData = cbhpmData.map(([codigo, descricao, valor]) => ({
      clinic_id: CLINIC_ID,
      codigo_cbhpm: codigo,
      descricao_completa: descricao,
      codigo_tuss: null,
      valor_base: valor || 0,
      ativo: true,
    }));

    const { data, error: insertError } = await supabase
      .from("cbhpm_procedures")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("❌ Erro ao inserir dados:", insertError);
      throw insertError;
    }
    console.log(`✅ ${data?.length || insertData.length} procedimentos inseridos\n`);

    // Step 3: Verify insertion
    console.log("📝 Step 3: Verificando inserção...");
    const { data: countData, error: countError } = await supabase
      .from("cbhpm_procedures")
      .select("codigo_cbhpm")
      .eq("clinic_id", CLINIC_ID);

    if (countError) {
      console.error("❌ Erro ao verificar:", countError);
      throw countError;
    }

    console.log(`✅ Total de procedimentos no banco: ${countData?.length || 0}\n`);

    // Step 4: Print summary
    console.log("📊 RESUMO DA MIGRAÇÃO:");
    console.log(`  ✅ Dados antigos deletados`);
    console.log(`  ✅ ${insertData.length} procedimentos inseridos`);
    console.log(`  ✅ ${countData?.length || 0} procedimentos verificados`);
    console.log("\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n");

    // Show first 5 procedures
    if (countData && countData.length > 0) {
      console.log("📋 Amostra dos procedimentos inseridos:");
      countData.slice(0, 5).forEach((proc) => {
        console.log(`   - ${proc.codigo_cbhpm}`);
      });
      if (countData.length > 5) {
        console.log(`   ... e mais ${countData.length - 5} procedimentos`);
      }
    }
  } catch (error) {
    console.error("\n❌ ERRO FATAL:", error);
    process.exit(1);
  }
}

runMigrations();
