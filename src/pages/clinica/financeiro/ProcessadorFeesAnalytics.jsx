import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { listProcessorFees } from '@/lib/processorFeesApi';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import { supabase } from '@/lib/customSupabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, CreditCard, DollarSign, Percent, TrendingUp } from 'lucide-react';

export default function ProcessadorFeesAnalytics({ embedded = false }) {
  const { clinicId } = useAuth();
  const { clinic, loadingClinic } = useClinicContext();
  const { toast } = useToast();

  const [fees, setFees] = useState([]);
  const [processors, setProcessors] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // month, quarter, year

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    if (!clinicId) return;
    loadData();
  }, [clinicId, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load fees config
      const feesData = await listProcessorFees(clinicId);
      setFees(feesData || []);

      // Load processors
      const processorsData = await listCardProcessors(clinicId);
      setProcessors(processorsData || []);

      // Load receivables with fees from the current operational AR source.
      const dateFilter = getDateFilter(dateRange);
      const { data: receivablesData, error } = await supabase
        .from('ar_invoices')
        .select(`
          id,
          patient_name,
          amount,
          gross_amount,
          discount_value,
          invoice_date,
          status,
          processor_id,
          card_brand,
          settlement_type,
          fee_percent,
          fee_amount,
          net_value
        `)
        .eq('clinic_id', clinicId)
        .gte('invoice_date', dateFilter.start)
        .lte('invoice_date', dateFilter.end)
        .not('processor_id', 'is', null);

      if (error) {
        throw error;
      } else {
        setReceivables(receivablesData || []);
      }
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = (range) => {
    const today = new Date();
    const start = new Date();

    if (range === 'month') {
      start.setMonth(today.getMonth() - 1);
    } else if (range === 'quarter') {
      start.setMonth(today.getMonth() - 3);
    } else if (range === 'year') {
      start.setFullYear(today.getFullYear() - 1);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  };

  // Calculate analytics
  const feesByProcessor = () => {
    const map = {};
    receivables.forEach((r) => {
      const processor = processors.find((p) => p.id === r.processor_id)?.name || 'Unknown';
      if (!map[processor]) {
        map[processor] = { name: processor, totalFees: 0, totalTransactions: 0, avgFee: 0 };
      }
      map[processor].totalFees += r.fee_amount || 0;
      map[processor].totalTransactions += 1;
    });

    Object.keys(map).forEach((key) => {
      map[key].avgFee = map[key].totalFees / map[key].totalTransactions;
    });

    return Object.values(map);
  };

  const feesBySettlement = () => {
    const map = {};
    receivables.forEach((r) => {
      const settlement = r.settlement_type || 'Unknown';
      if (!map[settlement]) {
        map[settlement] = { name: settlement, totalFees: 0, count: 0, avgPercent: 0 };
      }
      map[settlement].totalFees += r.fee_amount || 0;
      map[settlement].count += 1;
      map[settlement].avgPercent += r.fee_percent || 0;
    });

    Object.keys(map).forEach((key) => {
      map[key].avgPercent = map[key].avgPercent / map[key].count;
    });

    return Object.values(map);
  };

  const feesByBrand = () => {
    const map = {};
    receivables.forEach((r) => {
      const brand = r.card_brand || 'Unknown';
      if (!map[brand]) {
        map[brand] = { name: brand, totalFees: 0, totalAmount: 0, count: 0 };
      }
      map[brand].totalFees += r.fee_amount || 0;
      map[brand].totalAmount += r.amount || r.gross_amount || 0;
      map[brand].count += 1;
    });

    return Object.values(map);
  };

  const summaryStats = () => {
    const totalAmount = receivables.reduce((sum, r) => sum + (r.amount || r.gross_amount || 0), 0);
    const totalFees = receivables.reduce((sum, r) => sum + (r.fee_amount || 0), 0);
    const avgFeePercent = receivables.length > 0 ? (totalFees / totalAmount) * 100 : 0;

    return {
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      avgFeePercent: parseFloat(avgFeePercent.toFixed(2)),
      transactionCount: receivables.length,
    };
  };

  const stats = summaryStats();
  const processorData = feesByProcessor();
  const settlementData = feesBySettlement();
  const brandData = feesByBrand();
  const hasReceivables = receivables.length > 0;
  const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (loading) {
    const loadingContent = (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded mb-4"></div>
      </div>
    );

    if (embedded) return loadingContent;

    return (
      <PageLayout title="Analytics de Taxas de Processamento" subtitle="Carregando dados...">
        {loadingContent}
      </PageLayout>
    );
  }

  const content = (
    <>
      {/* Date Range Selector */}
      <div className="mb-5 flex flex-wrap gap-2">
        {['month', 'quarter', 'year'].map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            onClick={() => setDateRange(range)}
            className={dateRange === range ? 'bg-sky-700 text-white hover:bg-sky-800' : ''}
          >
            {range === 'month' ? 'Último Mês' : range === 'quarter' ? 'Último Trimestre' : 'Último Ano'}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-sm text-slate-500">Valor total processado</p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-sm text-slate-500">Total de taxas</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalFees)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-sm text-slate-500">Taxa média</p>
              <p className="text-2xl font-bold text-orange-600">{stats.avgFeePercent.toFixed(2)}%</p>
            </div>
            <Percent className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-sm text-slate-500">Transações</p>
              <p className="text-2xl font-bold">{stats.transactionCount}</p>
            </div>
            <CreditCard className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      {!hasReceivables && (
        <Card className="mb-5 border-sky-100 bg-sky-50 p-5 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-sky-700">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="font-medium text-slate-800">Ainda não há dados de cartões para o período</p>
          <p className="mt-1 text-sm text-slate-600">Os indicadores aparecem quando houver recebimentos com operadora, bandeira, forma de recebimento e taxa calculada.</p>
        </Card>
      )}

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Fees by Processor */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"><CreditCard className="h-4 w-4 text-sky-700" /> Taxas por processadora</h3>
          {processorData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="totalFees" fill="#0f76a8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">Sem dados para exibir</div>
          )}
        </Card>

        {/* Fees by Settlement Type */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900"><Percent className="h-4 w-4 text-emerald-600" /> Taxas por forma de recebimento</h3>
          {settlementData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={settlementData}
                  dataKey="totalFees"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {settlementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">Sem dados para exibir</div>
          )}
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="border-slate-200 p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Detalhes por bandeira</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Bandeira</th>
                <th className="px-4 py-2 text-right font-semibold">Transações</th>
                <th className="px-4 py-2 text-right font-semibold">Valor Total</th>
                <th className="px-4 py-2 text-right font-semibold">Total Taxas</th>
                <th className="px-4 py-2 text-right font-semibold">Taxa Média</th>
              </tr>
            </thead>
            <tbody>
              {brandData.length ? brandData.map((brand, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{brand.name}</td>
                  <td className="px-4 py-2 text-right">{brand.count}</td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(brand.totalAmount)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">
                    {formatCurrency(brand.totalFees)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {brand.totalAmount ? ((brand.totalFees / brand.totalAmount) * 100).toFixed(2) : '0.00'}%
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan="5">Sem bandeiras processadas no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info Box */}
      <Card className="mt-5 border-sky-100 bg-sky-50 p-4">
        <p className="text-sm text-sky-800">
          <strong>Dica:</strong> Monitore as taxas por processadora para negociar melhores condições.
          Quanto menor a taxa, maior o recebimento líquido. Considere usar D+30 quando a taxa for mais baixa.
        </p>
      </Card>
    </>
  );

  if (embedded) return content;

  return (
    <PageLayout title="Analytics de Taxas de Processamento" subtitle="Análise de custos com card processors">
      {content}
    </PageLayout>
  );
}
