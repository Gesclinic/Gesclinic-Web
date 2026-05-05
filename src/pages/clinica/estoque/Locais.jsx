import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { stockLocationsApi } from '@/lib/stockApi';
import StockLocationDialog from '@/components/clinica/estoque/StockLocationDialog';
import ConfirmationDialog from '@/components/clinica/ConfirmationDialog';

const ENTITY_NAME = 'Local';
const PLURAL_ENTITY_NAME = 'Locais';

export default function EstoqueLocais() {
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
      const data = await stockLocationsApi.list(clinicId);
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

  const handleSubmit = async (payload) => {
    try {
      if (payload.id) {
        await stockLocationsApi.update(payload.id, payload);
        toast({ title: `${ENTITY_NAME} atualizado com sucesso!` });
      } else {
        await stockLocationsApi.create(clinicId, payload);
        toast({ title: `${ENTITY_NAME} criado com sucesso!` });
      }
      fetchItems();
      setDialogOpen(false);
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
      await stockLocationsApi.remove(itemToDelete.id);
      toast({ title: `${ENTITY_NAME} excluído com sucesso!` });
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
        <h1 className="text-3xl font-bold">{PLURAL_ENTITY_NAME} de Estoque</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo {ENTITY_NAME}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de {PLURAL_ENTITY_NAME}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center">
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3">
                        {item.is_default && <Badge variant="default">Padrão</Badge>}
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
            {!loading && items.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Nenhum {ENTITY_NAME.toLowerCase()} encontrado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <StockLocationDialog
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
        title={'Confirmar Exclusão'}
        description={`Tem certeza que deseja excluir o ${ENTITY_NAME.toLowerCase()} "${itemToDelete?.name}"?`}
      />
    </div>
  );
}
