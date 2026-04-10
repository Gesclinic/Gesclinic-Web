import React from "react";
import PatientLayout from "./PatientLayout";
import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function HistoricoPaciente({ patient }) {
  return (
    <PatientLayout patient={patient} tab="historico">
      <TabsContent value="historico">
        <Card className="p-6 mt-4">
          <h2 className="font-semibold text-lg mb-2">Histórico do Paciente</h2>
          <p className="text-gray-600 text-sm mb-4">
            Linha do tempo com atendimentos, evoluções e movimentações.
          </p>

          {/* linha do tempo */}
          <p className="text-gray-500 text-center py-10">
            Nenhum evento registrado no histórico.
          </p>
        </Card>
      </TabsContent>
    </PatientLayout>
  );
}

