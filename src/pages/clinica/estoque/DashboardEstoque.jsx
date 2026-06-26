import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinicContext } from '@/contexts/useClinicContext';
import { stockItemsApi, stockMovementsApi } from '@/lib/stockApi';
import { formatLocalDate } from '@/utils/timezoneHelpers';

const getMovementLabel = (type) => {
  const labels = {
    entry: 'Entrada',
    exit: 'Saida',
    transfer: 'Transferencia',
    adjustment: 'Ajuste',
  };
  return labels[type] || type || 'Movimentacao';
};

export default function DashboardEstoque() {
  const clinicContext = useClinicContext();
  const clinicId = clinicContext?.clinicId;
  const [items, setItems] = useState([]);
  const [monthMovements, setMonthMovements] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Dashboard' },
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      if (!clinicId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = now.toISOString();

        const [loadedItems, loadedMonthMovements, loadedRecentMovements] = await Promise.all([
          stockItemsApi.list(clinicId),
          stockMovementsApi.list(clinicId, { startDate: startOfMonth, endDate: endOfMonth }),
          stockMovementsApi.list(clinicId),
        ]);

        if (cancelled) {
          return;
        }

        setItems(loadedItems || []);
        setMonthMovements(loadedMonthMovements || []);
        setRecentMovements((loadedRecentMovements || []).slice(0, 5));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const activeItems = useMemo(() => items.filter((item) => item.is_active !== false), [items]);

  const lowStockItems = useMemo(
    () =>
      activeItems.filter((item) => {
        const minStock = Number(item.min_stock || 0);
        const balance = Number(item.total_balance || 0);
        return minStock > 0 && balance <= minStock;
      }),
    [activeItems],
  );

  const renderMetric = (value) => {
    if (loading) {
      return <span className="text-gray-400">...</span>;
    }
    return value;
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Estoque"
      subtitle="Visão geral do estoque, níveis, alertas e movimentações recentes."
    >
      {error ? (
        <Card className="p-4 mt-6 border-red-200 bg-red-50 text-sm text-red-700">
          Erro ao carregar visão geral do estoque: {error.message}
        </Card>
      ) : null}

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Itens</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{renderMetric(activeItems.length)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itens com Baixo Estoque</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">{renderMetric(lowStockItems.length)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentações do Mês</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{renderMetric(monthMovements.length)}</CardContent>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">Movimentações Recentes</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Carregando movimentações...</p>
        ) : recentMovements.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma movimentação encontrada.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{movement.item?.name || 'Produto sem nome'}</p>
                  <p className="text-sm text-gray-500">{getMovementLabel(movement.type)}</p>
                </div>
                <div className="text-sm text-gray-600 sm:text-right">
                  <p className="font-semibold text-gray-900">{Number(movement.qty || 0).toLocaleString('pt-BR')} {movement.item?.unit_symbol || 'un'}</p>
                  <p>{movement.move_date ? formatLocalDate(movement.move_date) : '-'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageLayout>
  );
}
