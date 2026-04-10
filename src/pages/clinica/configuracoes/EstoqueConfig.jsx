import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function EstoqueConfig() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Clínica", path: "/clinica" },
    { label: "Configurações" },
    { label: "Estoque" }
  ]);

  return (
    <PageLayout
      title="Configurações de Estoque"
      subtitle="Gerencie parâmetros e automações do estoque."
      breadcrumbs={breadcrumbs}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>4.1 Parâmetros de Estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• Política de mínima / máxima</p>
            <p>• Controle de lote e validade</p>
            <p>• Permitir saída negativa?</p>
            <p>• Classificação por categorias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4.2 Movimentações Automáticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• Baixa automática por serviço</p>
            <p>• Integração com procedimentos</p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

