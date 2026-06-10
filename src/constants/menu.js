// src/constants/menu.js
/**
 * MENU LATERAL REESTRUTURADO — JANEIRO 2026
 *
 * 🎯 PRINCÍPIOS:
 * - Um único Dashboard como entry point
 * - 8 módulos principais organizados por domínio funcional
 * - Máximo 3 níveis de profundidade
 * - Sistema de permissões por perfil (role-based access)
 *
 * 📊 PERFIS SUPORTADOS:
 * - admin: acesso total
 * - gestor: visão executiva, financeiro, repasse
 * - financeiro: apenas módulos de finanças e relatórios
 * - medico: agenda, pacientes (prontuário), repasse (read-only)
 * - recepcao: agenda, pacientes (lista)
 */

// Mapa de permissões por role
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard',
    'agenda.*',
    'pacientes.*',
    'base_sistema.*',
    'financeiro.*',
    'estoque.*',
    'faturamento.*',
    'configuracoes.*',
    'administracao.*',
  ],
  gestor: [
    'dashboard',
    'agenda',
    'agenda.agenda',
    'agenda.confirmacoes',
    'agenda.espera',
    'agenda.recepcao',
    'agenda.indicadores',
    'pacientes.lista',
    'base_sistema.*',
    'financeiro.*',
    'estoque.dashboard',
    'estoque.relatorios',
    'faturamento.*',
    'configuracoes.financeiro',
    'configuracoes.faturamento',
    'administracao.auditoria',
  ],
  financeiro: [
    'dashboard',
    'financeiro.*',
    'estoque.dashboard',
    'estoque.relatorios',
    'faturamento.*',
  ],
  medico: ['dashboard', 'agenda', 'agenda.agenda', 'agenda.confirmacoes', 'pacientes.*'],
  recepcao: ['dashboard', 'agenda.*', 'pacientes.*'],
};

export function getMenuItems(role = 'admin') {
  const menu = [
    // ============================
    // 1️⃣ DASHBOARD — ENTRY POINT ÚNICO
    // ============================
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      path: '/clinica/dashboard',
      roles: ['admin', 'gestor', 'financeiro', 'medico', 'recepcao', 'profissional'],
      featurePath: 'dashboard',
    },

    // ============================
    // 2️⃣ AGENDA — GESTÃO DE COMPROMISSOS
    // ============================
    // 🟢 REFATORAÇÃO ETAPA 2: Agenda Única com Tabs Internos
    // - Agenda Geral, Por Profissional, Por Sala = TABS (não menu items, não mudam URL)
    // - Confirmações, Lista de Espera, Indicadores = Submenu items com rotas próprias
    {
      id: 'agenda',
      label: 'Agenda',
      icon: 'Calendar',
      roles: ['admin', 'gestor', 'medico', 'recepcao', 'profissional'],
      path: '/clinica/agenda',
      featurePath: 'agenda',
      children: [
        {
          id: 'agenda.agenda',
          label: 'Agenda',
          icon: 'Calendar',
          path: '/clinica/agenda',
          roles: ['admin', 'gestor', 'medico', 'recepcao', 'profissional'],
          featurePath: 'agenda',
        },
        {
          id: 'agenda.confirmacoes',
          label: 'Confirmações',
          icon: 'CheckCircle',
          path: '/clinica/agenda/confirmacoes',
          roles: ['admin', 'gestor', 'recepcao'],
          featurePath: 'agenda.confirmacoes',
        },
        {
          id: 'agenda.espera',
          label: 'Lista de Espera',
          icon: 'Clock',
          path: '/clinica/agenda/espera',
          roles: ['admin', 'gestor', 'recepcao'],
          featurePath: 'agenda.espera',
        },
        {
          id: 'agenda.recepcao',
          label: 'Recepção',
          icon: 'DoorOpen',
          path: '/clinica/agenda/recepcao',
          roles: ['admin', 'gestor', 'recepcao'],
          featurePath: 'agenda.recepcao',
        },
        {
          id: 'agenda.indicadores',
          label: 'Indicadores',
          icon: 'BarChart3',
          path: '/clinica/agenda/indicadores',
          roles: ['admin', 'gestor'],
          featurePath: 'agenda.indicadores',
        },
      ],
    },

    // ============================
    // 3️⃣ PACIENTES — GESTÃO CLÍNICA
    // ============================
    // 📝 NOTA: Recepção foi removida do menu pois está integrada na Agenda como drawer
    // V2 REFACTORED: Menu simplificado - apenas 2 itens
    // Funcionalidades removidas (Prontuário, Arquivos, Convênios, etc)
    // estão acessíveis via abas internas em /clinica/pacientes/:patientId
    {
      id: 'pacientes',
      label: 'Pacientes',
      icon: 'Users',
      path: '/clinica/pacientes',
      roles: ['admin', 'gestor', 'medico', 'recepcao', 'profissional'],
      featurePath: 'pacientes',
      children: [
        {
          id: 'pacientes.lista',
          label: 'Lista de Pacientes',
          icon: 'List',
          path: '/clinica/pacientes',
          roles: ['admin', 'gestor', 'medico', 'recepcao', 'profissional'],
          featurePath: 'pacientes.lista',
        },
        {
          id: 'pacientes.novo',
          label: 'Novo Paciente',
          icon: 'FilePlus',
          path: '/clinica/pacientes/novo',
          roles: ['admin', 'gestor', 'medico', 'recepcao', 'profissional'],
          featurePath: 'pacientes.novo',
        },
      ],
    },

    // ============================
    // 4️⃣ CADASTROS BÁSICOS
    // ============================
    {
      id: 'cadastros_basicos',
      label: 'Cadastros Básicos',
      icon: 'Building2',
      path: '/clinica/base-sistema/servicos',
      roles: ['admin', 'gestor'],
      featurePath: 'cadastros_basicos',
      children: [
        {
          id: 'cadastros_basicos.servicos',
          label: 'Serviços',
          path: '/clinica/base-sistema/servicos',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos',
        },
        {
          id: 'cadastros_basicos.profissionais',
          label: 'Profissionais',
          path: '/clinica/base-sistema/profissionais',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos',
        },
        {
          id: 'cadastros_basicos.salas',
          label: 'Salas',
          path: '/clinica/base-sistema/salas',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos',
        },
        {
          id: 'cadastros_basicos.recursos',
          label: 'Recursos',
          path: '/clinica/base-sistema/recursos',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos',
        },
        {
          id: 'cadastros_basicos.convenios',
          label: 'Convênios',
          path: '/clinica/base-sistema/convenios',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos',
        },
        {
          id: 'cadastros_basicos.tabela_precos',
          label: 'Tabela de Preços',
          path: '/clinica/base-sistema/service-prices',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos',
        },
        {
          id: 'cadastros_basicos.salas_servicos',
          label: 'Salas × Serviços',
          path: '/clinica/base-sistema/room-resources',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos',
        },
      ],
    },

    // ============================
    // 5️⃣ FINANCEIRO — CONTROLE ECONÔMICO
    // ============================
    // 🎯 REORGANIZAÇÃO: Estrutura simplificada com foco em integração Agenda → Lançamentos → DRE
    // Removido: Caixa Individual, Caixa Gerencial, Autorização Descontos, ETAPA 1
    // Reorganizado em 5 grupos: Dashboard, Movimento, Estrutura, Análise, Especiais
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: 'Wallet',
      path: '/clinica/financeiro',
      roles: ['admin', 'gestor', 'financeiro'],
      featurePath: 'financeiro',
      children: [
        // 1. DASHBOARD - Entry Point
        {
          id: 'financeiro.visao_geral',
          label: 'Dashboard',
          icon: 'LayoutDashboard',
          path: '/clinica/financeiro',
          roles: ['admin', 'gestor', 'financeiro'],
          featurePath: 'financeiro.visao_geral',
        },

        // 2. MOVIMENTO - Core Transactions (Motor Financeiro)
        {
          id: 'financeiro.movimento',
          label: 'Movimento',
          icon: 'Workflow',
          path: '/clinica/financeiro/lancamentos',
          roles: ['admin', 'gestor', 'financeiro'],
          featurePath: 'financeiro.movimento',
          children: [
            {
              id: 'financeiro.lancamentos',
              label: 'Lançamentos',
              icon: 'Book',
              path: '/clinica/financeiro/lancamentos',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.lancamentos',
            },
            {
              id: 'financeiro.receber',
              label: 'Contas a Receber',
              icon: 'TrendingUp',
              path: '/clinica/financeiro/receber',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.receber',
            },
            {
              id: 'financeiro.pagar',
              label: 'Contas a Pagar',
              icon: 'TrendingDown',
              path: '/clinica/financeiro/contas-pagar',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.pagar',
            },
            {
              id: 'financeiro.fluxo',
              label: 'Fluxo de Caixa',
              icon: 'LineChart',
              path: '/clinica/financeiro/fluxo-caixa',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.fluxo',
            },
          ],
        },

        // 3. ESTRUTURA - Configuração Financeira
        {
          id: 'financeiro.estrutura',
          label: 'Estrutura',
          icon: 'Settings2',
          path: '/clinica/financeiro/estrutura',
          roles: ['admin', 'gestor'],
          featurePath: 'financeiro.estrutura',
          children: [
            {
              id: 'financeiro.contas_bancarias',
              label: 'Contas Bancárias',
              icon: 'Landmark',
              path: '/clinica/financeiro/contas-financeiras',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.contas_bancarias',
            },
            {
              id: 'financeiro.plano_contas',
              label: 'Plano de Contas',
              icon: 'ListTree',
              path: '/clinica/financeiro/plano-contas',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.plano_contas',
            },
            {
              id: 'financeiro.centro_custos',
              label: 'Centro de Custos',
              icon: 'Target',
              path: '/clinica/financeiro/centro-custos',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.centro_custos',
            },
            {
              id: 'financeiro.automacoes',
              label: 'Automações',
              icon: 'Zap',
              path: '/clinica/financeiro/automacoes',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.automacoes',
            },
            {
              id: 'financeiro.cartoes',
              label: 'Cartões',
              icon: 'CreditCard',
              path: '/clinica/financeiro/cartoes',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.cartoes',
            },
            {
              id: 'financeiro.cartoes-operadoras',
              label: 'Operadoras',
              icon: 'Building2',
              path: '/clinica/financeiro/cartoes-operadoras',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.cartoes-operadoras',
            },
            {
              id: 'financeiro.cartoes-taxas-operadoras',
              label: 'Taxas por Operadora',
              icon: 'Percent',
              path: '/clinica/financeiro/cartoes-taxas-operadoras',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.cartoes-taxas-operadoras',
            },
            {
              id: 'financeiro.cartoes-analytics',
              label: 'Analytics de Taxas',
              icon: 'BarChart3',
              path: '/clinica/financeiro/cartoes-analytics',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.cartoes-analytics',
            },
          ],
        },

        // ✅ ETAPA D.6: AUDITORIA - Rastreamento de Alterações
        {
          id: 'financeiro.auditoria',
          label: 'Auditoria',
          icon: 'ShieldAlert',
          path: '/clinica/financeiro/auditoria',
          roles: ['admin', 'gestor'],
          featurePath: 'financeiro.auditoria',
          children: [
            {
              id: 'financeiro.auditoria-taxas',
              label: 'Relatório de Taxas',
              icon: 'FileText',
              path: '/clinica/financeiro/auditoria',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.auditoria',
            },
            {
              id: 'financeiro.auditoria-analytics',
              label: 'Analytics',
              icon: 'BarChart3',
              path: '/clinica/financeiro/auditoria-analytics',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.auditoria',
            },
          ],
        },

        // 4. ANÁLISE - Relatórios e Inteligência
        {
          id: 'financeiro.analise',
          label: 'Análise',
          icon: 'BarChart3',
          roles: ['admin', 'gestor', 'financeiro'],
          featurePath: 'financeiro.analise',
          children: [
            {
              id: 'financeiro.resultado',
              label: 'DRE',
              icon: 'PieChart',
              path: '/clinica/financeiro/resultado',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.resultado',
            },
            {
              id: 'financeiro.dre_dinamica',
              label: 'DRE Dinâmica',
              icon: 'BarChart3',
              path: '/clinica/financeiro/dre-dinamica',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.dre_dinamica',
            },
            {
              id: 'financeiro.conciliacao',
              label: 'Conciliação Bancária',
              icon: 'Banknote',
              path: '/clinica/financeiro/conciliacao-bancaria',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.conciliacao',
            },
            {
              id: 'financeiro.cockpit_premium',
              label: 'Cockpit Premium',
              icon: 'Zap',
              path: '/clinica/financeiro/cockpit-premium',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.cockpit_premium',
            },
            {
              id: 'financeiro.alerts',
              label: 'Alertas e Automações',
              icon: 'Bell',
              path: '/clinica/financeiro/alerts',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.alerts',
            },
          ],
        },

        // 5. ESPECIAIS - Repasse Médico
        {
          id: 'financeiro.repasse',
          label: 'Repasse Médico',
          icon: 'UserCog',
          path: '/clinica/financeiro/repasse/medico',
          roles: ['admin', 'gestor', 'medico'],
          featurePath: 'financeiro.repasse',
        },
      ],
    },

    // ============================
    // 6️⃣ ESTOQUE — GESTÃO DE INVENTÁRIO
    // ============================
    {
      id: 'estoque',
      label: 'Estoque',
      icon: 'Boxes',
      path: '/clinica/estoque',
      roles: ['admin', 'gestor'],
      featurePath: 'estoque',
      children: [
        {
          id: 'estoque.visao_geral',
          label: 'Visão Geral',
          icon: 'LayoutDashboard',
          path: '/clinica/estoque',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.visao_geral',
        },
        {
          id: 'estoque.produtos',
          label: 'Produtos',
          icon: 'Package',
          path: '/clinica/estoque/produtos',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.produtos',
        },
        {
          id: 'estoque.categorias',
          label: 'Categorias',
          icon: 'Tags',
          path: '/clinica/estoque/categorias',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.categorias',
        },
        {
          id: 'estoque.fornecedores',
          label: 'Fornecedores',
          icon: 'Truck',
          path: '/clinica/estoque/fornecedores',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.fornecedores',
        },
        {
          id: 'estoque.movimentacoes',
          label: 'Movimentações',
          icon: 'Shuffle',
          path: '/clinica/estoque/entradas',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.movimentacoes',
          children: [
            {
              id: 'estoque.entradas',
              label: 'Entradas',
              icon: 'ArrowDown',
              path: '/clinica/estoque/entradas',
              roles: ['admin', 'gestor'],
              featurePath: 'estoque.entradas',
            },
            {
              id: 'estoque.saidas',
              label: 'Saídas',
              icon: 'ArrowUp',
              path: '/clinica/estoque/saidas',
              roles: ['admin', 'gestor'],
              featurePath: 'estoque.saidas',
            },
            {
              id: 'estoque.transferencias',
              label: 'Transferências',
              icon: 'Repeat',
              path: '/clinica/estoque/transferencias',
              roles: ['admin', 'gestor'],
              featurePath: 'estoque.transferencias',
            },
          ],
        },
        {
          id: 'estoque.requisicoes',
          label: 'Requisições',
          icon: 'ClipboardCheck',
          path: '/clinica/estoque/requisicoes',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.requisicoes',
        },
        {
          id: 'estoque.locais',
          label: 'Locais de Estoque',
          icon: 'Warehouse',
          path: '/clinica/estoque/locais',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.locais',
        },
        {
          id: 'estoque.inventario',
          label: 'Inventário',
          icon: 'ScanLine',
          path: '/clinica/estoque/inventario',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.inventario',
        },
        {
          id: 'estoque.relatorios',
          label: 'Relatórios',
          icon: 'FileBarChart',
          path: '/clinica/estoque/relatorios',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.relatorios',
        },
      ],
    },

    // ============================
    // 7️⃣ FATURAMENTO — INTEGRAÇÃO COM CONVÊNIOS
    // ============================
    {
      id: 'faturamento',
      label: 'Faturamento',
      icon: 'Receipt',
      path: '/clinica/faturamento',
      roles: ['admin', 'gestor'],
      featurePath: 'faturamento',
      children: [
        {
          id: 'faturamento.dashboard',
          label: 'Dashboard',
          icon: 'BarChart3',
          path: '/clinica/faturamento',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.dashboard',
        },
        {
          id: 'faturamento.guias',
          label: 'Guias TISS',
          icon: 'FileText',
          path: '/clinica/faturamento/guias',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.guias',
        },
        {
          id: 'faturamento.xml',
          label: 'Envio de XML',
          icon: 'UploadCloud',
          path: '/clinica/faturamento/xml',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.xml',
        },
        {
          id: 'faturamento.retornos',
          label: 'Retornos & Recibos',
          icon: 'CheckCircle',
          path: '/clinica/faturamento/retornos',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.retornos',
        },
        {
          id: 'faturamento.lotes',
          label: 'Lotes de Envio',
          icon: 'PackageOpen',
          path: '/clinica/faturamento/lotes',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.lotes',
        },
        {
          id: 'faturamento.relatorios',
          label: 'Relatórios',
          icon: 'BarChart2',
          path: '/clinica/faturamento/relatorios',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.relatorios',
        },
      ],
    },

    // ============================
    // 8️⃣ CONFIGURAÇÕES — SETUP DO SISTEMA
    // ============================
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: 'Settings',
      path: '/clinica/configuracoes/perfis',
      roles: ['admin', 'gestor'],
      featurePath: 'configuracoes',
      children: [
        {
          id: 'configuracoes.perfis',
          label: 'Perfis de Usuário',
          icon: 'Shield',
          path: '/clinica/configuracoes/perfis',
          roles: ['admin'],
          featurePath: 'configuracoes.perfis',
        },
        {
          id: 'configuracoes.agenda',
          label: 'Agenda',
          icon: 'CalendarCog',
          path: '/clinica/configuracoes/agenda',
          roles: ['admin', 'gestor'],
          featurePath: 'configuracoes.agenda',
        },
        {
          id: 'configuracoes.estoque',
          label: 'Estoque',
          icon: 'Boxes',
          path: '/clinica/configuracoes/estoque',
          roles: ['admin', 'gestor'],
          featurePath: 'configuracoes.estoque',
        },
        {
          id: 'configuracoes.faturamento',
          label: 'Faturamento',
          icon: 'Receipt',
          path: '/clinica/configuracoes/faturamento',
          roles: ['admin', 'gestor'],
          featurePath: 'configuracoes.faturamento',
        },
      ],
    },

    // ============================
    // 9️⃣ ADMINISTRAÇÃO — SUPER ADMIN + AUDITORIA
    // ============================
    {
      id: 'administracao',
      label: 'Administração',
      icon: 'Shield',
      path: '/clinica/administracao/usuarios',
      roles: ['admin', 'gestor'],
      featurePath: 'administracao',
      children: [
        {
          id: 'administracao.usuarios',
          label: 'Usuários',
          icon: 'UsersRound',
          path: '/clinica/administracao/usuarios',
          roles: ['admin'],
          featurePath: 'administracao.usuarios',
        },
        {
          id: 'administracao.clinicas',
          label: 'Clínicas',
          icon: 'Building2',
          path: '/clinica/administracao/clinicas',
          roles: ['admin'],
          featurePath: 'administracao.clinicas',
        },
        {
          id: 'administracao.auditoria',
          label: 'Auditoria',
          icon: 'History',
          path: '/clinica/auditoria',
          roles: ['admin', 'gestor'],
          featurePath: 'administracao.auditoria',
        },
        {
          id: 'administracao.jobs',
          label: 'Agendamentos de Tarefas',
          icon: 'Clock3',
          path: '/clinica/administracao/jobs',
          roles: ['admin'],
          featurePath: 'administracao.jobs',
        },
        {
          id: 'administracao.alerts',
          label: 'Alertas',
          icon: 'Bell',
          path: '/clinica/administracao/alerts',
          roles: ['admin'],
          featurePath: 'administracao.alerts',
        },
        {
          id: 'administracao.saude',
          label: 'Saude do Sistema',
          icon: 'Activity',
          path: '/clinica/administracao/saude',
          roles: ['admin'],
          featurePath: 'administracao.saude',
        },
        {
          id: 'administracao.analytics',
          label: 'Analytics Operacional',
          icon: 'BarChart3',
          path: '/clinica/administracao/analytics',
          roles: ['admin'],
          featurePath: 'administracao.analytics',
        },
        {
          id: 'administracao.compliance',
          label: 'Compliance Operacional',
          icon: 'ShieldCheck',
          path: '/clinica/administracao/compliance',
          roles: ['admin'],
          featurePath: 'administracao.compliance',
        },
      ],
    },
  ];

  // Filtra menu por role
  return filterMenuByRole(menu, role);
}

/**
 * FUNÇÃO AUXILIAR: Filtra itens de menu por role do usuário
 * - Remove itens que o usuário não tem permissão
 * - Remove grupos vazios (sem children)
 */
function filterMenuByRole(menu, role = 'admin') {
  return menu
    .filter((item) => {
      // Se não tem roles específicas, permite admin
      if (!item.roles) {
        return role === 'admin';
      }
      return item.roles.includes(role);
    })
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children
          .filter((child) => {
            if (!child.roles) {
              return role === 'admin';
            }
            return child.roles.includes(role);
          })
          .map((child) => {
            // Filtra nível 3 (grandchildren)
            if (child.children) {
              return {
                ...child,
                children: child.children.filter((grandchild) => {
                  if (!grandchild.roles) {
                    return role === 'admin';
                  }
                  return grandchild.roles.includes(role);
                }),
              };
            }
            return child;
          })
          .filter((child) => {
            // Remove itens com children vazio
            if (child.children && child.children.length === 0) {
              return false;
            }
            return true;
          });

        return { ...item, children: filteredChildren };
      }

      return item;
    })
    .filter((item) => {
      // Remove módulos vazios (sem children ou sem paths)
      if (item.children && item.children.length === 0) {
        return false;
      }
      return true;
    });
}
