// src/AppRoutes.jsx
import React from 'react';
const EditarRecebimento = React.lazy(
  () => import('@/pages/clinica/financeiro/EditarRecebimento.jsx'),
);
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { resolvePermissionForPath } from '@/lib/menuPermissionCatalog';
import { ProtectedWizardRoute } from '@/components/ProtectedWizardRoute';

// Layout principal
const AppLayout = React.lazy(() => import('@/components/layout/AppLayout'));

// Auth
const Login = React.lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = React.lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('@/pages/auth/ResetPassword'));
const Register = React.lazy(() => import('@/pages/Register'));
const CompleteRegistration = React.lazy(() => import('@/pages/auth/CompleteRegistration'));
const PublicHome = React.lazy(() => import('@/pages/public/PublicHome'));
const TermosPage = React.lazy(() => import('@/pages/public/Termos'));
const PrivacidadePage = React.lazy(() => import('@/pages/public/Privacidade'));
const CookiesPage = React.lazy(() => import('@/pages/public/Cookies'));
const Checkout = React.lazy(() => import('@/pages/Checkout'));
const PaymentConfirmation = React.lazy(() => import('@/pages/PaymentConfirmation'));
const FixUserClinicPage = React.lazy(() => import('@/pages/FixUserClinicPage'));
const ForceLogoutPage = React.lazy(() => import('@/pages/ForceLogoutPage'));
const DiagnosticsPage = React.lazy(() => import('@/pages/DiagnosticsPage'));
const Forbidden = React.lazy(() => import('@/pages/Forbidden'));

// Clínica
const GeraisConfig = React.lazy(() => import('@/pages/clinica/configuracoes/GeraisConfig'));
const PerfisUsuarioConfig = React.lazy(() => import('@/pages/clinica/configuracoes/PerfisUsuarioConfig'));
const PermissoesConfig = React.lazy(() => import('@/pages/clinica/configuracoes/PermissoesConfig'));
const AgendaConfig = React.lazy(() => import('@/pages/clinica/configuracoes/AgendaConfig'));
const FaturamentoConfig = React.lazy(() => import('@/pages/clinica/configuracoes/FaturamentoConfig'));
const EstoqueConfig = React.lazy(() => import('@/pages/clinica/configuracoes/EstoqueConfig'));

// Estoque
const EstoqueProdutos = React.lazy(() => import('@/pages/clinica/estoque/Produtos'));
const EstoqueProdutoForm = React.lazy(() => import('@/pages/clinica/estoque/ProdutoFormPage'));
const EstoqueCategorias = React.lazy(() => import('@/pages/clinica/estoque/Categorias'));
const EstoqueCategoriaForm = React.lazy(() => import('@/pages/clinica/estoque/CategoriaFormPage'));
const EstoqueFornecedores = React.lazy(() => import('@/pages/clinica/estoque/Fornecedores'));
const EstoqueFornecedorForm = React.lazy(() => import('@/pages/clinica/estoque/FornecedorFormPage'));
const EstoqueMovimentacoes = React.lazy(() => import('@/pages/clinica/estoque/Movimentacoes'));
const EstoqueLocais = React.lazy(() => import('@/pages/clinica/estoque/Locais'));
const EstoqueLocalForm = React.lazy(() => import('@/pages/clinica/estoque/LocalFormPage'));
const EstoqueEntradas = React.lazy(() => import('@/pages/clinica/estoque/Entradas'));
const EstoqueSaidas = React.lazy(() => import('@/pages/clinica/estoque/Saidas'));
const EstoqueUnidades = React.lazy(() => import('@/pages/clinica/estoque/Unidades'));
const EstoqueUnidadeForm = React.lazy(() => import('@/pages/clinica/estoque/UnidadeFormPage'));
const EstoqueTransferencias = React.lazy(() => import('@/pages/clinica/estoque/Transferencias'));
const EstoqueMovimentoForm = React.lazy(() => import('@/pages/clinica/estoque/MovimentoFormPage'));
const EstoqueRequisicoes = React.lazy(() => import('@/pages/clinica/estoque/Requisicoes'));
const EstoqueRequisicaoForm = React.lazy(() => import('@/pages/clinica/estoque/RequisicaoFormPage'));
const EstoqueInventario = React.lazy(() => import('@/pages/clinica/estoque/Inventario'));
const EstoqueInventarioForm = React.lazy(() => import('@/pages/clinica/estoque/InventarioFormPage'));
const EstoqueRelatorios = React.lazy(() => import('@/pages/clinica/estoque/Relatorios'));
const AvaliacaoEstoque = React.lazy(() => import('@/pages/clinica/estoque/AvaliacaoEstoque'));
const DashboardEstoque = React.lazy(() => import('@/pages/clinica/estoque/DashboardEstoque'));

// Financeiro - removed duplicate Dashboard import, using FinanceDashboard instead
const FinanceDashboard = React.lazy(() => import('@/pages/clinica/financeiro/DashboardFinanceiro'));
const FinanceContasReceber = React.lazy(() => import('@/pages/clinica/financeiro/ContasReceber'));
const FinanceNovoRecebimento = React.lazy(() => import('@/pages/clinica/financeiro/NovoRecebimento'));
const FinanceFluxoCaixa = React.lazy(() => import('@/pages/clinica/financeiro/FluxoCaixa'));
const DREPage = React.lazy(() => import('@/pages/clinica/financeiro/DRE'));
const FinancePlanoContas = React.lazy(() => import('@/pages/clinica/financeiro/PlanoContas'));
const FinanceConciliacaoBancaria = React.lazy(() => import('@/pages/clinica/financeiro/ConciliacaoBancaria'));
const ConciliacaoCartoes = React.lazy(() => import('@/pages/clinica/financeiro/ConciliacaoCartoes'));
const ChartOfAccountsPage = React.lazy(() => import('@/modules/financeiro/plano-contas/pages/ChartOfAccountsPage'));
const FinancialPlanPage = React.lazy(() => import('@/modules/financeiro/plano-financeiro'));
const CostCenterPage = React.lazy(() => import('@/modules/financeiro/centro-custo/pages/CostCenterPage'));
const FinancialAccountsPage = React.lazy(() => import('@/modules/financeiro/contas-financeiras')
  .then((module) => ({ default: module.FinancialAccountsPage })));
const FinancialAccountFormPage = React.lazy(() => import('@/modules/financeiro/contas-financeiras')
  .then((module) => ({ default: module.FinancialAccountFormPage })));
// Contas a Pagar Module
const ContasApagarPage = React.lazy(() => import('@/modules/financeiro/contas-pagar/pages'));
const NovaContaPagarPage = React.lazy(() => import('@/modules/financeiro/contas-pagar/pages/NovaContaPagarPage'));
const AutorizacaoDescontos = React.lazy(() => import('@/pages/clinica/financeiro/AutorizacaoDescontos'));
const SolicitacoesEstorno = React.lazy(() => import('@/pages/clinica/financeiro/SolicitacoesEstorno'));
const CaixaIndividual = React.lazy(() => import('@/pages/clinica/financeiro/CaixaIndividual'));
const CaixaGerencial = React.lazy(() => import('@/pages/clinica/financeiro/CaixaGerencial'));
const DivergenciasAnalytics = React.lazy(() => import('@/pages/clinica/financeiro/DivergenciasAnalytics'));
const CartoesConfiguracaoPage = React.lazy(() => import('@/pages/clinica/financeiro/CartoesConfiguracaoPage'));
const AuditReportPage = React.lazy(() => import('@/pages/clinica/financeiro/AuditReportPage'));
const AuditoryAnalyticsDashboard = React.lazy(() => import('@/pages/clinica/financeiro/AuditoryAnalyticsDashboard'));
// Motor Financeiro Enterprise
const FinancialTransactionsPage = React.lazy(() => import('@/modules/financeiro/lancamentos')
  .then((module) => ({ default: module.FinancialTransactionsPage })));
// ETAPA 1: Integração Agenda → Financeiro
const AppointmentFinancialIntegrationConfig = React.lazy(() => import('@/modules/financeiro/etapa1-integracao-agenda/AppointmentFinancialIntegrationConfig'));
// Novas páginas de repasse (estrutura real)
const RepasseMedicoLayout = React.lazy(() => import('@/pages/financeiro/RepasseMedicoLayout'));
const RepasseEnterprisePage = React.lazy(() => import('@/pages/financeiro/repasse-medico/RepasseEnterprisePage'));
// ETAPA 6: Conciliação Inteligente
// ETAPA 8: Alertas e Automações
const AlertCenter = React.lazy(() => import('@/pages/admin/AlertCenter'));
const JobMonitor = React.lazy(() => import('@/pages/admin/JobMonitor'));
const SystemHealthPage = React.lazy(() => import('@/pages/admin/SystemHealthPage'));
const OperationalAnalyticsPage = React.lazy(() => import('@/pages/admin/OperationalAnalyticsPage'));
const OperationalCompliancePage = React.lazy(() => import('@/pages/admin/OperationalCompliancePage'));

// Faturamento
const GuiasPage = React.lazy(() => import('@/pages/clinica/faturamento/GuiasPage'));
const XMLPage = React.lazy(() => import('@/pages/clinica/faturamento/XMLPage'));
const RetornosPage = React.lazy(() => import('@/pages/clinica/faturamento/RetornosPage'));
const LotesPage = React.lazy(() => import('@/pages/clinica/faturamento/LotesPage'));
const RelatoriosPage = React.lazy(() => import('@/pages/clinica/faturamento/RelatoriosPage'));
const TISSPage = React.lazy(() => import('@/pages/clinica/faturamento/TISSPage'));
const FaturamentoDashboard = React.lazy(() => import('@/pages/clinica/faturamento/FaturamentoDashboard'));
const FaturamentoEnterprisePage = React.lazy(() => import('@/pages/clinica/faturamento/FaturamentoEnterprisePage'));
const CentroFiscal = React.lazy(() => import('@/pages/clinica/faturamento/CentroFiscal'));
const NotasFiscais = React.lazy(() => import('@/pages/clinica/faturamento/NotasFiscais'));
const IntegracoesFiscais = React.lazy(() => import('@/pages/clinica/faturamento/IntegracoesFiscais'));
const XmlPdfFiscal = React.lazy(() => import('@/pages/clinica/faturamento/XmlPdfFiscal'));

// Dashboards
const DashboardAtendimentos = React.lazy(() => import('@/pages/clinica/dashboard/DashboardAtendimentos'));
const DashboardFinanceiro = React.lazy(() => import('@/pages/clinica/dashboard/DashboardFinanceiro'));
const DashboardFaturamento = React.lazy(() => import('@/pages/clinica/dashboard/DashboardFaturamento'));

const NotFound = React.lazy(() => import('@/pages/NotFound'));

// ⭐ AGENDA
const AgendaPage = React.lazy(() => import('@/pages/clinica/agenda/AgendaPage'));
const AgendaLayout = React.lazy(() => import('@/pages/clinica/agenda/layout/AgendaLayout'));
const AgendaUnificada = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaUnificadaSimples'));
const AgendaPorProfissional = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaPorProfissional'));
const AgendaSala = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaSala'));
const AgendaConfirmacao = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaConfirmacao'));
const AgendaListaEspera = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaEspera'));
const AppointmentConfirmationPage = React.lazy(() => import('@/pages/clinica/agendamento/AppointmentConfirmationPage'));
const AgendaRelatorios = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaRelatorios'));
const AgendaKpis = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaKpis'));
const AgendaNotificacoes = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaNotificacoes'));
// 🟢 ETAPA 6: Import das páginas placeholder
const AgendaLogNotificacoes = React.lazy(() => import('@/pages/clinica/agenda/views/AgendaLogNotificacoes'));

// ✨ NOVA AGENDA REFATORADA - COMPONENTES
const AgendaIndexNew = React.lazy(() => import('@/pages/clinica/agenda/components/index'));

// 👨‍⚕️ ATENDIMENTO DO PROFISSIONAL (DESCONTINUADO - Consolidado na Página de Paciente)
// import AtendimentoProfissionalView from "@/pages/clinica/agenda/views/AtendimentoProfissionalView";

// Atendimento
const Atendimento = React.lazy(() => import('@/pages/clinica/Atendimento/Atendimento'));

// 👥 PACIENTES - V2 REFATORADO (SINGLE-SCREEN COM ABAS)
const PatientListPage = React.lazy(() => import('@/pages/clinica/pacientes/PatientListPage'));
const PatientCadastroPage = React.lazy(() => import('@/pages/clinica/pacientes/PatientCadastroPage'));
const PatientDetailPage = React.lazy(() => import('@/pages/clinica/pacientes/PatientDetailPage'));

// 📊 AUDITORIA
const AuditoriaPage = React.lazy(() => import('@/pages/clinica/auditoria/AuditoriaPage'));

// 🏗️ BASE DO SISTEMA - NOVO MÓDULO
import {
  ServicesPage,
  ProfessionalsPage,
  RoomsPage,
  ResourcesPage,
  HealthInsurancesPage,
  AgendaRulesPage,
  RoomResourcesPage,
  ProfessionalSchedulePage,
  ServicePricesPage,
} from '@/pages/clinica/base-sistema/pages';

// Admin
const Usuarios = React.lazy(() => import('@/pages/admin/Usuarios'));
const NewUser = React.lazy(() => import('@/pages/admin/NewUser'));
const EditUser = React.lazy(() => import('@/pages/admin/EditUser'));
const SincronizarProfissionais = React.lazy(() => import('@/pages/admin/SincronizarProfissionais'));
const Clinicas = React.lazy(() => import('@/pages/admin/Clinicas'));
const NewClinic = React.lazy(() => import('@/pages/admin/NewClinic'));
const EditClinic = React.lazy(() => import('@/pages/admin/EditClinic'));

function getCriticalPermissionForPath(pathname) {
  return resolvePermissionForPath(pathname);
}

function CriticalPermissionRoute() {
  const { activeCompany } = useClinicContext();
  const currentRole = activeCompany?.role;
  const { canView, canEdit, loading } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const required = getCriticalPermissionForPath(location.pathname);

  if (required && currentRole !== 'admin') {
    const requiredPermission = typeof required === 'string' ? required : required.permission;
    const requiredLevel = typeof required === 'string' ? 'view' : required.level || 'view';
    const allowed = requiredLevel === 'edit' ? canEdit(requiredPermission) : canView(requiredPermission);

    if (!allowed) {
    return <Navigate to="/403" replace />;
    }
  }

  return <Outlet />;
}

/* 🔐 Protected Route */
function ProtectedRoute() {
  const { isAuthenticated, loading, signOut } = useAuth();
  const { activeCompany, loadingClinic } = useClinicContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loadingClinic) {
    return <div className="flex min-h-screen items-center justify-center">Verificando acesso à clínica...</div>;
  }
  if (!activeCompany) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>Você não possui acesso ativo a uma clínica.</p>
        <button type="button" onClick={() => signOut()} className="text-blue-600 underline">
          Sair
        </button>
      </div>
    );
  }

  return <Outlet />;
}

/* 🔐 Admin Route - Only for admin users */
function AdminRoute() {
  const { isAuthenticated, loading } = useAuth();
  const { activeCompany } = useClinicContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = activeCompany?.role;
  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">Você não tem permissão para acessar esta página.</p>
          <p className="text-sm text-gray-500 mb-6">Acesse a partir de uma permissão válida.</p>
          <button
            onClick={() => (window.location.href = '/clinica/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

function LegacyAdminUserEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/clinica/administracao/usuarios/editar/${id}`} replace />;
}

function LegacyAdminClinicEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/clinica/administracao/clinicas/editar/${id}`} replace />;
}

function LegacyPayableEditRedirect() {
  const { id } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('edit', id);
  if (!params.has('trace')) params.set('trace', 'legacy-editar-conta');
  return <Navigate to={`/clinica/financeiro/contas-pagar?${params.toString()}`} replace />;
}

/* 🔓 Public Route */
function PublicRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/clinica" replace />;
  }

  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <React.Suspense fallback={<div>Carregando...</div>}>
    <Routes>
      <Route path="/termos-de-uso" element={<TermosPage />} />
      <Route path="/privacidade" element={<PrivacidadePage />} />
      <Route path="/politica-de-cookies" element={<CookiesPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/complete-registration" element={<CompleteRegistration />} />
      <Route path="/termos" element={<Navigate to="/termos-de-uso" replace />} />

      {/* PUBLIC */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/fix-user-clinic" element={<FixUserClinicPage />} />
        <Route path="/403" element={<Forbidden />} />
      </Route>

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route element={<CriticalPermissionRoute />}>
          <Route path="/diagnostics" element={<DiagnosticsPage />} />

        {/* 🔴 ADMIN */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Outlet />}>
            <Route path="" element={<Navigate to="/clinica/administracao/usuarios" replace />} />
            <Route
              path="usuarios"
              element={<Navigate to="/clinica/administracao/usuarios" replace />}
            />
            <Route
              path="new-user"
              element={<Navigate to="/clinica/administracao/usuarios/novo" replace />}
            />
            <Route path="edit-user/:id" element={<LegacyAdminUserEditRedirect />} />
            <Route
              path="sincronizar-profissionais"
              element={<Navigate to="/clinica/administracao/usuarios/sincronizar" replace />}
            />
            <Route
              path="clinicas"
              element={<Navigate to="/clinica/administracao/clinicas" replace />}
            />
            <Route
              path="new-clinic"
              element={<Navigate to="/clinica/administracao/clinicas/nova" replace />}
            />
            <Route path="edit-clinic/:id" element={<LegacyAdminClinicEditRedirect />} />
          </Route>
        </Route>

        {/* 🔴 CLÍNICA */}
        <Route path="/clinica" element={<AppLayout />}>
          {/* DASHBOARD */}
          <Route path="dashboard" element={<FinanceDashboard />} />
          <Route path="dashboard/atendimentos" element={<DashboardAtendimentos />} />
          <Route path="dashboard/financeiro" element={<DashboardFinanceiro />} />
          <Route path="dashboard/faturamento" element={<DashboardFaturamento />} />

          {/* ⭐ AGENDA - VERSÃO OTIMIZADA COM INTERFACE COMPACTA */}
          <Route
            path="agenda"
            element={<AgendaIndexNew />}
          />

          {/* Rotas legadas: recepção e painéis operacionais circulam dentro da Agenda única */}
          <Route path="agenda/recepcao" element={<Navigate to="/clinica/agenda" replace />} />
          <Route path="agenda/recepcao/test" element={<Navigate to="/clinica/agenda" replace />} />

          {/* ✨ NOVA AGENDA REFATORADA - VERSÃO DE TESTE */}
          <Route
            path="agenda-novo"
            element={
              <ProtectedWizardRoute feature="agenda">
                <AgendaIndexNew />
              </ProtectedWizardRoute>
            }
          />

          {/* �🟢 ETAPA 5: Redirects para rotas antigas */}
          <Route path="agenda/profissional" element={<Navigate to="/clinica/agenda" replace />} />
          <Route path="agenda/sala" element={<Navigate to="/clinica/agenda" replace />} />
          <Route path="agenda/geral" element={<Navigate to="/clinica/agenda" replace />} />
          {/* 📱 CONFIRMAÇÃO VIA WhatsApp */}
          <Route path="agendamento/confirmar/:token" element={<AppointmentConfirmationPage />} />

          {/*
            ❌ DESCONTINUADO - Fluxo consolidado na Página de Paciente
            Antes: Agenda → AtendimentoProfissionalView → PatientDetailPage
            Agora:  Agenda → PatientDetailPage (tudo em uma página)

            <Route
              path="agenda/atendimento/:appointmentId"
              element={
                <ProtectedWizardRoute feature="agenda">
                  <AtendimentoProfissionalView />
                </ProtectedWizardRoute>
              }
            />
          */}

          {/* Sub-rotas antigas removidas: sem telas operacionais separadas */}
          <Route path="agenda/confirmacoes" element={<Navigate to="/clinica/agenda" replace />} />
          <Route path="agenda/espera" element={<Navigate to="/clinica/agenda" replace />} />
          <Route path="agenda/indicadores" element={<Navigate to="/clinica/agenda" replace />} />

          {/* CONFIGURAÇÕES */}
          <Route path="configuracoes" element={<GeraisConfig />} />
          <Route path="configuracoes/perfis" element={<PerfisUsuarioConfig />} />
          <Route path="configuracoes/permissoes" element={<PermissoesConfig />} />
          <Route path="configuracoes/agenda/*" element={<AgendaConfig />} />
          <Route path="configuracoes/faturamento" element={<FaturamentoConfig />} />
          <Route path="configuracoes/estoque" element={<EstoqueConfig />} />

          <Route element={<AdminRoute />}>
            <Route path="administracao/usuarios" element={<Usuarios embedded />} />
            <Route path="administracao/usuarios/novo" element={<NewUser />} />
            <Route path="administracao/usuarios/editar/:id" element={<EditUser />} />
            <Route
              path="administracao/usuarios/sincronizar"
              element={<SincronizarProfissionais />}
            />
            <Route path="administracao/clinicas" element={<Clinicas embedded />} />
            <Route path="administracao/clinicas/nova" element={<NewClinic />} />
            <Route path="administracao/clinicas/editar/:id" element={<EditClinic />} />
            <Route path="administracao/jobs" element={<JobMonitor />} />
            <Route path="administracao/alerts" element={<AlertCenter />} />
            <Route path="administracao/saude" element={<SystemHealthPage />} />
            <Route path="administracao/analytics" element={<OperationalAnalyticsPage />} />
            <Route path="administracao/compliance" element={<OperationalCompliancePage />} />
          </Route>

          {/* ESTOQUE */}
          <Route path="estoque" element={<DashboardEstoque />} />
          <Route path="estoque/dashboard" element={<DashboardEstoque />} />
          <Route path="estoque/produtos" element={<EstoqueProdutos />} />
          <Route path="estoque/produtos/novo" element={<EstoqueProdutoForm />} />
          <Route path="estoque/produtos/editar/:id" element={<EstoqueProdutoForm />} />
          <Route path="estoque/categorias" element={<EstoqueCategorias />} />
          <Route path="estoque/categorias/nova" element={<EstoqueCategoriaForm />} />
          <Route path="estoque/categorias/editar/:id" element={<EstoqueCategoriaForm />} />
          <Route path="estoque/fornecedores" element={<EstoqueFornecedores />} />
          <Route path="estoque/fornecedores/novo" element={<EstoqueFornecedorForm />} />
          <Route path="estoque/fornecedores/editar/:id" element={<EstoqueFornecedorForm />} />
          <Route path="estoque/movimentacoes" element={<EstoqueMovimentacoes />} />
          <Route path="estoque/locais" element={<EstoqueLocais />} />
          <Route path="estoque/locais/novo" element={<EstoqueLocalForm />} />
          <Route path="estoque/locais/editar/:id" element={<EstoqueLocalForm />} />
          <Route path="estoque/depositos" element={<EstoqueLocais />} />
          <Route path="estoque/entradas" element={<EstoqueEntradas />} />
          <Route path="estoque/entradas/nova" element={<EstoqueMovimentoForm kind="entrada" />} />
          <Route path="estoque/entradas/editar/:id" element={<EstoqueMovimentoForm kind="entrada" />} />
          <Route path="estoque/saidas" element={<EstoqueSaidas />} />
          <Route path="estoque/saidas/nova" element={<EstoqueMovimentoForm kind="saida" />} />
          <Route path="estoque/saidas/editar/:id" element={<EstoqueMovimentoForm kind="saida" />} />
          <Route path="estoque/unidades" element={<EstoqueUnidades />} />
          <Route path="estoque/unidades/nova" element={<EstoqueUnidadeForm />} />
          <Route path="estoque/unidades/editar/:id" element={<EstoqueUnidadeForm />} />
          <Route path="estoque/transferencias" element={<EstoqueTransferencias />} />
          <Route path="estoque/transferencias/nova" element={<EstoqueMovimentoForm kind="transferencia" />} />
          <Route path="estoque/requisicoes" element={<EstoqueRequisicoes />} />
          <Route path="estoque/requisicoes/nova" element={<EstoqueRequisicaoForm />} />
          <Route path="estoque/inventario" element={<EstoqueInventario />} />
          <Route path="estoque/inventario/novo" element={<EstoqueInventarioForm />} />
          <Route path="estoque/avaliacao" element={<AvaliacaoEstoque />} />
          <Route path="estoque/relatorios" element={<EstoqueRelatorios />} />

          {/* FINANCEIRO */}
          <Route
            path="financeiro"
            element={
              <ProtectedWizardRoute feature="financeiro">
                <FinanceDashboard />
              </ProtectedWizardRoute>
            }
          />
          <Route
            path="financeiro/dashboard"
            element={
              <ProtectedWizardRoute feature="financeiro">
                <FinanceDashboard />
              </ProtectedWizardRoute>
            }
          />
          <Route path="financeiro/dre" element={<Navigate to="/clinica/financeiro/resultado" replace />} />
          <Route path="financeiro/caixa" element={<CaixaIndividual />} />
          <Route path="financeiro/caixa-gerencial" element={<CaixaGerencial />} />
          <Route path="financeiro/divergencias" element={<DivergenciasAnalytics />} />
          <Route path="financeiro/resultado" element={<DREPage />} />
          <Route path="financeiro/receber" element={<FinanceContasReceber />} />
          <Route path="financeiro/contas-receber" element={<FinanceContasReceber />} />
          <Route
            path="financeiro/movimento/contas-a-receber"
            element={<Navigate to="/clinica/financeiro/receber?from=fluxo-caixa&trace=legacy-movimento&status=open" replace />}
          />
          <Route path="financeiro/receber/nova" element={<FinanceNovoRecebimento />} />
          <Route
            path="financeiro/receber/:id/editar"
            element={
              <React.Suspense fallback={<div>Carregando...</div>}>
                <EditarRecebimento />
              </React.Suspense>
            }
          />
          <Route path="financeiro/fluxo-caixa" element={<FinanceFluxoCaixa />} />
          <Route path="financeiro/contas-pagar" element={<ContasApagarPage />} />
          <Route path="financeiro/pagar" element={<Navigate to="/clinica/financeiro/contas-pagar" replace />} />
          <Route
            path="financeiro/contas-pagar/nova"
            element={<NovaContaPagarPage />}
          />
          <Route path="financeiro/pagar/nova" element={<Navigate to="/clinica/financeiro/contas-pagar/nova" replace />} />
          <Route path="financeiro/pagar/:id/editar" element={<LegacyPayableEditRedirect />} />
          <Route path="financeiro/contas-pagar/:id/editar" element={<LegacyPayableEditRedirect />} />
          <Route
            path="financeiro/movimento/contas-a-pagar"
            element={<Navigate to="/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=legacy-movimento&status=open,partial,approved,overdue" replace />}
          />
          <Route
            path="financeiro/fluxo"
            element={<Navigate to="/clinica/financeiro/fluxo-caixa?section=operational&depth=groups&periodicity=monthly&scenario=consolidated&display=income_expense" replace />}
          />
          <Route
            path="financeiro/plano-contas"
            element={<ChartOfAccountsPage />}
          />
          <Route
            path="financeiro/plano-financeiro"
            element={<FinancialPlanPage />}
          />
          <Route
            path="financeiro/estrutura"
            element={<Navigate to="/clinica/financeiro/plano-financeiro" replace />}
          />
          <Route path="financeiro/conciliacao-bancaria" element={<FinanceConciliacaoBancaria />} />
          <Route
            path="financeiro/conciliacao"
            element={<Navigate to="/clinica/financeiro/conciliacao-bancaria" replace />}
          />
          <Route path="financeiro/conciliacao-cartoes" element={<ConciliacaoCartoes />} />
          <Route path="financeiro/alerts" element={<AlertCenter />} />
          <Route
            path="financeiro/cartoes"
            element={<CartoesConfiguracaoPage />}
          />
          <Route
            path="financeiro/cartoes-operadoras"
            element={<Navigate to="/clinica/financeiro/cartoes?tab=operadoras" replace />}
          />
          <Route
            path="financeiro/cartoes-taxas-operadoras"
            element={<Navigate to="/clinica/financeiro/cartoes?tab=taxas" replace />}
          />
          {/* ✅ ETAPA D.6: Rota de Auditoria */}
          <Route
            path="financeiro/auditoria"
            element={<AuditReportPage />}
          />
          {/* ✅ ETAPA F.1: Analytics de Auditoria */}
          <Route
            path="financeiro/auditoria-analytics"
            element={<AuditoryAnalyticsDashboard />}
          />
          <Route
            path="financeiro/cartoes-analytics"
            element={<Navigate to="/clinica/financeiro/cartoes?tab=analytics" replace />}
          />
          {/* ETAPA 1: Integração Agenda → Financeiro */}
          <Route
            path="financeiro/etapa1-integracao-agenda"
            element={<AppointmentFinancialIntegrationConfig />}
          />
          <Route path="financeiro/autorizacoes-descontos" element={<AutorizacaoDescontos />} />
          <Route path="financeiro/solicitacoes-estorno" element={<SolicitacoesEstorno />} />
          <Route path="financeiro/repasse/*" element={<RepasseMedicoLayout />}>
            <Route index element={<Navigate to="dashboard-executivo" replace />} />
            <Route path=":section" element={<RepasseEnterprisePage />} />
            <Route path=":section/:scope" element={<RepasseEnterprisePage />} />
          </Route>
          <Route
            path="financeiro/repasse/medico"
            element={<Navigate to="/clinica/financeiro/repasse/dashboard-executivo" replace />}
          />
          <Route
            path="financeiro/repasse-medico"
            element={<Navigate to="/clinica/financeiro/repasse/dashboard-executivo" replace />}
          />
          <Route
            path="repasse"
            element={<Navigate to="/clinica/financeiro/repasse/dashboard-executivo" replace />}
          />
          <Route path="financeiro/centro-custos" element={<CostCenterPage />} />
          <Route path="financeiro/contas-financeiras/nova" element={<FinancialAccountFormPage />} />
          <Route path="financeiro/contas-financeiras/:accountId/editar" element={<FinancialAccountFormPage />} />
          <Route path="financeiro/contas-financeiras" element={<FinancialAccountsPage />} />
          <Route path="financeiro/lancamentos" element={<FinancialTransactionsPage />} />

          {/* FATURAMENTO */}
          <Route path="faturamento" element={<Navigate to="/clinica/faturamento/dashboard" replace />} />
          <Route path="faturamento/dashboard" element={<FaturamentoDashboard />} />
          <Route path="faturamento/centro-fiscal" element={<CentroFiscal />} />
          <Route path="faturamento/notas-fiscais" element={<NotasFiscais />} />
          <Route path="faturamento/xml-pdf" element={<XmlPdfFiscal />} />
          <Route path="faturamento/integracoes-fiscais" element={<IntegracoesFiscais />} />
          <Route path="faturamento/producao" element={<FaturamentoEnterprisePage page="producao" />} />
          <Route path="faturamento/atendimentos" element={<FaturamentoEnterprisePage page="atendimentos" />} />
          <Route path="faturamento/convenios" element={<FaturamentoEnterprisePage page="convenios" />} />
          <Route path="faturamento/guias" element={<GuiasPage />} />
          <Route path="faturamento/lotes-faturamento" element={<LotesPage />} />
          <Route path="faturamento/xml" element={<XMLPage />} />
          <Route path="faturamento/retornos" element={<RetornosPage />} />
          <Route path="faturamento/lotes" element={<LotesPage />} />
          <Route path="faturamento/auditoria" element={<FaturamentoEnterprisePage page="auditoria" />} />
          <Route path="faturamento/forecast" element={<FaturamentoEnterprisePage page="forecast" />} />
          <Route path="faturamento/inteligencia" element={<FaturamentoEnterprisePage page="inteligencia" />} />
          <Route path="faturamento/pendencias" element={<FaturamentoEnterprisePage page="pendencias" />} />
          <Route path="faturamento/relatorios" element={<RelatoriosPage />} />
          <Route path="faturamento/configuracoes" element={<Navigate to="/clinica/configuracoes/faturamento" replace />} />
          <Route path="faturamento/tiss" element={<TISSPage />} />

          {/* OUTRAS */}
          {/* 👥 PACIENTES - V2: SINGLE-SCREEN COM ABAS INTERNAS */}
          <Route path="pacientes" element={<Outlet />}>
            <Route index element={<PatientListPage />} />
            <Route path="novo" element={<PatientCadastroPage />} />
            <Route path=":patientId" element={<PatientDetailPage />} />
          </Route>
          <Route path="atendimento/:id" element={<Atendimento />} />

          {/* 📊 AUDITORIA */}
          <Route path="auditoria" element={<AuditoriaPage />} />

          {/* 🏗️ BASE DO SISTEMA - NOVO MÓDULO */}
          {/* Rota padrão - redireciona para Serviços */}
          <Route
            path="base-sistema"
            element={<Navigate to="/clinica/base-sistema/servicos" replace />}
          />

          {/* 4.1 Cadastros Estruturais */}
          <Route path="base-sistema/servicos" element={<ServicesPage />} />
          <Route path="base-sistema/profissionais" element={<ProfessionalsPage />} />
          <Route path="base-sistema/convenios" element={<HealthInsurancesPage />} />
          <Route path="base-sistema/salas" element={<RoomsPage />} />
          <Route path="base-sistema/recursos" element={<ResourcesPage />} />

          {/* 4.2 Regras Operacionais */}
          <Route path="base-sistema/agenda-rules" element={<AgendaRulesPage />} />
          <Route path="base-sistema/room-resources" element={<RoomResourcesPage />} />
          <Route path="base-sistema/professional-schedule" element={<ProfessionalSchedulePage />} />

          {/* 4.3 Parâmetros Financeiros */}
          <Route path="base-sistema/service-prices" element={<ServicePricesPage />} />

          {/* DEFAULT */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </Route>
      </Route>

      {/* ROOT */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </React.Suspense>
  );
}
