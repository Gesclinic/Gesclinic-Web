import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export default function FaturamentoConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Configurações' },
    { label: 'Faturamento' },
  ]);

  return (
    <PageLayout
      title="Configurações de Faturamento"
      subtitle="Defina parâmetros TISS e regras de cobrança."
      breadcrumbs={breadcrumbs}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>5.1 Parâmetros TISS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• Padrão</p>
            <p>• Versão da tabela</p>
            <p>• Configuração de lotes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5.2 Parâmetros de Faturamento Manual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• Regras de cobrança</p>
            <p>• Percentuais</p>
            <p>• Descontos</p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
