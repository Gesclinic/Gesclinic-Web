// src/pages/clinica/Orcamentos.jsx
import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Plus, Search, Filter, Trash2, Pencil, ListChecks } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

import { useOrcamentos } from '@/hooks/clinic/useOrcamentos';
import OrcamentoDialog from '@/components/clinica/OrcamentoDialog';
import OrcamentoItensDialog from '@/components/clinica/OrcamentoItensDialog';

export default function Orcamentos() {
  const { toast } = useToast();

  const {
    // dados
    items,
    loading,
    page,
    pageCount,
    total,
    // filtros
    query,
    setQuery,
    status,
    setStatus,
    validFrom,
    setValidFrom,
    validTo,
    setValidTo,
    setPage,
    // ops
    fetchList,
    createOrcamento,
    updateOrcamento,
    deleteOrcamento,
    // itens
    listItens,
    addItem,
    updateItem,
    deleteItem,
  } = useOrcamentos();

  // Dialogs de orçamento (cabeçalho)
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgLoading, setDlgLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  // Dialog de itens
  const [itensOpen, setItensOpen] = useState(false);
  const [itensOrcamento, setItensOrcamento] = useState(null);

  // Filtros
  const onBuscar = useCallback(
    (e) => {
      e.preventDefault();
      fetchList();
    },
    [fetchList],
  );

  const limparFiltros = useCallback(() => {
    setQuery('');
    setStatus('todos');
    setValidFrom(null);
    setValidTo(null);
    setPage(1);
    fetchList();
  }, [setQuery, setStatus, setValidFrom, setValidTo, setPage, fetchList]);

  // CRUD cabeçalho
  const novo = useCallback(() => {
    setEditing(null);
    setDlgOpen(true);
  }, []);

  const editar = useCallback((orc) => {
    setEditing(orc);
    setDlgOpen(true);
  }, []);

  const salvarDialog = useCallback(
    async (payload) => {
      try {
        setDlgLoading(true);
        if (editing?.id) {
          await updateOrcamento(editing.id, payload);
          toast({ title: 'Orçamento atualizado' });
        } else {
          await createOrcamento(payload);
          toast({ title: 'Orçamento criado' });
        }
        setDlgOpen(false);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
      } finally {
        setDlgLoading(false);
      }
    },
    [editing, createOrcamento, updateOrcamento, toast],
  );

  const excluir = useCallback(
    async (id) => {
      await deleteOrcamento(id);
    },
    [deleteOrcamento],
  );

  // Itens
  const abrirItens = useCallback((orc) => {
    setItensOrcamento(orc);
    setItensOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600 mt-1">Crie e gerencie orçamentos para pacientes</p>
        </div>
        <Button
          onClick={novo}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </motion.div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-6">
            <form onSubmit={onBuscar} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por número/título…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  type="date"
                  value={validFrom || ''}
                  onChange={(e) => setValidFrom(e.target.value || null)}
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={validTo || ''}
                  onChange={(e) => setValidTo(e.target.value || null)}
                />
              </div>

              <div className="md:col-span-5 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={limparFiltros}>
                  <Filter className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
                <Button type="submit">
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lista */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resultados ({total})</CardTitle>
            <div className="text-sm text-gray-500">
              Página {page} de {pageCount}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Número</th>
                    <th className="text-left px-4 py-2">Paciente</th>
                    <th className="text-left px-4 py-2">Serviço</th>
                    <th className="text-left px-4 py-2">Convênio</th>
                    <th className="text-left px-4 py-2">Profissional</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Validade</th>
                    <th className="text-left px-4 py-2">Valor Bruto</th>
                    <th className="text-left px-4 py-2">Desconto</th>
                    <th className="text-left px-4 py-2">Valor Final</th>
                    <th className="px-4 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={11}>
                        Carregando…
                      </td>
                    </tr>
                  )}

                  {!loading && items.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-gray-500" colSpan={11}>
                        <div className="flex flex-col items-center">
                          <FileSpreadsheet className="w-10 h-10 text-gray-400 mb-2" />
                          Nenhum orçamento encontrado
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    items.map((it) => {
                      // Helper to get first service and professional
                      const firstItem = it.orcamento_itens?.[0];
                      const serviceName = firstItem?.service_name || '-';
                      const professionalName = firstItem?.professionals?.name || '-';
                      const moreItems = (it.orcamento_itens?.length || 0) > 1;

                      return (
                        <tr key={it.id} className="border-t hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 font-medium">{it.numero || '-'}</td>
                          <td className="px-4 py-2">{it.patients?.full_name || '-'}</td>
                          <td className="px-4 py-2">
                            {serviceName}
                            {moreItems && (
                              <span className="text-xs text-gray-400 ml-1">
                                (+{it.orcamento_itens.length - 1})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">{it.payers?.name || '-'}</td>
                          <td className="px-4 py-2">{professionalName}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold 
                            ${
                              it.status === 'aprovado'
                                ? 'bg-green-100 text-green-700'
                                : it.status === 'reprovado'
                                  ? 'bg-red-100 text-red-700'
                                  : it.status === 'cancelado'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-blue-100 text-blue-700'
                            }`}
                            >
                              {it.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {it.validade ? new Date(it.validade).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-4 py-2">
                            R${' '}
                            {Number(it.valor_bruto || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-2">
                            R${' '}
                            {Number(it.desconto || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-2 font-bold text-green-600">
                            R${' '}
                            {Number(it.valor_final || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => editar(it)}>
                                <Pencil className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => excluir(it.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between p-4">
              <div className="text-xs text-gray-500">Total: {total}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog: criar/editar orçamento */}
      <OrcamentoDialog
        open={dlgOpen}
        onOpenChange={setDlgOpen}
        initialData={editing}
        loading={dlgLoading}
        onSubmit={salvarDialog}
      />

      {/* Dialog: itens do orçamento */}
      <OrcamentoItensDialog
        open={itensOpen}
        onOpenChange={setItensOpen}
        orcamento={itensOrcamento}
        listItens={listItens}
        addItem={addItem}
        updateItem={updateItem}
        deleteItem={deleteItem}
      />
    </div>
  );
}
