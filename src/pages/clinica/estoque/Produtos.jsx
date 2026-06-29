import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { stockItemsApi } from '@/lib/stockApi';
import StockItemDialog from '@/components/clinica/estoque/StockItemDialog';
import ConfirmationDialog from '@/components/clinica/ConfirmationDialog';

export default function EstoqueProdutos() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  console.log(
    'EstoqueProdutos render. clinicId:',
    clinicId,
    'loading:',
    loading,
    'items:',
    items.length,
  );

  const fetchItems = useCallback(async () => {
    console.log('fetchItems called. clinicId:', clinicId);
    if (!clinicId) {
      console.warn('fetchItems: No clinicId available');
      setLoading(false); // Ensure loading stops if no clinicId
      return;
    }
    setLoading(true);
    try {
      console.log('Calling stockItemsApi.list...');
      const data = await stockItemsApi.list(clinicId);
      console.log('stockItemsApi.list result:', data);
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar produtos',
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

  const handleCloseDialog = () => {
    setSelectedItem(null);
    setDialogOpen(false);
  };

  const handleSubmit = async (payload) => {
    try {
      if (payload.id) {
        await stockItemsApi.update(payload.id, payload);
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        await stockItemsApi.create(clinicId, payload);
        toast({ title: 'Produto criado com sucesso!' });
      }
      fetchItems();
      handleCloseDialog();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar produto',
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
    setDeleting(true);
    toast({
      title: 'Processando exclusao...',
      description: 'Aguarde enquanto concluimos a operacao.',
    });

    try {
      const result = await stockItemsApi.remove(itemToDelete.id);

      if (result?.action === 'inactivated_due_to_movements') {
        toast({
          title: 'Produto inativado',
          description:
            'Este produto possui movimentacoes de estoque e foi inativado para preservar o historico.',
        });
      } else {
        toast({ title: 'Produto excluido com sucesso!' });
      }

      fetchItems();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir produto',
        description: error.message,
      });
    } finally {
      setDeleting(false);
      setDeleteAlertOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mt-2"
          />
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-left">Categoria</th>
                  <th className="p-3 text-center">Mínimo</th>
                  <th className="p-3 text-center">Máximo</th>
                  <th className="p-3 text-center">Saldo Atual</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-4 text-center">
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-muted-foreground">{item.sku || '-'}</td>
                      <td className="p-3 text-muted-foreground">{item.category_name || '-'}</td>
                      <td className="p-3 text-center text-muted-foreground">
                        {item.min_stock || '-'}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {item.max_stock || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={
                            item.total_balance < (item.min_stock || 0)
                              ? 'text-red-600 font-semibold'
                              : ''
                          }
                        >
                          {`${item.total_balance || 0} ${item.unit_symbol || 'un'}`}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={item.is_active ? 'default' : 'outline'}>
                          {item.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="p-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteAlert(item)}
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
              <p className="text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <StockItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          initialData={selectedItem}
          clinicId={clinicId}
        />
      )}

      <ConfirmationDialog
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o produto "${itemToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText={deleting ? 'Processando...' : 'Excluir'}
        confirmDisabled={deleting}
      />
    </div>
  );
}
