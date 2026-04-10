#!/usr/bin/env node
/**
 * Script para importar todos os procedimentos CBHPM da tabela oficial
 * Processa dados em formato: CÓDIGO\tDESCRIÇÃO\tVALOR
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CLINIC_ID = "dcee437c-fd14-463c-b25e-a318f5da60b7";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Carregar dados processados do JSON
function loadCBHPMData() {
  try {
    const dataPath = path.join(__dirname, "cbhpm-data.json");
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Arquivo não encontrado: ${dataPath}`);
    }
    const rawData = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(rawData);
  } catch (err) {
    console.error("❌ Erro ao carregar dados CBHPM:", err.message);
    return [];
  }
}

async function importCBHPM() {
  try {
    console.log("🚀 Iniciando importação CBHPM completa...\n");

    // Carregar dados
    const cbhpmData = loadCBHPMData();
    if (cbhpmData.length === 0) {
      console.error("❌ Nenhum dado CBHPM encontrado");
      return;
    }

    // Step 1: Limpar dados antigos
    console.log("📝 Step 1: Removendo dados antigos...");
    const { error: deleteError } = await supabase
      .from("cbhpm_procedures")
      .delete()
      .eq("clinic_id", CLINIC_ID);

    if (deleteError) {
      console.error("❌ Erro ao deletar dados:", deleteError);
      return;
    }
    console.log("✅ Dados antigos removidos\n");

    // Step 2: Preparar insert em lotes
    console.log(`📝 Step 2: Preparando ${cbhpmData.length} procedimentos...`);
    const insertData = cbhpmData.map((item) => ({
      clinic_id: CLINIC_ID,
      codigo_cbhpm: item.codigo_cbhpm,
      descricao_completa: item.descricao_completa,
      codigo_tuss: null,
      valor_base: item.valor_base || 0,
      ativo: item.ativo !== false,
    }));

    // Inserir em lotes de 100
    const batchSize = 100;
    let totalInserted = 0;
    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);
      const { error, count } = await supabase
        .from("cbhpm_procedures")
        .insert(batch);

      if (error) {
        console.error(`❌ Erro ao inserir lote ${Math.floor(i / batchSize) + 1}:`, error);
        return;
      }

      totalInserted += batch.length;
      console.log(
        `   ✅ Lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(insertData.length / batchSize)} inserido (${batch.length} registros) - Total: ${totalInserted}`
      );
    }

    console.log("\n✅ Inserção completa!\n");

    // Step 3: Verificar resultado
    console.log("📝 Step 3: Verificando inserção...");
    const { data, count } = await supabase
      .from("cbhpm_procedures")
      .select("*", { count: "exact" })
      .eq("clinic_id", CLINIC_ID);

    console.log(`✅ Total de procedimentos no banco: ${count}\n`);

    // Mostrar amostra
    if (data && data.length > 0) {
      console.log("📊 Amostra dos procedimentos inseridos:");
      data.slice(0, 5).forEach((proc) => {
        console.log(
          `   - ${proc.codigo_cbhpm}: ${proc.descricao_completa.substring(0, 60)}... (R$ ${proc.valor_base || "N/A"})`
        );
      });
      console.log(`   ... e mais ${Math.max(0, count - 5)} procedimentos`);
    }

    console.log("\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!");
  } catch (err) {
    console.error("❌ ERRO FATAL:", err.message);
  }
}

importCBHPM();
