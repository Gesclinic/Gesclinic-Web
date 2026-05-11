#!/bin/bash

# ============================================================================
# OFFICIAL STATUS MODEL - QUICK START GUIDE
# ============================================================================
#
# Guia rápido de como usar o novo sistema de status
#

echo "=================================================="
echo "🚀 Official Status Model - Quick Start"
echo "=================================================="
echo ""

# ============================================================================
# INSTALAÇÃO
# ============================================================================

echo "📦 INSTALAÇÃO"
echo "---"
echo ""
echo "1. Copiar arquivos para o projeto:"
echo "   - src/modules/agenda/constants/officialStatusModel.ts"
echo "   - src/modules/agenda/constants/statusValidation.ts"
echo "   - src/modules/agenda/constants/quickFilters.ts"
echo "   - src/modules/agenda/components/OfficialStatusBadge.tsx"
echo "   - src/modules/agenda/components/OfficialStatusSelect.tsx"
echo "   - src/modules/agenda/components/OperationalTimeline.tsx"
echo "   - supabase/migrations/2026-05-10_official_status_model.sql"
echo ""

echo "2. Aplicar migration (Supabase SQL Editor):"
echo "   Arquivo: supabase/migrations/2026-05-10_official_status_model.sql"
echo ""

echo "3. npm run dev"
echo ""
echo "✅ Pronto para usar!"
echo ""

# ============================================================================
# USO RÁPIDO
# ============================================================================

echo "⚡ USO RÁPIDO"
echo "---"
echo ""

cat << 'EOF'
// ============================================================================
// 1. USAR BADGE COM STATUS
// ============================================================================

import { OfficialStatusBadge } from '@/modules/agenda';

function AppointmentCard({ appointment }) {
  return (
    <div>
      <h3>{appointment.patient_name}</h3>
      <OfficialStatusBadge 
        status={appointment.official_status}
        size="md"
      />
    </div>
  );
}

// ============================================================================
// 2. MUDAR STATUS COM VALIDAÇÃO
// ============================================================================

import { OfficialStatusSelect } from '@/modules/agenda';

function AppointmentForm({ appointment }) {
  const handleStatusChange = async (newStatus) => {
    // Validação automática no componente
    await updateAppointment({
      ...appointment,
      official_status: newStatus
    });
  };

  return (
    <OfficialStatusSelect
      currentStatus={appointment.official_status}
      onStatusChange={handleStatusChange}
      showLabel={true}
    />
  );
}

// ============================================================================
// 3. MOSTRAR PROGRESSO OPERACIONAL
// ============================================================================

import { OperationalTimeline } from '@/modules/agenda';

function AppointmentDetail({ appointment }) {
  return (
    <OperationalTimeline
      currentStatus={appointment.official_status}
      completionHistory={appointment.status_history}
      showTimestamps={true}
    />
  );
}

// ============================================================================
// 4. USAR FILTROS RÁPIDOS
// ============================================================================

import { 
  QUICK_FILTERS,
  getQuickFilterSummary,
  filterByQuickFilter
} from '@/modules/agenda';

function AgendaDashboard({ appointments }) {
  // Resumo rápido
  const summary = getQuickFilterSummary(appointments);
  console.log(summary);
  // { pending: 10, finalized: 5, needsAction: 3, ... }

  // Filtrar agendamentos
  const pendingAppointments = filterByQuickFilter(
    appointments,
    'PENDING'
  );

  return (
    <div>
      <div>Pendentes: {summary.pending}</div>
      <div>Finalizados: {summary.finalized}</div>
      <div>Precisa Ação: {summary.needsAction}</div>
    </div>
  );
}

// ============================================================================
// 5. VALIDAR TRANSIÇÕES
// ============================================================================

import { validateStatusTransition } from '@/modules/agenda';

const currentStatus = 'scheduled';
const targetStatus = 'confirmed';

const validation = validateStatusTransition(
  currentStatus,
  targetStatus
);

if (validation.valid) {
  console.log('Transição permitida!');
} else {
  console.error(validation.error);
}

// ============================================================================
// 6. USAR CHART DATA
// ============================================================================

import { generateChartData } from '@/modules/agenda';
import { BarChart } from 'recharts';

function StatusChart({ appointments }) {
  const chartData = generateChartData(appointments);
  
  return (
    <BarChart data={chartData}>
      {/* Chart config */}
    </BarChart>
  );
}

EOF

echo ""

# ============================================================================
# EXEMPLOS AVANÇADOS
# ============================================================================

echo "🔧 EXEMPLOS AVANÇADOS"
echo "---"
echo ""

cat << 'EOF'
// ============================================================================
// VALIDAR PERMISSÃO DE EDIÇÃO
// ============================================================================

import { validateEditPermission } from '@/modules/agenda';

const currentStatus = 'completed';
const fieldToEdit = 'duration_minutes';

const permission = validateEditPermission(currentStatus, fieldToEdit);

if (!permission.canEdit) {
  console.warn(permission.reason); // "Agendamento completo, não pode editar"
}

// ============================================================================
// CONTAR POR STATUS
// ============================================================================

import { countByStatus } from '@/modules/agenda';

const counts = countByStatus(appointments);
// {
//   scheduled: 5,
//   confirmed: 3,
//   checked_in: 2,
//   waiting: 1,
//   in_progress: 0,
//   completed: 10,
//   cancelled: 1,
//   no_show: 2
// }

// ============================================================================
// VERIFICAR SE GERA FATURAMENTO
// ============================================================================

import { validateFinancialGeneration } from '@/modules/agenda';

const financial = validateFinancialGeneration('completed');
// { generatesFinancial: true }

const noFinancial = validateFinancialGeneration('cancelled');
// { generatesFinancial: false, reason: '...' }

// ============================================================================
// USAR PRÓXIMAS TRANSIÇÕES POSSÍVEIS
// ============================================================================

import { getNextPossibleStatuses } from '@/modules/agenda';

const currentStatus = 'confirmed';
const nextPossible = getNextPossibleStatuses(currentStatus);
// ['checked_in', 'cancelled']

// ============================================================================
// USAR CONFIG DE STATUS
// ============================================================================

import { getStatusConfig } from '@/modules/agenda';

const config = getStatusConfig('waiting');
// {
//   label: 'Aguardando',
//   icon: '⏳',
//   backgroundColor: '#fef08a',
//   textColor: '#b45309',
//   borderColor: '#f59e0b',
//   generatesFinancial: false,
//   blocksEditing: true,
//   unlocksReception: false,
//   ...
// }

EOF

echo ""

# ============================================================================
# LISTA DE EXPORTS
# ============================================================================

echo "📚 LISTA DE EXPORTS DISPONÍVEIS"
echo "---"
echo ""

cat << 'EOF'
// Componentes
import {
  OfficialStatusBadge,
  OfficialStatusBadgeCompact,
  OfficialStatusDot,
  OfficialStatusSelect,
  OperationalTimeline
} from '@/modules/agenda';

// Constants
import {
  OFFICIAL_STATUS_CONFIG,
  OPERATIONAL_STATUSES,
  FINALIZED_STATUSES,
  EDITABLE_STATUSES,
  NON_BILLABLE_STATUSES,
  AUTO_BILLABLE_STATUSES,
  STATUS_TRANSITIONS,
  OPERATIONAL_FLOW_SEQUENCE,
  QUICK_FILTERS,
  QUICK_FILTER_LABELS
} from '@/modules/agenda';

// Functions
import {
  getStatusConfig,
  getStatusLabel,
  getStatusIcon,
  getNextPossibleStatuses,
  isValidTransition,
  isStatusFinalized,
  isStatusOperational,
  blocksEditingInStatus,
  generatesFinancialInStatus,
  receptionUnlockedInStatus,
  validateStatusTransition,
  validateEditPermission,
  validateCancelPermission,
  validateFinancialGeneration,
  validateReceptionUnlock,
  filterByQuickFilter,
  countByStatus,
  getQuickFilterSummary,
  generateChartData
} from '@/modules/agenda';

// Types
import type {
  OfficialAppointmentStatus,
  OfficialStatusConfig,
  StatusTransitionValidation
} from '@/modules/agenda';
EOF

echo ""

# ============================================================================
# PRÓXIMOS PASSOS
# ============================================================================

echo "✅ PRÓXIMOS PASSOS"
echo "---"
echo ""

echo "1. Testar em desenvolvimento:"
echo "   npm run dev"
echo "   http://localhost:3000/clinica/agenda"
echo ""

echo "2. Atualizar AppointmentUnitedModal:"
echo "   - Substituir StatusSelect por OfficialStatusSelect"
echo "   - Adicionar OperationalTimeline"
echo ""

echo "3. Atualizar filtros de agenda:"
echo "   - Usar QUICK_FILTERS ao invés de arrays hardcoded"
echo ""

echo "4. Testar faturamento:"
echo "   - Confirmar que 'completed' gera financeiro"
echo "   - Confirmar que 'cancelled'/'no_show' não geram"
echo ""

echo "5. Executar migration SQL:"
echo "   supabase/migrations/2026-05-10_official_status_model.sql"
echo ""

echo "6. Deploy em staging + produção"
echo ""

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

echo "🐛 TROUBLESHOOTING"
echo "---"
echo ""

echo "❓ Erro: 'Cannot find module officialStatusModel'"
echo "   ✓ Solução: npm run dev (rebuildar)"
echo ""

echo "❓ Erro: 'Type OfficialAppointmentStatus not found'"
echo "   ✓ Solução: Verificar imports em index.ts do módulo"
echo ""

echo "❓ Transição bloqueada incorretamente"
echo "   ✓ Solução: Verificar validateStatusTransition"
echo "   ✓ Solução: Verificar STATUS_TRANSITIONS map"
echo ""

echo "❓ Status antigos não estão sendo convertidos"
echo "   ✓ Solução: Executar migration SQL"
echo "   ✓ Solução: Verificar função convert_to_official_status"
echo ""

# ============================================================================
# SUPORTE
# ============================================================================

echo "📞 SUPORTE"
echo "---"
echo ""

echo "Documentação completa:"
echo "  src/modules/agenda/STATUS_OFFICIAL_MODEL.md"
echo ""

echo "Código de referência:"
echo "  src/modules/agenda/constants/officialStatusModel.ts"
echo "  src/modules/agenda/components/OfficialStatusBadge.tsx"
echo ""

echo "SQL Migration:"
echo "  supabase/migrations/2026-05-10_official_status_model.sql"
echo ""

echo "=================================================="
echo "🎉 Pronto para começar!"
echo "=================================================="
