# ✅ CHECKLIST IMPLEMENTAÇÃO — Auditoria Gesclinic Web
**Status:** Auditoria concluída, pronto para implementação  
**Objetivo:** Completar integrações Agenda ↔ Financeiro ↔ Faturamento ↔ Repasse  

---

## 🔴 CRÍTICAS ABSOLUTES (DEVEM SER FEITAS)

### PHASE 1: SQL TRIGGERS & RPCS (2-3h)

- [ ] **T1:** Trigger `trg_create_ar_on_appointment_attended`
  - File: `supabase/migrations/2026-04-11_trigger_appointment_ar_creation.sql`
  - Calls: `create_ar_receivable_from_appointment()`
  - When: `appointment.status='attended'` (first time)
  - Action: INSERT into `ar_receivables` com valor total
  - Test: Create appointment (particular) → mark attended → verify AR in DB

- [ ] **T2:** Trigger `trg_create_tiss_guide_on_appointment_attended`
  - File: `supabase/migrations/2026-04-11_trigger_appointment_guide_creation.sql`
  - Calls: `create_tiss_guide_from_appointment()`
  - When: `appointment.status='attended'` AND `appointment.payer_id IS NOT NULL`
  - Action: INSERT into `billing_guides` com status='draft'
  - Test: Create appointment (convênio) → mark attended → verify guide in DB

- [ ] **T3:** Trigger `trg_cancel_ar_on_appointment_canceled`
  - File: `supabase/migrations/2026-04-11_trigger_appointment_ar_cancellation.sql`
  - Calls: `cancel_ar_receivable_from_appointment()`
  - When: `appointment.status='canceled'` (first time)
  - Action: UPDATE `ar_receivables` SET status='canceled' (soft-delete)
  - Test: Create appointment → mark as attended → cancel → verify AR status

- [ ] **R1:** RPC `calculate_repasse_per_appointment()`
  - File: `supabase/migrations/2026-04-11_rpc_repasse_per_appointment.sql`
  - Logic: service% > group% > professional% (precedência)
  - Returns: NUMERIC (amount)
  - Test: Call with service_id that has % configured → validates precedência

- [ ] **R2:** Function `create_ar_receivable_from_appointment()`
  - Accepts: (clinic_id, appointment_id, payer_name, value)
  - Inserts into `ar_receivables`
  - Returns: NEW row

- [ ] **R3:** Function `create_tiss_guide_from_appointment()`
  - Accepts: (clinic_id, appointment_id, payer_id)
  - Inserts into `billing_guides`
  - Returns: NEW row

- [ ] **R4:** Function `cancel_ar_receivable_from_appointment()`
  - Accepts: (appointment_id)
  - Updates `ar_receivables` status='canceled'
  - Returns: affected rows

**Validation:** Run SQL test suite to confirm NO errors

---

### PHASE 2: API FUNCTIONS (2-3h)

- [ ] **A1:** Complete `appointmentFinancialIntegrationApi.js`
  - File: `src/lib/appointmentFinancialIntegrationApi.js`
  - Implement 5 functions:
    1. `finalizeAppointmentWithFinancials(appointmentId, clinicId)`
    2. `createReceiverFromAppointment(appointmentId, clinicId)`
    3. `createTissGuideFromAppointment(appointmentId, clinicId)`
    4. `cancelAppointmentFinancials(appointmentId, clinicId)`
    5. `calculateAppointmentRepasse(appointmentId, clinicId, profId)`
  - Each calls appropriate RPC from PHASE 1
  - Error handling: graceful fallback if trigger already fired
  - Test: Unit tests for each function

- [ ] **A2:** Update `appointmentsApi.updateAppointmentStatus()`
  - When status changes to 'attended':
    - Call `appointmentFinancialIntegrationApi.finalizeAppointmentWithFinancials()`
    - On error, log but don't block appointment save
  - When status changes to 'canceled':
    - Call `appointmentFinancialIntegrationApi.cancelAppointmentFinancials()`

- [ ] **A3:** Update `CheckinRecepacao.jsx` (OPTIONAL)
  - Remove validation call (trigger now handles)
  - Simplify UX: just display "Financeiro OK" if trigger succeeds

**Validation:** All API functions return expected data shapes

---

### PHASE 3: FATURAMENTO WORKFLOW (4-5h)

- [ ] **F1:** Auto-guide creation working
  - Trigger created in PHASE 1? ✅
  - API function callable from UI? ✅
  - Guide appears in `GuiasPage.jsx`? ✅
  - Test: appointment (convênio) → attended → guide visible in list

- [ ] **F2:** Lote (batch) creation RPC (NEW)
  - File: `supabase/migrations/2026-04-12_rpc_batch_guides_into_lote.sql`
  - Input: guide_ids[], clinic_id
  - Output: lote_id
  - Creates: `lote` row + links guides
  - Test: Create 3 guides → batch into lote → verify relationships

- [ ] **F3:** XML generation RPC (COMPLETE if partial)
  - File: `supabase/migrations/2026-04-12_rpc_generate_xml_from_lote.sql`
  - Input: lote_id, clinic_id
  - Output: XML string (or file_path)
  - Validation: TISS version, estructura correcta
  - Test: Generate XML for lote → parse + validate schema

- [ ] **F4:** UI updates for Faturamento pages
  - `GuiasPage.jsx`: Show auto-created guides from appointments
  - `LotesPage.jsx`: Allow batch-select guides → create lote
  - `XMLPage.jsx`: Show generated XML, download button

**Validation:** End-to-end: appointment → guide (auto) → lote → XML (generated)

---

### PHASE 4: TESTING + REAL DATA (3-4h)

- [ ] **T10:** Integration test: Full flow
  ```
  1. Create appointment (professional + service + convênio + value)
  2. Check-in paciente
  3. Mark attended
  4. Verify in DB:
     - ar_receivables.appointment_id populated
     - billing_guides.appointment_id populated
     - doctor_commissions.valor calculated
  5. Verify in UI:
     - ContasReceber shows new AR
     - GuiasPage shows new guide
     - RepasseDashboard shows accrual
  ```

- [ ] **T11:** Real DRE queries (REPLACE MOCK)
  - File: `src/pages/clinica/financeiro/DashboardDRE.jsx`
  - Replace `getMockDRE()` with real SQL queries
  - Query: `SELECT SUM(valor) FROM ar_receivables WHERE status='received' AND date BETWEEN...`
  - Output: Real income statement (não mock)
  - Test: Run DRE dashboard → verify numbers match database

- [ ] **T12:** Precedência repasse validation
  - Create appointments with:
    - Service-level config (15%)
    - Group-level config (12%)
    - Professional-level config (10%)
  - Mark all as attended
  - Verify repasse: 15% applied (service wins)
  - Test each combination

- [ ] **T13:** Cancellation reversal validation
  - Create appointment → attended → AR created
  - Cancel appointment
  - Verify AR status='canceled'
  - Verify NOT appears in "open" list

**Validation:** All tests pass, no edge cases break

---

## 🟠 IMPORTANTES (Should do)

- [ ] **D1:** Criar documentação visual
  - Diagram: Appointment → AR → Guide → Lote → XML → Retorno (draw.io)
  - Sequence diagram: 5 steps from appointment complete to repasse in AP

- [ ] **D2:** Unit test suite
  - 20+ test cases covering:
    - Trigger firing correctly
    - RPC precedência logic
    - API function error handling
    - E2E workflow

- [ ] **D3:** Performance test
  - Test with 10,000 appointments → trigger speed
  - Identify potential lock contention

- [ ] **R1:** Relatórios consolidados
  - Add page: Production → Billing → Received → Repasse (visual pipeline)
  - Show impact: 1 appointment through entire flow

---

## 🟡 NICE TO HAVE (Can wait)

- [ ] Repasse bruto vs líquido toggle
- [ ] Glosa system (contestation workflow)
- [ ] Multi-unidade support
- [ ] Vigência temporal de configs
- [ ] Bank webhook integration
- [ ] NFe generation

---

## ❌ DO NOT CHANGE

```
🔒 Rotas & menus
🔒 Status enums (12 values)
🔒 Component UI (Radix-based)
🔒 Auth/RBAC
🔒 Existing table structures (only add columns if needed)
```

---

## 📊 PROGRESS TRACKER

```
┌─────────────────────────────────────┬──────┬────────┐
│ Phase                               │ Time │ Status │
├─────────────────────────────────────┼──────┼────────┤
│ PHASE 1: SQL Triggers + RPCs        │ 2-3h │ ⬜    │
│ PHASE 2: API Function Complete      │ 2-3h │ ⬜    │
│ PHASE 3: Faturamento Workflow       │ 4-5h │ ⬜    │
│ PHASE 4: Testing & Real Data        │ 3-4h │ ⬜    │
├─────────────────────────────────────┼──────┼────────┤
│ TOTAL                               │ 13h  │        │
└─────────────────────────────────────┴──────┴────────┘
```

---

## 🎯 DEFINIÇÃO DE "PRONTO"

Sistema estará **pronto quando passar em teste:**

```sql
-- T2a: Novo agendamento → completo → AR criado
SELECT COUNT(*) FROM ar_receivables WHERE appointment_id='APT-123';
-- Expected: 1

-- T2b: Guia TISS automática para convênio
SELECT COUNT(*) FROM billing_guides WHERE appointment_id='APT-456';
-- Expected: 1

-- T2c: Repasse calculado imediatamente
SELECT valor FROM doctor_commissions WHERE appointment_id='APT-789';
-- Expected: numerator > 0

-- T2d: Cancelamento reverte financeiro
UPDATE appointments SET status='canceled' WHERE id='APT-999';
SELECT status FROM ar_receivables WHERE appointment_id='APT-999';
-- Expected: 'canceled'

-- T2e: DRE mostra dados reais
SELECT SUM(valor) FROM ar_receivables WHERE status='received' AND DATE(created_at) >= NOW() - INTERVAL 30;
-- Expected: real amount (não 0 ou mock)
```

---

## 📝 NOTAS

- **Timing:** Estimativa 13 horas para todas as 4 phases. Realista: 15-18h com revisão/ajustes.
- **Dependências:** PHASE 2 depends on PHASE 1. PHASE 3 depends on PHASE 2. PHASE 4 is parallel.
- **Rollback:** Se algo quebra, disable triggers + revert migrations (standard git workflow).
- **Risks:**
  - ⚠️ Triggers on busy table (appointments) → lock contention
  - ⚠️ Auto-creates may duplicate if appointment edited multiple times → idempotency check
  - ⚠️ DRE switch from mock → must verify numbers match accounting rules

---

**PRÓXIMO:** Escolher Phase para começar. Recomendado: PHASE 1 first (SQL, isolated, testable).
