// src/AppRoutes.jsx
import React from "react";
const EditarRecebimento = React.lazy(() => import("@/pages/clinica/financeiro/EditarRecebimento.jsx"));
import { Routes, Route, Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { ClinicProvider } from "@/contexts/ClinicContext";
import { ProtectedWizardRoute } from "@/components/ProtectedWizardRoute";

// Layout principal
import AppLayout from "@/components/layout/AppLayout";

// Auth
import Login from "@/pages/auth/Login";
import Register from "@/pages/Register";
import PublicHome from "@/pages/public/PublicHome";
import Checkout from "@/pages/Checkout";
import PaymentConfirmation from "@/pages/PaymentConfirmation";
import FixUserClinicPage from "@/pages/FixUserClinicPage";
import ForceLogoutPage from "@/pages/ForceLogoutPage";
import DiagnosticsPage from "@/pages/DiagnosticsPage";

// Clínica
import Dashboard from "@/pages/clinica/financeiro/DashboardFinanceiro";
import GeraisConfig from "@/pages/clinica/configuracoes/GeraisConfig";
import PerfisUsuarioConfig from "@/pages/clinica/configuracoes/PerfisUsuarioConfig";
import PermissoesConfig from "@/pages/clinica/configuracoes/PermissoesConfig";
import AgendaConfig from "@/pages/clinica/configuracoes/AgendaConfig";
import ContaConfig from "@/pages/clinica/configuracoes/ContaConfig";
import FaturamentoConfig from "@/pages/clinica/configuracoes/FaturamentoConfig";
import EstoqueConfig from "@/pages/clinica/configuracoes/EstoqueConfig";

// Estoque
import EstoqueProdutos from "@/pages/clinica/estoque/Produtos";
import EstoqueCategorias from "@/pages/clinica/estoque/Categorias";
import EstoqueFornecedores from "@/pages/clinica/estoque/Fornecedores";
import EstoqueMovimentacoes from "@/pages/clinica/estoque/Movimentacoes";
import EstoqueLocais from "@/pages/clinica/estoque/Locais";
import EstoqueEntradas from "@/pages/clinica/estoque/Entradas";
import EstoqueSaidas from "@/pages/clinica/estoque/Saidas";
import EstoqueUnidades from "@/pages/clinica/estoque/Unidades";
import EstoqueTransferencias from "@/pages/clinica/estoque/Transferencias";
import EstoqueRequisicoes from "@/pages/clinica/estoque/Requisicoes";
import EstoqueInventario from "@/pages/clinica/estoque/Inventario";
import EstoqueRelatorios from "@/pages/clinica/estoque/Relatorios";
import DashboardEstoque from "@/pages/clinica/estoque/DashboardEstoque";

// Financeiro
import FinanceDashboard from "@/pages/clinica/financeiro/DashboardFinanceiro";
import FinanceContasPagar from "@/pages/clinica/financeiro/ContasPagar";
import FinanceNovaConta from "@/pages/clinica/financeiro/NovaConta";
import FinanceEditarConta from "@/pages/clinica/financeiro/EditarConta";
import FinanceContasReceber from "@/pages/clinica/financeiro/ContasReceber";
import FinanceNovoRecebimento from "@/pages/clinica/financeiro/NovoRecebimento";
import FinanceFluxoCaixa from "@/pages/clinica/financeiro/FluxoCaixa";
import FinancePlanoContas from "@/pages/clinica/financeiro/PlanoContas";
import CentroCustosLayout from "@/pages/clinica/financeiro/custos/CentroCustosLayout";
import CentroCustosOverview from "@/pages/clinica/financeiro/custos/Overview";
import CentroCustosCadastro from "@/pages/clinica/financeiro/custos/Cadastro";
import CentroCustosHierarquia from "@/pages/clinica/financeiro/custos/Hierarquia";
import CentroCustosVinculacoes from "@/pages/clinica/financeiro/custos/Vinculacoes";
import CentroCustosRateio from "@/pages/clinica/financeiro/custos/Rateio";
import CentroCustosAnalises from "@/pages/clinica/financeiro/custos/Analises";
import CentroCustosConfig from "@/pages/clinica/financeiro/custos/Config";
import FinanceConciliacaoBancaria from "@/pages/clinica/financeiro/ConciliacaoBancaria";
import FinanceAutomacaoFinanceira from "@/pages/clinica/financeiro/AutomacaoFinanceira";
import AutorizacaoDescontos from "@/pages/clinica/financeiro/AutorizacaoDescontos";
import DashboardDRE from "@/pages/clinica/financeiro/DashboardDRE";
import CaixaIndividual from "@/pages/clinica/financeiro/CaixaIndividual";
import CaixaGerencial from "@/pages/clinica/financeiro/CaixaGerencial";
// Novas páginas de repasse (estrutura real)
import RepasseMedicoLayout from "@/pages/financeiro/RepasseMedicoLayout";
import RepasseMedicoPage from "@/pages/financeiro/RepasseMedicoPage";
import RepasseRegrasPage from "@/pages/financeiro/RepasseRegrasPage";
import RepasseDashboardAnalyticsPage from "@/pages/financeiro/RepasseDashboardAnalyticsPage";
import RepasseAutomacaoPage from "@/pages/financeiro/RepasseAutomacaoPage";

// Faturamento
import FaturamentoPage from "@/pages/clinica/faturamento/FaturamentoPage";
import GuiasPage from "@/pages/clinica/faturamento/GuiasPage";
import XMLPage from "@/pages/clinica/faturamento/XMLPage";
import RetornosPage from "@/pages/clinica/faturamento/RetornosPage";
import LotesPage from "@/pages/clinica/faturamento/LotesPage";
import RelatoriosPage from "@/pages/clinica/faturamento/RelatoriosPage";
import TISSPage from "@/pages/clinica/faturamento/TISSPage";

// Dashboards
import DashboardAtendimentos from "@/pages/clinica/dashboard/DashboardAtendimentos";
import DashboardFinanceiro from "@/pages/clinica/dashboard/DashboardFinanceiro";
import DashboardFaturamento from "@/pages/clinica/dashboard/DashboardFaturamento";

import NotFound from "@/pages/NotFound";

// ⭐ AGENDA
import AgendaPage from "@/pages/clinica/agenda/AgendaPage";
import AgendaLayout from "@/pages/clinica/agenda/layout/AgendaLayout";
import AgendaUnificada from "@/pages/clinica/agenda/views/AgendaUnificadaSimples";
import AgendaPorProfissional from "@/pages/clinica/agenda/views/AgendaPorProfissional";
import AgendaSala from "@/pages/clinica/agenda/views/AgendaSala";
import AgendaConfirmacao from "@/pages/clinica/agenda/views/AgendaConfirmacao";
import AgendaListaEspera from "@/pages/clinica/agenda/views/AgendaEspera";
import AppointmentConfirmationPage from "@/pages/clinica/agendamento/AppointmentConfirmationPage";
import AgendaRelatorios from "@/pages/clinica/agenda/views/AgendaRelatorios";
import AgendaKpis from "@/pages/clinica/agenda/views/AgendaKpis";
import AgendaNotificacoes from "@/pages/clinica/agenda/views/AgendaNotificacoes";
// 🟢 ETAPA 6: Import das páginas placeholder
import AgendaConfirmacoes from "@/pages/clinica/agenda/AgendaConfirmacoes";
import AgendaEspera from "@/pages/clinica/agenda/AgendaEspera";
import AgendaIndicadores from "@/pages/clinica/agenda/AgendaIndicadores";
import AgendaLogNotificacoes from "@/pages/clinica/agenda/views/AgendaLogNotificacoes";

// ✨ NOVA AGENDA REFATORADA - COMPONENTES
import AgendaIndexNew from "@/pages/clinica/agenda/components/index";

// 👨‍⚕️ ATENDIMENTO DO PROFISSIONAL (DESCONTINUADO - Consolidado na Página de Paciente)
// import AtendimentoProfissionalView from "@/pages/clinica/agenda/views/AtendimentoProfissionalView";


// Atendimento
import Atendimento from "@/pages/clinica/Atendimento/Atendimento";

// 👥 PACIENTES - V2 REFATORADO (SINGLE-SCREEN COM ABAS)
import PatientListPage from "@/pages/clinica/pacientes/PatientListPage";
import PatientCadastroPage from "@/pages/clinica/pacientes/PatientCadastroPage";
import PatientDetailPage from "@/pages/clinica/pacientes/PatientDetailPage";

// 🏗️ BASE DO SISTEMA - NOVO MÓDULO
import {
  ServicesPage,
  ProfessionalsPage,
  ProfessionalServicesPage,
  RoomsPage,
  ResourcesPage,
  HealthInsurancesPage,
  AgendaRulesPage,
  RoomResourcesPage,
  ProfessionalSchedulePage,
  ServicePricesPage,
  ProfessionalPayerPage,
} from "@/pages/clinica/base-sistema/pages";
import CBHPMManagement from "@/pages/clinica/base-sistema/CBHPMManagement";

// Admin
import Usuarios from "@/pages/admin/Usuarios";
import NewUser from "@/pages/admin/NewUser";
import EditUser from "@/pages/admin/EditUser";
import SincronizarProfissionais from "@/pages/admin/SincronizarProfissionais";
import Clinicas from "@/pages/admin/Clinicas";
import NewClinic from "@/pages/admin/NewClinic";
import EditClinic from "@/pages/admin/EditClinic";

/* 🔐 Protected Route */
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  
  // Verificar se existe sessão customizada no localStorage
  const hasCustomSession = localStorage.getItem("gesclinic_session");

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
  
  // Verificar se existe sessão customizada no localStorage
  const customSession = (() => {
    const session = localStorage.getItem("gesclinic_session");
    if (!session) return null;
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

  // Verificar role: deve ser admin
  const userRole = customSession?.role || currentRole;
  
  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">Você não tem permissão para acessar esta página.</p>
          <p className="text-sm text-gray-500 mb-6">Apenas usuários com perfil de Administrador podem acessar.</p>
          <button
            onClick={() => window.location.href = '/clinica/dashboard'}
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

/* 🔓 Public Route */
function PublicRoute() {
  const { isAuthenticated } = useAuth();
  
  // Verificar se existe sessão customizada no localStorage
  const hasCustomSession = localStorage.getItem("gesclinic_session");
  
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
      </Route>

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route path="/diagnostics" element={<DiagnosticsPage />} />

        {/* 🔴 ADMIN */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Outlet />}>
            <Route path="" element={<Navigate to="/clinica/administracao/usuarios" replace />} />
            <Route path="usuarios" element={<Navigate to="/clinica/administracao/usuarios" replace />} />
            <Route path="new-user" element={<Navigate to="/clinica/administracao/usuarios/novo" replace />} />
            <Route path="edit-user/:id" element={<LegacyAdminUserEditRedirect />} />
            <Route path="sincronizar-profissionais" element={<Navigate to="/clinica/administracao/usuarios/sincronizar" replace />} />
            <Route path="clinicas" element={<Navigate to="/clinica/administracao/clinicas" replace />} />
            <Route path="new-clinic" element={<Navigate to="/clinica/administracao/clinicas/nova" replace />} />
            <Route path="edit-clinic/:id" element={<LegacyAdminClinicEditRedirect />} />
          </Route>
        </Route>

        {/* 🔴 CLÍNICA */}
        <Route
          path="/clinica"
          element={<AppLayout />}
        >

          {/* DASHBOARD */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/atendimentos" element={<DashboardAtendimentos />} />
          <Route path="dashboard/financeiro" element={<DashboardFinanceiro />} />
          <Route path="dashboard/faturamento" element={<DashboardFaturamento />} />

          {/* ⭐ AGENDA - VERSÃO OTIMIZADA COM INTERFACE COMPACTA */}
          <Route 
            path="agenda" 
            element={
              <ProtectedWizardRoute feature="agenda">
                <AgendaIndexNew />
              </ProtectedWizardRoute>
            } 
          />

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

          {/* �🟢 ETAPA 6: Sub-rotas com páginas placeholder */}
          <Route path="agenda/confirmacoes" element={<AgendaConfirmacoes />} />
          <Route path="agenda/espera" element={<AgendaEspera />} />
          <Route path="agenda/indicadores" element={<AgendaIndicadores />} />

          {/* CONFIGURAÇÕES */}
          <Route path="configuracoes" element={<GeraisConfig />} />
          <Route path="configuracoes/perfis" element={<PerfisUsuarioConfig />} />
          <Route path="configuracoes/permissoes" element={<PermissoesConfig />} />
          <Route path="configuracoes/agenda/*" element={<AgendaConfig />} />
          <Route path="configuracoes/conta" element={<ContaConfig />} />
          <Route path="configuracoes/conta/:tab" element={<ContaConfig />} />
          <Route path="configuracoes/faturamento" element={<FaturamentoConfig />} />
          <Route path="configuracoes/estoque" element={<EstoqueConfig />} />

          <Route element={<AdminRoute />}>
            <Route path="administracao/usuarios" element={<Usuarios embedded />} />
            <Route path="administracao/usuarios/novo" element={<NewUser />} />
            <Route path="administracao/usuarios/editar/:id" element={<EditUser />} />
            <Route path="administracao/usuarios/sincronizar" element={<SincronizarProfissionais />} />
            <Route path="administracao/clinicas" element={<Clinicas embedded />} />
            <Route path="administracao/clinicas/nova" element={<NewClinic />} />
            <Route path="administracao/clinicas/editar/:id" element={<EditClinic />} />
          </Route>

          {/* ESTOQUE */}
          <Route path="estoque" element={<DashboardEstoque />} />
          <Route path="estoque/dashboard" element={<DashboardEstoque />} />
          <Route path="estoque/produtos" element={<EstoqueProdutos />} />
          <Route path="estoque/categorias" element={<EstoqueCategorias />} />
          <Route path="estoque/fornecedores" element={<EstoqueFornecedores />} />
          <Route path="estoque/movimentacoes" element={<EstoqueMovimentacoes />} />
          <Route path="estoque/locais" element={<EstoqueLocais />} />
          <Route path="estoque/depositos" element={<EstoqueLocais />} />
          <Route path="estoque/entradas" element={<EstoqueEntradas />} />
          <Route path="estoque/saidas" element={<EstoqueSaidas />} />
          <Route path="estoque/unidades" element={<EstoqueUnidades />} />
          <Route path="estoque/transferencias" element={<EstoqueTransferencias />} />
          <Route path="estoque/requisicoes" element={<EstoqueRequisicoes />} />
          <Route path="estoque/inventario" element={<EstoqueInventario />} />
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
          <Route path="financeiro/caixa" element={<CaixaIndividual />} />
          <Route path="financeiro/caixa-gerencial" element={<CaixaGerencial />} />
          <Route path="financeiro/resultado" element={<DashboardDRE />} />
          <Route path="financeiro/dre" element={<Navigate to="/clinica/financeiro/resultado" replace />} />
          <Route path="financeiro/pagar" element={<FinanceContasPagar />} />
          <Route path="financeiro/pagar/nova" element={<FinanceNovaConta />} />
          <Route path="financeiro/pagar/:id/editar" element={<FinanceEditarConta />} />
          <Route path="financeiro/receber" element={<FinanceContasReceber />} />
          <Route path="financeiro/contas-receber" element={<FinanceContasReceber />} />
          <Route path="financeiro/receber/nova" element={<FinanceNovoRecebimento />} />
          <Route path="financeiro/receber/:id/editar" element={
            <React.Suspense fallback={<div>Carregando...</div>}>
              <EditarRecebimento />
            </React.Suspense>
          } />
          <Route path="financeiro/fluxo-caixa" element={<FinanceFluxoCaixa />} />
          <Route path="financeiro/fluxo" element={<Navigate to="/clinica/financeiro/fluxo-caixa" replace />} />
          <Route path="financeiro/plano-contas" element={<Navigate to="/clinica/configuracoes/conta" replace />} />
          <Route path="financeiro/conciliacao-bancaria" element={<FinanceConciliacaoBancaria />} />
          <Route path="financeiro/conciliacao" element={<Navigate to="/clinica/financeiro/conciliacao-bancaria" replace />} />
          <Route path="financeiro/automacao" element={<FinanceAutomacaoFinanceira />} />
          <Route path="financeiro/automacoes" element={<Navigate to="/clinica/financeiro/automacao" replace />} />
          <Route path="automacoes" element={<Navigate to="/clinica/financeiro/automacao" replace />} />
          <Route path="financeiro/autorizacoes-descontos" element={<AutorizacaoDescontos />} />
          <Route path="financeiro/repasse/*" element={<RepasseMedicoLayout />}>
            <Route index element={<Navigate to="?tab=visao-geral" replace />} />
            <Route path="visao-geral" element={<RepasseMedicoPage />} />
            <Route path="regras-avancadas" element={<RepasseRegrasPage />} />
            <Route path="analytics" element={<RepasseDashboardAnalyticsPage />} />
            <Route path="automacao" element={<RepasseAutomacaoPage />} />
          </Route>
          <Route path="financeiro/repasse/medico" element={<Navigate to="/clinica/financeiro/repasse/?tab=visao-geral" replace />} />
          <Route path="financeiro/repasse-medico" element={<Navigate to="/clinica/financeiro/repasse/?tab=visao-geral" replace />} />
          <Route path="repasse" element={<Navigate to="/clinica/financeiro/repasse/?tab=visao-geral" replace />} />
          <Route path="financeiro/centro-custos" element={<CentroCustosLayout />}>
            <Route index element={<CentroCustosOverview />} />
            <Route path="cadastro" element={<CentroCustosCadastro />} />
            <Route path="hierarquia" element={<CentroCustosHierarquia />} />
            <Route path="vinculacoes" element={<CentroCustosVinculacoes />} />
            <Route path="rateio" element={<CentroCustosRateio />} />
            <Route path="analises" element={<CentroCustosAnalises />} />
            <Route path="config" element={<CentroCustosConfig />} />
          </Route>

          {/* FATURAMENTO */}
          <Route path="faturamento" element={<FaturamentoPage />} />
          <Route path="faturamento/dashboard" element={<FaturamentoPage />} />
          <Route path="faturamento/guias" element={<GuiasPage />} />
          <Route path="faturamento/xml" element={<XMLPage />} />
          <Route path="faturamento/retornos" element={<RetornosPage />} />
          <Route path="faturamento/lotes" element={<LotesPage />} />
          <Route path="faturamento/relatorios" element={<RelatoriosPage />} />
          <Route path="faturamento/tiss" element={<TISSPage />} />

          {/* OUTRAS */}
          {/* 👥 PACIENTES - V2: SINGLE-SCREEN COM ABAS INTERNAS */}
          <Route path="pacientes" element={<Outlet />}>
            <Route index element={<PatientListPage />} />
            <Route path="novo" element={<PatientCadastroPage />} />
            <Route path=":patientId" element={<PatientDetailPage />} />
          </Route>
          <Route path="atendimento/:id" element={<Atendimento />} />

          {/* 🏗️ BASE DO SISTEMA - NOVO MÓDULO */}
          {/* Rota padrão - redireciona para Serviços */}
          <Route path="base-sistema" element={<Navigate to="/clinica/base-sistema/servicos" replace />} />
          
          {/* 4.1 Cadastros Estruturais */}
          <Route path="base-sistema/servicos" element={<ServicesPage />} />
          <Route path="base-sistema/cbhpm" element={<CBHPMManagement />} />
          <Route path="base-sistema/profissionais" element={<ProfessionalsPage />} />
          <Route path="base-sistema/convenios" element={<HealthInsurancesPage />} />
          <Route path="base-sistema/salas" element={<RoomsPage />} />
          <Route path="base-sistema/recursos" element={<ResourcesPage />} />
          
          {/* 4.2 Regras Operacionais */}
          <Route path="base-sistema/professional-services" element={<ProfessionalServicesPage />} />
          <Route path="base-sistema/professional-payer" element={<ProfessionalPayerPage />} />
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

      {/* ROOT */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
