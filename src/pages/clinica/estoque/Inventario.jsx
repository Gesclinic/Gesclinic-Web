import React, { useEffect, useState } from "react";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Filter, Download, MoreVertical } from "lucide-react";
import { useClinicContext } from "@/contexts/useClinicContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import InventoryDialog from "@/components/clinica/estoque/InventoryDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Inventario() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Estoque", path: "/clinica/estoque" },
    { label: "Inventário" }
  ]);

  const { clinicId } = useClinicContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadInventories();
  }, [clinicId]);

  const loadInventories = async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    try {
      // TODO: Implement API call to fetch inventories
      // For now, using mock data
      setRows([]);
    } catch (err) {
      console.error('Erro ao carregar inventários:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar inventários', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (form) => {
    try {
      // TODO: Implement API call to create inventory
      toast({ title: 'Inventário iniciado' });
      setDialogOpen(false);
      await loadInventories();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao criar inventário', description: err.message });
    }
  };

  const setPeriod = (days) => {
    const today = new Date();
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(today.getDate() - days);
    const fmt = (d) => d.toISOString().slice(0, 10);
    setDateStart(fmt(start));
    setDateEnd(fmt(end));
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Inventário"
      subtitle="Realize inventários periódicos para controlar o saldo físico do estoque."
      actions={
        <div className="flex gap-2">
          <Button 
            className="bg-purple-600 text-white hover:bg-purple-700 flex items-center" 
            onClick={() => setDialogOpen(true)}
          >
            <ClipboardCheck className="mr-2 w-4 h-4" /> Novo Inventário
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
        </div>
      }
    >
      {/* FILTROS */}
      <div className="flex flex-wrap gap-3 items-end mt-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Status</label>
          <select 
            className="border rounded px-3 py-2 text-sm" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="em_progresso">Em Progresso</option>
            <option value="concluido">Concluído</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Motivo</label>
          <select 
            className="border rounded px-3 py-2 text-sm" 
            value={reasonFilter} 
            onChange={(e) => setReasonFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="auditoria">Auditoria periódica</option>
            <option value="reconciliacao">Reconciliação de sistema</option>
            <option value="reposicao">Planejamento de reposição</option>
            <option value="investigacao">Investigação de discrepância</option>
            <option value="manutencao">Manutenção/Limpeza</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">De</label>
          <input 
            type="date" 
            className="border rounded px-3 py-2 text-sm" 
            value={dateStart} 
            onChange={(e) => setDateStart(e.target.value)} 
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Até</label>
          <input 
            type="date" 
            className="border rounded px-3 py-2 text-sm" 
            value={dateEnd} 
            onChange={(e) => setDateEnd(e.target.value)} 
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPeriod(0)}>Hoje</Button>
          <Button size="sm" variant="outline" onClick={() => setPeriod(7)}>Últimos 7 dias</Button>
          <Button size="sm" variant="outline" onClick={() => setPeriod(30)}>Últimos 30 dias</Button>
        </div>

        <div className="flex-1 min-w-[250px]">
          <label className="block text-xs text-gray-600 mb-1">Buscar</label>
          <input
            type="text"
            placeholder="Local, responsável ou motivo"
            className="border rounded px-3 py-2 text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button 
          variant="outline" 
          onClick={() => {
            setStatusFilter("");
            setReasonFilter("");
            setDateStart("");
            setDateEnd("");
            setSearch("");
          }}
        >
          Limpar
        </Button>
      </div>

      {/* CONTEÚDO */}
      <Card className="p-6 mt-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-500 mt-4">Carregando inventários...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-2">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum inventário registrado</h3>
            <p className="text-gray-600 mb-6">Comece a fazer controles de estoque iniciando o primeiro inventário</p>
            <Button 
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={() => setDialogOpen(true)}
            >
              <ClipboardCheck className="mr-2 w-4 h-4" /> Iniciar Inventário
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Local</th>
                  <th className="px-4 py-2 text-left">Motivo</th>
                  <th className="px-4 py-2 text-left">Responsável</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Itens</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{r.date}</td>
                    <td className="px-4 py-3">{r.location}</td>
                    <td className="px-4 py-3">{r.reason}</td>
                    <td className="px-4 py-3">{r.conducted_by}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        r.status === 'em_progresso' ? 'bg-yellow-100 text-yellow-800' :
                        r.status === 'concluido' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {r.status === 'em_progresso' ? 'Em Progresso' :
                         r.status === 'concluido' ? 'Concluído' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.items_count || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="px-2">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Visualizar</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* DIALOG */}
      <InventoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        clinicId={clinicId}
      />
    </PageLayout>
  );
}

