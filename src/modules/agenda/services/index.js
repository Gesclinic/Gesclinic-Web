/**
 * @module src/modules/agenda/services
 * 
 * Serviços de negócio (API layer) para o domínio "agenda".
 * 
 * Inclui:
 * - Mappers: Transformadores de dados puros
 * - agendaService (listar, criar, editar, deletar agendamentos) - em preparação
 * - agendaQueryService (queries complexas) - em preparação
 * - Etc.
 */

// Mappers - Transformadores de dados
export { mapAgendaItem } from './agendaMapper';
export { mapAgendaPorProfissional } from './agendaPorProfissionalMapper';
export { mapearPorSala } from './agendaPorSalaMapper';
