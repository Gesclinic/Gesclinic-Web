import React, { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import {
  accountTypeColors,
  accountTypeBgColors,
  accountTypeLabels,
  getAccountTypeIcon,
  financialAccountsApi,
} from '@/lib/financialAccountsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, Plus, Edit2, Trash2, Save, X, AlertTriangle } from 'lucide-react';

export default function PlanoDeContas() {
  const { clinic } = useClinicContext();
  const { toast } = useToast();
  const clinicId = clinic?.id;

  const [accounts, setAccounts] = useState([]);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    type: 'despesa',
    parent_id: null,
  });

  useEffect(() => {
    if (clinicId) {
      loadAccounts();
    }
  }, [clinicId]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await financialAccountsApi.listAccounts(clinicId);
      setAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o plano de contas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const handleCreateAccount = async () => {
    if (!newAccountData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para a conta',
        variant: 'destructive',
      });
      return;
    }

    try {
      await financialAccountsApi.createAccount(
        clinicId,
        newAccountData.name,
        newAccountData.type,
        newAccountData.parent_id,
      );
      toast({
        title: 'Sucesso',
        description: 'Conta criada com sucesso',
      });
      setShowCreateModal(false);
      setNewAccountData({ name: '', type: 'despesa', parent_id: null });
      loadAccounts();
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a conta',
        variant: 'destructive',
      });
    }
  };

  const handleSaveEdit = async (accountId) => {
    try {
      await financialAccountsApi.updateAccount(accountId, editingData);
      toast({
        title: 'Sucesso',
        description: 'Conta atualizada com sucesso',
      });
      setEditingId(null);
      setEditingData({});
      loadAccounts();
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a conta',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      await financialAccountsApi.deleteAccount(accountId);
      toast({
        title: 'Sucesso',
        description: 'Conta deletada com sucesso',
      });
      setShowDeleteConfirm(null);
      loadAccounts();
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar a conta',
        variant: 'destructive',
      });
    }
  };

  const getChildAccounts = (parentId) => {
    return accounts.filter((a) => a.parent_id === parentId);
  };

  const startEditingAccount = (account) => {
    setEditingId(account.id);
    setEditingData({ name: account.name });
  };

  const renderAccount = (account, level = 1) => {
    const children = getChildAccounts(account.id);
    const isExpanded = expandedAccounts[account.id];
    const hasChildren = children.length > 0;
    const isEditing = editingId === account.id;
    const paddingLeft = level * 24;

    return (
      <div key={account.id} className="space-y-0">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border-l-4 transition-all hover:shadow-md ${
            accountTypeBgColors[account.type]
          }`}
          style={{
            paddingLeft: `${paddingLeft}px`,
            borderLeftColor: accountTypeColors[account.type]?.split(' ')[0] || '#3b82f6',
          }}
        >
          {/* Expand Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(account.id)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 transition flex-shrink-0 p-1 hover:bg-white/50 dark:hover:bg-slate-700 rounded"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
          ) : (
            <div className="w-6 flex-shrink-0" />
          )}

          {/* Icon */}
          <span className="text-lg flex-shrink-0">{getAccountTypeIcon(account.type)}</span>

          {/* Name / Edit Input */}
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                autoFocus
                value={editingData.name}
                onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                className="h-8 text-sm"
                placeholder="Nome da conta"
              />
              <button
                onClick={() => handleSaveEdit(account.id)}
                className="p-1.5 hover:bg-green-200 dark:hover:bg-green-900/30 rounded transition"
                title="Salvar"
              >
                <Save className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditingData({});
                }}
                className="p-1.5 hover:bg-red-200 dark:hover:bg-red-900/30 rounded transition"
                title="Cancelar"
              >
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {account.name}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${accountTypeColors[account.type]} bg-white/30 dark:bg-black/20`}
                >
                  {accountTypeLabels[account.type]}
                </span>
              </div>
            </div>
          )}

          {/* Status Badge */}
          {!account.is_active && (
            <span className="text-xs bg-red-200 dark:bg-red-900/30 px-2 py-1 rounded text-red-700 dark:text-red-300 font-medium">
              Inativa
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => startEditingAccount(account)}
                className="p-2 hover:bg-blue-200 dark:hover:bg-blue-900/30 rounded transition"
                title="Editar"
              >
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(account.id)}
                className="p-2 hover:bg-red-200 dark:hover:bg-red-900/30 rounded transition"
                title="Deletar"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-0 mt-1">
            {children.map((child) => renderAccount(child, level + 1))}
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm === account.id && (
          <div className="ml-6 mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Tem certeza que deseja deletar esta conta?
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleDeleteAccount(account.id)}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition"
              >
                Deletar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3 py-1.5 bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded text-sm font-medium hover:bg-slate-400 dark:hover:bg-slate-600 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootAccounts = accounts.filter((a) => a.level === 1);
  const statistics = {
    receita: accounts.filter((a) => a.type === 'receita').length,
    deducao: accounts.filter((a) => a.type === 'deducao').length,
    custo: accounts.filter((a) => a.type === 'custo').length,
    despesa: accounts.filter((a) => a.type === 'despesa').length,
    investimento: accounts.filter((a) => a.type === 'investimento').length,
    ajuste: accounts.filter((a) => a.type === 'ajuste').length,
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            📊 Plano de Contas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Gestão hierárquica de receitas, custos, despesas e investimentos
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { type: 'receita', icon: '💰', label: 'Receitas' },
          { type: 'deducao', icon: '📉', label: 'Deduções' },
          { type: 'custo', icon: '🔧', label: 'Custos' },
          { type: 'despesa', icon: '💸', label: 'Despesas' },
          { type: 'investimento', icon: '📈', label: 'Investimentos' },
          { type: 'ajuste', icon: '⚙️', label: 'Ajustes' },
        ].map(({ type, icon, label }) => (
          <Card
            key={type}
            className={`border-0 shadow-sm hover:shadow-md transition ${accountTypeBgColors[type]}`}
          >
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className={`text-2xl font-bold ${accountTypeColors[type]}`}>
                  {statistics[type]}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accounts Tree */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <CardTitle className="flex items-center gap-2">
            <span>🌳</span>
            Estrutura Hierárquica
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin mr-3">⏳</div>
              <p className="text-slate-600 dark:text-slate-400">Carregando contas...</p>
            </div>
          ) : rootAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="text-6xl mb-4 opacity-50">📋</div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg mb-1">
                Nenhuma conta configurada
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Crie a primeira conta para começar a organizar seu plano de contas
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Adicionar Conta Raiz
              </Button>
            </div>
          ) : (
            <div className="space-y-1 max-h-[700px] overflow-y-auto pr-2">
              {rootAccounts.map((account) => renderAccount(account))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Account Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>Criar Nova Conta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="account-name">Nome da Conta *</Label>
              <Input
                id="account-name"
                placeholder="Ex: Consultas Particulares"
                value={newAccountData.name}
                onChange={(e) => setNewAccountData({ ...newAccountData, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="account-type">Tipo de Conta *</Label>
              <Select
                value={newAccountData.type}
                onValueChange={(value) => setNewAccountData({ ...newAccountData, type: value })}
              >
                <SelectTrigger id="account-type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(accountTypeLabels).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {getAccountTypeIcon(type)} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account-parent">Conta Pai (opcional)</Label>
              <Select
                value={newAccountData.parent_id || 'none'}
                onValueChange={(value) =>
                  setNewAccountData({
                    ...newAccountData,
                    parent_id: value === 'none' ? null : value,
                  })
                }
              >
                <SelectTrigger id="account-parent" className="mt-2">
                  <SelectValue placeholder="Selecionar conta pai..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Raiz)</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {getAccountTypeIcon(account.type)} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAccount} className="bg-blue-600 hover:bg-blue-700">
              Criar Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
