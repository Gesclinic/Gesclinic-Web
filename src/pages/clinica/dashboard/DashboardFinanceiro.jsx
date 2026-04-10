import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardFinanceiro() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Visão geral da saúde financeira da clínica. (Em breve: gráficos e KPIs)</p>
      </CardContent>
    </Card>
  );
}

