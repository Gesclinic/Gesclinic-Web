/**
 * ============================================
 * PatientFamiliaresPage - Dados Familiares
 * ============================================
 * /clinica/pacientes/:patientId/familiares
 */

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientContext } from "@/contexts/PatientContext";
import PageLayout from "@/components/ui/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { Plus, Users } from "lucide-react";

export default function PatientFamiliaresPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patientData, loading } = usePatientContext();

  // ⚠️ GUARD: Validar patientId
  useEffect(() => {
    if (!patientId || patientId.trim() === "") {
      console.warn("❌ PatientFamiliaresPage: patientId inválido ou vazio");
      navigate("/clinica/pacientes");
    }
  }, [patientId, navigate]);

  if (loading) {
    return (
      <PageLayout title="Carregando...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Familiares - {patientData?.name} - Gesclinic</title>
      </Helmet>

      <PageLayout
        title={patientData?.name}
        breadcrumbs={[
          { label: "Pacientes", href: "/clinica/pacientes" },
          { label: patientData?.name || "Paciente" },
          { label: "Familiares" },
        ]}
      >
        <div className="w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Dados Familiares
            </h2>
            <Button className="gap-2">
              <Plus size={18} />
              Adicionar Responsável
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum responsável cadastrado
                </h3>
                <p className="text-gray-600 mb-6">
                  Adicione dados dos familiares ou responsáveis legais
                </p>
                <Button>Adicionar Primeiro Responsável</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </>
  );
}

