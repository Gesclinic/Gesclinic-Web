import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Percent, Users, Building2 } from 'lucide-react';

interface CashCardsProps {
  totalReceita: number;
  totalDespesas: number;
  resultado: number;
  receitaParticular: number;
  receitaConvenio: number;
  repasseTotal: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const CardItem: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}> = ({ title, value, icon, color, description }) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
    <div className={`h-1 bg-gradient-to-r ${color}`} />
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
          {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
        </div>
        <div className="ml-4 text-slate-200">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export const CashCards: React.FC<CashCardsProps> = ({
  totalReceita,
  totalDespesas,
  resultado,
  receitaParticular,
  receitaConvenio,
  repasseTotal,
}) => {
  const margin = totalReceita > 0 ? ((resultado / totalReceita) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Receita Total */}
      <CardItem
        title="Receita Total"
        value={formatCurrency(totalReceita)}
        icon={<TrendingUp className="w-12 h-12" />}
        color="from-green-500 to-emerald-600"
        description="Todas as entradas de caixa"
      />

      {/* Despesas */}
      <CardItem
        title="Despesas"
        value={formatCurrency(totalDespesas)}
        icon={<TrendingDown className="w-12 h-12" />}
        color="from-red-500 to-rose-600"
        description="Todas as saídas de caixa"
      />

      {/* Resultado */}
      <CardItem
        title="Resultado Líquido"
        value={formatCurrency(resultado)}
        icon={<DollarSign className="w-12 h-12" />}
        color={resultado >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'}
        description={`Margem: ${margin}%`}
      />

      {/* Receita Particular */}
      <CardItem
        title="Receita Particular"
        value={formatCurrency(receitaParticular)}
        icon={<Users className="w-12 h-12" />}
        color="from-violet-500 to-purple-600"
        description={`${totalReceita > 0 ? ((receitaParticular / totalReceita) * 100).toFixed(1) : '0'}% do total`}
      />

      {/* Receita Convênios */}
      <CardItem
        title="Receita Convênios"
        value={formatCurrency(receitaConvenio)}
        icon={<Building2 className="w-12 h-12" />}
        color="from-cyan-500 to-blue-600"
        description={`${totalReceita > 0 ? ((receitaConvenio / totalReceita) * 100).toFixed(1) : '0'}% do total`}
      />

      {/* Repasse Médico */}
      <CardItem
        title="Repasse Profissional"
        value={formatCurrency(repasseTotal)}
        icon={<Percent className="w-12 h-12" />}
        color="from-amber-500 to-orange-600"
        description="Repasses vinculados à agenda"
      />
    </div>
  );
};
