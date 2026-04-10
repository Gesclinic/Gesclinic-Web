import React, { useEffect, useState } from "react";
    import { supabase } from "@/lib/customSupabaseClient.js";
    import { Button } from "@/components/ui/button";
    import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
    import { Input } from "@/components/ui/input";
    import { useToast } from "@/components/ui/use-toast";
    import GerarXMLMultiButton from "@/components/faturamento/GerarXMLMultiButton";
    import { FileDown, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
    import { Checkbox } from "@/components/ui/checkbox";
    import FecharOuReabrirLoteButton from "@/components/faturamento/FecharOuReabrirLoteButton";
    import { useAuth } from "@/contexts/SupabaseAuthContext";


    export default function FaturamentoDashboard() {
      const { toast } = useToast();
      const { currentRole } = useAuth();
      const [batches, setBatches] = useState([]);
      const [selectedBatches, setSelectedBatches] = useState([]);
      const [filters, setFilters] = useState({
        competencia: "",
        payer: "",
        status: "aberto",
      });
      const [loading, setLoading] = useState(false);

      const loadBatches = async (batchId, newStatus) => {
        if (batchId && newStatus) {
            setBatches(prevBatches => prevBatches.map(b => b.id === batchId ? { ...b, status: newStatus } : b));
            return;
        }

        setLoading(true);
        setSelectedBatches([]);
        try {
          let query = supabase
            .from("billing_batches")
            .select("*, payer:payers(name), clinic:clinics(name)")
            .order("created_at", { ascending: false });

          if (filters.status) query = query.eq("status", filters.status);
          if (filters.payer) query = query.ilike("payer.name", `%${filters.payer}%`);
          if (filters.competencia) query = query.eq("competencia", filters.competencia);

          const { data, error } = await query;

          if (error) throw error;
          
          setBatches(data || []);
        } catch (err) {
          console.error("Erro ao carregar lotes:", err);
          toast({
            title: "Erro ao carregar lotes",
            description: err.message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        loadBatches();
      }, [filters.status, filters.payer, filters.competencia]);

      const toggleSelect = (id) => {
        setSelectedBatches((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
      };

      const toggleSelectAll = () => {
        if (selectedBatches.length === batches.length) {
          setSelectedBatches([]);
        } else {
          setSelectedBatches(batches.map((b) => b.id));
        }
      };

      return (
        <div className="p-4 sm:p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Painel de Faturamento TISS</h1>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Lotes de Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 items-center">
                <Input
                  placeholder="Competência (ex: 2025-10)"
                  value={filters.competencia}
                  onChange={(e) =>
                    setFilters({ ...filters, competencia: e.target.value })
                  }
                />
                <Input
                  placeholder="Convênio"
                  value={filters.payer}
                  onChange={(e) => setFilters({ ...filters, payer: e.target.value })}
                />
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos Status</option>
                  <option value="aberto">Aberto</option>
                  <option value="enviado">Enviado</option>
                  <option value="fechado">Fechado</option>
                  <option value="retornado">Retornado</option>
                  <option value="glosada">Glosada</option>
                  <option value="pago">Pago</option>
                </select>
                <Button
                  variant="outline"
                  onClick={() => loadBatches()}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Atualizar
                </Button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox
                          onCheckedChange={toggleSelectAll}
                          checked={
                            batches.length > 0 &&
                            selectedBatches.length === batches.length
                          }
                          aria-label="Selecionar todos"
                        />
                      </th>
                      <th className="text-left p-3 font-medium">Competência</th>
                      <th className="text-left p-3 font-medium">Convênio</th>
                      <th className="text-left p-3 font-medium">Clínica</th>
                      <th className="text-right p-3 font-medium">Valor</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">XML</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                       <tr>
                        <td colSpan="8" className="text-center p-8">
                          <div className="flex justify-center items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Carregando lotes...</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && batches.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center text-muted-foreground p-8">
                          Nenhum lote encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                    {!loading && batches.map((b) => (
                      <tr key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedBatches.includes(b.id)}
                            onCheckedChange={() => toggleSelect(b.id)}
                            aria-label={`Selecionar lote ${b.id}`}
                          />
                        </td>
                        <td className="p-3">{b.competencia || "—"}</td>
                        <td className="p-3">{b.payer?.name || "—"}</td>
                        <td className="p-3">{b.clinic?.name || "—"}</td>
                        <td className="p-3 text-right font-mono">
                          {b.total_valor ? `R$ ${Number(b.total_valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "—"}
                        </td>
                        <td className="p-3 text-center capitalize">
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full ${b.status === 'aberto' ? 'bg-blue-100 text-blue-800' : b.status === 'fechado' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{b.status || "Aberto"}</span>
                        </td>
                        <td className="p-3 text-center">
                          {b.xml_path ? (
                            <a
                              href={`https://abqsgigufciyfenphffq.supabase.co/storage/v1/object/public/${b.xml_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1.5"
                            >
                              <FileDown className="w-4 h-4" /> Baixar
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">Não gerado</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <FecharOuReabrirLoteButton
                            batch={b}
                            userRole={currentRole}
                            onStatusChange={loadBatches}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <div className="w-full md:w-auto md:w-full">
                   <GerarXMLMultiButton batchIds={selectedBatches} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

