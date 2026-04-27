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

// Queries - Operações de leitura (GET)
export {
  listarServicosPorProfissional,
  listarSalas,
  listarProfissionais,
  listarPlanosPorConvenio,
  listarPacientes,
  listarConvenios,
  buscarAgendamentoPorId,
} from './agenda.api.queries';

// Complex Queries - Queries complexas com múltiplas operações
export {
  listarAgenda,
} from './agenda.api.complex';

// Business Logic - Operações de negócio complexas
export {
  listarConveniosPorProfissional,
} from './agenda.api.business';

// Mutations - Operações de escrita (CREATE, UPDATE, DELETE)
export {
  atualizarAgendamento,
  criarAgendamento,
} from './agenda.api.mutations';
