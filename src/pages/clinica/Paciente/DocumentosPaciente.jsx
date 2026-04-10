import React from "react";
import PatientLayout from "./PatientLayout";
import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function DocumentosPaciente({ patient }) {
  return (
    <PatientLayout patient={patient} tab="documentos">
      <TabsContent value="documentos">
        <Card className="p-6 mt-4">
          <h2 className="font-semibold text-lg mb-2">Documentos</h2>
          <p className="text-gray-600 text-sm mb-4">
            Laudos, termos, receitas e outros documentos gerados para o paciente.
          </p>

          <div className="text-gray-500 flex flex-col items-center py-10">
            <FileText className="w-10 h-10 mb-3" />
            Nenhum documento disponível.
          </div>
        </Card>
      </TabsContent>
    </PatientLayout>
  );
}

