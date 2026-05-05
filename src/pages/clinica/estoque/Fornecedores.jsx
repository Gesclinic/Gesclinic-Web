import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { stockSuppliersApi } from '@/lib/stockApi';
import StockSupplierDialog from '@/components/clinica/estoque/StockSupplierDialog';
import ConfirmationDialog from '@/components/clinica/ConfirmationDialog';

export default function EstoqueFornecedores() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const data = await stockSuppliersApi.list(clinicId);
      setItems(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar fornecedores',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenDialog = (item = null) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      if (payload.id) {
        await stockSuppliersApi.update(payload.id, payload);
        toast({ title: 'Fornecedor atualizado com sucesso!' });
      } else {
        await stockSuppliersApi.create(clinicId, payload);
        toast({ title: 'Fornecedor criado com sucesso!' });
      }
      fetchItems();
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar fornecedor',
        description: error.message,
      });
    }
  };

  const openDeleteAlert = (item) => {
    setItemToDelete(item);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) {
      return;
    }
    try {
      await stockSuppliersApi.remove(itemToDelete.id);
      toast({ title: 'Fornecedor excluído com sucesso!' });
      fetchItems();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir fornecedor',
        description: error.message,
      });
    } finally {
      setDeleteAlertOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tax_id && item.tax_id.includes(searchTerm)),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fornecedores</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
          <Input
            placeholder="Buscar por nome ou CNPJ/CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mt-2"
          />
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr className="border-b">
                  <th className="p-4 text-left font-semibold">Fornecedor</th>
                  <th className="p-4 text-left font-semibold">CNPJ/CPF</th>
                  <th className="p-4 text-left font-semibold">Contato</th>
                  <th className="p-4 text-left font-semibold">Telefone/Email</th>
                  <th className="p-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🏢</span>
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 font-mono text-xs">{item.tax_id || '—'}</td>
                      <td className="p-4 text-gray-600 text-sm">{item.contact_name || '—'}</td>
                      <td className="p-4 text-gray-600 text-xs">
                        <div className="flex flex-col gap-1">
                          {item.phone && <span>📱 {item.phone}</span>}
                          {item.email && <span>📧 {item.email}</span>}
                          {!item.phone && !item.email && <span>—</span>}
                        </div>
                      </td>
                      <td className="p-4 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteAlert(item)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && filteredItems.length === 0 && (
              <p className="text-muted-foreground text-center py-6">
                Nenhum fornecedor encontrado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <StockSupplierDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          initialData={selectedItem}
        />
      )}

      <ConfirmationDialog
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o fornecedor "${itemToDelete?.name}"?`}
      />
    </div>
  );
}
