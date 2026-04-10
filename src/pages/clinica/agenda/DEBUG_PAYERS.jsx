/**
 * ARQUIVO DE DEBUG - Verificar dados de professional_payers
 * 
 * Use este arquivo para testar a função listarConveniosPorProfissional
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { listarConveniosPorProfissional } from "@/pages/clinica/agenda/services/agendaService";

export default function DebugPayers() {
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfId, setSelectedProfId] = useState("");
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allProfessionalPayers, setAllProfessionalPayers] = useState([]);

  // Carregar profissionais
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("professionals")
        .select("id, full_name")
        .limit(10);
      setProfessionals(data || []);
      
      // Também carregar todos os professional_payers
      const { data: ppData } = await supabase
        .from("professional_payers")
        .select("id, professional_id, payer_id");
      console.log("📋 Todos os professional_payers:", ppData);
      setAllProfessionalPayers(ppData || []);
    }
    load();
  }, []);

  // Testar função quando selecionar profissional
  const handleTest = async (profId) => {
    setSelectedProfId(profId);
    setLoading(true);
    console.log("🔍 Testando profissional:", profId);
    
    try {
      const result = await listarConveniosPorProfissional({
        profissionalId: profId,
      });
      console.log("✅ Resultado:", result);
      setPayers(result);
    } catch (err) {
      console.error("❌ Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">🔍 Debug: Professional Payers</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* COLUNA 1: Lista de Profissionais */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Profissionais</h2>
          <div className="space-y-2">
            {professionals.map(p => (
              <button
                key={p.id}
                onClick={() => handleTest(p.id)}
                className={`w-full text-left p-3 rounded border-2 transition ${
                  selectedProfId === p.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p.full_name}
              </button>
            ))}
          </div>
        </div>

        {/* COLUNA 2: Resultado */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Convênios Carregados</h2>
          {loading && <p className="text-gray-500">Carregando...</p>}
          {payers.length === 0 && !loading && (
            <p className="text-gray-500">Nenhum convênio encontrado</p>
          )}
          <div className="space-y-2">
            {payers.map(p => (
              <div
                key={p.id}
                className="p-3 bg-green-50 border border-green-300 rounded"
              >
                {p.name} (ID: {p.id})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO: Dados Brutos */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">📊 Dados Brutos</h2>
        <details>
          <summary className="cursor-pointer font-bold text-blue-600 mb-4">
            Ver professional_payers completo
          </summary>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(allProfessionalPayers, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

