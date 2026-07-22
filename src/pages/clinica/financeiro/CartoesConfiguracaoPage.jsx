import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Building2, CreditCard, Percent, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CartasPage from './CartasPage';
import CartasOperadorasPage from './CartasOperadorasPage';
import CartasProcessadorTaxasPage from './CartasProcessadorTaxasPage';
import ProcessadorFeesAnalytics from './ProcessadorFeesAnalytics';
import CartoesParametrosPage from './CartoesParametrosPage';

const TABS = [
  { value: 'cartoes', label: 'Cartões', icon: CreditCard },
  { value: 'parametros', label: 'Parâmetros', icon: SlidersHorizontal },
  { value: 'operadoras', label: 'Operadoras', icon: Building2 },
  { value: 'taxas', label: 'Taxas', icon: Percent },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
];

function normalizeTab(value) {
  return TABS.some((tab) => tab.value === value) ? value : 'cartoes';
}

export default function CartoesConfiguracaoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = normalizeTab(searchParams.get('tab'));

  const handleTabChange = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', normalizeTab(value));
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900">
          <CreditCard className="h-8 w-8 text-sky-700" />
          Cartões e Operadoras
        </h1>
        <p className="mt-1 text-slate-600">
          Cadastre cartões, operadoras, taxas e acompanhe indicadores para apoiar a conciliação de cartões.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-2 rounded-md px-4 py-2 data-[state=active]:bg-sky-700 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="cartoes" className="mt-0">
          <CartasPage embedded />
        </TabsContent>
        <TabsContent value="parametros" className="mt-0">
          <CartoesParametrosPage />
        </TabsContent>
        <TabsContent value="operadoras" className="mt-0">
          <CartasOperadorasPage embedded />
        </TabsContent>
        <TabsContent value="taxas" className="mt-0">
          <CartasProcessadorTaxasPage embedded />
        </TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <ProcessadorFeesAnalytics embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
