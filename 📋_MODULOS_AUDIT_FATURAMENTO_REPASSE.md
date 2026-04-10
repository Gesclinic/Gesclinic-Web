# MÓDULOS AUDIT: FATURAMENTO + REPASSE MÉDICO
**Data:** 9 de abril de 2026  
**Status Geral:** Faturamento ~30% | Repasse ~75%  
**Objetivo:** Análise detalhada de integração, status, gaps

---

## 🟥 MÓDULO 1: FATURAMENTO (TISS/Billing)

### 1.1 INVENTÁRIO COMPLETO

#### 📄 **Páginas & Views** (9 arquivos)
| Arquivo | Rota | Status | Descrição |
|---------|------|--------|-----------|
| `FaturamentoPage.jsx` | `/clinica/faturamento` | ✅ Funcional | Hub/Dashboard principal com 6 submódulos |
| `GuiasPage.jsx` | `/clinica/faturamento/guias` | ⚠️ Parcial | Tabbed: Consulta (parcial), Internação (stub), SADT (stub) |
| `GuiasConsulta.jsx` | (subcomponente) | ⚠️ 40% | CRUD em mock data, falta integrar API realmente |
| `XMLPage.jsx` | `/clinica/faturamento/xml` | ❌ Vazio | XML generation/envio não implementado |
| `LotesPage.jsx` | `/clinica/faturamento/lotes` | ❌ Vazio | Batch processing stubs |
| `RetornosPage.jsx` | `/clinica/faturamento/retornos` | ❌ Vazio | Return/receipt management não feito |
| `RelatoriosPage.jsx` | `/clinica/faturamento/relatorios` | ⚠️ 20% | Menu de vários relatórios (items todos vazios) |
| `tiss/GuiasConsulta.jsx` | (subcomponente) | ⚠️ 40% | Idem GuiasPage.jsx duplicado |
| `tiss/RetornosRecibos.jsx` | (subcomponente) | ❌ Vazio | Retornos/recibos não implementado |
| `tiss/LotesEnvio.jsx` | (subcomponente) | ❌ Vazio | Lotes não implementado |
| `sadt/NovaGuiaSADT.jsx` | (subcomponente) | ❌ Vazio | SADT guides (não começado) |
| `relatorios/RelatorioProducaoProfissional.jsx` | (subcomponente) | ❌ Vazio | Relatório por profissional |
| `relatorios/RelatorioProducaoPeriodo.jsx` | (subcomponente) | ❌ Vazio | Relatório por período |
| `relatorios/RelatorioProducaoConvenio.jsx` | (subcomponente) | ❌ Vazio | Relatório por convênio |
| `relatorios/RelatorioLotesGlosas.jsx` | (subcomponente) | ❌ Vazio | Relatórios de glosas |

**Resumo Páginas:** 15 arquivos | 2 funcionais | 13 vazios/stubs

#### 🔌 **API Functions** (guiasApi.js)
| Função | Status | Usado em | Notas |
|--------|--------|---------|-------|
| `listarGuias(clinicId, filters)` | ✅ Pronto | GuiasConsulta | Filtra por tipo, status, período |
| `buscarGuia(guiaId)` | ✅ Pronto | GuiasConsulta | Fetch single |
| `criarGuia(clinicId, dados)` | ⚠️ Parcial | GuiasConsulta | Validação OK, sem auto-linkagem a appointment |
| `atualizarGuia(guiaId, dados)` | ✅ Pronto | GuiasConsulta | Update básico |
| `deletarGuia(guiaId)` | ✅ Pronto | GuiasConsulta | Delete com validação |
| `atualizarStatusGuia(guiaId, status)` | ✅ Pronto | GuiasConsulta | Status: "Aguardando XML", "XML Gerado", "Enviado", "Pago", "Glosado" |
| `gerarNumeroGuia(clinicId)` | ✅ Pronto | GuiasConsulta | Auto-sequence: GC{num}-{ano}-001 |

**Resumo APIs:** 7 funções | 6 prontas | 1 parcial (sem auto-link)

#### 🗄️ **Database Schema**
```sql
Table: billing_guides
├── id (UUID)
├── clinic_id (FK clinics)
├── numero_guia (VARCHAR UNIQUE) -- GC001-2025-001
├── tipo_guia (VARCHAR) -- 'SP', 'SADT', 'Internação'
├── status (VARCHAR) -- Estados acima
├── paciente_nome, numero_carteirinha
├── convenio, plano
├── profissional, codigo_cbhpm (TUSS/CBHPM code)
├── valor (DECIMAL)
├── observacoes, xml_path
├── data_criacao, data_atualizacao, data_envio, data_processamento
└── Índices: clinic_id, numero_guia, status, tipo_guia, data_criacao, numero_carteirinha, paciente_nome
   RLS: Habilitado (validação por clinic_id)

Constraints:
├── numero_carteirinha NOT EMPTY
└── UNIQUE numero_guia
```

**Status Tabela:** ✅ Criada e com RLS, mas:
- ❌ Sem FK para appointments (não linkada)
- ❌ Sem FK para professionals (texto solto)
- ❌ Sem FK para payers (texto solto)
- ❌ xml_path nunca preenchido (XML nunca gerado)

#### 🔗 **Integration Points** (CRÍTICO)

**1. AUTO-CREATION FROM APPOINTMENTS** ❌
- **Esperado:** Ao marcar atendimento como "concluído" ou "faturado", gerar automaticamente guia
- **Atual:** Manual - usuário cria guia manualmente via UI
- **Falta:** Trigger no appointments ou chamada em syncAppointmentBilling
- **Impacto:** Workflow de 15+ cliques/guia vs automático
- **Esforço:** 2-3h (criar FK, trigger ou RPC gerar_guia)

**2. LINK COM AR RECEIVABLES** ❌
- **Esperado:** Guia TISS → AR invoice (faturamento do paciente/convênio)
- **Atual:** Desacoplado - billing_guides não FK ar_receivables
- **Falta:** Sincronização direcional (guia → AR ou AR → guia)
- **Impacto:** Dupla contagem / falta rastreabilidade
- **Esforço:** 1-2h (add foreign key, sync API)

**3. XML GENERATION** ❌
- **Esperado:** Gerar arquivo XML TISS padrão (padrão ANS)
- **Atual:** Campo xml_path existe mas nunca preenchido
- **Falta:** Gerador XML, serialização, save para storage
- **Impacto:** Nenhuma guia pode ser enviada
- **Esforço:** 6-8h (implementar schema TISS XML, serializer, S3 upload)

**4. RETURNS/DENIALS (GLOSAS)** ❌
- **Esperado:** Receber retorno da operadora → status "Glosado" + % deduzido
- **Atual:** Status existe mas nunca usado
- **Falta:** Tabela de_glosas, API import, match com guias
- **Impacto:** Sem tracking de rejeições
- **Esforço:** 4-5h (tabela glosas, import XML, match logic)

**5. VALIDATION CASCADE** ⚠️
- **Implementação:** `tiskCascadeValidationApi.js` exists - valida Service, Professional, Payer TISS
- **Funções:** `validateServiceTISSCompleteness`, `validateProfessionalTISSCompleteness`, `validatePayerTISSCompleteness`, `validateTISSXMLGenerationCascade`
- **Status:** ✅ Validação lógica pronta, mas:
  - Não é chamado na criação de guia
  - Services sem TUSS code podem ser criados
  - Erro: "⚠️ CRÍTICO: Número de credencial vazio" - mas nunca triggered
- **Impacto:** Validação morta no código
- **Esforço:** 1h integração em criarGuia()

### 1.2 CURRENT STATUS SUMMARY

| Aspecto | Status | % |
|---------|--------|---|
| **Pages Implementadas** | 2/15 estruturadas | 13% |
| **APIs Criadas** | 7/7 básicas prontas | 100% |
| **DB Schema** | Tabla OK, sem FKs | 40% |
| **Auto-Create from Appt** | Não existe | 0% |
| **XML Generation** | Não existe | 0% |
| **Returns/Glosas** | Schema ausente | 0% |
| **Validation** | Lógica pronta, desacoplada | 30% |
| **Overall Faturamento** | ~30% funcional | - |

### 1.3 WHAT WORKS
- ✅ Criar/editar/deletar guia via UI
- ✅ Listar guias com filtros
- ✅ Auto-geração de número sequencial
- ✅ Status tracking básico
- ✅ Validação de dados TISS existe (não usada)
- ✅ RLS segurança por clinic

### 1.4 WHAT DOESN'T WORK / GAPS

| Problema | Impacto | Esforço | Prioridade |
|----------|---------|---------|-----------|
| Sem auto-create de guias → Agenda | Manual workflow 15+ cliques | 2-3h | 🔴 CRITICAL |
| Sem XML generation | Não pode enviar nada | 6-8h | 🔴 CRITICAL |
| Sem link AR receivables | Dupla contagem financeira | 1-2h | 🔴 CRITICAL |
| Sem returns/glosas tracking | Sem rejeição visibility | 4-5h | 🟡 HIGH |
| SADT/Internação vazios | Só SP implementada | 3-4h | 🟠 MEDIUM |
| Relatórios vazios | Dashboard não mostra nada | 2-3h | 🟠 MEDIUM |
| Validação TISS desacoplada | Pode gerar guia inválida | 1h | 🟠 MEDIUM |
| Batch (Lotes) vazio | Sem batch submit | 2-3h | 🟠 MEDIUM |

**Total Effort to MVP:** ~22-30h

### 1.5 RECOMMENDED QUICK WINS (2 days)

1. **Connect guia to appointment FK** (1h)
   ```sql
   ALTER TABLE billing_guides ADD COLUMN appointment_id UUID REFERENCES appointments(id);
   ```

2. **Wire TISS validation to criarGuia()** (1h)
   ```js
   // In guiasApi.criarGuia, call validateTISSXMLGenerationCascade
   ```

3. **Basic XML stub generator** (3h)
   ```js
   // Generate minimal TISS XML structure (schema + root only)
   // Save to /public/xmls/{guiaId}.xml
   ```

4. **Auto-create guide trigger from appointment** (2h)
   ```sql
   CREATE TRIGGER trg_auto_guide_on_appointment
   AFTER UPDATE ON appointments
   WHEN (NEW.status = 'completed' AND NEW.payer_id IS NOT NULL)
   ```

5. **Connect to AR workflow** (1h)
   - When guide status → "Enviado", create ar_receivables entry

---

## 🟨 MÓDULO 2: REPASSE MÉDICO (Medical Repasse)

### 2.1 INVENTÁRIO COMPLETO

#### 📄 **Páginas & Views** (9 arquivos)
| Arquivo | Rota | Status | Descrição |
|---------|------|--------|-----------|
| `RepasseMedicoPage.jsx` | `/clinica/financeiro/repasse` | ✅ 80% Funcional | Dashboard: Gerar, Listar, Detalhe (alguns dados OK) |
| `RepasseRegrasPage.jsx` | `/clinica/financeiro/repasse/regras` | ⚠️ 60% | CRUD regras (pronto mas não totalmente wired) |
| `RepasseConfigPage.jsx` | `/clinica/financeiro/repasse/config` | ✅ 80% | Config 70/30 % por profissional |
| `RepasseAjustePage.jsx` | `/clinica/financeiro/repasse/ajuste` | ✅ 70% | Registrar ajustes/correções manuais |
| `RepasseDashboardPage.jsx` | `/clinica/financeiro/repasse/dashboard` | ⚠️ 40% | Stats exec (mock data mostly) |
| `RepasseDashboardAnalyticsPage.jsx` | `/clinica/financeiro/repasse/analytics` | ⚠️ 30% | Analytics tab (stubs) |
| `RepasseAutomacaoPage.jsx` | `/clinica/financeiro/repasse/automacao` | ❌ 10% | Automation rules (mostly stubs) |
| `RepasseTransferenciaPage.jsx` | `/clinica/financeiro/repasse/transferencia` | ⚠️ 40% | Bank transfer execution (stubs) |
| `RepasseMedicoLayout.jsx` | (wrapper) | ✅ Funcional | Tab layout container |

**Resumo Páginas:** 9 arquivos | 4 funcionais | 3 parciais | 2 vazios

#### 🔌 **Primary API Functions** (medicalRepasseApi.js)

| Função | Status | RF (Repasse Flow) | Notas |
|--------|--------|-------------------|-------|
| `listarConfigRepasse(clinicId)` | ✅ Pronto | Config | Lê medical_repasse_config |
| `obterConfigRepasse(clinicId, profId)` | ✅ Pronto | Config | Single record |
| `salvarConfigRepasse(clinicId, profId, %)` | ✅ Pronto | Config | Upsert 70/30 split |
| `registrarProducao(clinicId, profId, data)` | ✅ Pronto | Production | Insere em medical_production |
| `listarProducaoPeriodo(clinicId, profId, start, end)` | ✅ Pronto | Production | Query period range |
| `calcularRepasse(clinicId, profId, start, end)` | ✅ Pronto | Calc | Chama RPC calcular_repasse |
| `obterRepassePeriodo(...)` | ✅ Pronto | Query | Fetch medical_repasse result |
| `listarRepassesPeriodo(clinicId, start, end, status)` | ✅ Pronto | Query | All professionals period |
| `historicoProfissional(clinicId, profId, limit)` | ✅ Pronto | History | Last N months |
| `dashboardRepasseMedico(clinicId, start_date, end_date)` | ⚠️ Partial | Dashboard | Reads doctor_commissions table (from RPC v2) |

**Resumo medicalRepasseApi:** 10 funções | 9 prontas | 1 parcial

#### 🔌 **Secondary APIs**

| API File | Funções | Status | Uso |
|----------|---------|--------|-----|
| `repasseMedicoApi.js` | 6 | ✅ Pronto | Legacy repasse (gerarRepasse, listarRepasses, dashboard, ajustar, liberar payment) |
| `repasseConfigApi.js` | 3 | ✅ Pronto | repasse_config CRUD (listarRegrasRepasse, criarOuAtualizar, deletar) |
| `repasseSchedulerApi.js` | 4 | ⚠️ 50% | Scheduler - has agendarMensal (stub), executarAutomatico (broken date), histórico |
| `repassePdfApi.js` | ? | ❓ Unknown | PDF generation (not reviewed) |
| `repasseEmailApi.js` | ? | ❓ Unknown | Email dispatch (not reviewed) |
| `repasseBancariaApi.js` | 8 | ❌ 20% | Bank transfer - mostly stubs |
| `agendaIntegrationRepasseApi.js` | ? | ❓ Unknown | Agenda ↔ Repasse integration |

#### 🗄️ **Database Schema** (3 main tables)

```sql
Table 1: repasse_config
├── id (UUID)
├── clinic_id (FK clinics)
├── professional_id (FK professionals)
├── percentual_profissional (5,2) -- 70 default
├── percentual_clinica (5,2) -- 30 default
├── aplicar_imposto (BOOLEAN)
├── aplicar_glosa (BOOLEAN)
├── ativo (BOOLEAN)
├── created_at, updated_at
└── UNIQUE (clinic_id, professional_id)

Table 2: doctor_commissions [NEW - created by RPC v2]
├── id (UUID)
├── clinic_id (FK clinics)
├── professional_id (FK professionals)
├── reference_month (INTEGER) -- 1-12
├── reference_year (INTEGER) -- 2026
├── calc_mode (VARCHAR) -- 'atendido'
├── total_services (INTEGER) -- count of appts
├── gross_amount (DECIMAL) -- total valor
├── total_paid (DECIMAL)
├── total_pending (DECIMAL)
├── net_amount (DECIMAL) -- 70% of gross
├── commission_percent (5,2) -- 70
├── status (VARCHAR) -- 'pending', 'paid'
├── payment_method, paid_at
├── created_at, updated_at
└── UNIQUE (clinic_id, professional_id, reference_month, reference_year, calc_mode)

Table 3: repasse_medico [LEGACY]
├── id, clinic_id, professional_id
├── period_start, period_end (DATE)
├── total_appointments, total_revenue
├── amount_due, amount_paid
├── status, payment_date, notes
├── created_at, updated_at
└── Indexes por clinic, professional, status, period

Table 4: medical_repasse_config [ALTERNATIVE - from 20260318 migration]
├── id, clinic_id, professional_id
├── percentual_profissional, percentual_clinica
├── aplicar_imposto, aplicar_glosa
├── ativo, created_at, updated_at
└── UNIQUE (clinic_id, professional_id)

Table 5: medical_production [ALTERNATE]
├── id, clinic_id, professional_id
├── atendimento_id (FK appointments?)
├── tipo ('consulta', 'exame', 'cirurgia')
├── valor_bruto, valor_liquido
├── data_atendimento
├── created_at

Table 6: medical_repasse [ALTERNATE RESULT]
├── id, clinic_id, professional_id
├── periodo_inicio, periodo_fim
├── total_bruto, total_liquido
├── valor_profissional, valor_clinica
├── status ('pendente', 'processado', 'pago')
├── created_at, updated_at
```

**Schema Status:** ⚠️ CRITICAL - 3 DIFFERENT SCHEMAS IN PARALLEL!
- `doctor_commissions` (20260409 - LATEST) - Used by v2 generate function
- `repasse_medico` (20260113 - LEGACY) - Old schema still in migrations
- `medical_repasse_config` + `medical_production` + `medical_repasse` (20260318 - ALTERNATIVE) - Also in migrations

**Risk:** Confusion about which tables are authoritative. Code uses `doctor_commissions` but multiple schema tables exist.

#### 🔗 **Integration Points**

**1. AUTO-CALCULATION FROM APPOINTMENTS** ⚠️ PARTIAL
- **Mechanism:** `generate_doctor_commissions_v2(clinic_id, month, year, mode)` RPC
  ```sql
  -- Queries appointments table for period
  -- Sums appointments.value for each professional
  -- Creates doctor_commissions record (70% net)
  ```
- **Current:** Manual trigger needed (user clicks "Gerar Repasse" button)
- **Expected:** Should run automatically on last day of month OR on appointment completion
- **Status:** ⚠️ Logic ready, trigger missing
- **Linkage:** RPC queries `appointments` directly ✅
  - Filters: clinic_id, professional_id, date range, value > 0
  - Groups: per professional
  - Calculates: gross (sum value), net (70% of gross)

**2. LINK TO FINANCIAL (AP Bills)** ⚠️ PARTIAL
- **Expected:** When repasse marked "paid", create ap_bill (Contas a Pagar)
- **Current:** `liberarRepasseParaPagamento(repasseId)` calls RPC `liberar_repasse_pagamento`
  - ⚠️ RPC not reviewed - may or may not create AP entry
- **Status:** Partially implemented
- **Gap:** No link to cost centers or chart of accounts (financial entries orphaned)

**3. LINK TO BILLING (faturamento guides)** ❌ NO
- **Expected:** Repasse based on BILLED amount (after glosas), not appointments
- **Current:** Repasse based on appointment value only
- **Impact:** If guide glosado (50% rejection), repasse still 100%
- **Status:** Not implemented
- **Effort:** Requires integration with billing_guides table

**4. PRECEDENCE RULES (Service > Group > Professional)** ❌ NO
- **Expected:** Per-service repasse % (e.g., cardiac 80%, generic 60%)
- **Current:** Only professional-level config exists (70/30)
- **Status:** Not implemented
- **Effort:** Needs repasse_config_servico table + logic

**5. 70/30 SPLIT CALCULATION** ✅ YES
- **Implementation:** RPC `generate_doctor_commissions_v2`
- **Logic:** 
  - Gross = SUM(appointments.value) for period
  - Net (professional) = Gross * 0.70
  - Clinic share = implicit (30% stays in balance)
- **Status:** Working correctly
- **Note:** Hardcoded 70 - does not read from repasse_config

**6. SCHEDULER FOR AUTO-GENERATION** ⚠️ BROKEN
- **File:** `repasseSchedulerApi.js`
- **Functions:** 
  - `agendarCalculoMensal()` - checks if last day of month (stub, frontend-only)
  - `executarCalculoAutomatico()` - has bug: `today` undefined (line ~40)
  - `agendarCalculoManual()` - calls for specific period (OK)
  - `obterHistoricoScheduler()` - queries scheduler_log table
- **Status:** ❌ **Cannot auto-run** - no backend cron, frontend-only
- **Issue:** Would need Node.js + cron job (not implemented)

### 2.2 CURRENT STATUS SUMMARY

| Aspecto | Status | % |
|---------|--------|---|
| **Config (% split)** | CRUD pronto | 100% |
| **Manual Trigger** | Funcional (button) | 100% |
| **Auto-Generate RPC** | Lógica OK, sem scheduler | 60% |
| **Production Tracking** | Via appointments | 80% |
| **Dashboard** | Lê doctor_commissions | 70% |
| **Finance Link (AP Bills)** | Partial, sem cost center | 40% |
| **Billing Link (guides)** | Não existe | 0% |
| **Service-level Rules** | Não existe | 0% |
| **Auto-scheduler (cron)** | Não existe | 0% |
| **Bank Transfer** | Stubs | 10% |
| **Overall Repasse** | ~75% funcional | - |

### 2.3 WHAT WORKS

✅ Create/update professional repasse config (70/30 %)  
✅ Manual trigger to calculate monthly repasse  
✅ RPC generates doctor_commissions records with correct math  
✅ Dashboard displays aggregates + per-professional breakdown  
✅ Historical view of past months  
✅ Manual adjustment (ajuste) records  
✅ Status tracking (pending, paid)  
✅ Validation: % must sum to 100  

### 2.4 WHAT DOESN'T WORK / GAPS

| Problema | Impacto | Esforço | Prioridade |
|----------|---------|---------|-----------|
| Sem auto-trigger mensal | Manual toda montada | 1-2h | 🔴 CRITICAL |
| Sem link to billing guides | Repasse ignora glosas | 3-4h | 🔴 CRITICAL |
| Sem service-level rules | 1 rule para todos | 2-3h | 🟡 HIGH |
| Sem banco transfer execution | Manual PIX/TED | 4-5h | 🟡 HIGH |
| Scheduler broken (code bug) | Auto-calc não roda | 0.5h | 🟠 MEDIUM |
| 3 different schemas | Confusing, tech debt | 2h | 🟠 MEDIUM |
| No audit trail | Não rastreia mudanças | 1h | 🟠 MEDIUM |
| Production table never used | medical_production vazia | 1h | 🟠 MEDIUM |

**Total Effort to Production-Ready:** ~15-20h

### 2.5 RECOMMENDED QUICK WINS (1 day)

1. **Fix repasseSchedulerApi bug** (0.5h)
   ```js
   // Line ~40: Change 'today' to 'hoje' or declare const today = new Date()
   ```

2. **Wire repasseMedicoApi.gerarRepasse to RPC** (1h)
   ```js
   // In RepasseMedicoPage, call: gerarRepasse({ clinicId, mes, ano, tipoGeracao: 'manual' })
   ```

3. **Create scheduler backend** (2h)
   - Node.js + cron-job library OR Supabase pg_cron
   - Call RPC daily on last business day of month

4. **Connect repasse to billing_guides** (2-3h)
   ```js
   // In calculate logic, join on appointment_id → billing_guides
   // Filter by guide.status != 'Glosado', apply glosa %
   ```

5. **Add service-level override** (1.5h)
   ```sql
   CREATE TABLE repasse_config_servico (
     professional_id, service_id, percentual_profissional, ...
   )
   -- In RPC, check service override before using professional default
   ```

---

## 🔗 CROSS-MODULE INTEGRATION ANALYSIS

### Current Integration State

```
Appointments
    ↓
    ✅ syncAppointmentBilling() exists [appointmentBillingApi.js]
    ├─→ ar_receivables (created) ✅
    ├─→ billing_guides (NOT auto-created) ❌
    └─→ doctor_commissions (indirectly via period query) ⚠️
    
Billing Guides (faturamento)
    ↓
    ❌ No link back to appointments
    ❌ No XML generation
    ❌ No AR invoice link
    ❌ No repasse impact on amounts
    
Repasse Médico
    ↓
    ✅ Reads from appointments.value
    ⚠️ Ignores guide status (glosas)
    ⚠️ No cost center allocation
    ❌ No auto-monthly trigger
```

### Ideal Desired State

```
Appointment Created
    ↓
    → If status='completed' + payer_id
        → Auto-create billing_guide
        → Auto-create ar_receivable
        ↓
        On first of next month
        → Calculate repasse from guide.valor (not appointment.value)
        → Generate doctor_commissions
        → Generate ap_bill for repasse
        → Auto-transfer via PIX/TED
```

### Integration Effort
- **Current:** ~65% coupled, 35% missing
- **Fix Gaps:** 12-15h work
- **Production Ready:** +3-5h testing

---

## 📊 COMPARATIVE SUMMARY TABLE

| Feature | Faturamento | Repasse |
|---------|-------------|---------|
| **Database Schema** | ✅ Simple | ⚠️ 3x duplicate |
| **Core CRUD** | ✅ 7 funcs | ✅ 10 funcs |
| **UI Pages** | ⚠️ 2/15 | ✅ 5/9 |
| **Auto-Generation** | ❌ 0% | ⚠️ 60% |
| **Integration** | ❌ Isolated | ⚠️ Partial |
| **Validation** | ✅ Written, unused | ✅ Working |
| **Reporting** | ❌ Empty | ⚠️ Dashboard partial |
| **External API** | ❌ None (XML stub) | ❌ None (transfer stub) |
| **Completion %** | 30% | 75% |

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: FOUNDATION (1 week)
**Effort:** 10-12h | **Priority:** CRITICAL

- [ ] Fix bugs in repasseSchedulerApi
- [ ] Link billing_guides → appointments (FK)
- [ ] Wire TISS validation into criarGuia()
- [ ] Auto-create guide when appointment completed
- [ ] Auto-create ar_receivable when guide validated

### Phase 2: PRODUCTION FLOW (2 weeks)
**Effort:** 15-18h | **Priority:** HIGH

- [ ] Implement XML stub generator
- [ ] Connect repasse → billing (ignore glosas initially)
- [ ] Setup backend scheduler (cron)
- [ ] Create service-level repasse rules table
- [ ] Wire guide status → ap_bill creation

### Phase 3: INTEGRATION (1 week)
**Effort:** 8-10h | **Priority:** MEDIUM

- [ ] Add glosa import + parse returns
- [ ] Real financial cost center allocation
- [ ] Dashboard reports (guias by month, glosas %, repasse aging)
- [ ] PDF exports

### Phase 4: AUTOMATION (1 week)
**Effort:** 6-8h | **Priority:** LOW

- [ ] PIX/TED transfer execution
- [ ] Email notifications for repasse ready
- [ ] Auto-aging for unpaid repasses
- [ ] Audit trail logging

**Total:** ~40-50h for full production feature parity

---

## ⚠️ CRITICAL BLOCKERS

1. **No XML generation = No way to submit guides**
   - Fix Priority: 🔴 BLOCK
   - Est. 6-8h

2. **No auto-repasse scheduler = Manual every month**
   - Fix Priority: 🔴 BLOCK
   - Est. 2-3h

3. **3x duplicate schemas = Tech debt, maintainability**
   - Fix Priority: 🟠 TECHNICAL DEBT
   - Est. 2-3h consolidation

4. **No glosa import = Inaccurate repasse math**
   - Fix Priority: 🟡 HIGH (defer to Phase 2)
   - Est. 4-5h

---

## 📝 NOTES FOR DEVELOPERS

### Faturamento (TISS)
- See: `tiskCascadeValidationApi.js` for comprehensive TISS validation logic
- Services MUST have: `tuss_code`, `guide_type`, `unit_measure`
- Professionals MUST have: `cbo_code`, `credentials`
- Payers MUST have: `tiss_pattern`, `guide_format`
- Current validation exists but unused - integrate!

### Repasse Médico
- **Table Confusion:** Code uses `doctor_commissions` but migrations define `repasse_medico` + `medical_repasse`
  - Recommendation: Drop old tables, standardize on `doctor_commissions` + `repasse_config`
- **RPC v2 is latest:** `generate_doctor_commissions_v2(clinic_id, month, year, mode)` - use this
- **Dashboard loads from doctor_commissions** - ensure this is always populated
- **70% hardcoded:** Consider reading from `repasse_config` instead of magic number

### Cross-Module
- `appointmentBillingApi.js` is the main integration point
- Currently syncs to AR only - extend to also handle:
  - Guide auto-create (faturamento)
  - Production logging (repasse)
  - Medical accounting entries

---

## 🔒 Security Considerations

- ✅ RLS enabled on billing_guides (clinic_id check)
- ✅ Supabase auth required for all APIs
- ⚠️ No field-level encryption for sensitive data (CNPJ, CPF in guides)
- ⚠️ No audit trail for guide modifications
- ⚠️ XML files to be stored but no encryption/signing spec

---

## 📚 References

- Validation API: `src/lib/tiskCascadeValidationApi.js`
- Billing API: `src/lib/guiasApi.js`
- Repasse API: `src/lib/medicalRepasseApi.js`, `src/lib/repasseMedicoApi.js`
- DB Schema: `supabase/migrations/2026-02-21_create_billing_guides_table.sql`, `20260409_create_generate_doctor_commissions_v2.sql`
- Pages: `src/pages/clinica/faturamento/`, `src/pages/financeiro/`

