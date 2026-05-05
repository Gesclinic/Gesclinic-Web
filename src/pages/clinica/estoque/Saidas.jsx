import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Minus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import StockMovementDialog from '@/components/clinica/estoque/StockMovementDialog';
import { useClinicContext } from '@/contexts/useClinicContext';
import { stockMovementsApi } from '@/lib/stockApi';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';

export default function Saidas() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState(null);
  const { clinicId } = useClinicContext();
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Saídas' },
  ]);

  const loadMovements = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await stockMovementsApi.list(clinicId, { type: 'exit' });
      setMovements(data);
    } catch (error) {
      console.error('Erro ao carregar saídas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar saídas',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [clinicId]);

  const handleSubmit = async (payload) => {
    const products = payload.products || [];

    // Edição (usa apenas o primeiro item, pois edição é por movimento individual)
    if (editingMovement) {
      const product = products[0];
      try {
        await stockMovementsApi.update(editingMovement.id, {
          move_date: payload.date,
          qty: parseFloat(product.qty) || 0,
          unit_cost: null,
          notes: payload.notes,
          location_id: payload.locationId,
          item_id: product.itemId || editingMovement.item_id,
          type: 'exit',
        });
        toast({ title: 'Saída atualizada' });
      } catch (error) {
        console.error('Erro ao atualizar saída:', error);
        toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
        return;
      }
    } else {
      // Novo lançamento (aceita múltiplos produtos)
      try {
        const items = products.map((product) => ({
          clinic_id: clinicId,
          item_id: product.itemId,
          type: 'exit',
          location_id: payload.locationId,
          qty: parseFloat(product.qty) || 0,
          unit_cost: null,
          move_date: payload.date,
          notes: payload.notes,
        }));

        const { error } = await supabase.from('stock_movements').insert(items);

        if (error) {
          throw error;
        }
        toast({ title: 'Saída registrada' });
      } catch (error) {
        console.error('Erro ao registrar saída:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao registrar saída',
          description: error.message,
        });
        return;
      }
    }

    setDialogOpen(false);
    setEditingMovement(null);
    await loadMovements();
  };

  const handleDelete = async (movementId) => {
    if (!movementId) {
      return;
    }
    const confirmed = window.confirm('Excluir esta saída de estoque?');
    if (!confirmed) {
      return;
    }
    try {
      await stockMovementsApi.remove(movementId);
      toast({ title: 'Saída excluída' });
      await loadMovements();
    } catch (error) {
      console.error('Erro ao excluir saída:', error);
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    }
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Saídas de Estoque"
      subtitle="Registre saídas para uso interno, pacientes ou descarte."
      actions={
        <Button
          className="bg-red-600 text-white flex items-center"
          onClick={() => {
            setEditingMovement(null);
            setDialogOpen(true);
          }}
        >
          <Minus className="mr-2 w-4 h-4" /> Nova Saída
        </Button>
      }
    >
      <Card className="p-6 mt-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Produto</th>
              <th className="px-4 py-2 text-left">Quantidade</th>
              <th className="px-4 py-2 text-left">Observação</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500">
                  Nenhuma saída registrada.
                </td>
              </tr>
            ) : (
              movements.map((mov) => (
                <tr key={mov.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {mov.move_date
                      ? format(new Date(mov.move_date + 'T00:00:00'), 'dd/MM/yyyy')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{mov.item?.name || '-'}</td>
                  <td className="px-4 py-3">{mov.qty}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{mov.notes || '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMovement({
                          ...mov,
                          item_name: mov.item?.name,
                          location_name: mov.location?.name,
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleDelete(mov.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <StockMovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        type="saida"
        clinicId={clinicId}
        initialMovement={editingMovement}
      />
    </PageLayout>
  );
}
