/**
 * Page: Chart of Accounts
 * Main page for managing financial chart of accounts
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Plus, AlertCircle, Upload, FileBarChart, Layers, ListChecks, CheckCircle2 } from 'lucide-react';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';
import { applyDefaultAccountPlan, repairAccountPlanDescriptions, resetAccountPlan } from '@/lib/accountPlanSeed';
import { getChartOfAccountById } from '../services/chartOfAccountsApi';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import {
  ChartOfAccount,
  ChartOfAccountTreeNode,
  ChartOfAccountCreateInput,
  ChartOfAccountUpdateInput,
  ChartOfAccountFilter,
} from '../types';
import ChartOfAccountsTree from '../components/ChartOfAccountsTree';
import ChartOfAccountsFilters from '../components/ChartOfAccountsFilters';
import ChartOfAccountsForm from '../components/ChartOfAccountsForm';
import ChartOfAccountsTable from '../components/ChartOfAccountsTable';
import { ExcelImportDialog } from '../components/ExcelImportDialog';

type ViewMode = 'tree' | 'table' | 'form-create' | 'form-edit';

interface FormState {
  mode: 'create' | 'edit';
  account?: ChartOfAccountTreeNode;
  parentAccount?: ChartOfAccountTreeNode;
}

const reportColumns = [
  { key: 'code', label: 'Codigo', width: 14 },
  { key: 'name', label: 'Nome', width: 32 },
  { key: 'type', label: 'Tipo', width: 14 },
  { key: 'nature', label: 'Natureza', width: 14 },
  { key: 'level', label: 'Nivel', width: 10 },
  { key: 'parentName', label: 'Conta Pai', width: 28 },
  { key: 'status', label: 'Status', width: 12 },
  { key: 'acceptsEntries', label: 'Lancamentos', width: 14 },
  { key: 'description', label: 'Descricao', width: 36 },
];

const templateExampleRows = [
  { code: '1', name: 'RECEITAS', type: 'RECEITA', nature: 'CREDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Grupo raiz de receitas' },
  { code: '1.1', name: 'Particular', type: 'RECEITA', nature: 'CREDORA', level: 2, parentName: 'RECEITAS', status: 'Ativa', acceptsEntries: 'Sim', description: 'Receitas de pacientes particulares' },
  { code: '1.2', name: 'Convenios', type: 'RECEITA', nature: 'CREDORA', level: 2, parentName: 'RECEITAS', status: 'Ativa', acceptsEntries: 'Nao', description: 'Receitas por convênios' },
  { code: '1.2.1', name: 'Unimed', type: 'RECEITA', nature: 'CREDORA', level: 3, parentName: 'Convenios', status: 'Ativa', acceptsEntries: 'Sim', description: 'Convênio Unimed' },
  { code: '2', name: 'DEDUCOES', type: 'DEDUCAO', nature: 'DEVEDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Glosas, impostos e estornos' },
  { code: '2.2', name: 'ISS', type: 'DEDUCAO', nature: 'DEVEDORA', level: 2, parentName: 'DEDUCOES', status: 'Ativa', acceptsEntries: 'Sim', description: 'Imposto sobre serviços' },
  { code: '3', name: 'CUSTOS ASSISTENCIAIS', type: 'CUSTO', nature: 'DEVEDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Custos diretos assistenciais' },
  { code: '3.2', name: 'Medicamentos', type: 'CUSTO', nature: 'DEVEDORA', level: 2, parentName: 'CUSTOS ASSISTENCIAIS', status: 'Ativa', acceptsEntries: 'Sim', description: 'Compras de medicamentos' },
  { code: '4', name: 'HONORARIOS MEDICOS', type: 'HONORARIO', nature: 'DEVEDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Produção, repasse e plantões' },
  { code: '4.2', name: 'Repasses', type: 'HONORARIO', nature: 'DEVEDORA', level: 2, parentName: 'HONORARIOS MEDICOS', status: 'Ativa', acceptsEntries: 'Sim', description: 'Repasses médicos' },
  { code: '5', name: 'PESSOAL', type: 'DESPESA', nature: 'DEVEDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Folha e encargos' },
  { code: '5.1', name: 'Salarios', type: 'DESPESA', nature: 'DEVEDORA', level: 2, parentName: 'PESSOAL', status: 'Ativa', acceptsEntries: 'Sim', description: 'Salários fixos' },
  { code: '6', name: 'DESPESAS ADMINISTRATIVAS', type: 'DESPESA', nature: 'DEVEDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Despesas de suporte' },
  { code: '7', name: 'DESPESAS FINANCEIRAS', type: 'DESPESA', nature: 'DEVEDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Juros, tarifas e IOF' },
  { code: '8', name: 'INVESTIMENTOS', type: 'INVESTIMENTO', nature: 'DEVEDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Equipamentos, obras e tecnologia' },
  { code: '9', name: 'PATRIMONIO', type: 'PATRIMONIO', nature: 'CREDORA', level: 1, parentName: '', status: 'Ativa', acceptsEntries: 'Nao', description: 'Capital social e reservas' },
];

const templateDescriptionByCode = templateExampleRows.reduce<Record<string, string>>((acc, row) => {
  const description = String(row.description || '').trim();
  if (description) acc[row.code] = description;
  return acc;
}, {});

const getDetailedDescription = (account: { code?: string; name?: string; description?: string | null; parentName?: string }) => {
  const rawDescription = String(account.description || '').trim();
  if (rawDescription) return rawDescription;

  const code = String(account.code || '').trim();
  if (code && templateDescriptionByCode[code]) {
    return templateDescriptionByCode[code];
  }

  const name = String(account.name || '').trim();
  const parentName = String(account.parentName || '').trim();
  if (name && parentName && parentName !== 'Conta raiz') {
    return `Conta ${name} vinculada ao grupo ${parentName}`;
  }
  if (name) {
    return `Conta ${name} na estrutura do plano de contas`;
  }

  return '';
};

const flattenTree = (
  nodes: ChartOfAccountTreeNode[],
  parentName = '',
): Array<ChartOfAccount & { parentName?: string }> =>
  nodes.flatMap((node) => {
    const { children = [], ...account } = node;
    return [
      { ...account, parentName },
      ...flattenTree(children, node.name),
    ];
  });

const accountMatchesFilters = (account: ChartOfAccount, filters: ChartOfAccountFilter) => {
  const search = filters.search?.trim().toLowerCase();

  if (search) {
    const haystack = `${account.code || ''} ${account.name || ''} ${account.description || ''}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  if (filters.type && account.type !== filters.type) return false;
  if (filters.nature && account.nature !== filters.nature) return false;
  if (filters.is_active !== undefined && account.is_active !== filters.is_active) return false;
  if (filters.level && account.level !== filters.level) return false;
  if (filters.accepts_entries !== undefined && account.accepts_entries !== filters.accepts_entries) return false;

  return true;
};

const filterTree = (
  nodes: ChartOfAccountTreeNode[],
  filters: ChartOfAccountFilter,
): ChartOfAccountTreeNode[] =>
  nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children || [], filters);
      if (accountMatchesFilters(node, filters) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean) as ChartOfAccountTreeNode[];

const toReportRows = (accounts: Array<ChartOfAccount & { parentName?: string }>) =>
  accounts.map((account) => ({
    code: account.code,
    name: account.name,
    type: account.type,
    nature: account.nature,
    level: account.level,
    parentName: account.parentName || 'Conta raiz',
    status: account.is_active ? 'Ativa' : 'Inativa',
    acceptsEntries: account.accepts_entries ? 'Sim' : 'Nao',
    description: getDetailedDescription(account),
  }));

const getErrorMessage = (err: unknown) => {
  if (!err) return 'Erro desconhecido';
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const maybe = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [maybe.message, maybe.details, maybe.hint, maybe.code].filter(Boolean);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(maybe);
    } catch {
      return 'Erro desconhecido';
    }
  }
  return 'Erro desconhecido';
};

export const ChartOfAccountsPage: React.FC = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [formState, setFormState] = useState<FormState | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccountTreeNode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ChartOfAccountTreeNode | null>(null);
  const [filters, setFilters] = useState<ChartOfAccountFilter>({ is_active: true });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importingProgress, setImportingProgress] = useState<{ current: number; total: number } | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [repairingDescriptions, setRepairingDescriptions] = useState(false);

  const {
    accounts,
    tree,
    loading,
    error,
    fetchTree,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleStatus,
    checkCanDelete,
    clearError,
  } = useChartOfAccounts(clinicId);

  // Load initial data
  useEffect(() => {
    if (clinicId) {
      if (viewMode === 'tree') {
        fetchTree(filters.is_active === true);
      } else if (viewMode === 'table') {
        fetchAccounts(filters);
      }
    }
  }, [clinicId, viewMode, filters, fetchTree, fetchAccounts]);

  const visibleTree = useMemo(() => filterTree(tree, filters), [tree, filters]);
  const treeRows = useMemo(() => flattenTree(visibleTree), [visibleTree]);
  const visibleAccounts = viewMode === 'tree' ? treeRows : accounts;
  const reportRows = useMemo(() => toReportRows(visibleAccounts), [visibleAccounts]);
  const rootCount = visibleAccounts.filter((account) => !account.parent_id).length;
  const activeCount = visibleAccounts.filter((account) => account.is_active).length;
  const entryCount = visibleAccounts.filter((account) => account.accepts_entries).length;
  const typeSummary = visibleAccounts.reduce<Record<string, number>>((summary, account) => {
    summary[account.type] = (summary[account.type] || 0) + 1;
    return summary;
  }, {});

  const handleGenerateReport = useCallback(() => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const generatedAt = new Date().toLocaleString('pt-BR');
    const typeRows = Object.entries(typeSummary)
      .map(([type, total]) => `<tr><td>${type}</td><td>${total}</td></tr>`)
      .join('');

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Relatorio - Plano de Contas</title>
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
            @media print { body { margin: 10mm; } .grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <h1>Relatorio do Plano de Contas</h1>
          <div class="muted">Gerado em ${generatedAt}</div>
          <div class="grid">
            <div class="card">Total de contas<strong>${visibleAccounts.length}</strong></div>
            <div class="card">Contas ativas<strong>${activeCount}</strong></div>
            <div class="card">Aceitam lancamentos<strong>${entryCount}</strong></div>
            <div class="card">Contas raiz<strong>${rootCount}</strong></div>
          </div>
          <h2>Resumo por tipo</h2>
          <table><thead><tr><th>Tipo</th><th>Total</th></tr></thead><tbody>${typeRows || '<tr><td colspan="2">Sem dados</td></tr>'}</tbody></table>
          <h2>Contas filtradas</h2>
          <table>
            <thead><tr>${reportColumns.map((column) => `<th>${column.label}</th>`).join('')}</tr></thead>
            <tbody>
              ${reportRows.map((row) => `<tr>${reportColumns.map((column) => `<td>${row[column.key] ?? ''}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="9">Nenhuma conta encontrada</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
  }, [activeCount, entryCount, reportRows, rootCount, typeSummary, visibleAccounts.length]);

  // Handle create
  const handleCreate = () => {
    setFormState({ mode: 'create' });
    setViewMode('form-create');
  };

  const handleApplyDefaultTemplate = async () => {
    if (!clinicId) return;

    setApplyingTemplate(true);
    try {
      if (visibleAccounts.length > 0) {
        const confirmed = window.confirm(
          'Ja existem contas cadastradas. Para aplicar o modelo ERP hospitalar completo, o plano atual sera recriado. Deseja continuar?'
        );
        if (!confirmed) return;
        await resetAccountPlan(clinicId, user?.id, user?.email);
      } else {
        await applyDefaultAccountPlan(clinicId, user?.id, user?.email);
      }
      await fetchTree(filters.is_active === true);
      await fetchAccounts(filters);
      alert('Modelo ERP hospitalar aplicado com sucesso.');
    } catch (err) {
      console.error('Erro ao aplicar plano padrão', err);
      alert(`Erro ao aplicar plano padrão: ${getErrorMessage(err)}`);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleRepairDescriptions = async () => {
    if (!clinicId) return;

    setRepairingDescriptions(true);
    try {
      const result = await repairAccountPlanDescriptions(clinicId);
      await fetchTree(filters.is_active === true);
      await fetchAccounts(filters);
      alert(`Descrições corrigidas: ${result.fixed}`);
    } catch (err) {
      console.error('Erro ao corrigir descrições do plano', err);
      alert(`Erro ao corrigir descrições: ${getErrorMessage(err)}`);
    } finally {
      setRepairingDescriptions(false);
    }
  };

  // Handle import Excel
  const handleImportExcel = async (data: ChartOfAccountCreateInput[]) => {
    try {
      setImportingProgress({ current: 0, total: data.length });

      const existingAccounts = accounts.length > 0 ? accounts : treeRows;
      const codeToId = new Map(existingAccounts.map((account) => [account.code, account.id]));
      const sortedData = [...data].sort((a, b) => {
        const levelDiff = a.code.split('.').length - b.code.split('.').length;
        return levelDiff || a.code.localeCompare(b.code, 'pt-BR', { numeric: true });
      });

      for (let i = 0; i < sortedData.length; i++) {
        const { parent_code, ...accountInput } = sortedData[i];
        const parentId = parent_code ? codeToId.get(parent_code) : null;

        if (parent_code && !parentId) {
          throw new Error(`Conta pai ${parent_code} não encontrada para ${accountInput.code}`);
        }

        const createdAccount = await createAccount(
          {
            ...accountInput,
            clinic_id: clinicId,
            parent_id: parentId,
          },
          user.id
        );
        codeToId.set(createdAccount.code, createdAccount.id);
        setImportingProgress({ current: i + 1, total: data.length });
      }

      setImportDialogOpen(false);
      setImportingProgress(null);
      await fetchTree();
      alert(`${data.length} contas foram importadas com sucesso!`);
    } catch (err) {
      console.error('Error importing accounts:', err);
      alert('Erro ao importar contas: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  // Handle create with parent
  const handleAddChild = (parentAccount: ChartOfAccountTreeNode) => {
    setFormState({ mode: 'create', parentAccount });
    setViewMode('form-create');
  };

  // Handle edit
  const handleEdit = async (account: ChartOfAccountTreeNode) => {
    const fallbackDescription = getDetailedDescription(account);

    try {
      const fullAccount = await getChartOfAccountById(account.id);
      const hydratedAccount: ChartOfAccountTreeNode = {
        ...account,
        ...fullAccount,
        description: getDetailedDescription({
          ...account,
          ...fullAccount,
          parentName: account.parentName,
        }),
      };

      setFormState({ mode: 'edit', account: hydratedAccount });
      setSelectedAccount(hydratedAccount);
      setViewMode('form-edit');
    } catch (err) {
      console.error('Erro ao carregar conta para edição:', err);
      const safeAccount: ChartOfAccountTreeNode = {
        ...account,
        description: fallbackDescription,
      };
      setFormState({ mode: 'edit', account: safeAccount });
      setSelectedAccount(safeAccount);
      setViewMode('form-edit');
    }
  };

  // Handle form submit
  const handleFormSubmit = async (data: ChartOfAccountCreateInput | ChartOfAccountUpdateInput) => {
    try {
      if (formState?.mode === 'create') {
        await createAccount(
          {
            ...data,
            clinic_id: clinicId,
          } as ChartOfAccountCreateInput,
          user.id
        );
      } else if (formState?.mode === 'edit' && formState.account) {
        await updateAccount(formState.account.id, data as ChartOfAccountUpdateInput);
      }

      setFormState(null);
      setViewMode('tree');
      await fetchTree();
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  // Handle delete
  const handleDeleteClick = async (account: ChartOfAccountTreeNode) => {
    const canDelete = await checkCanDelete(account.id);
    if (!canDelete) {
      alert(
        'Não é possível excluir esta conta pois ela possui subcontas ou lançamentos ativos.'
      );
      return;
    }
    setDeleteConfirm(account);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteAccount(deleteConfirm.id);
      setDeleteConfirm(null);
      await fetchTree();
    } catch (err) {
      alert('Erro ao excluir conta: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (account: ChartOfAccountTreeNode) => {
    try {
      await toggleStatus(account.id, !account.is_active);
      await fetchTree();
    } catch (err) {
      alert('Erro ao atualizar status: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  // Handle table edit
  const handleTableEdit = async (account: any) => {
    await handleEdit(account as ChartOfAccountTreeNode);
  };

  // Handle table delete
  const handleTableDelete = async (account: any) => {
    await handleDeleteClick(account as ChartOfAccountTreeNode);
  };

  // Handle table status toggle
  const handleTableToggleStatus = async (account: any) => {
    await handleToggleStatus(account as ChartOfAccountTreeNode);
  };

  const availableParents = formState?.mode === 'create' ? tree : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plano de Contas</h1>
          <p className="text-gray-600 mt-1">
            Gerenciar a estrutura contábil central da clínica
          </p>
        </div>
        {viewMode === 'tree' || viewMode === 'table' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyDefaultTemplate}
              disabled={applyingTemplate}
              className="px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg font-medium hover:bg-emerald-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {applyingTemplate ? 'Aplicando...' : 'Plano Padrão'}
            </button>
            <button
              onClick={handleRepairDescriptions}
              disabled={repairingDescriptions}
              className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {repairingDescriptions ? 'Corrigindo...' : 'Corrigir descrições'}
            </button>
            <button
              onClick={() => setImportDialogOpen(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Importar Excel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nova Conta
            </button>
          </div>
        ) : null}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-900 font-medium">Erro</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-900 font-medium text-sm"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-4">
              Tem certeza que deseja excluir a conta <span className="font-semibold">{deleteConfirm.name}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'tree' && (
        <>
          <div className="flex gap-4 items-center">
            <button
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

          <ChartOfAccountsFilters
            onFilterChange={setFilters}
            initialFilters={filters}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><FileBarChart className="w-4 h-4" /> Total filtrado</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{visibleAccounts.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Ativas</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{activeCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><ListChecks className="w-4 h-4" /> Aceitam lançamentos</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{entryCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><Layers className="w-4 h-4" /> Contas raiz</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{rootCount}</p>
            </div>
          </div>

          <RelatoriosToolbar
            title="Plano de Contas"
            data={reportRows}
            columns={reportColumns}
            templateFileName="plano_de_contas"
            templateRows={templateExampleRows}
            onGenerateReport={handleGenerateReport}
          />

          <ChartOfAccountsTree
            accounts={visibleTree}
            loading={loading}
            selectedAccountId={selectedAccount?.id}
            onSelect={setSelectedAccount}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onToggleStatus={handleToggleStatus}
          />
        </>
      )}

      {viewMode === 'table' && (
        <>
          <div className="flex gap-4 items-center">
            <button
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

          <ChartOfAccountsFilters
            onFilterChange={setFilters}
            initialFilters={filters}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><FileBarChart className="w-4 h-4" /> Total filtrado</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{visibleAccounts.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Ativas</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{activeCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><ListChecks className="w-4 h-4" /> Aceitam lançamentos</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{entryCount}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm"><Layers className="w-4 h-4" /> Contas raiz</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{rootCount}</p>
            </div>
          </div>

          <RelatoriosToolbar
            title="Plano de Contas"
            data={reportRows}
            columns={reportColumns}
            templateFileName="plano_de_contas"
            templateRows={templateExampleRows}
            onGenerateReport={handleGenerateReport}
          />

          <ChartOfAccountsTable
            accounts={accounts}
            loading={loading}
            onEdit={handleTableEdit}
            onDelete={handleTableDelete}
            onToggleStatus={handleTableToggleStatus}
          />
        </>
      )}

      {(viewMode === 'form-create' || viewMode === 'form-edit') && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {formState?.mode === 'create' ? 'Nova Conta' : 'Editar Conta'}
          </h2>

          <ChartOfAccountsForm
            account={formState?.account}
            parentAccount={formState?.parentAccount}
            availableParents={availableParents}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setFormState(null);
              setViewMode('tree');
            }}
            isLoading={loading}
            error={error}
          />
        </div>
      )}

      {/* Excel Import Dialog */}
      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        importType="chart-of-accounts"
        onImport={handleImportExcel}
      />
    </div>
  );
};

export default ChartOfAccountsPage;
