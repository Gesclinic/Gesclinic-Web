import React from "react";
import PatientLayout from "./PatientLayout";
import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";

export default function ArquivosPaciente({ patient }) {
  return (
    <PatientLayout patient={patient} tab="arquivos">
      <TabsContent value="arquivos">
        <Card className="p-6 mt-4">
          <h2 className="font-semibold text-lg mb-2">Arquivos e Uploads</h2>
          <p className="text-gray-600 text-sm mb-4">
            Envie e gerencie arquivos relacionados ao paciente.
          </p>

          <div className="flex flex-col items-center text-gray-500 py-10">
            <UploadCloud className="w-10 h-10 mb-3" />
            Nenhum arquivo enviado.
          </div>
        </Card>
      </TabsContent>
    </PatientLayout>
  );
}

