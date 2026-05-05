import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, X, Building2, Banknote, Phone, MapPin } from 'lucide-react';
import {
  listFinanceAccounts,
  createFinanceAccount,
  updateFinanceAccount,
  deleteFinanceAccount,
} from '@/lib/financeApi';

export default function BankAccountsManager() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    account_type: 'bank',
    bank_name: '',
    account_number: '',
    agency: '',
    holder_name: '',
    holder_document: '',
  });
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  const fetchAccounts = async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const data = await listFinanceAccounts(clinicId);
      setAccounts(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [clinicId]);

  const handleOpenDialog = (account = null) => {
    setSelectedAccount(account);
    setFormData(
      account || {
        name: '',
        description: '',
        account_type: 'bank',
        bank_name: '',
        account_number: '',
        agency: '',
        holder_name: '',
        holder_document: '',
      },
    );
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedAccount(null);
    setFormData({
      name: '',
      description: '',
      account_type: 'bank',
      bank_name: '',
      account_number: '',
      agency: '',
      holder_name: '',
      holder_document: '',
    });
    setDialogOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nome da conta é obrigatório' });
      return;
    }

    try {
      if (selectedAccount) {
        await updateFinanceAccount(selectedAccount.id, formData);
        toast({ title: 'Conta atualizada com sucesso!' });
      } else {
        await createFinanceAccount(clinicId, formData);
        toast({ title: 'Conta criada com sucesso!' });
      }
      fetchAccounts();
      handleCloseDialog();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) {
      return;
    }
    try {
      await deleteFinanceAccount(accountToDelete.id);
      toast({ title: 'Conta excluída com sucesso!' });
      fetchAccounts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setDeleteAlertOpen(false);
      setAccountToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Contas Bancárias & Financeiras</h2>
          <p className="text-gray-600 text-sm mt-1">
            Gerencie as contas onde você receberá e pagará
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <div className="animate-pulse">Carregando contas...</div>
          </CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhuma conta cadastrada</p>
            <p className="text-gray-400 text-sm mt-1">
              Clique em "Nova Conta" para adicionar sua primeira conta
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-600"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Banknote className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{account.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            account.account_type === 'pix'
                              ? 'bg-purple-100 text-purple-700'
                              : account.account_type === 'cash'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {account.account_type === 'pix'
                            ? '🔐 PIX'
                            : account.account_type === 'cash'
                              ? '💵 Caixa'
                              : '🏦 Banco'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {account.bank_name && (
                  <div className="text-sm">
                    <p className="text-gray-500 text-xs">Banco</p>
                    <p className="font-medium text-gray-900">{account.bank_name}</p>
                  </div>
                )}
                {account.holder_name && (
                  <div className="text-sm">
                    <p className="text-gray-500 text-xs">Titular</p>
                    <p className="font-medium text-gray-900 truncate">{account.holder_name}</p>
                  </div>
                )}
                {account.description && (
                  <div className="text-sm">
                    <p className="text-gray-500 text-xs">Observações</p>
                    <p className="text-gray-700 line-clamp-2">{account.description}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(account)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    onClick={() => {
                      setAccountToDelete(account);
                      setDeleteAlertOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Nova/Editar Conta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg sticky top-0 z-20 -mx-6 -mt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedAccount ? 'Editar Conta' : 'Nova Conta Bancária'}
                  </h2>
                  <p className="text-blue-100 text-sm">Gerencie suas contas de receita e despesa</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-white hover:bg-blue-700 h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
            {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Informações Básicas
              </h3>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nome da Conta *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Conta Corrente Itaú, PIX da Clínica"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tipo de Conta</Label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="bank">🏦 Conta Bancária</option>
                  <option value="pix">🔐 PIX</option>
                  <option value="cash">💵 Caixa Físico</option>
                  <option value="other">📝 Outra</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Descrição / Observações</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Conta pessoal, Informações específicas, Notas..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* SEÇÃO 2: INFORMAÇÕES BANCÁRIAS */}
            {formData.account_type === 'bank' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-blue-600" />
                  Informações Bancárias
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Nome do Banco</Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="Ex: Itaú, Bradesco, Banco do Brasil"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Agência</Label>
                    <Input
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      placeholder="Ex: 1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Número da Conta</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Ex: 123456-7"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Titular da Conta</Label>
                    <Input
                      value={formData.holder_name}
                      onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                      placeholder="Nome completo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">CPF/CNPJ</Label>
                    <Input
                      value={formData.holder_document}
                      onChange={(e) =>
                        setFormData({ ...formData, holder_document: e.target.value })
                      }
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* FOOTER */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg -mx-6 -mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              {selectedAccount ? 'Atualizar Conta' : 'Criar Conta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert de Confirmação de Exclusão */}
      {deleteAlertOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Confirmar Exclusão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Tem certeza que deseja excluir a conta <strong>{accountToDelete?.name}</strong>?
              </p>
              <p className="text-sm text-gray-600">
                Esta ação não pode ser desfeita. Todas as transações dessa conta serão mantidas para
                histórico.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteAlertOpen(false);
                    setAccountToDelete(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Excluir Conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
