import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardAtendimentos() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard de Atendimentos</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Visão geral dos atendimentos realizados na clínica. (Em breve: gráficos e KPIs)</p>
      </CardContent>
    </Card>
  );
}
