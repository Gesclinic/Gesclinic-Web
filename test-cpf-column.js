// Script para verificar se coluna CPF existe
// Execute isto no console do navegador (F12 > Console)

import { supabase } from "./src/lib/customSupabaseClient.js";

async function checkCPFColumn() {
  console.log("🔍 Verificando coluna CPF...");
  
  try {
    // Tentar inserir sem CPF (sucesso = coluna existe)
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .limit(1);
    
    if (error) {
      console.error("❌ Erro ao buscar:", error);
      return;
    }
    
    console.log("✅ Dados retornados:", data);
    
    if (data && data.length > 0) {
      const firstProfessional = data[0];
      console.log("📋 Colunas encontradas:");
      console.log(Object.keys(firstProfessional));
      
      if (firstProfessional.cpf !== undefined) {
        console.log("✅ COLUNA CPF EXISTE!");
        console.log("   Valor:", firstProfessional.cpf);
      } else {
        console.log("❌ COLUNA CPF NÃO EXISTE OU NÃO ESTÁ SENDO RETORNADA");
      }
    } else {
      console.log("⚠️ Nenhum profissional encontrado");
    }
  } catch (err) {
    console.error("❌ Erro:", err);
  }
}

checkCPFColumn();
