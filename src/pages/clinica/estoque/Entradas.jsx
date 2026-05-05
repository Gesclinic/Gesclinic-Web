import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import StockMovementDialog from '@/components/clinica/estoque/StockMovementDialog';
import { useClinicContext } from '@/contexts/useClinicContext';
import { createAP } from '@/lib/financeApi';
import { stockMovementsApi } from '@/lib/stockApi';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';

export default function Entradas() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState(null);
  const { clinicId } = useClinicContext();
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Entradas' },
  ]);

  const loadEntries = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await stockMovementsApi.list(clinicId, { type: 'entry' });
      setEntries(data);
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar entradas',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [clinicId]);

  const handleSubmit = async (payload) => {
    console.log('Payload recebido:', payload);

    // Modo edição: atualiza movimento existente e não cria AP
    if (editingMovement) {
      try {
        const product = payload.products[0];
        await stockMovementsApi.update(editingMovement.id, {
          move_date: payload.date,
          qty: parseFloat(product.qty) || 0,
          unit_cost: parseFloat(product.unitCost) || 0,
          notes: payload.notes,
          location_id: payload.locationId,
          item_id: product.itemId || editingMovement.item_id,
          type: 'entry',
        });
        toast({ title: 'Entrada atualizada' });
      } catch (error) {
        console.error('Erro ao atualizar entrada:', error);
        toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
        return;
      }

      setDialogOpen(false);
      setEditingMovement(null);
      await loadEntries();
      return;
    }

    // Calcular total de todos os produtos
    const totalAmount = payload.products.reduce((sum, p) => {
      return sum + (parseFloat(p.qty) || 0) * (parseFloat(p.unitCost) || 0);
    }, 0);

    let apCreated = false;
    let apBillId = null;

    try {
      // Cria uma única AP com a soma de todos os produtos
      const ap = await createAP(clinicId, {
        vendor_name: payload.supplier,
        description: payload.products.map((p) => p.product).join(', ') || 'Entrada de estoque',
        amount: totalAmount,
        due_date: payload.dueDate,
        issue_date: payload.date,
        notes: payload.notes,
        status: 'open',
        installments: payload.installments || '1',
        payment_method: payload.paymentMethod,
      });
      apCreated = true;
      apBillId = ap?.id || null;
    } catch (error) {
      console.error('Erro ao registrar AP:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar entrada',
        description: error.message,
      });
      return;
    }

    // Lança os movimentos no estoque para cada produto com itemId
    const itemsToMove = payload.products.filter((p) => p.itemId && payload.locationId);
    if (itemsToMove.length > 0) {
      try {
        // Tenta lançar movimentos individuais para cada produto
        for (const product of itemsToMove) {
          try {
            // Validar que os campos obrigatórios existem
            if (!product.itemId || !payload.locationId) {
              console.warn(
                `Movimento para ${product.product} não pode ser salvo: itemId ou locationId ausente`,
              );
              continue;
            }

            // Cria entrada individual de estoque
            const commonNotes = [payload.notes, apBillId ? `AP#${apBillId}` : null]
              .filter(Boolean)
              .join(' | ');
            const movementData = {
              clinic_id: clinicId,
              item_id: product.itemId,
              type: 'entry',
              location_id: payload.locationId,
              qty: parseFloat(product.qty) || 0,
              unit_cost: parseFloat(product.unitCost) || 0,
              move_date: payload.date,
              notes: commonNotes,
              ap_bill_id: apBillId || null,
            };

            console.log('Inserindo movimento:', movementData);

            // Insere diretamente na tabela se a função não existir
            let { data, error: mvError } = await supabase
              .from('stock_movements')
              .insert(movementData)
              .select();
            // Se coluna ap_bill_id não existir, tenta novamente sem ela
            if (
              mvError &&
              (mvError.code === '42703' ||
                /column .*ap_bill_id.* does not exist/i.test(mvError.message))
            ) {
              const { ap_bill_id, ...fallbackData } = movementData;
              const res2 = await supabase.from('stock_movements').insert(fallbackData).select();
              data = res2.data;
              mvError = res2.error;
            }

            if (mvError) {
              console.error(`Movimento para ${product.product} não foi salvo:`, mvError.message);
            } else {
              console.log(`Movimento para ${product.product} salvo com sucesso:`, data);
            }
          } catch (e) {
            console.error(`Falha ao lançar movimento de ${product.product}:`, e.message);
          }
        }
        toast({
          title: 'Entrada registrada',
          description: 'AP criada. Movimentos de estoque registrados.',
        });
      } catch (error) {
        console.error('Erro ao lançar movimentos:', error);
        // Não impede o salvamento - a AP foi criada
      }
    } else {
      toast({
        title: 'Entrada registrada',
        description: apCreated
          ? 'Conta a pagar criada. Para lançar no estoque, informe o ID dos produtos.'
          : 'Entrada salva',
      });
    }

    setDialogOpen(false);
    setEditingMovement(null);
    await loadEntries();
  };

  const handleDelete = async (movementId) => {
    if (!movementId) {
      return;
    }
    const confirmed = window.confirm('Excluir esta entrada de estoque?');
    if (!confirmed) {
      return;
    }
    try {
      // Remove movimento e AP vinculada, se existir
      if (stockMovementsApi.removeCascadeAP) {
        await stockMovementsApi.removeCascadeAP(movementId);
      } else {
        await stockMovementsApi.remove(movementId);
      }
      toast({ title: 'Entrada excluída' });
      await loadEntries();
    } catch (error) {
      console.error('Erro ao excluir entrada:', error);
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    }
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Entradas de Estoque"
      subtitle="Registre entradas de produtos, compras e reposições."
      actions={
        <Button
          className="bg-blue-600 text-white flex items-center"
          onClick={() => {
            setEditingMovement(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 w-4 h-4" /> Nova Entrada
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
              <th className="px-4 py-2 text-right">Custo Unit.</th>
              <th className="px-4 py-2 text-left">Observação</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  Nenhuma entrada registrada.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {entry.move_date
                      ? format(new Date(entry.move_date + 'T00:00:00'), 'dd/MM/yyyy')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{entry.item?.name || '-'}</td>
                  <td className="px-4 py-3">{entry.qty}</td>
                  <td className="px-4 py-3 text-right">
                    {entry.unit_cost ? `R$ ${parseFloat(entry.unit_cost).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{entry.notes || '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMovement({
                          ...entry,
                          item_name: entry.item?.name,
                          location_name: entry.location?.name,
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
                      onClick={() => handleDelete(entry.id)}
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
        type="entrada"
        enableFinance
        clinicId={clinicId}
        initialMovement={editingMovement}
      />
    </PageLayout>
  );
}
