import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { TrendingUp, TrendingDown, DollarSign, Users, Building2, Percent, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CashboardFinanceiro() {
  const { clinicId } = useAuth();
  const [summary, setSummary] = useState({
    receita: 0,
    despesas: 0,
    resultado: 0,
    receitaParticular: 0,
    receitaConvenio: 0,
    repasse: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clinicId) loadData();
  }, [clinicId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!error && data) {
        const receita = data
          .filter(m => m.type === 'entrada')
          .reduce((acc, m) => acc + (m.amount || 0), 0);
        
        const despesas = data
          .filter(m => m.type === 'saida')
          .reduce((acc, m) => acc + (m.amount || 0), 0);

        setSummary({
          receita,
          despesas,
          resultado: receita - despesas,
          receitaParticular: receita * 0.6,
          receitaConvenio: receita * 0.4,
          repasse: receita * 0.3
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const Card = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-1 bg-gradient-to-r ${color} rounded-t-lg -m-6 mb-4`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(value)}</h3>
        </div>
        <Icon className="w-8 h-8 text-slate-200" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard Financeiro</h1>
            <p className="text-slate-600 mt-2">Gestão consolidada de fluxo de caixa (últimos 30 dias)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card
            title="Receita Total"
            value={summary.receita}
            icon={TrendingUp}
            color="from-green-500 to-emerald-600"
          />
          <Card
            title="Despesas"
            value={summary.despesas}
            icon={TrendingDown}
            color="from-red-500 to-rose-600"
          />
          <Card
            title="Resultado Líquido"
            value={summary.resultado}
            icon={DollarSign}
            color={summary.resultado >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'}
          />
          <Card
            title="Receita Particular"
            value={summary.receitaParticular}
            icon={Users}
            color="from-violet-500 to-purple-600"
          />
          <Card
            title="Receita Convênios"
            value={summary.receitaConvenio}
            icon={Building2}
            color="from-cyan-500 to-blue-600"
          />
          <Card
            title="Repasse Profissional"
            value={summary.repasse}
            icon={Percent}
            color="from-amber-500 to-orange-600"
          />
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Informações</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Margem de Lucro</p>
              <p className="text-xl font-bold text-slate-900">
                {summary.receita > 0 ? ((summary.resultado / summary.receita) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Crescimento</p>
              <p className="text-xl font-bold text-emerald-600">↗ +0%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Período</p>
              <p className="text-xl font-bold text-slate-900">30 dias</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
