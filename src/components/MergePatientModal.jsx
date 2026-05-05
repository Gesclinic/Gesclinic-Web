/**
 * MergePatientModal.jsx
 *
 * 🔄 MODAL PARA MERGE PRÉ-PACIENTE → PACIENTE
 *
 * Fluxo com 3 etapas:
 * 1. Buscar paciente existente (CPF, Nome, Telefone)
 * 2. Criar novo paciente (formulário mínimo)
 * 3. Confirmar merge (resumo + confirmação)
 *
 * Props:
 * - isOpen: boolean
 * - appointment: { id, lead_name, lead_phone, lead_mobile, ... }
 * - onClose: () => void
 * - onSuccess: (updatedAppointment) => void
 */

import React, { useState, useMemo } from 'react';
import { X, Search, Plus, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { formatPhone } from '@/utils/formatters/formatPhone';

export default function MergePatientModal({ isOpen, appointment, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1, 2, ou 3
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // ============================================
  // FORMULÁRIO: CRIAR NOVO PACIENTE
  // ============================================
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    cpf: '',
    birth_date: '',
    phone: '',
    gender: '',
  });

  // ============================================
  // FORMULÁRIO: BUSCAR PACIENTE
  // ============================================
  const [searchForm, setSearchForm] = useState({
    cpf: '',
    name: '',
    phone: '',
  });

  if (!isOpen || !appointment) {
    return null;
  }

  // ============================================
  // ETAPA 1: BUSCAR PACIENTE EXISTENTE
  // ============================================
  const handleSearchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      setSearchResults([]);

      // Validar se tem algo para buscar
      if (!searchForm.cpf && !searchForm.name && !searchForm.phone) {
        setError('Preencha ao menos um campo para buscar');
        setLoading(false);
        return;
      }

      // TODO: Implementar busca via API
      // Por enquanto, simulação
      const response = await fetch('/api/patients/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: searchForm.cpf || null,
          name: searchForm.name || null,
          phone: searchForm.phone || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar pacientes');
      }

      const data = await response.json();
      setSearchResults(data.patients || []);

      if (data.patients.length === 0) {
        setError('Nenhum paciente encontrado com esses critérios');
      }
    } catch (err) {
      setError(err.message || 'Erro ao buscar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setStep(3); // Ir para confirmação
  };

  // ============================================
  // ETAPA 2: CRIAR NOVO PACIENTE
  // ============================================
  const handleCreatePatient = async () => {
    try {
      // Validações
      if (!newPatientForm.name.trim()) {
        setError('Nome é obrigatório');
        return;
      }
      if (!newPatientForm.cpf.trim()) {
        setError('CPF é obrigatório');
        return;
      }
      if (!newPatientForm.birth_date) {
        setError('Data de nascimento é obrigatória');
        return;
      }
      if (!newPatientForm.phone.trim()) {
        setError('Telefone é obrigatório');
        return;
      }

      setLoading(true);
      setError(null);

      // TODO: Implementar criação via API
      const response = await fetch('/api/patients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPatientForm.name,
          cpf: newPatientForm.cpf.replace(/\D/g, ''),
          birth_date: newPatientForm.birth_date,
          phone: newPatientForm.phone,
          gender: newPatientForm.gender || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar paciente');
      }

      const newPatient = await response.json();
      setSelectedPatient(newPatient);
      setStep(3); // Ir para confirmação
    } catch (err) {
      setError(err.message || 'Erro ao criar paciente');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ETAPA 3: CONFIRMAR MERGE
  // ============================================
  const handleConfirmMerge = async () => {
    if (!confirmed) {
      setError('Confirme os dados antes de continuar');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Implementar merge via API
      const response = await fetch(`/api/appointments/${appointment.id}/merge-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao vincular paciente');
      }

      const updated = await response.json();
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao finalizar merge');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="app-modal-overlay">
      <div className="app-modal-shell app-modal-shell--compact rounded-lg bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-900">🧾 Finalizar Cadastro do Paciente</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Indicador de Progresso */}
        <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
          <div className="flex gap-4">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => s < step && setStep(s)}
                disabled={s > step}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  s === step
                    ? 'bg-blue-600 text-white'
                    : s < step
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {s < step ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center">{s}</span>
                )}
                {s === 1 && 'Buscar paciente'}
                {s === 2 && 'Criar novo'}
                {s === 3 && 'Confirmar'}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm flex gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ETAPA 1: BUSCAR */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Busque um paciente existente por CPF, nome ou telefone. Se não encontrar, crie um
                novo.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={searchForm.cpf}
                    onChange={(e) =>
                      setSearchForm({
                        ...searchForm,
                        cpf: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={searchForm.name}
                    onChange={(e) =>
                      setSearchForm({
                        ...searchForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={searchForm.phone}
                    onChange={(e) =>
                      setSearchForm({
                        ...searchForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="(XX) 9 XXXX-XXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Resultados */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-gray-900">
                    {searchResults.length} paciente(s) encontrado(s):
                  </p>
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 transition cursor-pointer"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-600">
                            CPF:{' '}
                            {patient.cpf
                              ? `${patient.cpf.slice(0, 3)}.${patient.cpf.slice(3, 6)}.${patient.cpf.slice(6, 9)}-${patient.cpf.slice(9)}`
                              : 'N/A'}
                          </p>
                          {patient.birth_date && (
                            <p className="text-sm text-gray-600">
                              Nascimento: {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                          Vincular
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2: CRIAR NOVO */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Preencha os dados mínimos do novo paciente.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={newPatientForm.name}
                    onChange={(e) =>
                      setNewPatientForm({
                        ...newPatientForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ex: João Silva Santos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
                  <input
                    type="text"
                    value={newPatientForm.cpf}
                    onChange={(e) =>
                      setNewPatientForm({
                        ...newPatientForm,
                        cpf: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="000.000.000-00"
                    maxLength="11"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    value={newPatientForm.birth_date}
                    onChange={(e) =>
                      setNewPatientForm({
                        ...newPatientForm,
                        birth_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                  <input
                    type="tel"
                    value={newPatientForm.phone}
                    onChange={(e) =>
                      setNewPatientForm({
                        ...newPatientForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="(XX) 9 XXXX-XXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexo (opcional)
                  </label>
                  <select
                    value={newPatientForm.gender}
                    onChange={(e) =>
                      setNewPatientForm({
                        ...newPatientForm,
                        gender: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: CONFIRMAR */}
          {step === 3 && selectedPatient && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Pré-paciente (agendamento rápido):</strong>
                </p>
                <div className="space-y-1 mb-4">
                  <p className="font-medium text-gray-900">{appointment.lead_name}</p>
                  {appointment.lead_mobile && (
                    <p className="text-sm text-gray-600">Celular: {appointment.lead_mobile}</p>
                  )}
                  {appointment.lead_phone && (
                    <p className="text-sm text-gray-600">Telefone: {appointment.lead_phone}</p>
                  )}
                </div>

                <div className="text-2xl text-center text-blue-600 mb-4">↓</div>

                <p className="text-sm text-gray-600 mb-3">
                  <strong>Será vinculado a:</strong>
                </p>
                <div className="space-y-1 bg-white p-3 rounded border border-blue-200">
                  <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                  {selectedPatient.cpf && (
                    <p className="text-sm text-gray-600">
                      CPF: {selectedPatient.cpf.slice(0, 3)}.{selectedPatient.cpf.slice(3, 6)}.
                      {selectedPatient.cpf.slice(6, 9)}-{selectedPatient.cpf.slice(9)}
                    </p>
                  )}
                  {selectedPatient.birth_date && (
                    <p className="text-sm text-gray-600">
                      Nascimento: {new Date(selectedPatient.birth_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    ✅ <strong>Confirmo que os dados estão corretos</strong> e autorizo o vínculo
                    deste paciente ao agendamento.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition disabled:opacity-50"
            >
              ← Voltar
            </button>
          )}

          {step === 1 && (
            <>
              <button
                onClick={handleSearchPatients}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Buscar Pacientes
                  </>
                )}
              </button>

              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar Novo
              </button>
            </>
          )}

          {step === 2 && (
            <button
              onClick={handleCreatePatient}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Paciente
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleConfirmMerge}
              disabled={loading || !confirmed}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Vínculo
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
