📊 ARQUITETURA VISUAL - ATENDIMENTO UNIFICADO

═══════════════════════════════════════════════════════════════════════════════════
1️⃣  CAMADAS DE APLICAÇÃO
═══════════════════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────────────────────┐
│                          🖥️  BROWSER / FRONTEND                              │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  AgendaPage.jsx                                                         │ │
│  │  ├─ useAuth() → user, clinicId, currentRole                           │ │
│  │  ├─ useClinicContext() → clinic                                        │ │
│  │  ├─ useAgendaStore → selectedSlot, filters                            │ │
│  │  │                                                                      │ │
│  │  ├─ STATE:                                                              │ │
│  │  │  ├─ atendimentoUnificadoOpen: boolean                             │ │
│  │  │  └─ selectedAppointmentForUnified: appointment | null             │ │
│  │  │                                                                      │ │
│  │  ├─ HANDLERS:                                                           │ │
│  │  │  ├─ handleOpenAtendimentoUnificado(appointment)                   │ │
│  │  │  └─ handleCloseAtendimentoUnificado()                             │ │
│  │  │                                                                      │ │
│  │  └─ RENDER:                                                             │ │
│  │     └─ <AtendimentoUnificado ... />                                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ▲                                                │
│                              │ props flow                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  AtendimentoUnificado.jsx (Modal)                                       │ │
│  │                                                                         │ │
│  │  📋 Aba 1: Dados                                                        │ │
│  │    ├─ Paciente (select)                                                │ │
│  │    ├─ Pagador/Convênio (select)                                       │ │
│  │    ├─ Profissional (select)                                           │ │
│  │    └─ Sala (select)                                                   │ │
│  │                                                                         │ │
│  │  📊 Aba 2: Serviços                                                    │ │
│  │    ├─ Tabela com serviços                                             │ │
│  │    ├─ Botão "+ Adicionar"                                            │ │
│  │    └─ Totalizadores (Subtotal, Impostos, Total)                     │ │
│  │                                                                         │ │
│  │  💰 Aba 3: Financeiro                                                  │ │
│  │    ├─ Status (não processado/processando/criado/erro)               │ │
│  │    └─ Valores (gross, impostos, net)                                │ │
│  │                                                                         │ │
│  │  📝 Aba 4: Auditoria                                                  │ │
│  │    └─ Timeline de eventos                                            │ │
│  │                                                                         │ │
│  │  ✅ Aba 5: Check-in                                                    │ │
│  │    ├─ Status presença                                                │ │
│  │    ├─ Horários entrada/saída                                        │ │
│  │    └─ Observações                                                   │ │
│  │                                                                         │ │
│  │  VALIDAÇÃO:                                                             │ │
│  │  ├─ Badge RED → YELLOW → GREEN                                        │ │
│  │  ├─ Campos obrigatórios validados                                    │ │
│  │  └─ Botões habilitados/desabilitados dinamicamente                  │ │
│  │                                                                         │ │
│  │  QUERIES (React Query):                                                │ │
│  │  ├─ useQuery('payers') → listPayers()                                │ │
│  │  ├─ useQuery('services') → listServices()                            │ │
│  │  ├─ useQuery('professionals') → listProfessionals()                  │ │
│  │  ├─ useQuery('rooms') → listRooms()                                  │ │
│  │  └─ useQuery('patients') → listPatients()                            │ │
│  │                                                                         │ │
│  │  MUTATIONS (React Query):                                              │ │
│  │  ├─ useMutation(finalizeAppointmentWithFinancials)                   │ │
│  │  ├─ useMutation(saveAppointment)                                      │ │
│  │  ├─ useMutation(addService)                                           │ │
│  │  └─ useMutation(removeService)                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ▲                                                │
│                              │ HTTP calls                                     │
└──────────────────────────────┼────────────────────────────────────────────────┘
                               │
                               │ (JSON over HTTPS)
                               │
┌──────────────────────────────▼────────────────────────────────────────────────┐
│                         🔧 SERVICE LAYER                                       │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  appointmentFinancialIntegrationApi.ts (33+ functions)                 │ │
│  │                                                                         │ │
│  │  CORE FUNCTIONS:                                                        │ │
│  │  ├─ finalizeAppointmentWithFinancials(appointmentId, clinicId)       │ │
│  │  │  └─ POST /rpc/create_receivable_from_appointment                  │ │
│  │  │                                                                      │ │
│  │  ├─ validateAppointmentDataIntegrity(appointmentId)                  │ │
│  │  │  └─ Checks: paciente, profissional, valor_total not NULL         │ │
│  │  │                                                                      │ │
│  │  ├─ reprocessAppointmentFinancials(appointmentId)                    │ │
│  │  │  └─ Retry com rollback de mapping anterior                       │ │
│  │  │                                                                      │ │
│  │  ├─ listFinancialAuditLogs(clinicId, filters)                        │ │
│  │  │  └─ SELECT from financial_audit_logs                             │ │
│  │  │                                                                      │ │
│  │  ├─ getAppointmentFinancialStatus(appointmentId)                     │ │
│  │  │  └─ Returns: 'not_processed' | 'pending' | 'completed' | 'error' │ │
│  │  │                                                                      │ │
│  │  ├─ bulkCreateReceivables(appointmentIds)                            │ │
│  │  │  └─ Batch process múltiplos agendamentos                        │ │
│  │  │                                                                      │ │
│  │  ├─ getFinancialStatsByDateRange(clinicId, start, end)              │ │
│  │  │  └─ Relatórios com breakdown por imposto                        │ │
│  │  │                                                                      │ │
│  │  ├─ calculateTaxes(appointmentId, payerType)                         │ │
│  │  │  └─ Motor de impostos v2.0                                        │ │
│  │  │     ├─ PIS (1.65%)                                               │ │
│  │  │     ├─ COFINS (7.6%)                                             │ │
│  │  │     ├─ CSLL (1%)                                                 │ │
│  │  │     ├─ IR (0.5% - 5%)                                            │ │
│  │  │     └─ ISSQN (variável por município)                           │ │
│  │  │                                                                      │ │
│  │  ├─ determinePayerType(appointment)                                  │ │
│  │  │  └─ 'particular' | 'convenio' | 'corporate'                      │ │
│  │  │                                                                      │ │
│  │  └─ Error handling + retry logic + logging                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  appointmentsApi.ts (CRUD operations)                                  │ │
│  │  ├─ listAppointments()                                                │ │
│  │  ├─ getAppointmentById()                                              │ │
│  │  ├─ createAppointment()                                               │ │
│  │  ├─ updateAppointment()                                               │ │
│  │  └─ deleteAppointment()                                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  servicesApi.ts, payersApi.ts, roomsApi.ts, patientsApi.ts            │ │
│  │  └─ list, get, create, update, delete operations                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ▲                                                │
│                              │ HTTP + Supabase Client                         │
└──────────────────────────────┼────────────────────────────────────────────────┘
                               │
                               │ (JSON over HTTPS)
                               │
┌──────────────────────────────▼────────────────────────────────────────────────┐
│                    ☁️  SUPABASE BACKEND (PostgreSQL)                          │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─ TABLE: appointments                                                     │ │
│  │  ├─ id, clinic_id, patient_id, professional_id                         │ │
│  │  ├─ payer_id, room_id, status, value_total                            │ │
│  │  ├─ scheduled_at, completed_at, notes                                 │ │
│  │  └─ RLS: clinic_id isolation                                          │ │
│  │                                                                         │ │
│  ├─ TABLE: ar_invoices                                                    │ │
│  │  ├─ id, clinic_id, appointment_id, payer_id                           │ │
│  │  ├─ valor_gross, impostos_totais, valor_liquido                       │ │
│  │  ├─ status ('open'|'paid'|'canceled'|'partial'|'scheduled')          │ │
│  │  ├─ payment_status, due_date, created_at, updated_at                 │ │
│  │  └─ RLS: clinic_id isolation                                          │ │
│  │                                                                         │ │
│  ├─ TABLE: financial_audit_logs ⭐ NOVO                                    │ │
│  │  ├─ id, clinic_id, appointment_id                                      │ │
│  │  ├─ event_type (JSONB: APPOINTMENT_DATA_FETCHED, RECEIVABLE_CREATED) │ │
│  │  ├─ event_data (JSONB: metadata, valores, erros)                     │ │
│  │  ├─ created_at                                                         │ │
│  │  ├─ Indexes: (clinic_appointment), (clinic_created_at), (appointment) │ │
│  │  └─ RLS: clinic_id isolation                                          │ │
│  │                                                                         │ │
│  ├─ TABLE: appointment_to_receivable_mapping ⭐ NOVO                       │ │
│  │  ├─ id, appointment_id, receivable_id                                  │ │
│  │  ├─ created_at                                                         │ │
│  │  └─ Foreign keys para audit trail                                     │ │
│  │                                                                         │ │
│  ├─ TABLE: cash_flow_entries                                              │ │
│  │  ├─ id, clinic_id, appointment_id, receivable_id                      │ │
│  │  ├─ type ('projected'|'actual'|'estimated')                          │ │
│  │  ├─ valor, status, created_at                                         │ │
│  │  └─ RLS: clinic_id isolation                                          │ │
│  │                                                                         │ │
│  ├─ RPC: create_receivable_from_appointment() ⭐ NOVO                     │ │
│  │  ├─ Input: p_appointment_id, p_clinic_id, p_rule_id                  │ │
│  │  ├─ Process (8 steps):                                                │ │
│  │  │  1️⃣  Fetch & validate appointment                                  │ │
│  │  │  2️⃣  Check if mapping exists (prevent duplicate)                  │ │
│  │  │  3️⃣  Validate data integrity (required fields)                    │ │
│  │  │  4️⃣  Determine payer type                                         │ │
│  │  │  5️⃣  Calculate taxes (5 types)                                    │ │
│  │  │  6️⃣  Create receivable in ar_invoices                            │ │
│  │  │  7️⃣  Create mapping in appointment_to_receivable_mapping         │ │
│  │  │  8️⃣  Update cash_flow_entries                                    │ │
│  │  ├─ Output: JSONB {success, receivable_id, values, error}            │ │
│  │  ├─ Security: SECURITY DEFINER, RLS aware                            │ │
│  │  └─ Error handling: Try-catch com logging em financial_audit_logs   │ │
│  │                                                                         │ │
│  ├─ TRIGGER: trigger_appointment_completed ⭐ NOVO                        │ │
│  │  ├─ WHEN: UPDATE appointments SET status = 'completed'               │ │
│  │  ├─ ACTION: Call create_receivable_from_appointment()                │ │
│  │  └─ LOG: Registra em financial_audit_logs                            │ │
│  │                                                                         │ │
│  ├─ TRIGGER: trigger_receivable_created ⭐ NOVO                          │ │
│  │  ├─ WHEN: INSERT INTO ar_invoices                                    │ │
│  │  └─ ACTION: Log em financial_audit_logs                              │ │
│  │                                                                         │ │
│  ├─ TRIGGER: trigger_receivable_updated ⭐ NOVO                          │ │
│  │  ├─ WHEN: UPDATE ar_invoices (status change)                         │ │
│  │  └─ ACTION: Log em financial_audit_logs                              │ │
│  │                                                                         │ │
│  └─ INDEXES: 3 performance indexes em financial_audit_logs              │ │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
2️⃣  FLUXO DE DADOS - USER INTERACTION
═══════════════════════════════════════════════════════════════════════════════════

USER CLICKS APPOINTMENT
         │
         ▼
┌────────────────────────────────┐
│ handleOpenAtendimentoUnificado │
│ setSelectedAppointmentForUnified
│ setAtendimentoUnificadoOpen(true)
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ <AtendimentoUnificado isOpen={true}│
│  appointment={selectedAppointment} │
│  clinicId={clinicId} />            │
└────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ QUERIES EXECUTE IN PARALLEL:     │
│ • listPayers()                   │
│ • listServices()                 │
│ • listProfessionals()            │
│ • listRooms()                    │
│ • listPatients()                 │
└──────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ MODAL RENDERS 5 TABS:          │
│ ✅ Aba 1: Dados (populated)   │
│ ✅ Aba 2: Serviços (empty)    │
│ ✅ Aba 3: Financeiro (empty)  │
│ ✅ Aba 4: Auditoria (empty)   │
│ ✅ Aba 5: Check-in (empty)    │
└────────────────────────────────┘
         │
         ▼
   USER INTERACTS:
   ├─ Preencha dados (Aba 1)
   ├─ Adicione serviços (Aba 2)
   ├─ Observe valores (Aba 3)
   ├─ Preencha check-in (Aba 5)
   └─ Clique "Finalizar Atendimento"
         │
         ▼
┌────────────────────────────────────────┐
│ MUTATION: finalizeAppointmentWithFin.. │
│ POST /rpc/create_receivable_from_app..│
│ Body: {                                │
│   p_appointment_id: "uuid",            │
│   p_clinic_id: "uuid",                 │
│   p_rule_id: null                      │
│ }                                      │
└────────────────────────────────────────┘
         │ (HTTP HTTPS over TLS)
         ▼
┌────────────────────────────────────────┐
│ SUPABASE RPC EXECUTION:                │
│                                        │
│ Step 1️⃣: Fetch appointment             │
│   SELECT * FROM appointments           │
│   WHERE id = $1 AND clinic_id = $2    │
│                                        │
│ Step 2️⃣: Check if mapping exists       │
│   SELECT 1 FROM                        │
│   appointment_to_receivable_mapping    │
│   WHERE appointment_id = $1            │
│                                        │
│ Step 3️⃣: Validate data integrity       │
│   IF patient_id IS NULL                │
│   OR professional_id IS NULL           │
│   OR value_total IS NULL               │
│   THEN error                           │
│                                        │
│ Step 4️⃣: Determine payer type          │
│   SELECT payer_type FROM payers        │
│   WHERE id = appointment.payer_id     │
│                                        │
│ Step 5️⃣: Calculate taxes               │
│   v_value_gross := appointment.value   │
│   v_value_taxes := gross * 0.15        │
│   v_value_net := gross - taxes        │
│                                        │
│ Step 6️⃣: Create receivable              │
│   INSERT INTO ar_invoices (            │
│     clinic_id, appointment_id,         │
│     valor_gross, impostos_totais,     │
│     valor_liquido, status              │
│   ) VALUES (...)                       │
│   RETURNING id                         │
│                                        │
│ Step 7️⃣: Create mapping                │
│   INSERT INTO                          │
│   appointment_to_receivable_mapping (  │
│     appointment_id, receivable_id      │
│   ) VALUES (...)                       │
│                                        │
│ Step 8️⃣: Update cashflow               │
│   INSERT INTO cash_flow_entries (      │
│     clinic_id, appointment_id,         │
│     type, valor, reference_id          │
│   ) VALUES (...)                       │
│                                        │
│ ✅ LOG: All steps to financial_audit_logs
└────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ TRIGGERS AUTO-EXECUTE:               │
│                                      │
│ • trigger_receivable_created()       │
│   └─ Log: RECEIVABLE_CREATED_EVENT  │
│      → financial_audit_logs          │
│                                      │
│ • trigger_receivable_updated()       │
│   (if status changed)                │
│   └─ Log: RECEIVABLE_STATUS_UPDATED │
│      → financial_audit_logs          │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ RPC RESPONSE:                        │
│ {                                    │
│   "success": true,                   │
│   "receivable_id": "uuid",          │
│   "valor_gross": 1200.00,           │
│   "impostos_totais": 180.00,        │
│   "valor_liquido": 1020.00,         │
│   "status": "created"               │
│ }                                    │
└──────────────────────────────────────┘
         │ (HTTP response)
         ▼
┌──────────────────────────────────┐
│ FRONTEND UPDATES:                │
│                                  │
│ • Status badge: "Processando.." →
│   "✓ Criado" (GREEN)             │
│ • Aba Financeiro se atualiza    │
│ • Aba Auditoria mostra eventos  │
│ • React Query cache invalidated │
└──────────────────────────────────┘
         │
         ▼
   USER CLOSES MODAL
         │
         ▼
┌────────────────────────────────┐
│ handleCloseAtendimentoUnificado│
│ setAtendimentoUnificadoOpen(false)
│ setSelectedAppointment(null)    │
│ agenda.loadAppointments()       │
│ (reload appointments from DB)   │
└────────────────────────────────┘
         │
         ▼
    ✅ FLUXO CONCLUÍDO
       Receivable criado automaticamente
       Audit trail registrada
       Agenda atualizada

═══════════════════════════════════════════════════════════════════════════════════
3️⃣  COMPONENTES & DEPENDÊNCIAS
═══════════════════════════════════════════════════════════════════════════════════

REACT COMPONENTS:
├─ AgendaPage.jsx
│  ├─ useState(atendimentoUnificadoOpen)
│  ├─ useState(selectedAppointmentForUnified)
│  ├─ useAuth()
│  ├─ useClinicContext()
│  ├─ useAgendaStore()
│  └─ renders: <AtendimentoUnificado />
│
└─ AtendimentoUnificado.jsx
   ├─ useQuery('payers', listPayers)
   ├─ useQuery('services', listServices)
   ├─ useQuery('professionals', listProfessionals)
   ├─ useQuery('rooms', listRooms)
   ├─ useQuery('patients', listPatients)
   ├─ useMutation(finalizeAppointmentWithFinancials)
   ├─ useMutation(saveAppointment)
   ├─ useMutation(addService)
   ├─ useMutation(removeService)
   └─ renders: 5 Tabs
      ├─ Tab 1: FormData (Radix Dialog + Inputs)
      ├─ Tab 2: ServiceTable + AddServiceForm
      ├─ Tab 3: FinancialStatus (Status badges)
      ├─ Tab 4: AuditTimeline (Event list)
      └─ Tab 5: CheckInForm (Presence + times)

EXTERNAL DEPENDENCIES:
├─ React 18
├─ React Router v6
├─ @tanstack/react-query
├─ Radix UI (Dialog, Input, Select, Button, Tabs)
├─ TailwindCSS
├─ Supabase JS Client
└─ TypeScript

API CLIENTS:
├─ customSupabaseClient.js (singleton)
├─ appointmentFinancialIntegrationApi.ts
├─ appointmentsApi.ts
├─ servicesApi.ts
├─ payersApi.ts
├─ roomsApi.ts
└─ patientsApi.ts

═══════════════════════════════════════════════════════════════════════════════════
4️⃣  SEGURANÇA & RLS (Row Level Security)
═══════════════════════════════════════════════════════════════════════════════════

RLS POLICIES (Supabase):

financial_audit_logs:
├─ SELECT: Users can view audit logs for their clinic
│  └─ WHERE clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
└─ INSERT: System only (SECURITY DEFINER RPC)

ar_invoices:
├─ (assumed existing)
└─ Clinic isolation via clinic_id

appointments:
├─ (assumed existing)
└─ Clinic isolation via clinic_id

AUTHENTICATION:
├─ JWT token from Supabase Auth
├─ User context via useAuth()
├─ Clinic context via useClinicContext()
└─ Role-based access control via user_clinic_roles

DATA ISOLATION:
├─ Every query filters by clinic_id
├─ RPC operates in SECURITY DEFINER mode
├─ Frontend cannot directly call RPC (goes through API layer)
└─ Audit trail registers all actions

═══════════════════════════════════════════════════════════════════════════════════
