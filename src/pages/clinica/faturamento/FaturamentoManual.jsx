import React from "react";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Calculator } from "lucide-react";

export default function FaturamentoManual() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Faturamento", path: "/clinica/faturamento" },
    { label: "Faturamento Manual" }
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Faturamento Manual"
      subtitle="Registre atendimentos particulares e pagamentos diretos."
      actions={
        <Button className="bg-blue-600 text-white">
          <Plus className="mr-2 w-4 h-4" /> Novo Faturamento
        </Button>
      }
    >
      <Card className="p-6 mt-6">

        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <Input placeholder="Paciente" />
          <Input placeholder="Profissional" />
          <Input type="date" />
          <Input placeholder="Serviço / Procedimento" />
        </div>

        <Button className="mb-4">
          <Calculator className="w-4 h-4 mr-2" /> Buscar
        </Button>

        <div className="border rounded p-10 text-center text-gray-500">
          Nenhum registro encontrado.
        </div>

      </Card>
    </PageLayout>
  );
}

