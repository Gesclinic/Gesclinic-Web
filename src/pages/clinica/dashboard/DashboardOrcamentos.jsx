import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardOrcamentos() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard de Orçamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Visão geral dos orçamentos da clínica. (Em breve: gráficos e KPIs)</p>
      </CardContent>
    </Card>
  );
}
