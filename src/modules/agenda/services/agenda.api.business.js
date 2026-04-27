import { supabase } from "@/lib/customSupabaseClient";
import { isValidUUID } from "./agenda.validation";

// Lista convênios vinculados a um profissional específico
export async function listarConveniosPorProfissional({ profissionalId }) {
  try {
    console.log("🔍 [listarConveniosPorProfissional] Iniciando busca para profissionalId:", profissionalId);
    
    // ⚠️ VALIDAÇÃO: Verificar se profissionalId é um UUID válido
    if (!isValidUUID(profissionalId)) {
      console.warn("⚠️ [listarConveniosPorProfissional] profissionalId inválido (não é UUID):", profissionalId);
      console.log("📝 [listarConveniosPorProfissional] Retornando lista vazia (fallback)");
      return [];
    }
    
    // Primeiro, buscar os payer_ids do profissional
    const { data: professionalPayers, error: ppError } = await supabase
      .from('professional_payers')
      .select('*')
      .eq('professional_id', profissionalId);
    
    console.log("📊 [Query 1] professional_payers resultado:", professionalPayers);
    console.log("📊 [Query 1] erro:", ppError);
    
    if (ppError) {
      console.error("❌ Erro ao carregar payers do profissional:", ppError);
      return [];
    }

    if (!professionalPayers || professionalPayers.length === 0) {
      console.log("⚠️ Nenhum payer encontrado para profissional:", profissionalId);
      console.log("📌 Tentando fallback: Buscar o profissional para pegar clinic_id...");
      
      // FALLBACK: Se não há professional_payers vinculados, retorna todos os payers da clínica
      const { data: prof, error: profError } = await supabase
        .from('professionals')
        .select('clinic_id')
        .eq('id', profissionalId)
        .maybeSingle();
      
      if (profError) {
        console.error("❌ Erro ao buscar profissional para clinic_id:", profError);
        return [];
      }
      
      if (!prof) {
        console.warn("⚠️ Profissional não encontrado:", profissionalId);
        return [];
      }
      
      console.log("💡 Found clinic_id:", prof.clinic_id, "- mostrando todos os payers da clínica");
      
      const { data: allPayers, error: allPayersError } = await supabase
        .from('payers')
        .select('id, name')
        .eq('clinic_id', prof.clinic_id)
        .eq('active', true);
      
      if (allPayersError) {
        console.error("❌ Erro ao buscar todos os payers:", allPayersError);
        return [];
      }
      
      console.log("✅ Retornando todos os payers da clínica (fallback):", allPayers);
      return allPayers || [];
    }

    // Extrair os IDs dos payers
    const payerIds = professionalPayers
      .map(pp => {
        console.log("📌 [Debug] pp.payer_id =", pp.payer_id, "tipo:", typeof pp.payer_id);
        return pp.payer_id;
      })
      .filter(id => id !== null && id !== undefined && id !== "");

    console.log("🎯 Payer IDs extraídos (filtrados):", payerIds);
    console.log("📊 Quantidade de payer IDs:", payerIds.length);

    if (payerIds.length === 0) {
      console.log("⚠️ Todos os payer_ids eram null/undefined/vazio");
      return [];
    }

    // Buscar os dados dos payers na tabela payers
    const { data: payers, error: payersError } = await supabase
      .from('payers')
      .select('id, name')
      .in('id', payerIds)
      .eq('active', true);

    console.log("📊 [Query 2] payers resultado:", payers);
    console.log("📊 [Query 2] erro:", payersError);

    if (payersError) {
      console.error("❌ Erro ao carregar dados dos payers:", payersError);
      return [];
    }

    console.log("✅ Convênios do profissional carregados com sucesso:", payers);
    return payers || [];
  } catch (err) {
    console.error("❌ Erro ao listar convênios do profissional:", err);
    return [];
  }
}
