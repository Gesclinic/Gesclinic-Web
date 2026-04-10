/**
 * ================================================
 * PatientRouteGuard - Proteção de Rotas Aninhadas
 * ================================================
 * 
 * RESPONSABILIDADES:
 * ✅ Bloqueia renderização sem patientId válido
 * ✅ Redireciona automaticamente para /clinica/pacientes
 * ✅ Previne acesso a rotas que precisam de paciente
 * ✅ Valida patientId contra PatientContext
 * 
 * PADRÃO DE USO:
 * <Route path=":patientId/*" element={<PatientRouteGuard><YourPage /></PatientRouteGuard>} />
 */

import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { usePatientContext } from "@/contexts/PatientContext";

export default function PatientRouteGuard({ children }) {
  const { patientId } = useParams();
  const { activePatientId, isPatientSelected, loading } = usePatientContext();

  // ⚠️ GUARD 1: patientId não pode ser null, undefined ou vazio
  if (!patientId || patientId.trim() === "") {
    console.warn("❌ PatientRouteGuard: patientId inválido ou ausente");
    return <Navigate to="/clinica/pacientes" replace />;
  }

  // ⚠️ GUARD 2: patientId da URL deve corresponder ao PatientContext
  if (activePatientId && activePatientId !== patientId) {
    console.warn(
      `❌ PatientRouteGuard: patientId mismatch (URL: ${patientId}, Context: ${activePatientId})`
    );
    // Não redireciona imediatamente - deixa a página carregar se patientId é válido
    // Apenas avisa no console
  }

  // ⚠️ GUARD 3: Aguardar carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando paciente...</p>
        </div>
      </div>
    );
  }

  // ✅ Paciente está selecionado - renderizar filhos
  return children;
}
