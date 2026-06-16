// ✅ MENU STRUCTURE REFERENCE — Gesclinic 2026
// Este arquivo documentá a estrutura JSON completa do novo menu

export const MENU_STRUCTURE = [
  // ===== LEVEL 0 =====
  // Dashboard - Entry point único
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/clinica/dashboard",
    roles: ["admin", "gestor", "financeiro", "medico", "recepcao"],
    // ⚠️ Sem children - item isolado
  },

  // ===== LEVEL 1 =====
  // 8 módulos principais

  {
    id: "agenda",
    label: "Agenda",
    icon: "Calendar",
    roles: ["admin", "gestor", "medico", "recepcao"],
    // ⚠️ Sem 'path' - é um grupo
    children: [
      // LEVEL 2
      {
        id: "agenda.geral",
        label: "Agenda Geral",
        icon: "CalendarDays",
        path: "/clinica/agenda",  // ✅ Link direto
        roles: ["admin", "gestor", "medico", "recepcao"],
      },
      {
        id: "agenda.profissional",
        label: "Por Profissional",
        icon: "UserCheck",
        path: "/clinica/agenda/profissional",
        roles: ["admin", "gestor", "medico", "recepcao"],
      },
      {
        id: "agenda.sala",
        label: "Por Sala",
        icon: "DoorOpen",
        path: "/clinica/agenda/sala",
        roles: ["admin", "gestor", "recepcao"],
      },
      {
        id: "agenda.confirmacoes",
        label: "Confirmações",
        icon: "CheckCircle",
        path: "/clinica/agenda/confirmacoes",
        roles: ["admin", "gestor", "recepcao"],
      },
      {
        id: "agenda.espera",
        label: "Lista de Espera",
        icon: "Clock",
        path: "/clinica/agenda/espera",
        roles: ["admin", "gestor", "recepcao"],
      },
      {
        id: "agenda.recepcao",
        label: "Recepção",
        icon: "DoorOpen",
        path: "/clinica/agenda/recepcao",
        roles: ["admin", "gestor", "recepcao"],
      },
      {
        id: "agenda.indicadores",
        label: "Indicadores",
        icon: "BarChart3",
        path: "/clinica/agenda/indicadores",
        roles: ["admin", "gestor"],
      },
      // LEVEL 2 - Grupo
      {
        id: "agenda.comunicacao",
        label: "Comunicação",
        icon: "Bell",
        roles: ["admin", "gestor", "recepcao"],
        // ⚠️ Sem 'path' - é um grupo
        children: [
          // LEVEL 3
          {
            id: "agenda.notificacoes",
            label: "Notificações",
            icon: "MessageSquare",
            path: "/clinica/agenda/notificacoes",
            roles: ["admin", "gestor", "recepcao"],
          },
          {
            id: "agenda.logs",
            label: "Logs",
            icon: "ScrollText",
            path: "/clinica/agenda/logs",
            roles: ["admin", "gestor"],
          },
        ],
      },
    ],
  },

  {
    id: "pacientes",
    label: "Pacientes",
    icon: "Users",
    roles: ["admin", "gestor", "medico", "recepcao"],
    children: [
      {
        id: "pacientes.lista",
        label: "Lista de Pacientes",
        icon: "List",
        path: "/clinica/pacientes",
        roles: ["admin", "gestor", "medico", "recepcao"],
      },
      {
        id: "pacientes.prontuario",
        label: "Prontuário",
        icon: "FileText",
        roles: ["admin", "gestor", "medico"],
        children: [
          {
            id: "pacientes.dados",
            label: "Dados Cadastrais",
            icon: "IdCard",
            path: "/clinica/pacientes/dados",
            roles: ["admin", "gestor", "medico", "recepcao"],
          },
          {
            id: "pacientes.historico",
            label: "Histórico Clínico",
            icon: "History",
            path: "/clinica/pacientes/historico",
            roles: ["admin", "gestor", "medico"],
          },
          {
            id: "pacientes.anamnese",
            label: "Anamnese",
            icon: "ClipboardList",
            path: "/clinica/pacientes/anamnese",
            roles: ["admin", "gestor", "medico"],
          },
        ],
      },
      {
        id: "pacientes.arquivos",
        label: "Arquivos",
        icon: "Folder",
        roles: ["admin", "gestor", "medico"],
        children: [
          {
            id: "pacientes.documentos",
            label: "Documentos",
            icon: "File",
            path: "/clinica/pacientes/documentos",
            roles: ["admin", "gestor", "medico"],
          },
          {
            id: "pacientes.midia",
            label: "Fotos / Vídeos",
            icon: "Image",
            path: "/clinica/pacientes/midia",
            roles: ["admin", "gestor", "medico"],
          },
        ],
      },
      {
        id: "pacientes.convenios",
        label: "Convênios",
        icon: "ShieldCheck",
        path: "/clinica/pacientes/convenios",
        roles: ["admin", "gestor", "recepcao"],
      },
      {
        id: "pacientes.familia",
        label: "Dados Familiares",
        icon: "UsersRound",
        path: "/clinica/pacientes/familia",
        roles: ["admin", "gestor", "medico"],
      },
    ],
  },

  {
    id: "base_sistema",
    label: "Base do Sistema",
    icon: "Database",
    roles: ["admin", "gestor"],
    children: [
      {
        id: "base_sistema.profissionais",
        label: "Profissionais",
        icon: "Stethoscope",
        path: "/clinica/cadastros/profissionais",
        roles: ["admin", "gestor"],
      },
      {
        id: "base_sistema.servicos",
        label: "Serviços e Procedimentos",
        icon: "Activity",
        path: "/clinica/cadastros/servicos",
        roles: ["admin", "gestor"],
      },
      {
        id: "base_sistema.convenios",
        label: "Convênios",
        icon: "Handshake",
        path: "/clinica/cadastros/convenios",
        roles: ["admin", "gestor"],
      },
      {
        id: "base_sistema.salas",
        label: "Salas e Recursos",
        icon: "Building",
        path: "/clinica/cadastros/salas",
        roles: ["admin", "gestor"],
      },
    ],
  },

  {
    id: "financeiro",
    label: "Financeiro",
    icon: "Wallet",
    roles: ["admin", "gestor", "financeiro"],
    children: [
      {
        id: "financeiro.visao_geral",
        label: "Visão Geral",
        icon: "LayoutDashboard",
        path: "/clinica/financeiro",
        roles: ["admin", "gestor", "financeiro"],
      },
      {
        id: "financeiro.lancamentos",
        label: "Lançamentos",
        icon: "Book",
        path: "/clinica/financeiro/lancamentos",
        roles: ["admin", "gestor", "financeiro"],
      },
      {
        id: "financeiro.receber",
        label: "Contas a Receber",
        icon: "TrendingUp",
        path: "/clinica/financeiro/receber",
        roles: ["admin", "gestor", "financeiro"],
      },
      {
        id: "financeiro.pagar",
        label: "Contas a Pagar",
        icon: "TrendingDown",
        path: "/clinica/financeiro/contas-pagar",
        roles: ["admin", "gestor", "financeiro"],
      },
      {
        id: "financeiro.fluxo",
        label: "Fluxo de Caixa",
        icon: "LineChart",
        path: "/clinica/financeiro/fluxo",
        roles: ["admin", "gestor", "financeiro"],
      },
      {
        id: "financeiro.conciliacao",
        label: "Conciliação Bancária",
        icon: "Banknote",
        path: "/clinica/financeiro/conciliacao",
        roles: ["admin", "gestor", "financeiro"],
      },
      {
        id: "financeiro.estrutura",
        label: "Estrutura Financeira",
        icon: "Settings2",
        roles: ["admin", "gestor"],
        children: [
          {
            id: "financeiro.plano_contas",
            label: "Plano de Contas",
            icon: "ListTree",
            path: "/clinica/financeiro/plano-contas",
            roles: ["admin", "gestor"],
          },
          {
            id: "financeiro.centro_custos",
            label: "Centro de Custos",
            icon: "Target",
            path: "/clinica/financeiro/centro-custos",
            roles: ["admin", "gestor"],
          },
          {
            id: "financeiro.automacoes",
            label: "Automações",
            icon: "Zap",
            path: "/clinica/financeiro/automacoes",
            roles: ["admin", "gestor"],
          },
        ],
      },
      {
        id: "financeiro.repasse",
        label: "Repasse Médico",
        icon: "UserCog",
        roles: ["admin", "gestor", "medico"],
        children: [
          {
            id: "financeiro.repasse_visao",
            label: "Visão Geral",
            icon: "PieChart",
            path: "/clinica/repasse",
            roles: ["admin", "gestor", "medico"],
          },
          {
            id: "financeiro.repasse_config",
            label: "Configurações",
            icon: "Sliders",
            path: "/clinica/repasse/config",
            roles: ["admin", "gestor"],
          },
          {
            id: "financeiro.repasse_historico",
            label: "Histórico",
            icon: "Clock3",
            path: "/clinica/repasse/historico",
            roles: ["admin", "gestor", "medico"],
          },
        ],
      },
    ],
  },

  {
    id: "estoque",
    label: "Estoque",
    icon: "Boxes",
    roles: ["admin", "gestor"],
    children: [
      {
        id: "estoque.visao_geral",
        label: "Visão Geral",
        icon: "LayoutDashboard",
        path: "/clinica/estoque",
        roles: ["admin", "gestor"],
      },
      {
        id: "estoque.produtos",
        label: "Produtos",
        icon: "Package",
        path: "/clinica/estoque/produtos",
        roles: ["admin", "gestor"],
      },
      {
        id: "estoque.categorias",
        label: "Categorias",
        icon: "Tags",
        path: "/clinica/estoque/categorias",
        roles: ["admin", "gestor"],
      },
      {
        id: "estoque.fornecedores",
        label: "Fornecedores",
        icon: "Truck",
        path: "/clinica/estoque/fornecedores",
        roles: ["admin", "gestor"],
      },
      {
        id: "estoque.movimentacoes",
        label: "Movimentações",
        icon: "Shuffle",
        roles: ["admin", "gestor"],
        children: [
          {
            id: "estoque.entradas",
            label: "Entradas",
            icon: "ArrowDown",
            path: "/clinica/estoque/entradas",
            roles: ["admin", "gestor"],
          },
          {
            id: "estoque.saidas",
            label: "Saídas",
            icon: "ArrowUp",
            path: "/clinica/estoque/saidas",
            roles: ["admin", "gestor"],
          },
          {
            id: "estoque.transferencias",
            label: "Transferências",
            icon: "Repeat",
            path: "/clinica/estoque/transferencias",
            roles: ["admin", "gestor"],
          },
        ],
      },
      {
        id: "estoque.requisicoes",
        label: "Requisições",
        icon: "ClipboardCheck",
        path: "/clinica/estoque/requisicoes",
        roles: ["admin", "gestor"],
      },
      {
        id: "estoque.inventario",
        label: "Inventário",
        icon: "ScanLine",
        path: "/clinica/estoque/inventario",
        roles: ["admin", "gestor"],
      },
      {
        id: "estoque.relatorios",
        label: "Relatórios",
        icon: "FileBarChart",
        path: "/clinica/estoque/relatorios",
        roles: ["admin", "gestor"],
      },
    ],
  },

  {
    id: "faturamento",
    label: "Faturamento",
    icon: "FileInvoice",
    roles: ["admin", "gestor"],
    children: [
      {
        id: "faturamento.guias",
        label: "Guias TISS",
        icon: "FileText",
        path: "/clinica/faturamento/guias",
        roles: ["admin", "gestor"],
      },
      {
        id: "faturamento.xml",
        label: "Envio de XML",
        icon: "UploadCloud",
        path: "/clinica/faturamento/xml",
        roles: ["admin", "gestor"],
      },
    ],
  },

  {
    id: "configuracoes",
    label: "Configurações",
    icon: "Settings",
    roles: ["admin", "gestor"],
    children: [
      {
        id: "configuracoes.perfis",
        label: "Perfis de Usuário",
        icon: "UserShield",
        path: "/clinica/configuracoes/perfis",
        roles: ["admin"],
      },
      {
        id: "configuracoes.permissoes",
        label: "Permissões",
        icon: "Lock",
        path: "/clinica/configuracoes/permissoes",
        roles: ["admin"],
      },
      {
        id: "configuracoes.agenda",
        label: "Agenda",
        icon: "CalendarCog",
        path: "/clinica/configuracoes/agenda",
        roles: ["admin", "gestor"],
      },
      {
        id: "configuracoes.financeiro",
        label: "Financeiro",
        icon: "WalletCards",
        path: "/clinica/configuracoes/financeiro",
        roles: ["admin", "gestor"],
      },
      {
        id: "configuracoes.estoque",
        label: "Estoque",
        icon: "Boxes",
        path: "/clinica/configuracoes/estoque",
        roles: ["admin", "gestor"],
      },
      {
        id: "configuracoes.faturamento",
        label: "Faturamento",
        icon: "FileInvoice",
        path: "/clinica/configuracoes/faturamento",
        roles: ["admin", "gestor"],
      },
    ],
  },

  {
    id: "administracao",
    label: "Administração",
    icon: "Shield",
    roles: ["admin"],
    children: [
      {
        id: "administracao.usuarios",
        label: "Usuários",
        icon: "UsersCog",
        path: "/clinica/admin/usuarios",
        roles: ["admin"],
      },
      {
        id: "administracao.clinicas",
        label: "Clínicas",
        icon: "Building2",
        path: "/clinica/admin/clinicas",
        roles: ["admin"],
      },
    ],
  },
];

// ===== ESTATÍSTICAS =====
export const MENU_STATS = {
  totalItems: 48,          // Número total de itens
  modules: 9,              // Dashboard + 8 módulos
  maxDepth: 3,             // Profundidade máxima (nível 2 tem children)
  roles: 5,                // admin, gestor, financeiro, medico, recepcao
  icons: 43,               // Total de ícones lucide-react usados
};

// ===== VISIBILIDADE POR ROLE =====
export const VISIBILITY_BY_ROLE = {
  admin: {
    visibleItems: 48,
    modules: 9,
    description: "Acesso total ao sistema",
  },
  gestor: {
    visibleItems: 37,
    modules: 8,
    description: "Visão executiva e gerencial",
  },
  financeiro: {
    visibleItems: 16,
    modules: 3,
    description: "Apenas operações financeiras",
  },
  medico: {
    visibleItems: 17,
    modules: 4,
    description: "Atendimento e prontuário",
  },
  recepcao: {
    visibleItems: 13,
    modules: 3,
    description: "Agenda e atendimento ao paciente",
  },
};

// ===== ÍCONES UTILIZADOS =====
export const ICONS_USED = [
  "LayoutDashboard", "Calendar", "Users", "FileText",
  "Database", "Wallet", "Boxes", "FileInvoice", "Settings", "Shield",
  "CalendarDays", "UserCheck", "DoorOpen", "CheckCircle", "Clock",
  "Bell", "MessageSquare", "ScrollText", "List", "IdCard", "History",
  "ClipboardList", "Folder", "Image", "ShieldCheck", "UsersRound",
  "Activity", "Handshake", "TrendingUp", "TrendingDown", "LineChart",
  "Banknote", "Settings2", "ListTree", "Target", "Zap", "UserCog",
  "PieChart", "Sliders", "Clock3", "Package", "Tags", "Shuffle",
  "ScanLine", "FileBarChart", "UploadCloud", "UserShield", "Lock",
  "CalendarCog", "WalletCards", "UsersCog", "Building2",
];
