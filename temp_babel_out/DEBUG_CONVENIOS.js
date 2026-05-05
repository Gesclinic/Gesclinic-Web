import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";

/**
 * DEBUG: Verificar dados de profissionais e convênios
 * Use para diagnosticar por que convênios não estão aparecendo
 */
export default function DebugConvenios() {
  const [professionals, setProfessionals] = useState([]);
  const [payers, setPayers] = useState([]);
  const [professionalPayers, setProfessionalPayers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        console.log("🔍 [Debug] Iniciando carregamento de dados...");

        // 1. Carregar todos os profissionais
        const {
          data: profData,
          error: profError
        } = await supabase.from("professionals").select("id, name, full_name").limit(10);
        console.log("👨‍⚕️ Profissionais:", profData, profError);
        setProfessionals(profData || []);

        // 2. Carregar todos os payers
        const {
          data: payersData,
          error: payersError
        } = await supabase.from("payers").select("id, name, clinic_id").limit(20);
        console.log("💰 Payers:", payersData, payersError);
        setPayers(payersData || []);

        // 3. Carregar todas as relações professional_payers
        const {
          data: ppData,
          error: ppError
        } = await supabase.from("professional_payers").select("id, professional_id, payer_id").limit(20);
        console.log("🔗 Professional_Payers:", ppData, ppError);
        setProfessionalPayers(ppData || []);
      } catch (err) {
        console.error("❌ Erro:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  if (loading) return /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, "Carregando...");
  return /*#__PURE__*/React.createElement("div", {
    className: "p-6 bg-white rounded-lg shadow"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold mb-6"
  }, "\uD83D\uDD0D Debug - Conv\xEAnios por Profissional"), /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold mb-3 text-blue-600"
  }, "\uD83D\uDC68\u200D\u2695\uFE0F Profissionais (", professionals.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border border-gray-300 text-sm"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "ID"), /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "Nome"))), /*#__PURE__*/React.createElement("tbody", null, professionals.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    className: "hover:bg-gray-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "border p-2 font-mono text-xs"
  }, p.id), /*#__PURE__*/React.createElement("td", {
    className: "border p-2"
  }, p.name || p.full_name))))))), /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold mb-3 text-green-600"
  }, "\uD83D\uDCB0 Payers (", payers.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border border-gray-300 text-sm"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "ID"), /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "Nome"), /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "Clinic ID"))), /*#__PURE__*/React.createElement("tbody", null, payers.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    className: "hover:bg-gray-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "border p-2 font-mono text-xs"
  }, p.id), /*#__PURE__*/React.createElement("td", {
    className: "border p-2"
  }, p.name), /*#__PURE__*/React.createElement("td", {
    className: "border p-2 font-mono text-xs"
  }, p.clinic_id))))))), /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold mb-3 text-purple-600"
  }, "\uD83D\uDD17 Professional_Payers (", professionalPayers.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border border-gray-300 text-sm"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "Professional ID"), /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "Payer ID"), /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "Professional Name"), /*#__PURE__*/React.createElement("th", {
    className: "border p-2 text-left"
  }, "Payer Name"))), /*#__PURE__*/React.createElement("tbody", null, professionalPayers.map(pp => {
    const prof = professionals.find(p => p.id === pp.professional_id);
    const payer = payers.find(p => p.id === pp.payer_id);
    return /*#__PURE__*/React.createElement("tr", {
      key: pp.id,
      className: "hover:bg-gray-50"
    }, /*#__PURE__*/React.createElement("td", {
      className: "border p-2 font-mono text-xs"
    }, pp.professional_id), /*#__PURE__*/React.createElement("td", {
      className: "border p-2 font-mono text-xs"
    }, pp.payer_id), /*#__PURE__*/React.createElement("td", {
      className: "border p-2"
    }, prof?.name || prof?.full_name || "?"), /*#__PURE__*/React.createElement("td", {
      className: "border p-2"
    }, payer?.name || "?"));
  })))), professionalPayers.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-yellow-50 text-yellow-700 rounded border border-yellow-200"
  }, "\u26A0\uFE0F Nenhum registro em professional_payers. Voc\xEA precisa inserir dados vindando profissionais a payers.")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-blue-50 rounded border border-blue-200"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold mb-2"
  }, "\uD83D\uDCCA Resumo:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-sm space-y-1"
  }, /*#__PURE__*/React.createElement("li", null, "\u2713 Profissionais: ", professionals.length), /*#__PURE__*/React.createElement("li", null, "\u2713 Payers: ", payers.length), /*#__PURE__*/React.createElement("li", null, "\u2713 Professional_Payers: ", professionalPayers.length), /*#__PURE__*/React.createElement("li", null, professionalPayers.length === 0 ? "❌ Sem vínculos! Precisa inserir registros em professional_payers" : "✅ Há vínculos configurados"))));
}