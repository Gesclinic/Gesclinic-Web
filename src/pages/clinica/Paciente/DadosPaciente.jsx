import React from "react";
import PatientLayout from "./PatientLayout";
import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function DadosPaciente({ patient }) {
  return (
    <PatientLayout patient={patient} tab="dados">
      <TabsContent value="dados">
        <Card className="p-6 mt-4">
          <h2 className="font-semibold text-lg mb-2">Informações Pessoais</h2>
          <p className="text-gray-600 text-sm mb-4">
            Dados básicos do paciente, contatos e informações cadastrais.
          </p>

          {/* formulário real */}
        </Card>
      </TabsContent>
    </PatientLayout>
  );
}

