/**
 * ========================================
 * PatientContext - Global Patient State
 * ========================================
 * Gerencia o paciente ativo e seus alertas
 * Evita múltiplos fetches desnecessários
 */

import React, { createContext, useContext, useCallback, useState } from "react";

const PatientContext = createContext(undefined);

export function PatientProvider({ children }) {
  const [activePatientId, setActivePatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dados"); // Aba ativa na tela de detalhe

  // Alertas calculados
  const [alerts, setAlerts] = useState({
    documentsIncomplete: false,
    expiredInsurance: false,
    incompleteRegistration: false,
    overdue: false,
  });

  /**
   * Carregar dados completos do paciente
   * ⚠️ OBRIGATÓRIO: patientId deve ser válido (não null, não undefined, não vazio)
   */
  const loadPatient = useCallback(async (patientId) => {
    // Guard: Validar patientId obrigatoriamente
    if (!patientId || typeof patientId !== "string" || patientId.trim() === "") {
      // Limpar estado se ID inválido
      setActivePatientId(null);
      setPatientData(null);
      setError(null);
      setAlerts({
        documentsIncomplete: false,
        expiredInsurance: false,
        incompleteRegistration: false,
        overdue: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Dynamic import para evitar circular dependencies
      const { getPatientById } = await import("@/lib/patientsApi");
      const data = await getPatientById(patientId);
      
      if (data) {
        setActivePatientId(patientId);
        setPatientData(data);

        // Calcular alertas baseado nos dados
        // ✅ Validar apenas campos que existem e são essenciais
        const newAlerts = {
          // 📋 Documentos: verifica se tem foto ou documentos registrados
          documentsIncomplete: !data.photo_url, 
          // 🗓️ Seguro: verifica se tem informações de seguro (insurance_id_number)
          expiredInsurance: false, // TODO: Implementar quando houver data_vencimento
          // 📝 Registro completo: verifica campos mínimos obrigatórios
          incompleteRegistration: !data.street || !data.number || !data.city || !data.state,
          // 💰 Placeholder - integrar com financeiro
          overdue: false,
        };

        setAlerts(newAlerts);
      } else {
        // Dados não encontrados - limpar
        setActivePatientId(null);
        setPatientData(null);
        setError("Paciente não encontrado");
      }
    } catch (err) {
      console.error("Erro ao carregar paciente:", err);
      setError(err.message);
      setActivePatientId(null);
      setPatientData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Limpar paciente ativo
   */
  const clearPatient = useCallback(() => {
    setActivePatientId(null);
    setPatientData(null);
    setAlerts({
      documentsIncomplete: false,
      expiredInsurance: false,
      incompleteRegistration: false,
      overdue: false,
    });
    setError(null);
  }, []);

  /**
   * Atualizar dados do paciente em cache
   */
  const updatePatientData = useCallback((updatedData) => {
    setPatientData((prev) => ({
      ...prev,
      ...updatedData,
    }));
  }, []);

  const value = {
    // Estado
    activePatientId,
    patientData,
    loading,
    error,
    alerts,
    activeTab,

    // Ações
    loadPatient,
    clearPatient,
    updatePatientData,
    setActiveTab,

    // Computed
    isPatientSelected: !!activePatientId && !!patientData,
    hasActivePatient: !!activePatientId && !!patientData,
    registrationStatus: patientData?.address ? "Completo" : "Incompleto",
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatientContext() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error("usePatientContext deve ser usado dentro de PatientProvider");
  }
  return context;
}
