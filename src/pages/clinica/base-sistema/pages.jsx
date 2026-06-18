// src/pages/clinica/base-sistema/pages.jsx
// ============================================================
// Base do Sistema - Importações dos Componentes CRUD
// Todas as 12 páginas de gerenciamento do sistema
// ============================================================

// Imports dos componentes reais
import { ServicosPage as ServicesPageComponent } from './ServicosPage';
import { ProfessionalsPage as ProfessionalsPageComponent } from './ProfessionalsPage';
import { ConveniosPage as HealthInsurancesPageComponent } from './ConveniosPage';
import { SalasPage as RoomsPageComponent } from './SalasPage';
import { RecursosPage as ResourcesPageComponent } from './RecursosPage';
import { AgendaRulesPage as AgendaRulesPageComponent } from './AgendaRulesPage';
import { RoomResourcesPage as RoomResourcesPageComponent } from './RoomServicesPage';
import { ProfessionalSchedulePage as ProfessionalSchedulePageComponent } from './ProfessionalSchedulePage';
import { ServicePricesPage as ServicePricesPageComponent } from './ServicePricesPage';

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

// 3. Salas
export function RoomsPage() {
  return <RoomsPageComponent />;
}

// 4. Recursos
export function ResourcesPage() {
  return <ResourcesPageComponent />;
}

// 5. Convênios
export function HealthInsurancesPage() {
  return <HealthInsurancesPageComponent />;
}

// 6. Regras de Agenda
export function AgendaRulesPage() {
  return <AgendaRulesPageComponent />;
}

// 7. Recursos por Sala
export function RoomResourcesPage() {
  return <RoomResourcesPageComponent />;
}

// 8. Disponibilidade de Profissionais
export function ProfessionalSchedulePage() {
  return <ProfessionalSchedulePageComponent />;
}

// 9. Tabelas de Preço
export function ServicePricesPage() {
  return <ServicePricesPageComponent />;
}
