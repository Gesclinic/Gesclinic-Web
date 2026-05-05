/**
 * Application Constants
 * Define valores fixos do sistema
 */

// API Routes
export const API_ROUTES = {
  APPOINTMENTS: 'appointments',
  PATIENTS: 'patients',
  PROFESSIONALS: 'professionals',
  CLINICS: 'clinics',
  FINANCE: 'finance',
  SERVICES: 'services',
};

// Default Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0,
};

// Status enums
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

export const FINANCIAL_STATUS = {
  OPEN: 'open',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

// Role types
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PROFESSIONAL: 'professional',
  SECRETARY: 'secretary',
  PATIENT: 'patient',
};

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Você não tem permissão para acessar este recurso',
  UNAUTHENTICATED: 'Faça login para continuar',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Erro ao validar dados',
  INTERNAL_ERROR: 'Erro interno do servidor',
};

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Dados salvos com sucesso',
  DELETED: 'Dados removidos com sucesso',
  UPDATED: 'Dados atualizados com sucesso',
  CREATED: 'Dados criados com sucesso',
};
