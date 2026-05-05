import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { stockCategoriesApi } from '@/lib/stockApi';
import CategoryDialog from '@/components/clinica/estoque/CategoryDialog';
import ConfirmationDialog from '@/components/clinica/ConfirmationDialog';

const ENTITY_NAME = 'Categoria';
const PLURAL_ENTITY_NAME = 'Categorias';

export default function EstoqueCategorias() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const data = await stockCategoriesApi.list(clinicId);
      setItems(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Erro ao buscar ${PLURAL_ENTITY_NAME.toLowerCase()}`,
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
        await stockCategoriesApi.update(payload.id, payload);
        toast({ title: `${ENTITY_NAME} atualizada com sucesso!` });
      } else {
        const created = await stockCategoriesApi.create(clinicId, payload);
        toast({ title: `${ENTITY_NAME} criada com sucesso!` });
        try {
          if (created?.id) {
            const msg = {
              id: created.id,
              name: created.name || payload.name || '',
              ts: Date.now(),
            };
            localStorage.setItem('gc_cat_created', JSON.stringify(msg));
            // também prepara seleção por nome como fallback
            localStorage.setItem('gc_cat_pending', msg.name);
          }
        } catch {}
      }
      fetchItems();
      handleCloseDialog();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Erro ao salvar ${ENTITY_NAME.toLowerCase()}`,
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
      await stockCategoriesApi.remove(itemToDelete.id);
      toast({ title: `${ENTITY_NAME} excluída com sucesso!` });
      fetchItems();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Erro ao excluir ${ENTITY_NAME.toLowerCase()}`,
        description: error.message,
      });
    } finally {
      setDeleteAlertOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{PLURAL_ENTITY_NAME} de Produtos</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova {ENTITY_NAME}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de {PLURAL_ENTITY_NAME}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr className="border-b">
                  <th className="p-4 text-left font-semibold">Categoria</th>
                  <th className="p-4 text-left font-semibold">Descrição</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.emoji || '📦'}</span>
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.code || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 text-xs max-w-xs truncate">
                        {item.description || '—'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            item.is_active !== false
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {item.is_active !== false ? '🟢 Ativa' : '⚪ Inativa'}
                        </span>
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
            {!loading && items.length === 0 && (
              <p className="text-muted-foreground text-center py-6">
                Nenhuma {ENTITY_NAME.toLowerCase()} encontrada.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          initialData={selectedItem}
          entityName={ENTITY_NAME}
        />
      )}

      <ConfirmationDialog
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        onConfirm={handleDelete}
        title={'Confirmar Exclusão'}
        description={`Tem certeza que deseja excluir a ${ENTITY_NAME.toLowerCase()} "${itemToDelete?.name}"?`}
      />
    </div>
  );
}
