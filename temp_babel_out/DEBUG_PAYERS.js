/**
 * ARQUIVO DE DEBUG - Verificar dados de professional_payers
 * 
 * Use este arquivo para testar a função listarConveniosPorProfissional
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { listarConveniosPorProfissional } from "@/modules/agenda/services/agenda.api.business";
export default function DebugPayers() {
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfId, setSelectedProfId] = useState("");
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allProfessionalPayers, setAllProfessionalPayers] = useState([]);

  // Carregar profissionais
  useEffect(() => {
    async function load() {
      const {
        data
      } = await supabase.from("professionals").select("id, full_name").limit(10);
      setProfessionals(data || []);

      // Também carregar todos os professional_payers
      const {
        data: ppData
      } = await supabase.from("professional_payers").select("id, professional_id, payer_id");
      console.log("📋 Todos os professional_payers:", ppData);
      setAllProfessionalPayers(ppData || []);
    }
    load();
  }, []);

  // Testar função quando selecionar profissional
  const handleTest = async profId => {
    setSelectedProfId(profId);
    setLoading(true);
    console.log("🔍 Testando profissional:", profId);
    try {
      const result = await listarConveniosPorProfissional({
        profissionalId: profId
      });
      console.log("✅ Resultado:", result);
      setPayers(result);
    } catch (err) {
      console.error("❌ Erro:", err);
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "p-8 bg-gray-100 min-h-screen"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold mb-8"
  }, "\uD83D\uDD0D Debug: Professional Payers"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-6 rounded-lg shadow"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold mb-4"
  }, "Profissionais"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, professionals.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => handleTest(p.id),
    className: `w-full text-left p-3 rounded border-2 transition ${selectedProfId === p.id ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:bg-gray-50"}`
  }, p.full_name)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-6 rounded-lg shadow"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold mb-4"
  }, "Conv\xEAnios Carregados"), loading && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500"
  }, "Carregando..."), payers.length === 0 && !loading && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500"
  }, "Nenhum conv\xEAnio encontrado"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, payers.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "p-3 bg-green-50 border border-green-300 rounded"
  }, p.name, " (ID: ", p.id, ")"))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 bg-white p-6 rounded-lg shadow"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold mb-4"
  }, "\uD83D\uDCCA Dados Brutos"), /*#__PURE__*/React.createElement("details", null, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer font-bold text-blue-600 mb-4"
  }, "Ver professional_payers completo"), /*#__PURE__*/React.createElement("pre", {
    className: "bg-gray-100 p-4 rounded overflow-auto text-xs"
  }, JSON.stringify(allProfessionalPayers, null, 2)))));
}