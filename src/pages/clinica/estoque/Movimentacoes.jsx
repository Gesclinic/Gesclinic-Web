import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { stockMovementsApi } from '@/lib/stockApi';
import { format } from 'date-fns';

export default function Movimentacoes() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Movimentações' },
  ]);

  const clinicContext = useClinicContext();
  const clinicId = clinicContext?.clinicId;
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    itemId: '',
    type: '',
  });

  const loadMovements = async () => {
    if (!clinicId) {
      return;
    }

    setLoading(true);
    try {
      // ✅ APLICAR FILTROS APENAS SE PREENCHIDOS
      const queryFilters = {};

      if (filters.startDate) {
        queryFilters.startDate = filters.startDate;
      }
      if (filters.endDate) {
        queryFilters.endDate = filters.endDate;
      }
      if (filters.itemId) {
        queryFilters.itemId = filters.itemId;
      }
      if (filters.type) {
        queryFilters.type = filters.type;
      }

      const data = await stockMovementsApi.list(clinicId, queryFilters);
      console.log('✅ Movimentações carregadas:', data);
      setMovements(data);
    } catch (error) {
      console.error('❌ Erro ao carregar movimentações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [clinicId]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadMovements();
  };

  const getTypeLabel = (type) => {
    const types = {
      entry: 'Entrada',
      exit: 'Saída',
      transfer: 'Transferência',
      adjustment: 'Ajuste',
    };
    return types[type] || type;
  };

  const getTypeIcon = (type) => {
    if (type === 'entry') {
      return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
    }
    if (type === 'exit') {
      return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
    }
    return <RefreshCw className="w-4 h-4 text-blue-500" />;
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Movimentações"
      subtitle="Entradas, saídas e transferências registradas no estoque."
    >
      <Card className="p-6 mt-6">
        {/* Filtros */}
        <form onSubmit={handleSearch}>
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Produto"
              value={filters.itemId}
              onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}
            />
            <Input
              type="date"
              placeholder="Data inicial"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              type="date"
              placeholder="Data final"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />

            <Button type="submit" className="flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </form>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-4">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Produto</th>
                <th className="px-4 py-2 text-right">Quantidade</th>
                <th className="px-4 py-2 text-right">Custo Unit.</th>
                <th className="px-4 py-2 text-left">Observação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    Nenhuma movimentação encontrada.
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(mov.type)}
                        {getTypeLabel(mov.type)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{mov.item?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{mov.qty}</td>
                    <td className="px-4 py-3 text-right">
                      {mov.unit_cost ? `R$ ${parseFloat(mov.unit_cost).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{mov.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageLayout>
  );
}
