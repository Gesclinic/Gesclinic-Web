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
  medico: ['dashboard', 'agenda', 'agenda.agenda', 'pacientes.*'],
  recepcao: ['dashboard', 'agenda.*', 'pacientes.*', 'financeiro.caixa'],
};

export function getMenuItems(role = 'admin', options = {}) {
  const { canView, enablePermissionFilter = false } = options;
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
    // Agenda única: sem submenus operacionais separados.
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
          featurePath: 'cadastros_basicos.servicos',
        },
        {
          id: 'cadastros_basicos.profissionais',
          label: 'Profissionais',
          path: '/clinica/base-sistema/profissionais',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos.profissionais',
        },
        {
          id: 'cadastros_basicos.salas',
          label: 'Salas',
          path: '/clinica/base-sistema/salas',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos.salas',
        },
        {
          id: 'cadastros_basicos.recursos',
          label: 'Recursos',
          path: '/clinica/base-sistema/recursos',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos.recursos',
        },
        {
          id: 'cadastros_basicos.convenios',
          label: 'Convênios',
          path: '/clinica/base-sistema/convenios',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos.convenios',
        },
        {
          id: 'cadastros_basicos.tabela_precos',
          label: 'Tabela de Preços',
          path: '/clinica/base-sistema/service-prices',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos.tabela_precos',
        },
        {
          id: 'cadastros_basicos.salas_servicos',
          label: 'Salas × Serviços',
          path: '/clinica/base-sistema/room-resources',
          roles: ['admin', 'gestor'],
          featurePath: 'cadastros_basicos.salas_servicos',
        },
      ],
    },

    // ============================
    // 5️⃣ FINANCEIRO — CONTROLE ECONÔMICO
    // ============================
    // 🎯 REORGANIZAÇÃO: Estrutura simplificada com foco em integração Agenda → Caixa → Lançamentos → DRE
    // Reorganizado em 5 grupos: Dashboard, Movimento, Estrutura, Análise, Especiais
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: 'Wallet',
      path: '/clinica/financeiro',
      roles: ['admin', 'gestor', 'financeiro', 'recepcao'],
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

        {
          id: 'financeiro.controle_caixa',
          label: 'Controle de Caixa',
          icon: 'Landmark',
          path: '/clinica/financeiro/caixa-gerencial',
          roles: ['admin', 'gestor', 'financeiro', 'recepcao'],
          featurePath: 'financeiro.controle_caixa',
          children: [
            {
              id: 'financeiro.caixa',
              label: 'Caixa Diário',
              icon: 'WalletCards',
              path: '/clinica/financeiro/caixa',
              roles: ['admin', 'gestor', 'financeiro', 'recepcao'],
              featurePath: 'financeiro.caixa',
            },
            {
              id: 'financeiro.caixa_geral',
              label: 'Caixa Gerencial',
              icon: 'Landmark',
              path: '/clinica/financeiro/caixa-gerencial',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.caixa_geral',
            },
            {
              id: 'financeiro.divergencias',
              label: 'Análise de Divergências',
              icon: 'TrendingDown',
              path: '/clinica/financeiro/divergencias',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.divergencias',
            },
          ],
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
              id: 'financeiro.autorizacoes_descontos',
              label: 'Autorização de Descontos',
              icon: 'ShieldCheck',
              path: '/clinica/financeiro/autorizacoes-descontos',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.autorizacoes_descontos',
            },
            {
              id: 'financeiro.solicitacoes_estorno',
              label: 'Solicitações de Estorno',
              icon: 'RotateCcw',
              path: '/clinica/financeiro/solicitacoes-estorno',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.estorno',
            },
            {
              id: 'financeiro.lancamentos',
              label: 'Lançamentos',
              icon: 'Book',
              path: '/clinica/financeiro/lancamentos',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.lancamentos',
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
              id: 'financeiro.receber',
              label: 'Contas a Receber',
              icon: 'TrendingUp',
              path: '/clinica/financeiro/receber',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.receber',
            },
            {
              id: 'financeiro.fluxo',
              label: 'Fluxo de Caixa',
              icon: 'LineChart',
              path: '/clinica/financeiro/fluxo-caixa?section=operational&depth=details&expand=all&periodicity=monthly&scenario=consolidated&display=income_expense',
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
              label: 'Contas Financeiras',
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
              featurePath: 'financeiro.auditoria_taxas',
            },
            {
              id: 'financeiro.auditoria-analytics',
              label: 'Analytics',
              icon: 'BarChart3',
              path: '/clinica/financeiro/auditoria-analytics',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.auditoria_analytics',
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
              id: 'financeiro.conciliacao',
              label: 'Conciliação Bancária',
              icon: 'Banknote',
              path: '/clinica/financeiro/conciliacao-bancaria',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.conciliacao',
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
          path: '/clinica/financeiro/repasse/dashboard-executivo',
          roles: ['admin', 'gestor', 'medico'],
          featurePath: 'financeiro.repasse',
          children: [
            {
              id: 'financeiro.repasse.dashboard_executivo',
              label: 'Dashboard Executivo',
              icon: 'LayoutDashboard',
              path: '/clinica/financeiro/repasse/dashboard-executivo',
              roles: ['admin', 'gestor', 'medico'],
              featurePath: 'financeiro.repasse.dashboard_executivo',
            },
            {
              id: 'financeiro.repasse.producao_medica',
              label: 'Produção Médica',
              icon: 'Stethoscope',
              path: '/clinica/financeiro/repasse/producao-medica',
              roles: ['admin', 'gestor', 'medico'],
              featurePath: 'financeiro.repasse.producao_medica',
            },
            {
              id: 'financeiro.repasse.calculo_repasse',
              label: 'Cálculo de Repasse',
              icon: 'Calculator',
              path: '/clinica/financeiro/repasse/calculo-repasse',
              roles: ['admin', 'gestor', 'medico'],
              featurePath: 'financeiro.repasse.calculo_repasse',
            },
            {
              id: 'financeiro.repasse.regras',
              label: 'Regras de Repasse',
              icon: 'SlidersHorizontal',
              path: '/clinica/financeiro/repasse/regras',
              roles: ['admin', 'gestor'],
              featurePath: 'financeiro.repasse.regras',
              children: [
                {
                  id: 'financeiro.repasse.regras.individual',
                  label: 'Individual',
                  icon: 'User',
                  path: '/clinica/financeiro/repasse/regras/individual',
                  roles: ['admin', 'gestor'],
                  featurePath: 'financeiro.repasse.regras.individual',
                },
                {
                  id: 'financeiro.repasse.regras.especialidade',
                  label: 'Especialidade',
                  icon: 'BadgePlus',
                  path: '/clinica/financeiro/repasse/regras/especialidade',
                  roles: ['admin', 'gestor'],
                  featurePath: 'financeiro.repasse.regras.especialidade',
                },
                {
                  id: 'financeiro.repasse.regras.convenio',
                  label: 'Convênio',
                  icon: 'Handshake',
                  path: '/clinica/financeiro/repasse/regras/convenio',
                  roles: ['admin', 'gestor'],
                  featurePath: 'financeiro.repasse.regras.convenio',
                },
                {
                  id: 'financeiro.repasse.regras.procedimento',
                  label: 'Procedimento',
                  icon: 'Activity',
                  path: '/clinica/financeiro/repasse/regras/procedimento',
                  roles: ['admin', 'gestor'],
                  featurePath: 'financeiro.repasse.regras.procedimento',
                },
              ],
            },
            {
              id: 'financeiro.repasse.contas_pagar_medicas',
              label: 'Contas a Pagar Médicas',
              icon: 'Wallet',
              path: '/clinica/financeiro/repasse/contas-pagar-medicas',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.contas_pagar_medicas',
            },
            {
              id: 'financeiro.repasse.aprovacoes',
              label: 'Aprovações',
              icon: 'CheckCheck',
              path: '/clinica/financeiro/repasse/aprovacoes',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.aprovacoes',
            },
            {
              id: 'financeiro.repasse.glosas_impacto',
              label: 'Glosas e Impacto',
              icon: 'BadgeAlert',
              path: '/clinica/financeiro/repasse/glosas-impacto',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.glosas_impacto',
            },
            {
              id: 'financeiro.repasse.analytics',
              label: 'Analytics',
              icon: 'BarChart3',
              path: '/clinica/financeiro/repasse/analytics',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.analytics',
            },
            {
              id: 'financeiro.repasse.rentabilidade',
              label: 'Rentabilidade Médica',
              icon: 'TrendingUp',
              path: '/clinica/financeiro/repasse/rentabilidade',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.rentabilidade',
            },
            {
              id: 'financeiro.repasse.simulacoes',
              label: 'Simulações',
              icon: 'FlaskConical',
              path: '/clinica/financeiro/repasse/simulacoes',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.simulacoes',
            },
            {
              id: 'financeiro.repasse.contas_bancarias',
              label: 'Contas Bancárias',
              icon: 'Building2',
              path: '/clinica/financeiro/repasse/contas-bancarias',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.contas_bancarias',
            },
            {
              id: 'financeiro.repasse.automacoes',
              label: 'Automações',
              icon: 'Bot',
              path: '/clinica/financeiro/repasse/automacoes',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.automacoes',
            },
            {
              id: 'financeiro.repasse.auditoria',
              label: 'Auditoria',
              icon: 'ShieldCheck',
              path: '/clinica/financeiro/repasse/auditoria',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'financeiro.repasse.auditoria',
            },
          ],
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
          id: 'estoque.avaliacao',
          label: 'Avaliação de Estoque',
          icon: 'TrendingUp',
          path: '/clinica/estoque/avaliacao',
          roles: ['admin', 'gestor'],
          featurePath: 'estoque.avaliacao',
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
          label: 'Dashboard 360',
          icon: 'BarChart3',
          path: '/clinica/faturamento/dashboard',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.dashboard',
        },
        {
          id: 'faturamento.centro_fiscal',
          label: 'Centro Fiscal',
          icon: 'ReceiptText',
          path: '/clinica/faturamento/centro-fiscal',
          roles: ['admin', 'gestor', 'financeiro'],
          featurePath: 'faturamento.centro_fiscal',
          children: [
            {
              id: 'faturamento.centro_fiscal.emissao',
              label: 'Emissão Inteligente',
              icon: 'Send',
              path: '/clinica/faturamento/centro-fiscal',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'faturamento.centro_fiscal',
            },
            {
              id: 'faturamento.centro_fiscal.notas',
              label: 'Notas Fiscais',
              icon: 'FileText',
              path: '/clinica/faturamento/notas-fiscais',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'faturamento.centro_fiscal',
            },
            {
              id: 'faturamento.centro_fiscal.xml_pdf',
              label: 'XML e PDF',
              icon: 'FileArchive',
              path: '/clinica/faturamento/xml-pdf',
              roles: ['admin', 'gestor', 'financeiro'],
              featurePath: 'faturamento.centro_fiscal',
            },
            {
              id: 'faturamento.centro_fiscal.integracoes',
              label: 'Integrações Fiscais',
              icon: 'PlugZap',
              path: '/clinica/faturamento/integracoes-fiscais',
              roles: ['admin', 'gestor'],
              featurePath: 'faturamento.centro_fiscal',
            },
          ],
        },
        {
          id: 'faturamento.producao',
          label: 'Produção Assistencial',
          icon: 'TrendingUp',
          path: '/clinica/faturamento/producao',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.producao',
        },
        {
          id: 'faturamento.atendimentos',
          label: 'Atendimentos Faturáveis',
          icon: 'Workflow',
          path: '/clinica/faturamento/atendimentos',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.atendimentos',
        },
        {
          id: 'faturamento.convenios',
          label: 'Faturamento Convênios',
          icon: 'Building2',
          path: '/clinica/faturamento/convenios',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.convenios',
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
          id: 'faturamento.lotes_faturamento',
          label: 'Lotes de Faturamento',
          icon: 'PackageOpen',
          path: '/clinica/faturamento/lotes-faturamento',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.lotes_faturamento',
        },
        {
          id: 'faturamento.xml',
          label: 'Envio XML',
          icon: 'UploadCloud',
          path: '/clinica/faturamento/xml',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.xml',
        },
        {
          id: 'faturamento.retornos',
          label: 'Retornos e Glosas',
          icon: 'CheckCircle',
          path: '/clinica/faturamento/retornos',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.retornos',
        },
        {
          id: 'faturamento.auditoria',
          label: 'Auditoria de Faturamento',
          icon: 'ShieldCheck',
          path: '/clinica/faturamento/auditoria',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.auditoria',
        },
        {
          id: 'faturamento.forecast',
          label: 'Forecast Financeiro',
          icon: 'CalendarClock',
          path: '/clinica/faturamento/forecast',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.forecast',
        },
        {
          id: 'faturamento.inteligencia',
          label: 'Inteligência Operacional',
          icon: 'Bot',
          path: '/clinica/faturamento/inteligencia',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.inteligencia',
        },
        {
          id: 'faturamento.pendencias',
          label: 'Central de Pendências',
          icon: 'AlertTriangle',
          path: '/clinica/faturamento/pendencias',
          roles: ['admin', 'gestor'],
          featurePath: 'faturamento.pendencias',
        },
        {
          id: 'faturamento.relatorios',
          label: 'Relatórios Operacionais',
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
  return filterMenuByRole(menu, role, { canView, enablePermissionFilter });
}

/**
 * FUNÇÃO AUXILIAR: Filtra itens de menu por role do usuário
 * - Remove itens que o usuário não tem permissão
 * - Remove grupos vazios (sem children)
 */
function filterMenuByRole(menu, role = 'admin', options = {}) {
  const { canView, enablePermissionFilter = false } = options;

  const isAllowedByRole = (item) => {
    if (!item.roles) {
      return role === 'admin';
    }
    return item.roles.includes(role);
  };

  const isAllowedByPermission = (item) => {
    if (!enablePermissionFilter) {
      return true;
    }
    if (typeof canView !== 'function') {
      return true;
    }
    if (!item.featurePath) {
      return true;
    }
    return canView(item.featurePath);
  };

  const walk = (items) => {
    return items.reduce((acc, item) => {
      if (!isAllowedByRole(item)) {
        return acc;
      }

      const filteredChildren = item.children ? walk(item.children) : undefined;
      const hasVisibleChildren = Array.isArray(filteredChildren) && filteredChildren.length > 0;
      const currentItemAllowed = isAllowedByPermission(item);

      if (!currentItemAllowed && !hasVisibleChildren) {
        return acc;
      }

      const nextItem = { ...item };
      if (item.children) {
        nextItem.children = filteredChildren || [];
      }

      acc.push(nextItem);
      return acc;
    }, []);
  };

  return walk(menu);
}
