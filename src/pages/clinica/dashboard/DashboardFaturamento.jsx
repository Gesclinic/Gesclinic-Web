import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardFaturamento() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard de Faturamento</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Visão geral do faturamento da clínica. (Em breve: gráficos e KPIs)</p>
      </CardContent>
    </Card>
  );
}
