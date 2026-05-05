import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listPatients } from '@/lib/patientsApi';
import { useClinicContext } from '@/contexts/ClinicContext';

/**
 * 🔍 PatientSearchOrCreate - Busca paciente existente ou cria novo
 * Com autocomplete em tempo real
 *
 * Props:
 * - onSelect: (pacientData) => {} - quando seleciona paciente
 * - onCreateNew: () => {} - quando ativa modo "novo paciente"
 * - initialPhone: string - telefone para busca
 */
export default function PatientSearchOrCreate({
  onSelect = () => {},
  onCreateNew = () => {},
  initialPhone = '',
  clinicId = null,
  selectedPatient = null, // Paciente já selecionado
  onClearSelection = null, // Para voltar e buscar outro
}) {
  const { clinic } = useClinicContext();
  const cId = clinicId || clinic?.id;

  const [mode, setMode] = useState('search'); // 'search' | 'new' | 'selected'
  const [searchTerm, setSearchTerm] = useState(initialPhone || '');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const containerRef = useRef(null);

  // 🔍 Buscar pacientes (com debounce)
  const handleSearchChange = async (value) => {
    setSearchTerm(value);

    // Limpar timeout anterior
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Se vazio, não buscar
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Se muito curto, não buscar
    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);

    // Debounce 500ms
    const timer = setTimeout(async () => {
      if (!cId) {
        console.error('❌ Sem clinic_id para buscar pacientes');
        setLoading(false);
        return;
      }

      try {
        // ✅ Usar a API com 'q' para filtros server-side
        const patients = await listPatients(cId, { q: value.trim() });
        console.log('✅ Pacientes retornados:', patients);
        setSearchResults(patients || []);
        setShowResults(true);
        setLoading(false);
      } catch (error) {
        console.error('❌ Erro ao buscar pacientes:', error);
        setSearchResults([]);
        setLoading(false);
      }
    }, 500);

    setDebounceTimer(timer);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Determinar modo baseado em selectedPatient
  useEffect(() => {
    if (selectedPatient) {
      setMode('selected');
    }
  }, [selectedPatient]);

  const handleSelectPatient = (patient) => {
    console.log('✅ Paciente selecionado:', patient.name);

    // ✅ VALIDAÇÃO: Garantir que patient.id está preenchido
    if (!patient.id) {
      console.error('❌ ERRO: Paciente selecionado mas ID está vazio!', patient);
      alert('Erro: Paciente sem ID válido. Por favor, selecione outro paciente.');
      return;
    }

    // ✅ Mapeamento CORRETO dos campos da API para o estado cadastralData
    onSelect({
      // Dados de agendamento
      patientId: patient.id, // ✅ GARANTIDO: vem preenchido
      patientName: patient.name,
      phone: patient.phone || '',
      recordNumber: patient.prontuario_numero || '',

      // Dados cadastrais (mapeamento correto!)
      name: patient.name || '', // ✅ Nome completo
      document_id: patient.document_id || '', // ✅ CPF/RG
      birthdate: patient.birthdate || '', // ✅ Data de nascimento
      gender: patient.gender || '', // ✅ Gênero
      phone: patient.phone || '', // ✅ Telefone
      cell_phone: patient.cell_phone || patient.phone || '', // ✅ Celular (com fallback para phone)
      email: patient.email || '', // ✅ Email
      street: patient.street || patient.address || '', // ✅ Rua (tenta street primeiro, depois address)
      number: patient.number || '', // ✅ Número
      neighborhood: patient.neighborhood || '', // ✅ Bairro
      city: patient.city || '', // ✅ Cidade
      state: patient.state || '', // ✅ Estado
      zip_code: patient.zip_code || '', // ✅ CEP
    });
  };

  const handleCreateNewPatient = () => {
    console.log('✅ Modo: Criar novo paciente');
    setMode('new');
    onCreateNew();
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
      {mode === 'selected' && selectedPatient ? (
        // ✅ PACIENTE SELECIONADO
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-300 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-green-600 font-semibold mb-1">✅ PACIENTE SELECIONADO</p>
                <p className="font-semibold text-lg text-green-900">
                  {selectedPatient.patientName}
                </p>
                <p className="text-sm text-green-800 mt-1">📞 {selectedPatient.phone}</p>
                {selectedPatient.document_id && (
                  <p className="text-sm text-green-800">📋 {selectedPatient.document_id}</p>
                )}
              </div>
              <Button
                onClick={() => {
                  setMode('search');
                  setSearchTerm('');
                  setSearchResults([]);
                  setShowResults(false);
                  if (onClearSelection) {
                    onClearSelection();
                  }
                }}
                variant="ghost"
                size="sm"
                className="text-green-700 hover:bg-green-100"
              >
                🔄 Trocar
              </Button>
            </div>
          </div>
        </div>
      ) : mode === 'search' ? (
        // 🔍 MODO BUSCA
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">🔍 Buscar Paciente Existente</Label>
            <p className="text-xs text-gray-500 mt-1">Digite nome, telefone ou CPF</p>
          </div>

          {/* 📍 AUTOCOMPLETE COM DROPDOWN ACIMA */}
          <div className="relative" ref={containerRef}>
            {/* Dropdown acima do input */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 max-h-48 overflow-y-auto border rounded bg-white shadow-lg z-50">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => {
                      handleSelectPatient(patient);
                      setShowResults(false);
                    }}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 transition"
                  >
                    <div className="font-semibold text-sm">{patient.name}</div>
                    <div className="text-xs text-gray-600">
                      {patient.phone} • {patient.document_id}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Input de busca */}
            <Input
              placeholder="Nome, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() =>
                searchTerm.length >= 2 && searchResults.length > 0 && setShowResults(true)
              }
              className="w-full"
            />

            {/* Indicador de carregamento */}
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-sm text-gray-500">⏳</span>
              </div>
            )}
          </div>

          {/* Mensagem quando nenhum resultado */}
          {showResults && searchResults.length === 0 && searchTerm.length >= 2 && !loading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <p>📭 Nenhum paciente encontrado com "{searchTerm}"</p>
            </div>
          )}

          <Button onClick={handleCreateNewPatient} variant="outline" size="sm" className="w-full">
            ➕ Criar Novo Paciente (Cadastro Simples)
          </Button>
        </div>
      ) : (
        // ✏️ MODO NOVO PACIENTE
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">➕ Novo Paciente - Cadastro Simples</Label>
            <p className="text-xs text-gray-500 mt-1">
              Preencha os dados básicos agora. Dados completos podem ser adicionados depois.
            </p>
          </div>

          <Button
            onClick={() => setMode('search')}
            variant="ghost"
            size="sm"
            className="text-blue-600 p-0"
          >
            ← Voltar para busca
          </Button>
        </div>
      )}
    </div>
  );
}
