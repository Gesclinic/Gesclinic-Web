import React from "react";
import PatientLayout from "./PatientLayout";
import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function ProntuarioPaciente({ patient }) {
  return (
    <PatientLayout patient={patient} tab="prontuario">
      <TabsContent value="prontuario">
        <Card className="p-6 mt-4">
          <h2 className="font-semibold text-lg mb-2">Prontuário Clínico</h2>
          <p className="text-gray-600 text-sm mb-4">
            Evoluções, anotações, procedimentos e informações clínicas.
          </p>

          {/* componente de prontuário */}
        </Card>
      </TabsContent>
    </PatientLayout>
  );
}

