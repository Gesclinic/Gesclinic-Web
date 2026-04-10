import React from "react";
import PageLayout from "@/components/ui/PageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function PatientLayout({ patient, tab, children }) {
  const breadcrumbs = useBreadcrumbs([
    { label: "Pacientes", path: "/clinica/pacientes" },
    { label: patient?.full_name || "Paciente" }
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title={patient?.full_name || "Paciente"}
      subtitle="Gerencie informações clínicas, documentos, evoluções e histórico."
    >
      <Tabs defaultValue={tab} className="mt-4">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {children}
      </Tabs>
    </PageLayout>
  );
}

