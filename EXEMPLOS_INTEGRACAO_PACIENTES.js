/**
 * ============================================
 * EXEMPLOS DE INTEGRAÇÃO DO MÓDULO PACIENTES
 * ============================================
 * Casos de uso reais e padrões de desenvolvimento
 */

// ============================================
// EXEMPLO 1: Usar PatientContext em Agenda
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";
import { useNavigate } from "react-router-dom";

export function AgendaQuickAdd() {
  const { activePatientId, patientData } = usePatientContext();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        if (activePatientId) {
          // Pré-preencher paciente na agenda
          navigate(`/clinica/agenda?patientId=${activePatientId}`);
        } else {
          navigate("/clinica/pacientes");
        }
      }}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      {patientData ? `Agendar para ${patientData.name}` : "Selecione um paciente"}
    </button>
  );
}

// ============================================
// EXEMPLO 2: Integração com Faturamento
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";
import { financeApi } from "@/lib/financeApi";

export function PatientFinanceStatus() {
  const { activePatientId, patientData } = usePatientContext();
  const [receivables, setReceivables] = useState([]);

  useEffect(() => {
    if (activePatientId) {
      // Buscar contas em aberto do paciente
      financeApi
        .listReceivables({ patientId: activePatientId })
        .then(setReceivables);
    }
  }, [activePatientId]);

  const overdue = receivables.filter((r) => r.status === "open");

  return (
    <div className="bg-red-50 p-4 rounded-lg">
      <p className="font-semibold text-red-900">
        {overdue.length} conta(s) em aberto
      </p>
    </div>
  );
}

// ============================================
// EXEMPLO 3: Componente com Validação automática
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";

export function PatientGuard({ children }) {
  const { activePatientId, loading } = usePatientContext();
  const navigate = useNavigate();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!activePatientId) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-900">Selecione um paciente primeiro</p>
        <button
          onClick={() => navigate("/clinica/pacientes")}
          className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg"
        >
          Ir para Pacientes
        </button>
      </div>
    );
  }

  return children;
}

// ============================================
// EXEMPLO 4: Monitorar Alertas
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";
import { useEffect } from "react";

export function AlertMonitor() {
  const { alerts, patientData } = usePatientContext();

  useEffect(() => {
    // Quando um alerta muda, dispara notificação
    Object.entries(alerts).forEach(([key, isActive]) => {
      if (isActive) {
        console.log(`ALERTA: ${key} ativado para ${patientData?.name}`);
        // Aqui poderia disparar uma notificação do sistema
      }
    });
  }, [alerts, patientData]);

  return null;
}

// ============================================
// EXEMPLO 5: Listar Pacientes com Filtros
// ============================================

import { listPatients } from "@/lib/patientsApi";
import { useAuth } from "@/contexts/SupabaseAuthContext";

export function PatientSearchWithFilter() {
  const { clinicId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    // Busca já filtra por nome/CPF/email
    const patients = await listPatients(clinicId, {
      q: searchTerm,
    });

    setResults(patients);
  };

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Nome, CPF ou email..."
        onBlur={handleSearch}
      />
      <ul>
        {results.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// EXEMPLO 6: Criar Paciente com Redirect
// ============================================

import { createPatient } from "@/lib/patientsApi";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { usePatientContext } from "@/contexts/PatientContext";

export function NewPatientForm() {
  const { clinicId } = useAuth();
  const { loadPatient } = usePatientContext();
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    const newPatient = await createPatient(clinicId, formData);

    // Carregar no contexto
    await loadPatient(newPatient.id);

    // Redirecionar para HUB
    navigate(`/clinica/pacientes/${newPatient.id}`);
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}

// ============================================
// EXEMPLO 7: Usar em Modal/Drawer
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";
import { useState } from "react";

export function PatientSelectorModal() {
  const { loadPatient } = usePatientContext();
  const { clinicId } = useAuth();
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    listPatients(clinicId).then(setPatients);
  }, [clinicId]);

  const handleSelectPatient = async (patientId) => {
    await loadPatient(patientId);
    // Modal fecha automaticamente ou redireciona
  };

  return (
    <div className="modal">
      <h2>Selecionar Paciente</h2>
      {patients.map((p) => (
        <button key={p.id} onClick={() => handleSelectPatient(p.id)}>
          {p.name}
        </button>
      ))}
    </div>
  );
}

// ============================================
// EXEMPLO 8: Sincronizar com Storage Local
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";
import { useEffect } from "react";

export function PersistPatientSelection() {
  const { activePatientId, loadPatient } = usePatientContext();

  // Salvar quando mudar
  useEffect(() => {
    if (activePatientId) {
      localStorage.setItem("lastSelectedPatient", activePatientId);
    }
  }, [activePatientId]);

  // Restaurar ao carregar
  useEffect(() => {
    const lastPatient = localStorage.getItem("lastSelectedPatient");
    if (lastPatient && !activePatientId) {
      loadPatient(lastPatient);
    }
  }, []);

  return null;
}

// ============================================
// EXEMPLO 9: Componente de Documento Inline
// ============================================

import { PatientDocumentUpload } from "@/components/pacientes/PatientDocumentUpload";

export function InlineDocumentUpload() {
  const { activePatientId } = usePatientContext();

  if (!activePatientId) {
    return <p>Selecione um paciente</p>;
  }

  return <PatientDocumentUpload patientId={activePatientId} />;
}

// ============================================
// EXEMPLO 10: Hook Customizado para Pacientes
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";

export function usePatientOperations() {
  const { activePatientId, patientData, loadPatient, updatePatientData } =
    usePatientContext();
  const { clinicId } = useAuth();

  const updatePatient = async (data) => {
    if (!activePatientId) return;

    const updated = await updatePatient(activePatientId, data);
    updatePatientData(updated);
    return updated;
  };

  const switchPatient = async (newPatientId) => {
    await loadPatient(newPatientId);
  };

  const getCurrentAge = () => {
    if (!patientData?.birthdate) return null;
    const today = new Date();
    const birth = new Date(patientData.birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth()) age--;
    return age;
  };

  return {
    activePatientId,
    patientData,
    updatePatient,
    switchPatient,
    getCurrentAge,
  };
}

// ============================================
// EXEMPLO 11: Proteção de Rota com Contexto
// ============================================

import { usePatientContext } from "@/contexts/PatientContext";
import { Navigate } from "react-router-dom";

export function ProtectedPatientRoute({ children }) {
  const { activePatientId, loading } = usePatientContext();

  if (loading) {
    return <div>Validando...</div>;
  }

  if (!activePatientId) {
    return <Navigate to="/clinica/pacientes" replace />;
  }

  return children;
}

// ============================================
// EXEMPLO 12: Debug Helper
// ============================================

export function PatientDebugInfo() {
  const { activePatientId, patientData, loading, alerts, error } =
    usePatientContext();

  return (
    <div className="p-4 bg-gray-100 rounded text-xs font-mono">
      <div>activePatientId: {activePatientId}</div>
      <div>loading: {loading}</div>
      <div>name: {patientData?.name}</div>
      <div>alerts: {JSON.stringify(alerts, null, 2)}</div>
      <div>error: {error}</div>
    </div>
  );
}

/**
 * ============================================
 * PADRÕES RECOMENDADOS
 * ============================================
 *
 * 1. SEMPRE validar activePatientId antes de usar dados
 * 2. Usar loadPatient() apenas quando necessário
 * 3. Preferir patientData do contexto em vez de fazer fetch local
 * 4. Sincronizar alterações com updatePatientData()
 * 5. Implementar ErrorBoundary para capturar falhas
 * 6. Usar PatientGuard em rotas críticas
 * 7. Notificar usuário quando contexto está vazio
 * 8. Persistir última seleção se apropriado
 * 9. Limpar contexto ao deslogar (implementar em AuthContext)
 * 10. Testar todos os casos de patientId inválido/vazio
 */

export default {};
