/**
 * @module src/modules/agenda
 * 
 * MÓDULO AGENDA - Arquitetura por Domínio
 * =========================================
 * 
 * Domínio responsável por toda a lógica de agendamentos de pacientes,
 * calendários, profissionais, salas e financeiro relacionado.
 * 
 * ESTRUTURA:
 * 
 * └── agenda/
 *     ├── components/        (Componentes React do domínio)
 *     ├── hooks/             (Hooks personalizados)
 *     ├── services/          (API layer / lógica de negócio)
 *     └── utils/             (Funções utilitárias puras)
 * 
 * STATUS: 🔄 Em Preparação
 * 
 * PRÓXIMAS FASES:
 * 1. Documentar arquivos existentes a mover
 * 2. Criar plano de migração incremental
 * 3. Mover componentes (AgendaWeekView, AgendaDayView, etc.)
 * 4. Mover hooks personalizados
 * 5. Mover serviços de agendamento
 * 6. Refatorar e consolidar utilitários
 * 
 * BENEFÍCIOS:
 * ✓ Separação clara de responsabilidades
 * ✓ Facilita encontrar código relacionado
 * ✓ Reduz importações cruzadas
 * ✓ Permite evolução independente
 * ✓ Prepara para lazy-loading
 * 
 * NOTAS:
 * - Imports externos continuarão funcionando durante migração
 * - Compatibilidade mantida com code existente
 * - Sem breaking changes durante a transição
 */

export const AGENDA_MODULE = {
  name: 'agenda',
  status: 'preparing',
  createdAt: '2026-04-22',
};
