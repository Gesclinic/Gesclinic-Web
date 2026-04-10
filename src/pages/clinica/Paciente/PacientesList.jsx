import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { listPacientes, deletePaciente } from "@/lib/pacientesService";

export default function PacientesList() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchPacientes() {
      try {
        const data = await listPacientes(searchTerm);
        if (mounted) setPacientes(Array.isArray(data) ? data : []);
      } catch (err) {
        toast({
          title: "Erro ao buscar pacientes",
          description: err?.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    }
    fetchPacientes();
    return () => {
      mounted = false;
    };
  }, [searchTerm, toast]);

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Deseja realmente excluir este paciente?")) return;
      try {
        await deletePaciente(id);
        setPacientes((prev) => prev.filter((p) => p.id !== id));
        toast({
          title: "Paciente excluído",
          description: "O paciente foi removido com sucesso.",
        });
      } catch (err) {
        toast({
          title: "Erro ao excluir paciente",
          description: err?.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  return (
    <div className="p-6 bg-[#F5F7FA] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#1A5B8A]">Buscar paciente</h1>
        <Button
          className="bg-[#5DB053] hover:bg-[#4da645] text-white"
          onClick={() => navigate("/pacientes/novo")}
        >
          <Plus className="w-4 h-4 mr-2" /> Cadastrar novo paciente
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="prontuario" className="block text-sm font-medium text-gray-700">
                Prontuário
              </label>
              <Input
                id="prontuario"
                name="prontuario"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-48"
                placeholder="_ _ _ _ _ _ _ _"
              />
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button onClick={() => setSearchTerm("")} variant="ghost">
                Limpar
              </Button>
              <Button onClick={() => navigate("/pacientes/novo")} className="bg-[#5DB053] hover:bg-[#4da645] text-white">
                <Plus className="w-4 h-4 mr-2" /> Cadastrar novo paciente
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="min-w-full border text-sm">
              <thead className="bg-[#1A5B8A] text-white">
                <tr>
                  <th className="py-2 px-3 text-left">Prontuário</th>
                  <th className="py-2 px-3 text-left">Nome completo</th>
                  <th className="py-2 px-3 text-left">Data nasc.</th>
                  <th className="py-2 px-3 text-left">CPF</th>
                  <th className="py-2 px-3 text-left">Celular</th>
                  <th className="py-2 px-3 text-left">Sexo</th>
                  <th className="py-2 px-3 text-left">Cidade</th>
                  <th className="py-2 px-3 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {pacientes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">
                      Nenhum paciente encontrado.
                    </td>
                  </tr>
                ) : (
                  pacientes.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">{p.record_number || "-"}</td>
                      <td className="py-2 px-3">{p.full_name || p.full_name || "-"}</td>
                      <td className="py-2 px-3">
                        {p.birth_date
                          ? (() => {
                              // Aceita datas ISO, timestamp, DD/MM/YYYY e YYYY-MM-DD
                              let d = typeof p.birth_date === "string" ? new Date(p.birth_date) : p.birth_date;
                              if (typeof p.birth_date === "string") {
                                if (p.birth_date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                                  const [dd, mm, yyyy] = p.birth_date.split("/");
                                  d = new Date(`${yyyy}-${mm}-${dd}`);
                                } else if (p.birth_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                  const [yyyy, mm, dd] = p.birth_date.split("-");
                                  d = new Date(`${yyyy}-${mm}-${dd}`);
                                }
                              }
                              return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : "-";
                            })()
                          : "-"}
                      </td>
                      <td className="py-2 px-3">{p.cpf || "-"}</td>
                      <td className="py-2 px-3">{p.cell_phone || p.phone || "-"}</td>
                      <td className="py-2 px-3">{p.sex || p.sexo || p.gender || "-"}</td>
                      <td className="py-2 px-3">{p.city || p.cidade || "-"}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[#1A5B8A] border-[#1A5B8A]"
                            onClick={() => navigate(`/pacientes/${p.id}`)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

