// src/AppRoutes.jsx
import React from 'react';
const EditarRecebimento = React.lazy(
  () => import('@/pages/clinica/financeiro/EditarRecebimento.jsx'),
);
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ClinicProvider } from '@/contexts/ClinicContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { resolvePermissionForPath } from '@/lib/menuPermissionCatalog';
import { ProtectedWizardRoute } from '@/components/ProtectedWizardRoute';

// Layout principal
import AppLayout from '@/components/layout/AppLayout';

// Auth
import Login from '@/pages/auth/Login';
import Register from '@/pages/Register';
import PublicHome from '@/pages/public/PublicHome';
import Checkout from '@/pages/Checkout';
import PaymentConfirmation from '@/pages/PaymentConfirmation';
import FixUserClinicPage from '@/pages/FixUserClinicPage';
import ForceLogoutPage from '@/pages/ForceLogoutPage';
import DiagnosticsPage from '@/pages/DiagnosticsPage';
import Forbidden from '@/pages/Forbidden';

// Clínica
import GeraisConfig from '@/pages/clinica/configuracoes/GeraisConfig';
import PerfisUsuarioConfig from '@/pages/clinica/configuracoes/PerfisUsuarioConfig';
import PermissoesConfig from '@/pages/clinica/configuracoes/PermissoesConfig';
import AgendaConfig from '@/pages/clinica/configuracoes/AgendaConfig';
import FaturamentoConfig from '@/pages/clinica/configuracoes/FaturamentoConfig';
import EstoqueConfig from '@/pages/clinica/configuracoes/EstoqueConfig';

// Estoque
import EstoqueProdutos from '@/pages/clinica/estoque/Produtos';
import EstoqueProdutoForm from '@/pages/clinica/estoque/ProdutoFormPage';
import EstoqueCategorias from '@/pages/clinica/estoque/Categorias';
import EstoqueCategoriaForm from '@/pages/clinica/estoque/CategoriaFormPage';
import EstoqueFornecedores from '@/pages/clinica/estoque/Fornecedores';
import EstoqueFornecedorForm from '@/pages/clinica/estoque/FornecedorFormPage';
import EstoqueMovimentacoes from '@/pages/clinica/estoque/Movimentacoes';
import EstoqueLocais from '@/pages/clinica/estoque/Locais';
import EstoqueLocalForm from '@/pages/clinica/estoque/LocalFormPage';
import EstoqueEntradas from '@/pages/clinica/estoque/Entradas';
import EstoqueSaidas from '@/pages/clinica/estoque/Saidas';
import EstoqueUnidades from '@/pages/clinica/estoque/Unidades';
import EstoqueUnidadeForm from '@/pages/clinica/estoque/UnidadeFormPage';
import EstoqueTransferencias from '@/pages/clinica/estoque/Transferencias';
import EstoqueMovimentoForm from '@/pages/clinica/estoque/MovimentoFormPage';
import EstoqueRequisicoes from '@/pages/clinica/estoque/Requisicoes';
import EstoqueRequisicaoForm from '@/pages/clinica/estoque/RequisicaoFormPage';
import EstoqueInventario from '@/pages/clinica/estoque/Inventario';
import EstoqueInventarioForm from '@/pages/clinica/estoque/InventarioFormPage';
import EstoqueRelatorios from '@/pages/clinica/estoque/Relatorios';
import AvaliacaoEstoque from '@/pages/clinica/estoque/AvaliacaoEstoque';
import DashboardEstoque from '@/pages/clinica/estoque/DashboardEstoque';

// Financeiro - removed duplicate Dashboard import, using FinanceDashboard instead
import FinanceDashboard from '@/pages/clinica/financeiro/DashboardFinanceiro';
import FinanceContasReceber from '@/pages/clinica/financeiro/ContasReceber';
import FinanceNovoRecebimento from '@/pages/clinica/financeiro/NovoRecebimento';
import FinanceFluxoCaixa from '@/pages/clinica/financeiro/FluxoCaixa';
import DREPage from '@/pages/clinica/financeiro/DRE';
import FinancePlanoContas from '@/pages/clinica/financeiro/PlanoContas';
import FinanceConciliacaoBancaria from '@/pages/clinica/financeiro/ConciliacaoBancaria';
import ChartOfAccountsPage from '@/modules/financeiro/plano-contas/pages/ChartOfAccountsPage';
import CostCenterPage from '@/modules/financeiro/centro-custo/pages/CostCenterPage';
import { FinancialAccountsPage, FinancialAccountFormPage } from '@/modules/financeiro/contas-financeiras';
// Contas a Pagar Module
import ContasApagarPage from '@/modules/financeiro/contas-pagar/pages';
import NovaContaPagarPage from '@/modules/financeiro/contas-pagar/pages/NovaContaPagarPage';
import AutorizacaoDescontos from '@/pages/clinica/financeiro/AutorizacaoDescontos';
import SolicitacoesEstorno from '@/pages/clinica/financeiro/SolicitacoesEstorno';
import CaixaIndividual from '@/pages/clinica/financeiro/CaixaIndividual';
import CaixaGerencial from '@/pages/clinica/financeiro/CaixaGerencial';
import DivergenciasAnalytics from '@/pages/clinica/financeiro/DivergenciasAnalytics';
import CartasPage from '@/pages/clinica/financeiro/CartasPage';
import CartasOperadorasPage from '@/pages/clinica/financeiro/CartasOperadorasPage';
import CartasProcessadorTaxasPage from '@/pages/clinica/financeiro/CartasProcessadorTaxasPage';
import AuditReportPage from '@/pages/clinica/financeiro/AuditReportPage'; // ✅ ETAPA D.6
import AuditoryAnalyticsDashboard from '@/pages/clinica/financeiro/AuditoryAnalyticsDashboard'; // ✅ ETAPA F.1
import ProcessadorFeesAnalytics from '@/pages/clinica/financeiro/ProcessadorFeesAnalytics';
// Motor Financeiro Enterprise
import { FinancialTransactionsPage } from '@/modules/financeiro/lancamentos';
// ETAPA 1: Integração Agenda → Financeiro
import AppointmentFinancialIntegrationConfig from '@/modules/financeiro/etapa1-integracao-agenda/AppointmentFinancialIntegrationConfig';
// Novas páginas de repasse (estrutura real)
import RepasseMedicoLayout from '@/pages/financeiro/RepasseMedicoLayout';
import RepasseEnterprisePage from '@/pages/financeiro/repasse-medico/RepasseEnterprisePage';
import DREDashboard from '@/components/financeiro/DRE/DREDashboard';
// ETAPA 6: Conciliação Inteligente
// ETAPA 8: Alertas e Automações
import AlertCenter from '@/pages/admin/AlertCenter';
import JobMonitor from '@/pages/admin/JobMonitor';
import SystemHealthPage from '@/pages/admin/SystemHealthPage';
import OperationalAnalyticsPage from '@/pages/admin/OperationalAnalyticsPage';
import OperationalCompliancePage from '@/pages/admin/OperationalCompliancePage';

// Faturamento
import GuiasPage from '@/pages/clinica/faturamento/GuiasPage';
import XMLPage from '@/pages/clinica/faturamento/XMLPage';
import RetornosPage from '@/pages/clinica/faturamento/RetornosPage';
import LotesPage from '@/pages/clinica/faturamento/LotesPage';
import RelatoriosPage from '@/pages/clinica/faturamento/RelatoriosPage';
import TISSPage from '@/pages/clinica/faturamento/TISSPage';
import FaturamentoDashboard from '@/pages/clinica/faturamento/FaturamentoDashboard';
import FaturamentoEnterprisePage from '@/pages/clinica/faturamento/FaturamentoEnterprisePage';
import CentroFiscal from '@/pages/clinica/faturamento/CentroFiscal';
import NotasFiscais from '@/pages/clinica/faturamento/NotasFiscais';
import IntegracoesFiscais from '@/pages/clinica/faturamento/IntegracoesFiscais';
import XmlPdfFiscal from '@/pages/clinica/faturamento/XmlPdfFiscal';

// Dashboards
import DashboardAtendimentos from '@/pages/clinica/dashboard/DashboardAtendimentos';
import DashboardFinanceiro from '@/pages/clinica/dashboard/DashboardFinanceiro';
import DashboardFaturamento from '@/pages/clinica/dashboard/DashboardFaturamento';

import NotFound from '@/pages/NotFound';

// ⭐ AGENDA
import AgendaPage from '@/pages/clinica/agenda/AgendaPage';
import AgendaLayout from '@/pages/clinica/agenda/layout/AgendaLayout';
import AgendaUnificada from '@/pages/clinica/agenda/views/AgendaUnificadaSimples';
import AgendaPorProfissional from '@/pages/clinica/agenda/views/AgendaPorProfissional';
import AgendaSala from '@/pages/clinica/agenda/views/AgendaSala';
import AgendaConfirmacao from '@/pages/clinica/agenda/views/AgendaConfirmacao';
import AgendaListaEspera from '@/pages/clinica/agenda/views/AgendaEspera';
import AppointmentConfirmationPage from '@/pages/clinica/agendamento/AppointmentConfirmationPage';
import AgendaRelatorios from '@/pages/clinica/agenda/views/AgendaRelatorios';
import AgendaKpis from '@/pages/clinica/agenda/views/AgendaKpis';
import AgendaNotificacoes from '@/pages/clinica/agenda/views/AgendaNotificacoes';
// 🟢 ETAPA 6: Import das páginas placeholder
import AgendaLogNotificacoes from '@/pages/clinica/agenda/views/AgendaLogNotificacoes';

// ✨ NOVA AGENDA REFATORADA - COMPONENTES
import AgendaIndexNew from '@/pages/clinica/agenda/components/index';

// 👨‍⚕️ ATENDIMENTO DO PROFISSIONAL (DESCONTINUADO - Consolidado na Página de Paciente)
// import AtendimentoProfissionalView from "@/pages/clinica/agenda/views/AtendimentoProfissionalView";

// Atendimento
import Atendimento from '@/pages/clinica/Atendimento/Atendimento';

// 👥 PACIENTES - V2 REFATORADO (SINGLE-SCREEN COM ABAS)
import PatientListPage from '@/pages/clinica/pacientes/PatientListPage';
import PatientCadastroPage from '@/pages/clinica/pacientes/PatientCadastroPage';
import PatientDetailPage from '@/pages/clinica/pacientes/PatientDetailPage';

// 📊 AUDITORIA
import AuditoriaPage from '@/pages/clinica/auditoria/AuditoriaPage';

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
import Usuarios from '@/pages/admin/Usuarios';
import NewUser from '@/pages/admin/NewUser';
import EditUser from '@/pages/admin/EditUser';
import SincronizarProfissionais from '@/pages/admin/SincronizarProfissionais';
import Clinicas from '@/pages/admin/Clinicas';
import NewClinic from '@/pages/admin/NewClinic';
import EditClinic from '@/pages/admin/EditClinic';

function getCriticalPermissionForPath(pathname) {
  return resolvePermissionForPath(pathname);
}

function CriticalPermissionRoute() {
  const { currentRole } = useAuth();
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
  const { isAuthenticated, loading } = useAuth();

  // Verificar se existe sessão customizada no localStorage
  const hasCustomSession = localStorage.getItem('gesclinic_session');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Permitir acesso se tem autenticação Supabase OU sessão customizada
  if (!isAuthenticated && !hasCustomSession) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/* 🔐 Admin Route - Only for admin users */
function AdminRoute() {
  const { isAuthenticated, loading, currentRole } = useAuth();
  const { canView, canEdit } = usePermissions();
  const location = useLocation();

  // Verificar se existe sessão customizada no localStorage
  const customSession = (() => {
    const session = localStorage.getItem('gesclinic_session');
    if (!session) {
      return null;
    }
    try {
      return JSON.parse(session);
    } catch (e) {
      return null;
    }
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar autenticação: Supabase OU sessão customizada
  const isAuthenticatedUser = isAuthenticated || !!customSession;

  if (!isAuthenticatedUser) {
    return <Navigate to="/login" replace />;
  }

  const userRole = customSession?.role || currentRole;
  const required = getCriticalPermissionForPath(location.pathname);
  const requiredPermission = required ? (typeof required === 'string' ? required : required.permission) : null;
  const requiredLevel = required ? (typeof required === 'string' ? 'view' : required.level || 'view') : 'view';
  const hasPermission =
    !requiredPermission ||
    userRole === 'admin' ||
    (requiredLevel === 'edit' ? canEdit(requiredPermission) : canView(requiredPermission));

  if (!hasPermission) {
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

  // Verificar se existe sessão customizada no localStorage
  const hasCustomSession = localStorage.getItem('gesclinic_session');

  // Se tem qualquer autenticação (Supabase ou customizada), redireciona
  if (isAuthenticated || hasCustomSession) {
    return <Navigate to="/clinica" replace />;
  }

  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/checkout" element={<Checkout />} />
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
          <Route
            path="financeiro/contas-pagar/nova"
            element={<NovaContaPagarPage />}
          />
          <Route path="financeiro/contas-pagar/:id/editar" element={<LegacyPayableEditRedirect />} />
          <Route
            path="financeiro/movimento/contas-a-pagar"
            element={<Navigate to="/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=legacy-movimento&status=open,partial,approved,overdue" replace />}
          />
          <Route
            path="financeiro/fluxo"
            element={<Navigate to="/clinica/financeiro/fluxo-caixa?section=operational&depth=details&expand=all&periodicity=monthly&scenario=consolidated&display=income_expense" replace />}
          />
          <Route
            path="financeiro/plano-contas"
            element={<ChartOfAccountsPage />}
          />
          <Route
            path="financeiro/estrutura"
            element={<Navigate to="/clinica/financeiro/contas-financeiras" replace />}
          />
          <Route path="financeiro/conciliacao-bancaria" element={<FinanceConciliacaoBancaria />} />
          <Route
            path="financeiro/conciliacao"
            element={<Navigate to="/clinica/financeiro/conciliacao-bancaria" replace />}
          />
          <Route path="financeiro/alerts" element={<AlertCenter />} />
          <Route
            path="financeiro/cartoes"
            element={<CartasPage />}
          />
          <Route
            path="financeiro/cartoes-operadoras"
            element={<CartasOperadorasPage />}
          />
          <Route
            path="financeiro/cartoes-taxas-operadoras"
            element={<CartasProcessadorTaxasPage />}
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
            element={<ProcessadorFeesAnalytics />}
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
  );
}
