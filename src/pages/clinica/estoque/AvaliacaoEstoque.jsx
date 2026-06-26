import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useClinicContext } from '@/contexts/useClinicContext';
import { stockValuationApi } from '@/lib/stockValuationApi';
import { formatLocalDate } from '@/utils/timezoneHelpers';
import { TrendingUp, Package } from 'lucide-react';

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function AvaliacaoEstoque() {
  const { toast } = useToast();
  const { clinicId } = useClinicContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const method = searchParams.get('metodo') || 'custo_medio';
  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);

  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Avaliação de Estoque' },
  ]);

  const methodMap = {
    peps: 'peps',
    ueps: 'ueps',
    custo_medio: 'weighted',
    ultimas_compras: 'lastPurchases',
  };

  const methodLabel = {
    peps: 'PEPS (Primeiro a Entrar, Primeiro a Sair)',
    ueps: 'UEPS (Último a Entrar, Primeiro a Sair)',
    custo_medio: 'Custo Médio (Média Ponderada)',
    ultimas_compras: 'Últimas Compras',
  };

  const loadValuations = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await stockValuationApi.getClinicValuation(
        clinicId,
        methodMap[method],
      );
      setValuations(data);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar avaliações',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValuations();
  }, [clinicId, method]);

  const handleMethodChange = (newMethod) => {
    setSearchParams({ metodo: newMethod });
  };

  const totalValue = valuations.reduce(
    (sum, item) => sum + (item.selectedMethod?.totalValue || 0),
    0,
  );
  const totalQuantity = valuations.reduce(
    (sum, item) => sum + (item.selectedMethod?.totalQuantity || 0),
    0,
  );
  const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;
  const showRecentPurchases = method === 'ultimas_compras';

  const renderRecentPurchases = (purchases = []) => {
    if (!purchases.length) {
      return <span className="text-gray-400">-</span>;
    }

    const visiblePurchases = purchases.slice(0, 3);

    return (
      <div className="min-w-[150px] max-w-[190px] space-y-1.5">
        {visiblePurchases.map((purchase, index) => (
          <div
            key={`${purchase.createdAt || 'purchase'}-${index}`}
            className={`rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] shadow-sm ${index === 2 ? 'hidden md:block' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-500">Data</span>
              <span className="font-semibold text-gray-800 whitespace-nowrap tabular-nums">
                {formatLocalDate(String(purchase.createdAt || '').slice(0, 10)) || '-'}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="font-medium text-gray-500">Valor unitário</span>
              <span className="font-semibold text-indigo-600 whitespace-nowrap tabular-nums">
                {moneyFormatter.format(purchase.unitCost || 0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Avaliação de Estoque"
      subtitle="Calcule o valor do seu estoque utilizando diferentes métodos de avaliação"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'PEPS', value: 'peps' },
          { label: 'UEPS', value: 'ueps' },
          { label: 'Custo Médio', value: 'custo_medio' },
          { label: 'Últimas Compras', value: 'ultimas_compras' },
        ].map((btn) => (
          <Button
            key={btn.value}
            onClick={() => handleMethodChange(btn.value)}
            variant={method === btn.value ? 'default' : 'outline'}
            className="w-full"
          >
            {btn.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Método Selecionado</p>
              <p className="text-2xl font-bold text-gray-900">
                {methodLabel[method]}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-gray-500 text-sm">Quantidade Total</p>
            <p className="text-2xl font-bold text-gray-900">{numberFormatter.format(totalQuantity)}</p>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-gray-500 text-sm">Valor Total de Estoque</p>
            <p className="text-2xl font-bold text-green-600">
              {moneyFormatter.format(totalValue)}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-gray-500 text-sm">Custo Médio Geral</p>
            <p className="text-2xl font-bold text-indigo-600">
              {moneyFormatter.format(averageCost)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Média ponderada de todo o estoque</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Produtos
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Produto</th>
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-left">Unidade</th>
                <th className="px-4 py-2 text-right">Quantidade</th>
                <th className="px-4 py-2 text-right">Custo do Método Selecionado</th>
                {showRecentPurchases && (
                  <th className="px-4 py-2 text-left w-[170px] whitespace-nowrap">
                    3 Últimas Compras
                  </th>
                )}
                <th className="px-4 py-2 text-right">Custo Médio da Linha</th>
                <th className="px-4 py-2 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={showRecentPurchases ? 8 : 7} className="py-10 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : valuations.length === 0 ? (
                <tr>
                  <td colSpan={showRecentPurchases ? 8 : 7} className="py-10 text-center text-gray-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                valuations
                  .filter((item) => (item.selectedMethod?.totalQuantity || 0) > 0)
                  .map((item) => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.sku || '-'}</td>
                      <td className="px-4 py-3">{item.unit_symbol || 'un'}</td>
                      <td className="px-4 py-3 text-right">
                        {numberFormatter.format(item.selectedMethod?.totalQuantity || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {moneyFormatter.format(item.selectedMethod?.unitCostAverage || 0)}
                      </td>
                      {showRecentPurchases && (
                        <td className="px-4 py-3 align-top w-[170px]">
                          {renderRecentPurchases(item.selectedMethod?.recentPurchases)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-indigo-600 font-medium">
                        {moneyFormatter.format(item.valuations?.weighted?.unitCostAverage || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {moneyFormatter.format(item.selectedMethod?.totalValue || 0)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
            {!loading && valuations.length > 0 && (
              <tfoot className="border-t-2 bg-gray-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-right">{numberFormatter.format(totalQuantity)}</td>
                  <td className="px-4 py-3 text-right">
                    {moneyFormatter.format(averageCost)}
                  </td>
                  {showRecentPurchases && <td className="px-4 py-3" />}
                  <td className="px-4 py-3 text-right text-indigo-600">
                    {moneyFormatter.format(averageCost)}
                  </td>
                  <td className="px-4 py-3 text-right">{moneyFormatter.format(totalValue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Sobre os Métodos</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Custo Médio Geral:</strong> mostra a média ponderada total do estoque.
          </p>
          <p>
            <strong>Custo Médio da Linha:</strong> mostra o custo médio por item na linha, separado do valor calculado pelo método selecionado.
          </p>
          <p>
            <strong>PEPS:</strong> Valida estoque com os preços das compras mais antigas
          </p>
          <p>
            <strong>UEPS:</strong> Valida estoque com os preços das compras mais recentes
          </p>
          <p>
            <strong>Custo Médio:</strong> Usa a média ponderada de todos os custos de aquisição
          </p>
          <p>
            <strong>Últimas Compras:</strong> Valida usando apenas o preço da compra mais recente
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
