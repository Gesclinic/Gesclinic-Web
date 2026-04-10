import { supabase } from "@/lib/customSupabaseClient.js";

/**
 * 🔍 getRepassesReport
 * Carrega e consolida o relatório anual de repasses médicos.
 *
 * @param {string} clinicId - UUID da clínica logada
 * @param {number} year - Ano de referência (ex: 2025)
 * @returns {Promise<Array>} Lista de repasses consolidados
 *
 * ⚙️ Ordem de prioridade:
 *  1️⃣ Tenta buscar via RPC (função SQL otimizada no banco)
 *  2️⃣ Se não existir, faz SELECT direto da view `view_doctor_commissions_summary`
 */
export async function getRepassesReport(clinicId, year) {
  if (!clinicId) throw new Error("Clinic ID é obrigatório.");

  try {
    // ✅ 1️⃣ Tentativa via função RPC (ideal para performance)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_repasses_annual_report",
      {
        p_clinic_id: clinicId,
        p_year: year,
      }
    );

    if (rpcError && !rpcError.message.includes("does not exist")) {
      throw rpcError;
    }

    // Se RPC retornou dados válidos
    if (rpcData && rpcData.length > 0) {
      console.log("✅ Dados carregados via RPC get_repasses_annual_report");
      return rpcData.map((r) => ({
        profissional_nome: r.profissional_nome,
        convenio_nome: r.convenio_nome,
        mes: r.mes,
        total_servicos: r.total_servicos,
        valor_bruto: r.valor_bruto,
        percentual_repasse: r.percentual_repasse,
        valor_repasse: r.valor_repasse,
        status: r.status,
      }));
    }

    // ✅ 2️⃣ Fallback: SELECT direto da view pública (sem RPC)
    const { data: viewData, error: viewError } = await supabase
      .from("view_doctor_commissions_summary")
      .select(
        `
        profissional_nome,
        convenio_nome,
        reference_month,
        reference_year,
        total_services,
        total_bruto,
        percentual_repasse,
        total_repasse,
        status
      `
      )
      .eq("clinic_id", clinicId)
      .eq("reference_year", year)
      .order("reference_month", { ascending: true });

    if (viewError) throw viewError;

    console.log("✅ Dados carregados via view view_doctor_commissions_summary");

    return (viewData || []).map((r) => ({
      profissional_nome: r.profissional_nome,
      convenio_nome: r.convenio_nome,
      mes: `${String(r.reference_month).padStart(2, "0")}/${r.reference_year}`,
      total_servicos: r.total_services || 0,
      valor_bruto: r.total_bruto || 0,
      percentual_repasse: r.percentual_repasse || 0,
      valor_repasse: r.total_repasse || 0,
      status: r.status || "pendente",
    }));

    // ✅ 3️⃣ Fallback adicional: usar agregação da view `repasse_dashboard`
    // Essa view é preenchida quando cadastramos repasses na AP com vínculo à receita
    const { data: repDash, error: repError } = await supabase
      .from('repasse_dashboard')
      .select('doctor, service, revenue_total, repasse_total, margin')
      .eq('clinic_id', clinicId);

    if (repError) throw repError;
    if (Array.isArray(repDash) && repDash.length > 0) {
      return repDash.map(r => ({
        profissional_nome: r.doctor,
        convenio_nome: r.service, // usamos service como natureza aqui
        mes: '-',
        total_servicos: null,
        valor_bruto: r.revenue_total,
        percentual_repasse: null,
        valor_repasse: r.repasse_total,
        status: 'consolidado',
        margin: r.margin,
      }));
    }
  } catch (error) {
    console.error("❌ Erro ao carregar relatório de repasses:", error.message);
    throw error;
  }
}