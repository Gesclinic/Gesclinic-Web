#!/usr/bin/env node
/**
 * Script para descobrir o clinic_id correto
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findClinicId() {
  console.log("🔍 Procurando clínicas no banco...\n");

  try {
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name, city, state")
      .limit(10);

    if (error) {
      console.error("❌ Erro ao buscar clínicas:", error);
      return;
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Nenhuma clínica encontrada no banco!");
      return;
    }

    console.log("📋 Clínicas encontradas:\n");
    data.forEach((clinic) => {
      console.log(`  ID: ${clinic.id}`);
      console.log(`  Nome: ${clinic.name}`);
      console.log(`  Local: ${clinic.city}, ${clinic.state}`);
      console.log();
    });

    console.log("\n✅ Use um dos IDs acima para a migração.");
  } catch (err) {
    console.error("❌ ERRO:", err.message);
  }
}

findClinicId();
