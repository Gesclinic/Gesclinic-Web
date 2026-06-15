import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BankAccountsManager from '@/pages/clinica/configuracoes/BankAccountsManager';
import RepassesRulesManager from '@/pages/clinica/configuracoes/RepassesRulesManager';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export default function ContaConfig() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const currentTab = tab || 'bancos';

  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Configurações', path: '/clinica/configuracoes' },
    { label: 'Contas' },
  ]);

  const handleTabChange = (value) => {
    navigate(`/clinica/configuracoes/conta/${value}`);
  };

  return (
    <PageLayout
      title="Configurações de Contas (Financeiro)"
      subtitle="Organização financeira, planos de contas e convênios."
      breadcrumbs={breadcrumbs}
    >
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="bancos">2.1 Contas Bancárias</TabsTrigger>
          <TabsTrigger value="repasses">2.2 Repasses Médicos</TabsTrigger>
          <TabsTrigger value="convenios">2.3 Convênios</TabsTrigger>
        </TabsList>

        <TabsContent value="bancos" className="mt-4">
          <BankAccountsManager />
        </TabsContent>

        <TabsContent value="repasses" className="mt-4">
          <RepassesRulesManager />
        </TabsContent>

        <TabsContent value="convenios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>2.4 Convênios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• Cadastro de convênios</p>
              <p>• Taxas e comissões</p>
              <p>• Tabelas de preço</p>
              <p>• Regras de faturamento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
