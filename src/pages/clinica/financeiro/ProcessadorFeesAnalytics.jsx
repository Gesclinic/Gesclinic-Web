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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, TrendingUp, DollarSign, Percent } from 'lucide-react';

export default function ProcessadorFeesAnalytics() {
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

  if (loading) {
    return (
      <PageLayout title="Analytics de Taxas de Processamento" subtitle="Carregando dados...">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="📊 Analytics de Taxas de Processamento" subtitle="Análise de custos com card processors">
      {/* Date Range Selector */}
      <div className="mb-6 flex gap-2">
        {['month', 'quarter', 'year'].map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            onClick={() => setDateRange(range)}
            className="capitalize"
          >
            {range === 'month' ? 'Último Mês' : range === 'quarter' ? 'Último Trimestre' : 'Último Ano'}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Valor Total Processado</p>
              <p className="text-2xl font-bold">
                R$ {stats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total de Taxas</p>
              <p className="text-2xl font-bold text-red-600">
                R$ {stats.totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Taxa Média</p>
              <p className="text-2xl font-bold text-orange-600">{stats.avgFeePercent.toFixed(2)}%</p>
            </div>
            <Percent className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Transações</p>
              <p className="text-2xl font-bold">{stats.transactionCount}</p>
            </div>
            <CreditCard className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Fees by Processor */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">💳 Taxas por Processadora</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Bar dataKey="totalFees" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Fees by Settlement Type */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">⏰ Taxas por Forma de Recebimento</h3>
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
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Detalhes por Bandeira</h3>
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
              {brandData.map((brand, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{brand.name}</td>
                  <td className="px-4 py-2 text-right">{brand.count}</td>
                  <td className="px-4 py-2 text-right">
                    R$ {brand.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">
                    R$ {brand.totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {((brand.totalFees / brand.totalAmount) * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info Box */}
      <Card className="p-4 mt-6 bg-blue-50 border-l-4 border-blue-500">
        <p className="text-sm text-gray-700">
          💡 <strong>Dica:</strong> Monitore as taxas por processadora para negociar melhores condições. 
          Quanto menor a taxa, maior o recebimento líquido. Considere usar D+30 quando a taxa for mais baixa.
        </p>
      </Card>
    </PageLayout>
  );
}
