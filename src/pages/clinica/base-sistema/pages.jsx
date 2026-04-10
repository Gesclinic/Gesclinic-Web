// src/pages/clinica/base-sistema/pages.jsx
// ============================================================
// Base do Sistema - Importações dos Componentes CRUD
// Todas as 12 páginas de gerenciamento do sistema
// ============================================================

// Imports dos componentes reais
import { ServicosPage as ServicesPageComponent } from "./ServicosPage";
import { ProfessionalsPage as ProfessionalsPageComponent } from "./ProfessionalsPage";
import { ConveniosPage as HealthInsurancesPageComponent } from "./ConveniosPage";
import { SalasPage as RoomsPageComponent } from "./SalasPage";
import { RecursosPage as ResourcesPageComponent } from "./RecursosPage";
import { ProfessionalServicesPage as ProfessionalServicesPageComponent } from "./ProfessionalServicesPage";
import { AgendaRulesPage as AgendaRulesPageComponent } from "./AgendaRulesPage";
import { RoomResourcesPage as RoomResourcesPageComponent } from "./RoomServicesPage";
import { ProfessionalSchedulePage as ProfessionalSchedulePageComponent } from "./ProfessionalSchedulePage";
import { ServicePricesPage as ServicePricesPageComponent } from "./ServicePricesPage";
import { ProfessionalPayerPage as ProfessionalPayerPageComponent } from "./ProfessionalPayerPage";

// ============================================================
// EXPORTAÇÕES - Mapear para rotas em AppRoutes.jsx
// ============================================================

// 1. Serviços
export function ServicesPage() {
  return <ServicesPageComponent />;
}

// 2. Profissionais
export function ProfessionalsPage() {
  return <ProfessionalsPageComponent />;
}

// 3. Vínculo Profissional-Serviço
export function ProfessionalServicesPage() {
  return <ProfessionalServicesPageComponent />;
}

// 4. Salas
export function RoomsPage() {
  return <RoomsPageComponent />;
}

// 5. Recursos
export function ResourcesPage() {
  return <ResourcesPageComponent />;
}

// 6. Convênios
export function HealthInsurancesPage() {
  return <HealthInsurancesPageComponent />;
}

// 7. Regras de Agenda
export function AgendaRulesPage() {
  return <AgendaRulesPageComponent />;
}

// 8. Recursos por Sala
export function RoomResourcesPage() {
  return <RoomResourcesPageComponent />;
}

// 9. Disponibilidade de Profissionais
export function ProfessionalSchedulePage() {
  return <ProfessionalSchedulePageComponent />;
}

// 10. Tabelas de Preço
export function ServicePricesPage() {
  return <ServicePricesPageComponent />;
}

// 11. Profissional-Convênio
export function ProfessionalPayerPage() {
  return <ProfessionalPayerPageComponent />;
}

