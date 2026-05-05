// CHECKLIST DE VALIDAÇÃO - AGENDA ÚNICA
// =======================================

/**
 * Use este checklist para validar a implementação da Agenda Única
 * Marque com [x] conforme avança
 */

export const VALIDATION_CHECKLIST = {
  // 🏗️ ESTRUTURA E ARQUIVOS
  ESTRUTURA: [
    { item: 'Arquivo AgendaPage.jsx existe', completed: false },
    { item: 'Arquivo useAgendaStore.js existe', completed: false },
    { item: 'Arquivo AgendaHeader.jsx existe', completed: false },
    { item: 'Arquivo AgendaIndicators.jsx existe', completed: false },
    { item: 'Arquivo AgendaTabs.jsx existe', completed: false },
    { item: 'Arquivo AgendaFilters.jsx existe', completed: false },
    { item: 'Arquivo AgendaTimeline.jsx existe', completed: false },
    { item: 'Arquivo AppointmentModal.jsx existe', completed: false },
    { item: 'Arquivo roomsApi.js existe', completed: false },
    { item: 'Rota /clinica/agenda está registrada', completed: false },
  ],

  // 🎯 FUNCIONAMENTO BÁSICO
  FUNCIONALIDADE_BASICA: [
    { item: 'Página /clinica/agenda carrega sem erros', completed: false },
    { item: 'useAgendaStore pode ser instanciado', completed: false },
    { item: 'Estado inicial é consistente', completed: false },
    { item: 'Nenhuma mensagem de erro no console', completed: false },
  ],

  // 📅 NAVEGAÇÃO DE DATA
  NAVEGACAO_DATA: [
    { item: "Botão 'Anterior' muda data para dia anterior", completed: false },
    { item: "Botão 'Próximo' muda data para próximo dia", completed: false },
    { item: "Botão 'Hoje' volta para data atual", completed: false },
    { item: 'Input de data pode ser alterado manualmente', completed: false },
    { item: 'Data muda corretamente no header', completed: false },
  ],

  // 👁️ MODOS DE VISUALIZAÇÃO
  MODOS_VISUALIZACAO: [
    { item: "Aba 'Agenda Geral' funciona e renderiza tabela", completed: false },
    { item: "Aba 'Por Profissional' funciona e renderiza colunas", completed: false },
    { item: "Aba 'Por Sala' funciona e renderiza colunas", completed: false },
    { item: 'Trocar de aba não recarrega a página (URL não muda)', completed: false },
    { item: 'Estado de aba é mantido ao navegar', completed: false },
  ],

  // 🔍 FILTROS
  FILTROS: [
    { item: 'Barra de busca funciona (texto)', completed: false },
    { item: 'Filtro de Profissional funciona', completed: false },
    { item: "Filtro de Profissional oculto em modo 'profissional'", completed: false },
    { item: 'Filtro de Sala funciona', completed: false },
    { item: "Filtro de Sala oculto em modo 'sala'", completed: false },
    { item: 'Filtro de Status funciona', completed: false },
    { item: 'Filtro de Convênio funciona', completed: false },
    { item: 'Filtro de Serviço funciona', completed: false },
    { item: 'Múltiplos filtros podem ser aplicados simultaneamente', completed: false },
    { item: "Botão 'Limpar' remove todos os filtros", completed: false },
    { item: 'Indicador de filtros ativos mostra quantidade correta', completed: false },
  ],

  // 📊 INDICADORES
  INDICADORES: [
    { item: "Card 'Taxa de Ocupação' renderiza", completed: false },
    { item: "Card 'Total de Agendamentos' renderiza", completed: false },
    { item: "Card 'Confirmados' renderiza", completed: false },
    { item: "Card 'Faltas' renderiza", completed: false },
    { item: "Card 'Encaixes' renderiza", completed: false },
    { item: 'Indicadores reagem a filtros ativos', completed: false },
    { item: 'Indicadores mostram valores corretos', completed: false },
  ],

  // ⏰ TIMELINE / GRADE DE HORÁRIOS
  TIMELINE: [
    { item: 'Grade de horários renderiza (slots a cada 30 min)', completed: false },
    { item: "Modo 'geral' mostra tabela com colunas corretas", completed: false },
    { item: "Modo 'profissional' mostra colunas por profissional", completed: false },
    { item: "Modo 'sala' mostra colunas por sala", completed: false },
    { item: 'Clicar em slot vazio abre modal para criar novo', completed: false },
    { item: 'Clicar em agendamento existente abre modal para editar', completed: false },
    { item: 'Cores de status são aplicadas corretamente', completed: false },
    { item: 'Hover em agendamento mostra efeito visual', completed: false },
  ],

  // 🗂️ MODAL DE AGENDAMENTO
  MODAL: [
    { item: 'Modal abre ao clicar em slot', completed: false },
    { item: 'Modal fecha ao clicar em X', completed: false },
    { item: "Modal fecha ao clicar 'Fechar'", completed: false },
    { item: "Aba 'Agendamento' renderiza campos corretos", completed: false },
    { item: "Aba 'Paciente' renderiza campos corretos", completed: false },
    { item: "Aba 'Financeiro' renderiza campos corretos", completed: false },
    { item: "Aba 'Histórico' renderiza sem erros", completed: false },
    { item: 'Trocar de aba no modal funciona', completed: false },
    { item: "Modal modo 'novo' mostra apenas botões 'Salvar' e 'Encaixe'", completed: false },
    {
      item: "Modal modo 'editar' mostra botões 'Confirmar', 'Cancelar' e 'Salvar'",
      completed: false,
    },
  ],

  // 🔐 PERMISSÕES (RBAC)
  PERMISSOES: [
    { item: "Role 'recepcao': Pode criar agendamento", completed: false },
    { item: "Role 'recepcao': NÃO pode editar valor", completed: false },
    { item: "Role 'recepcao': NÃO pode cancelar", completed: false },
    { item: "Role 'profissional': Pode confirmar", completed: false },
    { item: "Role 'profissional': NÃO pode editar", completed: false },
    { item: "Role 'gestor': Tem acesso total", completed: false },
    { item: "Role 'admin': Tem acesso total", completed: false },
  ],

  // 📱 RESPONSIVIDADE
  RESPONSIVIDADE: [
    { item: 'Layout funciona em mobile (320px)', completed: false },
    { item: 'Layout funciona em tablet (768px)', completed: false },
    { item: 'Layout funciona em desktop (1920px)', completed: false },
    { item: 'Tabela de agendamentos rola horizontalmente em mobile', completed: false },
    { item: 'Modal é responsivo em mobile', completed: false },
  ],

  // 🔧 INTEGRAÇÃO API
  API_INTEGRACAO: [
    { item: 'Agendamentos carregam da API', completed: false },
    { item: 'Profissionais carregam da API', completed: false },
    { item: 'Salas carregam da API', completed: false },
    { item: 'Serviços carregam da API', completed: false },
    { item: 'Convênios carregam da API', completed: false },
    { item: 'Pacientes carregam da API', completed: false },
    { item: 'Novo agendamento salva na API', completed: false },
    { item: 'Editar agendamento salva na API', completed: false },
    { item: 'Cancelar agendamento atualiza na API', completed: false },
    { item: 'Confirmar agendamento atualiza na API', completed: false },
  ],

  // 🎨 DESIGN E UX
  DESIGN: [
    { item: 'Cores de status são visualmente distintas', completed: false },
    { item: 'Fonte é legível em todos os tamanhos', completed: false },
    { item: 'Espaçamento é consistente', completed: false },
    { item: 'Botões têm hover/feedback visual', completed: false },
    { item: 'Inputs mostram foco visual', completed: false },
    { item: 'Loading spinner aparece ao carregar', completed: false },
    { item: 'Mensagens de erro aparecem adequadamente', completed: false },
  ],

  // ⚡ PERFORMANCE
  PERFORMANCE: [
    { item: 'Página carrega em menos de 2s', completed: false },
    { item: 'Modal abre/fecha sem delay', completed: false },
    { item: 'Filtros respondem imediatamente', completed: false },
    { item: 'Indicadores calculam sem lag', completed: false },
    { item: 'Não há vazamento de memória (DevTools)', completed: false },
  ],

  // 🐛 BUGS CONHECIDOS (Se houver)
  BUGS: [
    // Adicione bugs encontrados durante testes aqui
  ],
};

/**
 * FUNCAO AUXILIAR PARA IMPRIMIR CHECKLIST
 */
export function printChecklist() {
  console.log('📋 CHECKLIST DE VALIDAÇÃO - AGENDA ÚNICA\n');

  Object.entries(VALIDATION_CHECKLIST).forEach(([category, items]) => {
    if (Array.isArray(items) && items.length > 0) {
      console.log(`\n${category}:`);
      items.forEach((item, idx) => {
        const check = item.completed ? '✅' : '⬜';
        console.log(`  ${check} ${item.item}`);
      });
      const completed = items.filter((i) => i.completed).length;
      console.log(`  [${completed}/${items.length}]`);
    }
  });
}

/**
 * GUIA DE TESTE MANUAL
 */
export const MANUAL_TEST_GUIDE = `
🧪 GUIA DE TESTE MANUAL

1. INICIALIZAÇÃO (3 min)
   □ Abrir /clinica/agenda
   □ Verificar se carrega sem erros
   □ Verificar console (F12) para warnings/errors

2. NAVEGAÇÃO (5 min)
   □ Clicar "Anterior" - data deve mudar
   □ Clicar "Próximo" - data deve mudar
   □ Clicar "Hoje" - deve voltar ao dia atual
   □ Mudar input de data manualmente

3. MODOS DE VISUALIZAÇÃO (5 min)
   □ Clicar "Agenda Geral" - tabela deve aparecer
   □ Clicar "Por Profissional" - colunas por prof devem aparecer
   □ Clicar "Por Sala" - colunas por sala devem aparecer
   □ Verificar que URL não muda

4. FILTROS (5 min)
   □ Escrever na barra de busca
   □ Selecionar filtro de profissional
   □ Selecionar filtro de status
   □ Verificar contador de filtros ativos
   □ Clicar "Limpar" - todos devem ser removidos

5. INDICADORES (2 min)
   □ Verificar se 5 cards são visíveis
   □ Verificar se valores fazem sentido
   □ Aplicar filtro e verificar se indicadores mudam

6. TIMELINE (5 min)
   □ Verificar slots de horários
   □ Clicar em slot vazio - modal deve abrir
   □ Clicar em agendamento - modal deve abrir
   □ Verificar cores de status

7. MODAL (10 min)
   □ Verificar 4 abas: Agendamento, Paciente, Financeiro, Histórico
   □ Preencher formulário novo agendamento
   □ Clicar "Salvar" - agendamento deve ser criado
   □ Clicar em agendamento existente
   □ Clicar "Confirmar" - status deve mudar para confirmado
   □ Clicar "Cancelar" - status deve mudar para cancelado

8. PERMISSÕES (10 min)
   □ Testar com role 'recepcao'
   □ Testar com role 'profissional'
   □ Testar com role 'gestor'
   □ Testar com role 'admin'
   □ Verificar botões habilitados/desabilitados

9. RESPONSIVIDADE (5 min)
   □ Abrir DevTools (F12)
   □ Testar em 320px (mobile)
   □ Testar em 768px (tablet)
   □ Testar em 1920px (desktop)

10. PERFORMANCE (2 min)
    □ Abrir DevTools > Network
    □ Verificar tempo de carregamento
    □ Verificar tamanho de bundle

TEMPO TOTAL: ~50 minutos
`;

/**
 * EXEMPLOS DE DADOS PARA TESTE
 */
export const TEST_DATA = {
  professionals: [
    { id: 'prof-001', name: 'Dr. Silva' },
    { id: 'prof-002', name: 'Dra. Santos' },
    { id: 'prof-003', name: 'Dr. Oliveira' },
  ],
  rooms: [
    { id: 'room-001', name: 'Sala 1' },
    { id: 'room-002', name: 'Sala 2' },
    { id: 'room-003', name: 'Consultório' },
  ],
  services: [
    { id: 'service-001', name: 'Consulta' },
    { id: 'service-002', name: 'Procedimento' },
    { id: 'service-003', name: 'Exame' },
  ],
  statuses: ['confirmado', 'a_confirmar', 'faltou', 'encaixe'],
};
