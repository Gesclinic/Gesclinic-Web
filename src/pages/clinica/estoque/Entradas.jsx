import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useClinicContext } from '@/contexts/useClinicContext';
import { stockMovementsApi } from '@/lib/stockApi';
import { format } from 'date-fns';

export default function Entradas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
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
          onClick={() => navigate('/clinica/estoque/entradas/nova')}
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
                        navigate(`/clinica/estoque/entradas/editar/${entry.id}`);
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
    </PageLayout>
  );
}
