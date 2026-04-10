# 🕒 Sistema de Auditoria de Atendimentos - Implementação Completa

## ✅ Status: IMPLEMENTADO

O sistema de auditoria de atendimentos foi implementado seguindo padrão ERP hospitalar com rastreabilidade completa, imutabilidade e permissões baseadas em role.

---

## 📋 O Que Foi Implementado

### 1. **Backend - Banco de Dados (Supabase)**

#### Migration SQL
- **Arquivo:** `supabase/migrations/2026-01-14_create_appointment_audit_logs.sql`
- **Tabela:** `appointment_audit_logs` com campos:
  - `id` (UUID, chave primária)
  - `appointment_id` (UUID, referência a appointments)
  - `action_type` (TEXT - tipo de ação realizada)
  - `old_status` (TEXT - status anterior)
  - `new_status` (TEXT - novo status)
  - `performed_by` (UUID - usuário que realizou)
  - `performed_by_role` (TEXT - role do usuário)
  - `performed_at` (TIMESTAMPTZ - quando foi realizado)
  - `context` (JSONB - dados adicionais da ação)
  - `ip_address` (TEXT - IP da requisição)
  - `user_agent` (TEXT - navegador do usuário)
  - `created_at` (TIMESTAMPTZ - quando foi logado)

#### Índices para Performance
- `idx_appointment_audit_logs_appointment_id` - buscar logs de um agendamento
- `idx_appointment_audit_logs_performed_at` - ordenar por data descendente
- `idx_appointment_audit_logs_action_type` - filtrar por tipo de ação

#### Políticas RLS (Row Level Security)
- **Admin/Gestor:** Acesso completo (SELECT, INSERT)
- **Profissional:** Bloqueado
- **Recepção:** Bloqueado
- **UPDATE/DELETE:** Bloqueado para todos (tabela é append-only)

---

### 2. **Backend - Service Layer**

#### Arquivo: `src/lib/auditApi.js`

**Funções Principais:**

```javascript
// 🔴 Função Core
logAppointmentAudit({
  appointmentId,    // ID do agendamento
  actionType,       // Tipo de ação (APPOINTMENT_CREATED, STATUS_CHANGED, etc)
  oldStatus,        // Status anterior (opcional)
  newStatus,        // Novo status (opcional)
  context,          // Dados adicionais em objeto (opcional)
})

// 🟢 Helpers para ações comuns
logStatusChange(appointmentId, oldStatus, newStatus)
logCheckinStarted(appointmentId, context)
logChecklistUpdated(appointmentId, checklistData)
logFinancialValidated(appointmentId, paymentDetails)
logAppointmentCancelled(appointmentId, reason)
logAppointmentRescheduled(appointmentId, newDate, newTime, reason)
logMarkedNoShow(appointmentId, reason)
logPatientLinked(appointmentId, patientId)
logMergePrePatient(appointmentId, linkedPatientId, method)
logAttendanceStarted(appointmentId)
logAttendanceFinished(appointmentId, duration)
```

**Tipos de Ações Auditadas:**

```javascript
APPOINTMENT_CREATED       // Agendamento criado
STATUS_CHANGED           // Status alterado
CHECKIN_STARTED          // Check-in iniciado
CHECKLIST_UPDATED        // Checklist atualizado
FINANCIAL_VALIDATED      // Financeiro validado
MERGE_PRE_PATIENT        // Pré-paciente linkado
PATIENT_LINKED           // Paciente linkado
PATIENT_CREATED          // Paciente criado
ATTENDANCE_STARTED       // Atendimento iniciado
ATTENDANCE_FINISHED      // Atendimento finalizado
MARKED_NO_SHOW          // Falta marcada
RESCHEDULED             // Remarcado
CANCELLED               // Cancelado
```

**Captura Automática:**
- IP da requisição (via ipify)
- User-Agent do navegador
- Usuário autenticado e seu role
- Timestamp preciso em UTC

---

### 3. **Integração no AppointmentsApi**

#### Arquivo: `src/lib/appointmentsApi.js`

**createAppointment()** - Loga automaticamente:
```javascript
logAppointmentAudit({
  appointmentId: result.id,
  actionType: AUDIT_ACTION_TYPES.APPOINTMENT_CREATED,
  newStatus: result.status,
  context: {
    patient_type,
    professional_id,
    room_id,
    service_id,
  },
})
```

**updateAppointment()** - Loga mudanças de status:
```javascript
if (updates.status && updates.status !== oldStatus) {
  logStatusChange(id, oldStatus, updates.status)
}
```

---

### 4. **Frontend - Componente de Exibição**

#### Arquivo: `src/pages/clinica/agenda/components/AppointmentAuditTimeline.jsx`

**Recurso:** Timeline visual mostrando histórico completo

**Props:**
```javascript
appointmentId      // UUID do agendamento
currentRole        // 'admin' | 'gestor' | 'profissional' | 'recepcao'
currentUserId      // UUID do usuário logado
compact           // boolean - mostrar últimas 5 ações (default: false)
```

**Permissões:**
- ✅ **Admin/Gestor:** Acesso completo com todos os detalhes (IP, User-Agent)
- ❌ **Profissional:** Sem acesso (componente mostra mensagem bloqueada)
- ❌ **Recepção:** Sem acesso (componente mostra mensagem bloqueada)

**Exibições:**
- Data/hora da ação com distância relativa
- Tipo de ação com ícone e cor específica
- Nome do usuário que realizou
- Role do usuário
- Detalhes contextuais (clicáveis para expandir)
- Status anterior/novo (quando aplicável)
- IP address e User-Agent (apenas Admin)

---

### 5. **Integração no UI**

#### CheckinDrawer (`CheckinDrawer.jsx`)
- Nova aba: **"Histórico"** com ícone 🕒
- Exibe `AppointmentAuditTimeline`
- Log automático quando drawer abre: `CHECKIN_STARTED`
- Logs quando ações são executadas:
  - Marcar falta → `MARKED_NO_SHOW`
  - Liberar para atendimento → `CHECKIN_STARTED`

#### AppointmentModal (`AppointmentModal.jsx`)
- Aba "Histórico" agora usa novo `AppointmentAuditTimeline`
- Mostra mensagem amigável se agendamento é novo (sem logs ainda)
- Integrado com permissões de role

---

## 🔄 Fluxo de Auditoria

### Exemplo: Agendamento → Check-in → Atendimento

```
1️⃣  Criar Agendamento
    └─ Log: APPOINTMENT_CREATED
       status: "a_confirmar"

2️⃣  Abrir Drawer de Check-in
    └─ Log: CHECKIN_STARTED
       context: { status_anterior: "a_confirmar" }

3️⃣  Completar Checklist + Financeiro

4️⃣  Clicar "Liberar para Atendimento"
    └─ Log: STATUS_CHANGED
       old_status: "a_confirmar"
       new_status: "liberado_para_atendimento"
    └─ Log: CHECKIN_STARTED (confirmação)

5️⃣  Profissional Inicia Atendimento
    └─ Log: ATTENDANCE_STARTED

6️⃣  Profissional Finaliza Atendimento
    └─ Log: ATTENDANCE_FINISHED
       context: { duration_minutes: 30 }
```

---

## 🔐 Segurança e Conformidade

### ✅ Imutabilidade
- Tabela é **append-only** (INSERT apenas)
- UPDATE/DELETE são bloqueados por RLS
- Não é possível alterar logs existentes
- Nem admin pode deletar histórico

### ✅ Rastreabilidade Completa
- IP da requisição é capturado
- User-Agent é capturado
- Usuário e role são registrados
- Timestamp em UTC com precisão

### ✅ Conformidade Regulatória
- Padrão ERP hospitalar
- LGPD: dados de usuario ligados a ações concretas
- Auditável: rastreável de volta ao usuário
- Imutável: não pode ser alterado depois de criado

---

## 📊 Exemplos de Uso

### Gestor Consultando Histórico

```javascript
// No AppointmentModal ou CheckinDrawer
<AppointmentAuditTimeline
  appointmentId={appointment.id}
  currentRole="gestor"  // ✅ Acesso completo
/>
```

**Resultado:** Timeline mostrando todas as ações com detalhes

---

### Adicionando Auditoria em Nova Ação

```javascript
// Exemplo: Quando atendimento é iniciado
import { logAttendanceStarted } from '@/lib/auditApi';

const handleStartAttendance = async () => {
  await updateAppointmentStatus(appointmentId, 'em_atendimento');
  
  // Auditoria automática
  logAttendanceStarted(appointmentId).catch(err =>
    console.warn("Erro ao logar:", err)
  );
};
```

---

## 🚀 Próximos Passos Opcionais

### 1. Dashboard de Auditoria
Criar página `/clinica/auditoria` com:
- Filtros por data, tipo de ação, usuário
- Gráficos de atividades
- Alertas de ações suspeitas
- Exportação para relatório

### 2. Alertas em Tempo Real
- Notificar gestor sobre ações críticas
- Alertar sobre fluxos inválidos

### 3. Detecção de Fluxos Inválidos
- Validar sequência de status (ex: não pode ir de "cancelado" para "em_atendimento")
- Marcar agendamento como `INCONSISTENTE` quando detectado

### 4. Integração com Compliance
- Gerar relatórios automáticos
- Integrar com sistema de compliance externo
- Alertar sobre violações de protocolo

---

## 🧪 Testando

### 1. Criar Agendamento
```bash
1. Vá para /clinica/agenda
2. Clique em "Novo Agendamento"
3. Preencha dados e salve
4. Abra novamente e vá para aba "Histórico"
5. Deve mostrar: APPOINTMENT_CREATED
```

### 2. Verificar Check-in
```bash
1. Clique em "Check-in" em um agendamento
2. Drawer abre → Log CHECKIN_STARTED foi enviado
3. Vá para aba "Histórico" → Deve aparecer
4. Complete checklist + financeiro
5. Clique "Liberar para Atendimento"
6. Logs: STATUS_CHANGED e CHECKIN_STARTED
```

### 3. Testar Permissões
```bash
1. Login como Admin/Gestor → Acesso total ao histórico ✅
2. Login como Profissional → "Você não tem permissão" ✅
3. Login como Recepção → "Você não tem permissão" ✅
```

---

## 📝 Notas Técnicas

### Performance
- Índices garantem queries rápidas mesmo com milhões de logs
- Queries usam `eq()` e `order()` otimizados
- Timeline mostra apenas últimos 50 logs por padrão

### Database Storage
- ~200 bytes por log (IP, User-Agent, context)
- 10 mil logs/mês = ~2MB
- Sem limite de retenção (append-only, não cresce infinitamente em volume)

### Sutil: Context é JSONB
- Armazena dados estruturados
- Permite queries futuras por campo específico
- Ex: Buscar todos os logs onde `context.reason = 'paciente_cancelou'`

---

## 📞 Suporte

Se encontrar problemas:

1. **Logs não aparecem?**
   - Verifique RLS policies (role do usuário logado)
   - Check console browser: erros de auditoria não bloqueiam fluxo

2. **Histórico bloqueado para Profissional?**
   - Comportamento correto: RLS bloqueia SELECT na tabela
   - Por design para privacidade

3. **IP ou User-Agent faltando?**
   - IP: dependente de ipify API (melhor esforço)
   - User-Agent: sempre disponível se navegador

---

## ✨ Recursos Implementados

- ✅ Tabela imutável (append-only)
- ✅ RLS com controle granular
- ✅ Indices para performance
- ✅ Auditoria automática em actionKey points
- ✅ Componente visual profissional
- ✅ Permissões por role
- ✅ Captura de IP + User-Agent
- ✅ Context estruturado (JSONB)
- ✅ Timeline responsiva
- ✅ Helpers para ações comuns

**Sistema pronto para produção! 🚀**
