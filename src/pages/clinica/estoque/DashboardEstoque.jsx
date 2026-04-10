import React from "react";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardEstoque() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Estoque", path: "/clinica/estoque" },
    { label: "Dashboard" }
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Estoque"
      subtitle="Visão geral do estoque, níveis, alertas e movimentações recentes."
    >
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader><CardTitle>Total de Itens</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">0</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Itens com Baixo Estoque</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">0</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Movimentações do Mês</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">0</CardContent>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">Movimentações Recentes</h2>
        <p className="text-gray-500 text-sm">Nenhuma movimentação encontrada.</p>
      </Card>
    </PageLayout>
  );
}

