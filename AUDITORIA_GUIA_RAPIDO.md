# 🕒 Auditoria de Atendimentos - Guia Rápido

## ✅ Implementação Concluída

Sistema completo de auditoria de atendimentos com rastreabilidade, imutabilidade e controle de permissões.

---

## 📍 Arquivos Criados/Modificados

### Backend
- ✅ `supabase/migrations/2026-01-14_create_appointment_audit_logs.sql` - Migration SQL
- ✅ `src/lib/auditApi.js` - Funções de logging (ATUALIZADO com novos helpers)
- ✅ `src/lib/appointmentsApi.js` - Integração automática (createAppointment, updateAppointment)

### Frontend
- ✅ `src/pages/clinica/agenda/components/AppointmentAuditTimeline.jsx` - **NOVO** Componente visual
- ✅ `src/pages/clinica/agenda/components/CheckinDrawer.jsx` - Aba "Histórico" adicionada
- ✅ `src/pages/clinica/agenda/components/AppointmentModal.jsx` - Histórico inteligente
- ✅ `src/pages/clinica/agenda/views/components/CheckinAcoes.jsx` - Logs em ações

---

## 🚀 Como Usar

### Para Usuários (Admin/Gestor)

1. **Ver Histórico de Agendamento**
   ```
   Abrir modal/drawer do agendamento
   → Clicar na aba "Histórico"
   → Timeline mostra todas as ações realizadas
   ```

2. **Entender as Ações**
   - 🟢 **APPOINTMENT_CREATED** - Agendamento criado
   - 🔄 **STATUS_CHANGED** - Status alterado
   - 📋 **CHECKIN_STARTED** - Check-in iniciado
   - ✅ **CHECKLIST_UPDATED** - Checklist atualizado
   - 💳 **FINANCIAL_VALIDATED** - Financeiro validado
   - 🔗 **MERGE_PRE_PATIENT** - Pré-paciente linkado
   - ▶️ **ATTENDANCE_STARTED** - Atendimento iniciado
   - ⏹️ **ATTENDANCE_FINISHED** - Atendimento finalizado
   - ❌ **MARKED_NO_SHOW** - Falta marcada
   - 🔁 **RESCHEDULED** - Remarcado
   - ❌ **CANCELLED** - Cancelado

3. **Ver Detalhes**
   - Clique em um item para expandir e ver contexto
   - Mostra: data, hora, usuário, role, IP, detalhes técnicos

---

### Para Desenvolvedores

#### Adicionar Auditoria a Uma Ação

```javascript
import { logAppointmentAudit, AUDIT_ACTION_TYPES } from '@/lib/auditApi';

const handleMinhaAcao = async () => {
  const result = await meuServico.fazer();
  
  // Log de auditoria
  logAppointmentAudit({
    appointmentId: result.id,
    actionType: AUDIT_ACTION_TYPES.STATUS_CHANGED,
    oldStatus: 'antes',
    newStatus: 'depois',
    context: {
      motivo: 'dado extra',
    },
  }).catch(err => console.warn("Erro ao logar:", err));
};
```

#### Usar Helpers Prontos

```javascript
import {
  logStatusChange,
  logCheckinStarted,
  logChecklistUpdated,
  logFinancialValidated,
  logMarkedNoShow,
  logAppointmentRescheduled,
  logAttendanceStarted,
  logAttendanceFinished,
  logMergePrePatient,
} from '@/lib/auditApi';

// Exemplos:
await logStatusChange(appointmentId, 'antes', 'depois');
await logCheckinStarted(appointmentId, { extra: 'dados' });
await logAttendanceFinished(appointmentId, 30); // 30 minutos de duração
await logMarkedNoShow(appointmentId, 'Paciente não compareceu');
```

#### Verificar Logs em Código

```javascript
import { getAppointmentAuditLogs, countAppointmentAuditLogs } from '@/lib/auditApi';

// Buscar todos os logs
const logs = await getAppointmentAuditLogs(appointmentId);

// Contar logs
const total = await countAppointmentAuditLogs(appointmentId);

// Buscar por período
const periodLogs = await getAuditLogsByDateRange({
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-01-31T23:59:59Z',
  actionType: 'STATUS_CHANGED', // opcional
});
```

---

## 🔐 Permissões

| Role | Acesso | Detalhes |
|------|--------|----------|
| **Admin** | ✅ Completo | Vê tudo, IP, User-Agent, contexto |
| **Gestor** | ✅ Completo | Mesma permissão que admin |
| **Profissional** | ❌ Bloqueado | "Você não tem permissão" |
| **Recepção** | ❌ Bloqueado | "Você não tem permissão" |

---

## 📊 O Que É Registrado

Cada log de auditoria contém:

```javascript
{
  id: 'uuid',
  appointment_id: 'uuid',
  action_type: 'STATUS_CHANGED',
  old_status: 'a_confirmar',
  new_status: 'confirmado',
  performed_by: 'user_uuid',
  performed_by_role: 'gestor',
  performed_at: '2026-01-14T10:30:45Z',
  context: {
    motivo: 'confirmado por telefone',
    // ... dados adicionais
  },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  created_at: '2026-01-14T10:30:45Z',
}
```

---

## 🧪 Testando

### 1. Criar Agendamento e Ver Histórico
```
1. /clinica/agenda → "Novo Agendamento"
2. Preencher e salvar
3. Abrir agendamento → aba "Histórico"
4. Deve mostrar: APPOINTMENT_CREATED ✅
```

### 2. Check-in com Log
```
1. Clicar "Check-in" em um agendamento
2. Drawer abre → Log CHECKIN_STARTED enviado ✅
3. Completar checklist + financeiro
4. Clicar "Liberar"
5. Deve aparecer nos logs ✅
```

### 3. Testar Permissões
```
1. Admin/Gestor: Acesso total ✅
2. Profissional: "Você não tem permissão" ✅
3. Recepção: "Você não tem permissão" ✅
```

---

## ⚠️ Importante

### Não é Possível
- ❌ Deletar logs
- ❌ Editar logs existentes
- ❌ Profissional ver histórico (bloqueado por RLS)

### É Imutável
- ✅ Tabela append-only
- ✅ RLS bloqueia UPDATE/DELETE
- ✅ Histórico permanente

### Automático
- ✅ Não precisa chamar manualmente em update()
- ✅ IP e User-Agent capturados automaticamente
- ✅ Timestamp em UTC

---

## 📝 Documentação Completa

Ver: `AUDITORIA_ATENDIMENTOS_IMPLEMENTACAO.md`

---

## 🎯 Próximas Adições Opcionais

1. **Dashboard de Auditoria** - Página com filtros e gráficos
2. **Alertas em Tempo Real** - Notificar sobre ações críticas
3. **Detecção de Fluxos Inválidos** - Marcar como INCONSISTENTE
4. **Exportação de Relatórios** - Gerar PDFs com histórico

---

**Sistema pronto para produção! 🚀**
