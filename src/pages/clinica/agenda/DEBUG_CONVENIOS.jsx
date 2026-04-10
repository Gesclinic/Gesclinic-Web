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
        const { data: profData, error: profError } = await supabase
          .from("professionals")
          .select("id, name, full_name")
          .limit(10);

        console.log("👨‍⚕️ Profissionais:", profData, profError);
        setProfessionals(profData || []);

        // 2. Carregar todos os payers
        const { data: payersData, error: payersError } = await supabase
          .from("payers")
          .select("id, name, clinic_id")
          .limit(20);

        console.log("💰 Payers:", payersData, payersError);
        setPayers(payersData || []);

        // 3. Carregar todas as relações professional_payers
        const { data: ppData, error: ppError } = await supabase
          .from("professional_payers")
          .select("id, professional_id, payer_id")
          .limit(20);

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

  if (loading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">🔍 Debug - Convênios por Profissional</h2>

      {/* PROFISSIONAIS */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-blue-600">
          👨‍⚕️ Profissionais ({professionals.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Nome</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="border p-2 font-mono text-xs">{p.id}</td>
                  <td className="border p-2">{p.name || p.full_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYERS */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-green-600">
          💰 Payers ({payers.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Nome</th>
                <th className="border p-2 text-left">Clinic ID</th>
              </tr>
            </thead>
            <tbody>
              {payers.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="border p-2 font-mono text-xs">{p.id}</td>
                  <td className="border p-2">{p.name}</td>
                  <td className="border p-2 font-mono text-xs">{p.clinic_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROFESSIONAL_PAYERS */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-purple-600">
          🔗 Professional_Payers ({professionalPayers.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-left">Professional ID</th>
                <th className="border p-2 text-left">Payer ID</th>
                <th className="border p-2 text-left">Professional Name</th>
                <th className="border p-2 text-left">Payer Name</th>
              </tr>
            </thead>
            <tbody>
              {professionalPayers.map(pp => {
                const prof = professionals.find(p => p.id === pp.professional_id);
                const payer = payers.find(p => p.id === pp.payer_id);
                return (
                  <tr key={pp.id} className="hover:bg-gray-50">
                    <td className="border p-2 font-mono text-xs">{pp.professional_id}</td>
                    <td className="border p-2 font-mono text-xs">{pp.payer_id}</td>
                    <td className="border p-2">{prof?.name || prof?.full_name || "?"}</td>
                    <td className="border p-2">{payer?.name || "?"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {professionalPayers.length === 0 && (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded border border-yellow-200">
            ⚠️ Nenhum registro em professional_payers. Você precisa inserir dados vindando profissionais a payers.
          </div>
        )}
      </div>

      {/* RESUMO */}
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-semibold mb-2">📊 Resumo:</h4>
        <ul className="text-sm space-y-1">
          <li>✓ Profissionais: {professionals.length}</li>
          <li>✓ Payers: {payers.length}</li>
          <li>✓ Professional_Payers: {professionalPayers.length}</li>
          <li>
            {professionalPayers.length === 0
              ? "❌ Sem vínculos! Precisa inserir registros em professional_payers"
              : "✅ Há vínculos configurados"}
          </li>
        </ul>
      </div>
    </div>
  );
}

