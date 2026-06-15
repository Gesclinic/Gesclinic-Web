// src/modules/financeiro/centro-custo/pages/CostCenterPage.tsx

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle, FileBarChart, CheckCircle2, Layers, Users } from 'lucide-react';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';
import { useCostCenters } from '../hooks/useCostCenters';
import { CostCenterForm } from '../components/CostCenterForm';
import { CostCenterTree } from '../components/CostCenterTree';
import { CostCenterTable } from '../components/CostCenterTable';
import { CostCenterFilters } from '../components/CostCenterFilters';
import type { CostCenter, CreateCostCenterPayload, UpdateCostCenterPayload } from '../types';

type ViewMode = 'tree' | 'table' | 'form-create' | 'form-edit';

const reportColumns = [
  { key: 'code', label: 'Codigo', width: 14 },
  { key: 'name', label: 'Nome', width: 32 },
  { key: 'parentName', label: 'Centro Pai', width: 28 },
  { key: 'status', label: 'Status', width: 12 },
  { key: 'manager', label: 'Responsavel', width: 20 },
  { key: 'description', label: 'Descricao', width: 38 },
];

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function CostCenterPage() {
  const { clinicId } = useAuth();
  const { toast } = useToast();

  const state = useCostCenters(clinicId);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedCenter, setSelectedCenter] = useState<CostCenter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CostCenter | null>(null);

  // Load tree view on mount
  useEffect(() => {
    if (clinicId && viewMode === 'tree') {
      state.fetchTree();
    }
  }, [clinicId, viewMode]); // Removido 'state' para evitar loop infinito

  // Load centers for table view and parent options
  useEffect(() => {
    if (clinicId) {
      state.fetchCenters();
    }
  }, [clinicId]); // Carrega centers apenas uma vez quando clinicId muda

  const handleCreateClick = () => {
    setSelectedCenter(null);
    setViewMode('form-create');
  };

  const handleEditClick = (center: CostCenter) => {
    setSelectedCenter(center);
    setViewMode('form-edit');
  };

  const handleFormSave = async (payload: CreateCostCenterPayload | UpdateCostCenterPayload) => {
    try {
      if (selectedCenter) {
        await state.updateCenter(selectedCenter.id, payload as UpdateCostCenterPayload);
        toast({ title: 'Centro de custo atualizado com sucesso!' });
      } else {
        await state.createCenter(payload as CreateCostCenterPayload);
        toast({ title: 'Centro de custo criado com sucesso!' });
      }
      setSelectedCenter(null);
      setViewMode('tree');

      // Refresh data
      await state.fetchTree();
      await state.fetchCenters();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Erro ao salvar centro de custo',
      });
    }
  };

  const handleDeleteClick = (center: CostCenter) => {
    setDeleteConfirm(center);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const canDelete = await state.checkCanDelete(deleteConfirm.id);
      if (!canDelete) {
        toast({
          variant: 'destructive',
          title: 'Não é possível excluir',
          description: 'Este centro de custo possui sub-centros ou movimentações associadas.',
        });
        return;
      }

      await state.deleteCenter(deleteConfirm.id);
      toast({ title: 'Centro de custo excluído com sucesso!' });
      setDeleteConfirm(null);

      // Refresh data
      if (viewMode === 'tree') {
        await state.fetchTree();
      } else {
        await state.fetchCenters();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Erro ao excluir centro de custo',
      });
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await state.toggleStatus(id, isActive);
      toast({
        title: 'Status atualizado',
        description: isActive ? 'Centro de custo ativado' : 'Centro de custo inativado',
      });

      // Refresh data
      if (viewMode === 'tree') {
        await state.fetchTree();
      } else {
        await state.fetchCenters();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Erro ao alterar status',
      });
    }
  };

  const parentOptions = state.centers.filter(
    (c) => !selectedCenter || c.id !== selectedCenter.id
  );

  const centerById = useMemo(() => new Map(state.centers.map((center) => [center.id, center])), [state.centers]);
  const visibleCenters = state.centers;
  const activeCount = visibleCenters.filter((center) => center.is_active).length;
  const rootCount = visibleCenters.filter((center) => !center.parent_id).length;
  const managedCount = visibleCenters.filter((center) => !!center.manager_id).length;
  const reportRows = useMemo(
    () => visibleCenters.map((center) => ({
      code: center.code,
      name: center.name,
      parentName: center.parent_id ? centerById.get(center.parent_id)?.name || 'Centro pai' : 'Centro raiz',
      status: center.is_active ? 'Ativo' : 'Inativo',
      manager: center.manager_id || '',
      description: center.description || '',
    })),
    [centerById, visibleCenters],
  );

  const handleGenerateReport = useCallback(() => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    const generatedAt = new Date().toLocaleString('pt-BR');
    const rows = reportRows
      .map((row) => `<tr>${reportColumns.map((column) => `<td>${escapeHtml(row[column.key as keyof typeof row])}</td>`).join('')}</tr>`)
      .join('');

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Relatorio - Centro de Custos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .muted { color: #6b7280; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
            .card strong { display: block; font-size: 22px; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Relatorio de Centro de Custos</h1>
          <div class="muted">Gerado em ${generatedAt}</div>
          <div class="grid">
            <div class="card">Total filtrado<strong>${visibleCenters.length}</strong></div>
            <div class="card">Ativos<strong>${activeCount}</strong></div>
            <div class="card">Centros raiz<strong>${rootCount}</strong></div>
            <div class="card">Com responsavel<strong>${managedCount}</strong></div>
          </div>
          <table>
            <thead><tr>${reportColumns.map((column) => `<th>${column.label}</th>`).join('')}</tr></thead>
            <tbody>${rows || '<tr><td colspan="6">Nenhum centro de custo encontrado</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
  }, [activeCount, managedCount, reportRows, rootCount, visibleCenters.length]);

  const cancelForm = () => {
    setSelectedCenter(null);
    setViewMode('tree');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centro de Custos</h1>
          <p className="text-gray-600 mt-1">Estrutura hierárquica de centros de custo</p>
        </div>

        {(viewMode === 'tree' || viewMode === 'table') && (
          <Button onClick={handleCreateClick} className="gap-2">
            <Plus className="w-5 h-5" />
            Novo Centro
          </Button>
        )}
      </div>

      {(viewMode === 'tree' || viewMode === 'table') && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Financeiro</span>
          <span>›</span>
          <span>Estrutura Financeira</span>
          <span>›</span>
          <span className="font-medium text-gray-700">Centro de Custos</span>
        </div>
      )}

      {/* Error Banner */}
      {state.error && (
        <Card className="mb-6 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{state.error}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={state.clearError}
                className="text-red-600 dark:text-red-400 h-6 px-2 mt-1"
              >
                Descartar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(viewMode === 'tree' || viewMode === 'table') && (
        <>
          <CostCenterFilters
            filters={state.filters}
            onFiltersChange={state.setFilters}
          />

          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-blue-100 text-blue-700'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Visualização em Árvore
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-100 text-blue-700'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Visualização em Tabela
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><FileBarChart className="w-4 h-4" /> Total filtrado</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{visibleCenters.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Ativos</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{activeCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><Layers className="w-4 h-4" /> Centros raiz</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{rootCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><Users className="w-4 h-4" /> Com responsável</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{managedCount}</p>
            </div>
          </div>

          <RelatoriosToolbar
            title="Centro de Custos"
            data={reportRows}
            columns={reportColumns}
            templateFileName="centro_de_custos"
            onGenerateReport={handleGenerateReport}
          />

          {viewMode === 'tree' ? (
            <CostCenterTree
              tree={state.tree}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatus}
              loading={state.loading}
            />
          ) : (
            <CostCenterTable
              centers={state.centers}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatus}
              loading={state.loading}
            />
          )}
        </>
      )}

      {(viewMode === 'form-create' || viewMode === 'form-edit') && (
        <CostCenterForm
          open
          embedded
          onOpenChange={(open) => {
            if (!open) cancelForm();
          }}
          center={viewMode === 'form-edit' ? selectedCenter : null}
          onSave={handleFormSave}
          parentOptions={parentOptions}
          clinicId={clinicId || ''}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">Confirmar Exclusão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Tem certeza que deseja excluir o centro de custo <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
