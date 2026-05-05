import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardRepasses() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard de Repasses</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Visão geral dos repasses médicos. (Em breve: gráficos e KPIs)</p>
      </CardContent>
    </Card>
  );
}
