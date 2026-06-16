/**
 * 📚 GUIA DE IMPLEMENTAÇÃO - SISTEMA OFICIAL DE STATUS
 * ===================================================
 *
 * Este guia mostra como usar o novo sistema de status em toda a aplicação
 * Mantém compatibilidade total com código legado
 *
 */

// ============================================================================
// 1. IMPORTAR O NOVO MODELO
// ============================================================================

// ✅ NOVO (use este em código novo):
import {
  APPOINTMENT_STATUS_OFFICIAL,
  normalizeToOfficialStatus,
  isValidTransition,
  shouldTriggerFinancial,
  getStatusConfig,
  getStatusLabel,
  STATUS_OPTIONS,
} from '@/lib/appointmentStatusOfficialModel';

// ✅ LEGADO (ainda funciona, será gradualmente descontinuado):
import { APPOINTMENT_STATUS } from '@/lib/appointmentStatusEnums';

// ============================================================================
// 2. USAR NO COMPONENTE - EXIBIÇÃO
// ============================================================================

// ❌ ANTIGO:
import StatusBadge from '@/components/StatusBadge';

function OldWayComponent() {
  return <StatusBadge status="finalizado" />;
}

// ✅ NOVO:
import StatusBadgeOfficial, { 
  StatusBadgeWithTooltip,
  StatusTimeline 
} from '@/components/StatusBadgeOfficial';

function NewWayComponent() {
  // Simples
  return <StatusBadgeOfficial status="completed" />;

  // Com tooltip
  return <StatusBadgeWithTooltip status="completed" />;

  // Timeline do progresso
  return <StatusTimeline currentStatus="in_progress" />;

  // Com compatibilidade automática (normaliza status legados)
  return <StatusBadgeOfficial status="finalizado" />; // → "completed"
}

// ============================================================================
// 3. USAR EM FILTROS
// ============================================================================

// ❌ ANTIGO: Hardcoda status strings
function OldFilter() {
  const [filter, setFilter] = useState('finalizado');
  
  const appointments = data.filter(apt => apt.status === 'finalizado');
  return <div>{appointments.length}</div>;
}

// ✅ NOVO: Usa constantes do novo modelo
import { OPERATIONAL_FLOW_STATUSES, FINAL_STATUSES } from '@/lib/appointmentStatusOfficialModel';

function NewFilter() {
  const [filter, setFilter] = useState(APPOINTMENT_STATUS_OFFICIAL.COMPLETED);
  
  // Filtrar apenas status finais
  const finalAppointments = data.filter(apt => 
    FINAL_STATUSES.includes(apt.status_official)
  );

  // Filtrar status ativos
  const activeAppointments = data.filter(apt =>
    OPERATIONAL_FLOW_STATUSES.includes(apt.status_official)
  );

  return <div>{finalAppointments.length}</div>;
}

// ============================================================================
// 4. USAR EM TRANSIÇÕES
// ============================================================================

// ❌ ANTIGO: Sem validação clara
async function updateStatusOld(appointmentId, newStatus) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId);
  
  return { data, error };
}

// ✅ NOVO: Com validação de transição
async function updateStatusNew(appointmentId, fromStatus, toStatus) {
  // 1. Validar transição
  if (!isValidTransition(fromStatus, toStatus)) {
    const fromLabel = getStatusLabel(fromStatus);
    const toLabel = getStatusLabel(toStatus);
    throw new Error(`Transição não permitida: ${fromLabel} → ${toLabel}`);
  }

  // 2. Atualizar no banco
  const { data, error } = await supabase
    .from('appointments')
    .update({
      status_official: toStatus,
      status: toStatus, // Para compatibilidade
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  if (error) throw error;

  // 3. Se entra financeiro, criar receivable
  if (shouldTriggerFinancial(toStatus)) {
    await createReceivableFromAppointment(appointmentId);
  }

  return data;
}

// ============================================================================
// 5. USAR EM FILTROS DE RECEPÇÃO
// ============================================================================

// ❌ ANTIGO: Muitos status misturados
function ReceptionBadgeOld({ appointment }) {
  const statusLabels = {
    'agendado': '🗓️ Agendado',
    'confirmado': '✅ Confirmado',
    'liberado_para_atendimento': '👨‍⚕️ Liberado',
    'em_atendimento': '⏳ Em Atendimento',
    'finalizado': '✔️ Finalizado',
    'cancelado': '🚫 Cancelado',
    'falta': '❌ Falta',
  };

  return <span>{statusLabels[appointment.status]}</span>;
}

// ✅ NOVO: Tudo centralizado no modelo
import StatusBadgeOfficial from '@/components/StatusBadgeOfficial';

function ReceptionBadgeNew({ appointment }) {
  // Normaliza status legados automaticamente
  return <StatusBadgeOfficial status={appointment.status} />;
}

// ============================================================================
// 6. USAR EM SELECT/DROPDOWN
// ============================================================================

// ❌ ANTIGO: Dropdown com valores hardcoded
function StatusSelectOld() {
  return (
    <select>
      <option value="agendado">Agendado</option>
      <option value="confirmado">Confirmado</option>
      <option value="em_atendimento">Em Atendimento</option>
      <option value="finalizado">Finalizado</option>
    </select>
  );
}

// ✅ NOVO: Usa STATUS_OPTIONS do modelo
import { STATUS_OPTIONS } from '@/lib/appointmentStatusOfficialModel';

function StatusSelectNew() {
  return (
    <select>
      {STATUS_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.icon} {option.label}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// 7. USAR PARA CONTADORES DE PAINEL
// ============================================================================

// ❌ ANTIGO: Contadores com status hardcoded
function DashboardOld({ appointments }) {
  return (
    <div>
      <p>Agendados: {appointments.filter(a => a.status === 'agendado').length}</p>
      <p>Confirmados: {appointments.filter(a => a.status === 'confirmado').length}</p>
      <p>Em Atendimento: {appointments.filter(a => a.status === 'em_atendimento').length}</p>
      <p>Finalizados: {appointments.filter(a => a.status === 'finalizado').length}</p>
    </div>
  );
}

// ✅ NOVO: Uso dinâmico de STATUS_OPTIONS
import { STATUS_OPTIONS, ACTIVE_STATUSES } from '@/lib/appointmentStatusOfficialModel';

function DashboardNew({ appointments }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {STATUS_OPTIONS.map(status => (
        <div key={status.value} className="p-4 border rounded">
          <p className="text-sm text-gray-600">
            {status.icon} {status.label}
          </p>
          <p className="text-2xl font-bold">
            {appointments.filter(a => a.status_official === status.value).length}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 8. USAR EM MODAL DE ATUALIZAÇÃO
// ============================================================================

// ✅ NOVO: Modal que mostra próximas transições permitidas
import { getPossibleTransitions } from '@/lib/appointmentStatusOfficialModel';
import StatusBadgeOfficial from '@/components/StatusBadgeOfficial';

function AppointmentStatusModal({ appointment, onUpdate }) {
  const currentStatus = appointment.status_official;
  const possibleTransitions = getPossibleTransitions(currentStatus);

  if (possibleTransitions.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-600">
          Status final: não pode ser alterado
        </p>
        <StatusBadgeOfficial status={currentStatus} size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">Status Atual:</p>
      <StatusBadgeOfficial status={currentStatus} size="lg" />

      <p className="font-medium">Mudar para:</p>
      <div className="flex flex-wrap gap-2">
        {possibleTransitions.map(transition => (
          <button
            key={transition.to}
            onClick={() => onUpdate(transition.to)}
            className={`px-4 py-2 rounded ${getStatusBadgeClass(transition.to)}`}
          >
            {transition.icon} {transition.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 9. USAR NA API
// ============================================================================

// ✅ NOVO: appointmentsApi.js deveria usar o novo modelo
import {
  normalizeToOfficialStatus,
  shouldTriggerFinancial,
} from '@/lib/appointmentStatusOfficialModel';

export async function updateAppointment(appointmentId, updateData) {
  // Normalizar status se necessário
  if (updateData.status) {
    updateData.status_official = normalizeToOfficialStatus(updateData.status);
  }

  // Fazer update
  const { data, error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .select();

  if (error) throw error;

  // Disparar integração financeira se necessário
  if (shouldTriggerFinancial(updateData.status_official)) {
    await createReceivableFromAppointment(appointmentId);
  }

  return data;
}

// ============================================================================
// 10. VALIDAÇÃO DE EDIÇÃO POR STATUS
// ============================================================================

// ✅ NOVO: Verificar quais campos podem ser editados
import { canEditField } from '@/lib/appointmentStatusOfficialModel';

function AppointmentForm({ appointment, onUpdate }) {
  const { status_official } = appointment;

  return (
    <form onSubmit={handleSubmit}>
      {/* Campo de paciente - pode ser bloqueado em status avançados */}
      <input
        name="patientId"
        disabled={!canEditField(status_official, 'patientId')}
        defaultValue={appointment.patient_id}
      />

      {/* Campo de profissional - pode ser bloqueado */}
      <input
        name="professionalId"
        disabled={!canEditField(status_official, 'professionalId')}
        defaultValue={appointment.professional_id}
      />

      {/* Campo de data/hora - pode ser bloqueado */}
      <input
        name="scheduledDate"
        disabled={!canEditField(status_official, 'scheduledDate')}
        defaultValue={appointment.scheduled_date}
      />

      <button type="submit">Salvar</button>
    </form>
  );
}

// ============================================================================
// 11. COMPATIBILIDADE LEGADA
// ============================================================================

// ✅ Se tiver código que ainda usa status legados, funciona:
function LegacyComponent() {
  // Estes todos funcionam (normalizam automaticamente):
  console.log(getStatusLabel('em_atendimento')); // → "🔄 Em Atendimento"
  console.log(getStatusLabel('finalizado')); // → "✔️ Completo"
  console.log(getStatusLabel('cancelado')); // → "🚫 Cancelado"

  // E isso também funciona:
  console.log(isValidTransition('agendado', 'confirmado')); // true
  console.log(isValidTransition('finalizado', 'agendado')); // false
}

// ============================================================================
// 12. MIGRATION GRADUAL
// ============================================================================

/*
  PLANO DE MIGRAÇÃO:

  FASE 1 (Agora):
  - Novo modelo de 8 status definido
  - Compatibilidade total com legado
  - Novos componentes usando STATUS_OFFICIAL

  FASE 2 (Próximas 2 semanas):
  - Migrar AppointmentUnitedModal para usar novo modelo
  - Migrar AgendaUnificada para usar STATUS_OPTIONS
  - Migrar Dashboard para usar novos contadores

  FASE 3 (Próximas 4 semanas):
  - Migrar appointmentsApi.js para usar normalizeToOfficialStatus()
  - Atualizar todos os filtros
  - Remover STATUS_ENUMS antigos

  FASE 4 (Produção):
  - Executar migration SQL de migração de dados
  - Testar thoroughly com financeiro
  - Monitorar ar_receivables por 1 semana

  ROLLBACK:
  - Se tiver problema, a coluna legacy_status guarda o status antigo
  - Pode reverter em < 1 hora
*/

// ============================================================================
// 13. TESTES
// ============================================================================

// Para testar, veja: 🧪_TESTES_STATUS_OFFICIAL.js
// Todos os testes podem ser executados no console do browser

// ============================================================================
// 14. PERGUNTAS FREQUENTES
// ============================================================================

/*
  P: Meu código que usa 'finalizado' quebra?
  R: Não! normalizeToOfficialStatus('finalizado') → 'completed'
     Funciona automaticamente em qualquer lugar.

  P: O financeiro quebra?
  R: Não! shouldTriggerFinancial('completed') retorna true (mesmo que antigo 'attended')
     ar_receivables continua sendo criado normalmente.

  P: Como fazer rollback?
  R: A coluna legacy_status guarda o status antigo. Se precisar, 
     pode reverter UPDATE appointments SET status = legacy_status;

  P: Por que 8 status e não 15?
  R: Operacional é mais simples e reduz confusão. Sistema anterior tinha status demais
     que criavam ambiguidade. 8 status seguem fluxo claro:
     scheduled → confirmed → checked_in → waiting → in_progress → completed
     Plus: cancelled e no_show

  P: Como saber qual versão está sendo usada?
  R: Verifique a coluna:
     - status = status antigo (compatibilidade)
     - status_official = status novo (primário)
*/

// ============================================================================
// ✅ CONCLUSÃO
// ============================================================================

/*
  O novo sistema de status oficial:
  ✅ 8 status claros e profissionais
  ✅ Compatibilidade total com código legado
  ✅ Não quebra financeiro
  ✅ Transições validadas automaticamente
  ✅ Campos bloqueados por status
  ✅ Badges padronizadas
  ✅ Fácil de migrar gradualmente

  Comece a usar hoje em novos componentes!
*/
