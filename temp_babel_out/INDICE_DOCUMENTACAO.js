// 📖 ÍNDICE CENTRAL - AGENDA ÚNICA
// =================================

/**
 * Este arquivo serve como índice/mapa para toda a documentação
 * e código da Agenda Única. Use como referência!
 */

const DOCUMENTATION_INDEX = {
  // ============================================================
  // 🚀 COMECE AQUI
  // ============================================================
  "COMECE_AQUI": {
    files: ["QUICK_START.js - 5 minutos para começar", "README.md - Visão geral e resumo", "ARQUITETURA_DIAGRAMA.txt - Diagramas visuais"],
    time: "10 minutos"
  },
  // ============================================================
  // 📚 DOCUMENTAÇÃO TÉCNICA
  // ============================================================
  "DOCUMENTACAO": {
    "README.md": {
      conteudo: "Visão geral, uso básico, permissões, estrutura de arquivos",
      para_quem: "Todos",
      tempo: "5 minutos"
    },
    "AGENDA_ARQUITETURA.js": {
      conteudo: "Arquitetura completa, ciclo de vida, permissões detalhadas",
      para_quem: "Desenvolvedores",
      tempo: "20 minutos"
    },
    "ARQUITETURA_DIAGRAMA.txt": {
      conteudo: "Diagramas visuais, fluxo de dados, estrutura de estado",
      para_quem: "Visuais/Gestores",
      tempo: "10 minutos"
    },
    "GUIA_INTEGRACAO_API.js": {
      conteudo: "Como integrar com Supabase, passo a passo",
      para_quem: "Desenvolvedores backend",
      tempo: "30 minutos"
    },
    "CHECKLIST_VALIDACAO.js": {
      conteudo: "Lista completa de itens a testar + guia manual",
      para_quem: "QA/Testers",
      tempo: "90+ minutos"
    },
    "QUICK_START.js": {
      conteudo: "Início rápido, exemplos, troubleshooting",
      para_quem: "Todos",
      tempo: "10 minutos"
    }
  },
  // ============================================================
  // 💻 CÓDIGO - COMPONENTES
  // ============================================================
  "COMPONENTES": {
    "AgendaPage.jsx": {
      localizacao: "src/pages/clinica/agenda/AgendaPage.jsx",
      responsabilidade: "Componente principal, orquestra tudo",
      linhas: "~350",
      dependencias: ["useAuth()", "useClinicContext()", "useAgendaStore()", "appointmentsApi", "professionalsApi", "roomsApi", "servicesApi", "payersApi", "patientsApi"],
      funcoes_principais: ["loadAgendaData() - Carrega agendamentos", "loadMetadata() - Carrega dados auxiliares", "handleSaveAppointment() - TODO: Implementar", "handleCancelAppointment() - TODO: Implementar", "handleConfirmAppointment() - TODO: Implementar", "handleFittingAppointment() - TODO: Implementar"]
    },
    "useAgendaStore.js": {
      localizacao: "src/pages/clinica/agenda/hooks/useAgendaStore.js",
      responsabilidade: "Hook com estado centralizado",
      linhas: "~250",
      estados: ["date - Data selecionada", "viewMode - Modo de visualização", "filters - Filtros aplicados", "appointments - Lista de agendamentos", "selectedSlot - Agendamento selecionado", "metadata - Dados auxiliares", "indicators - KPIs calculados"],
      funcoes_principais: ["updateFilter(key, value)", "clearFilters()", "setViewMode(mode)", "setDate(date)", "selectSlot(slot)", "previousDay(), nextDay(), goToday()", "updateAppointmentLocal(id, updates)"]
    },
    "AgendaHeader.jsx": {
      localizacao: "src/pages/clinica/agenda/components/AgendaHeader.jsx",
      responsabilidade: "Header com navegação de data",
      linhas: "~150",
      componentes: ["Input de data", "Botões: Anterior, Hoje, Próximo", "Botões: Semana, Mês", "Botão: Novo Agendamento"]
    },
    "AgendaIndicators.jsx": {
      localizacao: "src/pages/clinica/agenda/components/AgendaIndicators.jsx",
      responsabilidade: "Cards com KPIs",
      linhas: "~80",
      metricas: ["Taxa de ocupação (%)", "Total de agendamentos", "Confirmados", "Faltas", "Encaixes"]
    },
    "AgendaTabs.jsx": {
      localizacao: "src/pages/clinica/agenda/components/AgendaTabs.jsx",
      responsabilidade: "Tabs de modos de visualização",
      linhas: "~60",
      modos: ["Agenda Geral", "Por Profissional", "Por Sala"]
    },
    "AgendaFilters.jsx": {
      localizacao: "src/pages/clinica/agenda/components/AgendaFilters.jsx",
      responsabilidade: "Filtros combinativos",
      linhas: "~250",
      filtros: ["Busca por texto", "Profissional (oculto em modo profissional)", "Sala (oculto em modo sala)", "Status", "Convênio", "Serviço"]
    },
    "AgendaTimeline.jsx": {
      localizacao: "src/pages/clinica/agenda/components/AgendaTimeline.jsx",
      responsabilidade: "Grid de horários com 3 modos",
      linhas: "~400",
      modos_renderizacao: ["Geral: Tabela com colunas", "Profissional: Grid com colunas por profissional", "Sala: Grid com colunas por sala"]
    },
    "AppointmentModal.jsx": {
      localizacao: "src/pages/clinica/agenda/components/AppointmentModal.jsx",
      responsabilidade: "Modal com abas para criar/editar",
      linhas: "~400",
      abas: ["Agendamento", "Paciente", "Financeiro", "Histórico"]
    }
  },
  // ============================================================
  // 📡 CÓDIGO - APIS
  // ============================================================
  "APIS": {
    "appointmentsApi.js": {
      localizacao: "src/lib/appointmentsApi.js",
      status: "Parcialmente implementada",
      funcoes: {
        "✅ listAppointments()": "JÁ EXISTE",
        "⭕ createAppointment()": "TODO",
        "⭕ updateAppointment()": "TODO",
        "⭕ deleteAppointment()": "TODO"
      }
    },
    "roomsApi.js": {
      localizacao: "src/lib/roomsApi.js",
      status: "Completa",
      funcoes: ["✅ listRooms(clinicId)", "✅ getRoomById(roomId)", "✅ createRoom(data)", "✅ updateRoom(id, updates)", "✅ deactivateRoom(id)"]
    },
    "professionalsApi.js": {
      localizacao: "src/lib/professionalsApi.js",
      status: "Verificar se list() existe",
      necessario: "✓ Função list({ clinicId })"
    },
    "servicesApi.js": {
      localizacao: "src/lib/servicesApi.js",
      status: "Verificar se list() existe",
      necessario: "✓ Função list({ clinicId })"
    },
    "payersApi.js": {
      localizacao: "src/lib/payersApi.js",
      status: "Verificar se list() existe",
      necessario: "✓ Função list({ clinicId })"
    },
    "patientsApi.js": {
      localizacao: "src/lib/patientsApi.js",
      status: "Verificar se list() existe",
      necessario: "✓ Função list({ clinicId })"
    }
  },
  // ============================================================
  // 🔗 INTEGRAÇÕES
  // ============================================================
  "INTEGRACIONES": {
    "Auth": "useAuth() - currentRole, clinicId",
    "Clinic": "useClinicContext() - clinic data",
    "Router": "/clinica/agenda - Rota principal",
    "Supabase": "view_agenda_completa_v6 - View existente"
  },
  // ============================================================
  // 🔐 PERMISSÕES
  // ============================================================
  "PERMISSOES": {
    "recepcao": {
      pode: ["Ver todos agendamentos", "Criar novo", "Editar data/hora/prof/sala", "Confirmar"],
      nao_pode: ["Editar valor", "Cancelar"]
    },
    "profissional": {
      pode: ["Ver seus agendamentos", "Confirmar"],
      nao_pode: ["Criar", "Editar", "Cancelar"]
    },
    "gestor": {
      pode: "Tudo exceto deletar",
      acesso_extra: "KPIs detalhados"
    },
    "admin": {
      pode: "Tudo"
    }
  },
  // ============================================================
  // 📋 CHECKLIST IMPLEMENTAÇÃO
  // ============================================================
  "CHECKLIST": {
    "Estrutura": ["[x] AgendaPage.jsx criada", "[x] useAgendaStore.js criada", "[x] 6 componentes criados", "[x] roomsApi.js criada", "[x] Rota registrada"],
    "Funcionalidade": ["[x] Navegação de data", "[x] Modos de visualização", "[x] Filtros combinativos", "[x] KPIs calculados", "[x] Modal com abas", "[ ] Salvamento em API", "[ ] Atualização em API", "[ ] Cancelamento em API"],
    "Permissões": ["[x] RBAC estruturado", "[ ] Validação no backend", "[ ] Testes por role"],
    "Testes": ["[ ] Teste com dados reais", "[ ] Teste responsividade", "[ ] Teste de performance", "[ ] Teste com diferentes roles"]
  },
  // ============================================================
  // 🎯 ROTEIRO POR PERFIL
  // ============================================================
  "ROTEIROS_POR_PERFIL": {
    "Desenvolvedor Frontend": ["1. Ler QUICK_START.js (10 min)", "2. Acessar /clinica/agenda (5 min)", "3. Ler AGENDA_ARQUITETURA.js (20 min)", "4. Explorar componentes (30 min)", "5. Explorar useAgendaStore (20 min)", "Total: ~90 minutos"],
    "Desenvolvedor Backend/API": ["1. Ler README.md (5 min)", "2. Ler GUIA_INTEGRACAO_API.js (30 min)", "3. Completar APIs (2-3 horas)", "4. Testar com CHECKLIST_VALIDACAO.js (1-2 horas)", "Total: ~4 horas"],
    "QA/Tester": ["1. Ler QUICK_START.js (10 min)", "2. Acessar /clinica/agenda (5 min)", "3. Ler CHECKLIST_VALIDACAO.js (20 min)", "4. Executar teste manual (50 min)", "5. Reportar bugs encontrados", "Total: ~90 minutos"],
    "Gestor/PM": ["1. Ler RESUMO_EXECUTIVO (5 min)", "2. Ver ARQUITETURA_DIAGRAMA.txt (10 min)", "3. Entender funcionalidades em README.md (10 min)", "Total: ~25 minutos"]
  },
  // ============================================================
  // 🚨 IMPORTANTE
  // ============================================================
  "IMPORTANTE": {
    "Não esquecer": ["✅ Implementar handlers de API em AgendaPage.jsx", "✅ Completar appointmentsApi.js", "✅ Validar permissões no backend", "✅ Testar com dados reais"],
    "Recursos": ["CHECKLIST_VALIDACAO.js - 90 itens de teste", "ARQUITETURA_DIAGRAMA.txt - Visualização"],
    "Suporte": ["Consulte comentários no código", "Veja console (F12) para erros", "Leia QUICK_START.js troubleshooting"]
  }
};

// ============================================================
// FUNÇÃO PARA IMPRIMIR ÍNDICE
// ============================================================

export function printIndex() {
  console.log(`
📖 ÍNDICE CENTRAL - AGENDA ÚNICA
=================================

COMECE AQUI:
  1. QUICK_START.js (5 min)
  2. README.md (10 min)
  3. ARQUITETURA_DIAGRAMA.txt (10 min)

DOCUMENTAÇÃO COMPLETA:
  • AGENDA_ARQUITETURA.js - Técnica
  • GUIA_INTEGRACAO_API.js - APIs
  • CHECKLIST_VALIDACAO.js - Testes

COMPONENTES:
  • AgendaPage.jsx - Principal
  • useAgendaStore.js - Estado
  • 6 componentes UI

PRÓXIMOS PASSOS:
  1. Implementar APIs (2-3h)
  2. Testar (1-2h)
  3. Deploy (30min)

Para mais detalhes, consulte a documentação específica!
  `);
}
export default DOCUMENTATION_INDEX;