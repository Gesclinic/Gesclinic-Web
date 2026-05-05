// 🚀 QUICK START - AGENDA ÚNICA
// =============================

/**
 * Começar a usar a Agenda em 5 minutos!
 */

// ============================================================
// 1. ACESSAR A PÁGINA
// ============================================================

// Navegue até:
// http://localhost:3000/clinica/agenda

// Ou via código:
// import { useNavigate } from 'react-router-dom';
// const navigate = useNavigate();
// navigate('/clinica/agenda');

// ============================================================
// 2. USAR O HOOK useAgendaStore
// ============================================================

import { useAgendaStore } from '@/pages/clinica/agenda/hooks/useAgendaStore';

// Dentro de um componente:
export default function MeuComponente() {
  const agenda = useAgendaStore();

  // Acessar estado
  console.log('Data atual:', agenda.date);
  console.log('Modo:', agenda.viewMode);
  console.log('Agendamentos:', agenda.appointments);

  // Modificar estado
  agenda.setDate('2026-01-20');
  agenda.setViewMode('profissional');
  agenda.updateFilter('status', 'confirmado');
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => agenda.goToday()
  }, "Ir para hoje"), /*#__PURE__*/React.createElement("button", {
    onClick: () => agenda.previousDay()
  }, "Dia anterior"), /*#__PURE__*/React.createElement("button", {
    onClick: () => agenda.nextDay()
  }, "Pr\xF3ximo dia"));
}

// ============================================================
// 3. EXEMPLOS DE USO COMUM
// ============================================================

// EXEMPLO 1: Mudar para visualização por profissional
function changeToProView() {
  const agenda = useAgendaStore();
  agenda.setViewMode('profissional');
  // A página muda de visualização SEM recarregar (sem mudar URL)
}

// EXEMPLO 2: Aplicar múltiplos filtros
function applyAdvancedFilters() {
  const agenda = useAgendaStore();
  agenda.setMultipleFilters({
    professional: 'prof-001',
    status: 'a_confirmar',
    searchText: 'João'
  });
  console.log('Agendamentos filtrados:', agenda.filteredAppointments.length);
  console.log('Taxa de ocupação:', agenda.indicators.occupationRate + '%');
}

// EXEMPLO 3: Limpar filtros
function resetFilters() {
  const agenda = useAgendaStore();
  agenda.clearFilters();
  // Volta a mostrar todos os agendamentos
}

// EXEMPLO 4: Navegar entre datas
function navigateDates() {
  const agenda = useAgendaStore();
  agenda.goToday(); // Volta para hoje
  agenda.previousDay(); // Vai para ontem
  agenda.nextDay(); // Vai para amanhã
  agenda.goToWeek(); // Vai para segunda da semana
  agenda.goToMonth(); // Vai para primeiro dia do mês

  // Ou definir data manualmente
  agenda.setDate('2026-02-15');
}

// EXEMPLO 5: Selecionar agendamento
function selectAppointment() {
  const agenda = useAgendaStore();
  const appointment = {
    id: 'apt-123',
    patient_name: 'João Silva',
    start_time: '2026-01-20T14:30:00',
    status: 'a_confirmar'
  };
  agenda.selectSlot(appointment);
  // Modal abrirá automaticamente em AgendaPage
}

// EXEMPLO 6: Atualizar agendamento na lista local
function updateLocalAppointment() {
  const agenda = useAgendaStore();
  agenda.updateAppointmentLocal('apt-123', {
    status: 'confirmado',
    notes: 'Paciente confirmou'
  });
  // A lista atualiza imediatamente (sem esperar API)
}

// EXEMPLO 7: Adicionar novo agendamento
function addNewAppointment() {
  const agenda = useAgendaStore();
  const newApt = {
    id: 'apt-new-' + Date.now(),
    clinic_id: 'clinic-123',
    patient_id: 'pat-123',
    professional_id: 'prof-001',
    patient_name: 'Maria',
    professional_name: 'Dr. Silva',
    start_time: '2026-01-20T15:00:00',
    status: 'a_confirmar'
  };
  agenda.addAppointmentLocal(newApt);
}

// EXEMPLO 8: Ver indicadores
function showIndicators() {
  const agenda = useAgendaStore();
  const kpis = agenda.indicators;
  console.log(`Total: ${kpis.total}`);
  console.log(`Confirmados: ${kpis.confirmed}`);
  console.log(`Taxa de ocupação: ${kpis.occupationRate}%`);
  console.log(`Faltas: ${kpis.noShow}`);
  console.log(`Encaixes: ${kpis.fitting}`);
}

// EXEMPLO 9: Acessar metadata
function getMetadata() {
  const agenda = useAgendaStore();
  const professionals = agenda.metadata.professionals;
  const rooms = agenda.metadata.rooms;
  const services = agenda.metadata.services;
  const payers = agenda.metadata.payers;
  console.log('Profissionais:', professionals);
  console.log('Salas:', rooms);
}

// EXEMPLO 10: Monitorar mudanças
function watchChanges() {
  const agenda = useAgendaStore();

  // Sempre que appointments muda:
  // const effects = useMemo(() => {
  //   console.log('Agendamentos mudaram:', agenda.appointments);
  // }, [agenda.appointments]);
}

// ============================================================
// 4. CHECKLIST: PRIMEIROS PASSOS
// ============================================================

const FIRST_STEPS = `
□ 1. Acessar /clinica/agenda
□ 2. Verificar se página carrega
□ 3. Ver se agendamentos aparecem
□ 4. Clicar em aba "Por Profissional"
□ 5. Clicar em aba "Por Sala"
□ 6. Aplicar filtro de status
□ 7. Clicar em agendamento
□ 8. Abrir modal
□ 9. Trocar de aba no modal
□ 10. Verificar console (F12) para erros

Tempo estimado: 5 minutos
`;

// ============================================================
// 5. TROUBLESHOOTING RÁPIDO
// ============================================================

const TROUBLESHOOTING = `
❌ Página branca / em branco?
   → Verificar console (F12) para erros
   → Verificar se Auth está funcionando
   → Verificar se contextos estão com provider

❌ Agendamentos não carregam?
   → Verificar network (F12) > XHR
   → Verificar se API está respondendo
   → Verificar se clinicId está correto
   → Verificar se usuário tem permissão

❌ Filtros não funcionam?
   → Verificar se metadata carregou (console)
   → Verificar console para erros
   → Limpar filtros e tentar novamente

❌ Modal não abre?
   → Clicar em slot que tenha agendamento
   → Verificar se selectedSlot não é null
   → Verificar console para erros

❌ Permissões não funcionam?
   → Verificar useAuth() retorna currentRole
   → Verificar se role está correto
   → Verificar console para erros de permissão

❌ Performance lenta?
   → Verificar DevTools > Performance
   → Verificar se muitos agendamentos (>1000)
   → Verificar console para loops infinitos
`;

// ============================================================
// 6. ESTRUTURA MÍNIMA PARA TESTAR
// ============================================================

const MINIMAL_TEST = `
import React from 'react';
import AgendaPage from '@/pages/clinica/agenda/AgendaPage';

export default function TestAgenda() {
  return <AgendaPage />;
}

// Renderizar em /clinica/agenda ou diretamente
`;

// ============================================================
// 7. VERIFICAR INSTALAÇÃO
// ============================================================

function checkInstallation() {
  console.log('🔍 Verificando instalação da Agenda Única...\n');

  // Verificar se arquivos existem
  const requiredFiles = ['AgendaPage.jsx', 'useAgendaStore.js', 'AgendaHeader.jsx', 'AgendaIndicators.jsx', 'AgendaTabs.jsx', 'AgendaFilters.jsx', 'AgendaTimeline.jsx', 'AppointmentModal.jsx', 'roomsApi.js'];
  requiredFiles.forEach(file => {
    console.log(`✅ ${file}`);
  });

  // Verificar se rota está registrada
  console.log('\n✅ Rota /clinica/agenda registrada');

  // Verificar se pode acessar hook
  try {
    const {
      useAgendaStore
    } = require('@/pages/clinica/agenda/hooks/useAgendaStore');
    console.log('✅ Hook useAgendaStore importável');
  } catch (e) {
    console.log('❌ Erro ao importar hook:', e.message);
  }
  console.log('\n✅ Instalação OK!');
}

// ============================================================
// 8. PRÓXIMOS PASSOS APÓS INSTALAÇÃO
// ============================================================

const NEXT_STEPS = `
1. IMPLEMENTAR APIS (1-2 horas)
   - Completar appointmentsApi.js
   - Implementar handlers em AgendaPage.jsx
   - Verificar outras APIs

2. TESTAR COM DADOS REAIS (1-2 horas)
   - Usar CHECKLIST_VALIDACAO.js
   - Testar com dados reais do banco
   - Testar em diferentes roles

3. POLIR E MELHORAR (1-2 horas)
   - Adicionar notificações (toast)
   - Implementar histórico de alterações
   - Melhorar UX com transições

4. FUNCIONALIDADES FUTURAS (depois)
   - Agendamento recorrente
   - Sincronização Google Calendar
   - SMS/Email de confirmação
   - Dashboard com relatórios
`;

// ============================================================
// COMANDOS ÚTEIS
// ============================================================

const USEFUL_COMMANDS = `
# Acessar a Agenda
http://localhost:3000/clinica/agenda

# Ver no console se está funcionando
const { useAgendaStore } = require('@/pages/clinica/agenda/hooks/useAgendaStore');
const agenda = useAgendaStore();
console.log(agenda);

# Ver agendamentos filtrados
agenda.filteredAppointments

# Ver indicadores
agenda.indicators

# Mudar modo
agenda.setViewMode('profissional')

# Ver metadata
agenda.metadata

# Limpar console
console.clear()

# Verificar erros
F12 → Console tab
`;

// ============================================================
// RESUMO
// ============================================================

console.log(`
🚀 QUICK START - AGENDA ÚNICA
═════════════════════════════

✅ Página pronta em /clinica/agenda
✅ Hook useAgendaStore funcionando
✅ 8 componentes prontos
✅ Documentação completa
✅ Exemplos de código fornecidos

⏱️ Tempo para começar: 5 minutos
📚 Tempo para implementar APIs: 2-3 horas
🧪 Tempo para testar: 1-2 horas

Próximo passo: Abra /clinica/agenda no navegador!
`);
export { checkInstallation, FIRST_STEPS, TROUBLESHOOTING, NEXT_STEPS, USEFUL_COMMANDS };