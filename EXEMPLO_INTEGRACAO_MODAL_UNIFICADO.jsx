/**
 * 📝 EXEMPLO DE INTEGRAÇÃO - Modal Unificado em AgendaLayout
 * 
 * Este arquivo mostra como integrar o novo AppointmentUnitedModal
 * no lugar do antigo ModalCriarAgendamento na Agenda
 */

import React, { useState, useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import ModalCriarAgendamentoUnificado from '@/pages/clinica/agenda/components/ModalCriarAgendamentoUnificado';
import { listProfessionals } from '@/lib/professionalsApi';
import { listServices } from '@/lib/servicesApi';
import { listPayers } from '@/lib/payersApi';
import { listRooms } from '@/lib/roomsApi'; // Se houver API de salas

// ============================================
// EXEMPLO: Integração no AgendaLayout
// ============================================

export default function AgendaLayoutExample() {
  const { clinic, clinicId } = useClinicContext();

  // Estado do modal unificado
  const [modalAberto, setModalAberto] = useState(false);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [salas, setSalas] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // Carregar dados necessários ao montar
  useEffect(() => {
    if (clinicId) {
      carregarDados();
    }
  }, [clinicId]);

  const carregarDados = async () => {
    try {
      setCarregando(true);

      // 🏥 Carregar profissionais
      const { data: profs } = await listProfessionals(clinicId);
      if (profs) setProfissionais(profs);

      // 💊 Carregar serviços
      const { data: servs } = await listServices(clinicId);
      if (servs) setServicos(servs);

      // 🏢 Carregar convênios
      const { data: convs } = await listPayers(clinicId);
      if (convs) setConvenios(convs);

      // 🚪 Carregar salas (se houver API)
      try {
        const { data: sls } = await listRooms(clinicId);
        if (sls) setSalas(sls);
      } catch (e) {
        console.warn('⚠️ Não foi possível carregar salas:', e.message);
        setSalas([]);
      }

      setCarregando(false);
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setCarregando(false);
    }
  };

  const handleNovoAgendamento = () => {
    console.log('➕ Abrindo modal de novo agendamento (Modo: NEW)');
    setModalAberto(true);
  };

  const handleModalFechado = () => {
    console.log('❌ Modal fechado');
    setModalAberto(false);
  };

  const handleAgendamentoSucesso = () => {
    console.log('✅ Agendamento criado com sucesso!');
    
    // 📍 AQUI: Você deve chamar a função de recarregar agendamentos
    // Por exemplo:
    // await carregarAgendamentos();
    // ou dispatchar ação do Redux
    
    setModalAberto(false);
  };

  return (
    <div>
      {/* Header com botão para novo agendamento */}
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📅 Agenda</h1>
        
        <button
          onClick={handleNovoAgendamento}
          disabled={carregando}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {carregando ? '⏳ Carregando...' : '➕ Novo Agendamento'}
        </button>
      </div>

      {/* Resto da agenda aqui... */}
      <div className="p-4">
        {/* Seu conteúdo de agenda vai aqui */}
      </div>

      {/* ============================================ */}
      {/* NOVO MODAL UNIFICADO */}
      {/* ============================================ */}
      <ModalCriarAgendamentoUnificado
        isOpen={modalAberto}
        onClose={handleModalFechado}
        professionals={profissionais}
        services={servicos}
        payers={convenios}
        rooms={salas}
        onSuccess={handleAgendamentoSucesso}
      />
    </div>
  );
}

// ============================================
// GUIA DE SUBSTITUIÇÃO
// ============================================

/**
 * 🔄 Como migrar de ModalCriarAgendamento para ModalCriarAgendamentoUnificado
 * 
 * PASSO 1: Remover import antigo
 * ❌ import ModalCriarAgendamento from "../../agenda/components/ModalCriarAgendamento";
 * 
 * PASSO 2: Adicionar import novo
 * ✅ import ModalCriarAgendamentoUnificado from '@/pages/clinica/agenda/components/ModalCriarAgendamentoUnificado';
 * 
 * PASSO 3: Substituir JSX
 * ❌ <ModalCriarAgendamento open={modalOpen} onOpenChange={setModalOpen} ... />
 * ✅ <ModalCriarAgendamentoUnificado isOpen={modalOpen} onClose={close} ... />
 * 
 * PASSO 4: Atualizar props
 * Novo:
 * - isOpen (em vez de open)
 * - onClose (em vez de onOpenChange)
 * - professionals, services, payers, rooms (em vez de dados individuais)
 * - onSuccess (novo, chamado ao sucesso)
 * 
 * PASSO 5: Implementar callback onSuccess
 * Recarregar agendamentos quando novo agendamento for criado
 */

// ============================================
// EXEMPLO: Integração com Redux/Context
// ============================================

/**
 * Se seu projeto usa Redux ou Context para estado global:
 * 
 * @example
 * 
 * // Com Redux
 * const dispatch = useDispatch();
 * 
 * const handleAgendamentoSucesso = () => {
 *   dispatch(recarregarAgendamentos(clinicId, dataSelecionada));
 *   setModalAberto(false);
 * };
 * 
 * // Com Context
 * const { recarregarAgendamentos } = useAgendaContext();
 * 
 * const handleAgendamentoSucesso = () => {
 *   recarregarAgendamentos();
 *   setModalAberto(false);
 * };
 */

// ============================================
// NOTA IMPORTANTE: Salvamento de Agendamentos
// ============================================

/**
 * O novo modal AppointmentUnitedModal ainda não implementa
 * a lógica de salvamento no banco de dados.
 * 
 * ⚠️ TODO: Adicionar integração com API de agendamentos
 * 
 * Para implementar complemente, você precisa:
 * 
 * 1. Adicionar função handleSave no AppointmentUnitedModal
 * 2. Conectar com appointmentsApi.createAppointment()
 * 3. Implementar validação TISS completa
 * 4. Adicionar tratamento de erros
 * 5. Testar com dados reais
 * 
 * Repositório de APIs: src/lib/appointmentsApi.js
 */
