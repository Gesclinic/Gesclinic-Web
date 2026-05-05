import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardEstoque() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard de Estoque</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Visão geral do estoque da clínica. (Em breve: gráficos e KPIs)</p>
      </CardContent>
    </Card>
  );
}
