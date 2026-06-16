# 🎯 Arquitetura AtendimentoUnificado - Visão Completa

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                      APLICAÇÃO REACT                            │
│                   (localhost:3000)                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    AgendaPage.jsx
                   (Página Principal)
                              ↓
                    Usuário clica em
                    Agendamento
                              ↓
        ┌─────────────────────────────────────┐
        │  handleOpenAtendimentoUnificado()    │
        │  (Abre modal com appointment)        │
        └─────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────────────────┐
        │     AtendimentoUnificado Modal Component            │
        │  (650+ linhas, 5 abas, React Query integrado)       │
        │                                                     │
        │  Abas:                                              │
        │  ├─ [Dados] Paciente, Convênio, Prof, Sala         │
        │  ├─ [Serviços] Adicionar/Remover serviços          │
        │  ├─ [Financeiro] Status em tempo real              │
        │  ├─ [Auditoria] Timeline de eventos                │
        │  └─ [Check-in] Chegada/Saída                       │
        └─────────────────────────────────────────────────────┘
                              ↓
        Clique em "Finalizar Atendimento"
                              ↓
        finalizeAppointmentMutation.mutate()
                              ↓
┌────────────────────────────────────────────────────────────────┐
│         API Layer: appointmentFinancialIntegrationApi           │
│                   (src/lib/)                                    │
│                                                                │
│  finalizeAppointmentWithFinancials()                           │
│  ├─ Valida dados do agendamento                               │
│  ├─ Calcula impostos (v2.0: PIS, COFINS, CSLL, IR, ISSQN)   │
│  ├─ Cria recebível em ar_invoices                            │
│  ├─ Registra auditoria                                        │
│  └─ Retorna status                                             │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    Chamada Supabase RPC
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              BANCO DE DADOS: Supabase PostgreSQL                │
│          (gvdkdjyupktlflwurike.supabase.co)                     │
│                                                                │
│  RPC: create_receivable_from_appointment()                     │
│  ├─ Valida agendamento                                         │
│  ├─ Verifica se já tem recebível (evita duplicatas)           │
│  ├─ Insere em ar_invoices                                     │
│  ├─ Cria mapping em appointment_to_receivable_mapping         │
│  └─ Atualiza cashflow_entries                                 │
│                                                                │
│  Triggers (Automáticos):                                       │
│  ├─ trg_appointment_completed → Dispara RPC                   │
│  ├─ trg_receivable_created → Log em financial_audit_logs      │
│  └─ trg_receivable_updated → Registra mudanças                │
│                                                                │
│  Tabelas Principais:                                           │
│  ├─ appointments (agendamentos)                               │
│  ├─ ar_invoices (recebíveis)                                  │
│  ├─ financial_audit_logs (auditoria)                          │
│  ├─ appointment_to_receivable_mapping (mapeamento)            │
│  └─ cashflow_entries (fluxo de caixa)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Dados Persistidos
                    Triggers Disparados
                    Auditoria Registrada
                    Fluxo Completo! ✅
```

---

## 🔄 Componentes & Integrações

### 1. React Frontend
```
AgendaPage.jsx
    └─ AtendimentoUnificado.jsx (NOVO)
        ├─ useQuery: payers, services, professionals, rooms, patients
        ├─ useMutation: save, addService, removeService, finalize
        ├─ useAuth() → user, clinicId, currentRole
        ├─ useClinicContext() → clinic dados
        └─ 5 Tabs UI (Radix + Tailwind)
```

### 2. API Service Layer
```
appointmentFinancialIntegrationApi.ts (900+ linhas)
    ├─ finalizeAppointmentWithFinancials()
    ├─ validateAppointmentDataIntegrity()
    ├─ getAppointmentFinancialStatus()
    ├─ listFinancialAuditLogs()
    └─ calculateTaxes() [v2.0]

appointmentsApi.js
    ├─ getAppointmentServices()
    ├─ syncAppointmentServices()
    ├─ updateAppointment()
    └─ outros métodos existentes
```

### 3. Database Layer
```
Supabase PostgreSQL
    ├─ RPC: create_receivable_from_appointment()
    │   └─ 8-step orchestration
    ├─ Triggers (3 total)
    │   ├─ trg_appointment_completed
    │   ├─ trg_receivable_created
    │   └─ trg_receivable_updated
    ├─ Financial Audit Logs Table
    │   ├─ RLS habilitado
    │   └─ Indexes otimizados
    └─ Row Level Security (Clinic-level isolation)
```

---

## 📈 Fluxo de Tax Calculation (v2.0)

```
┌─────────────────────────────────┐
│   Serviço                       │
│   Preço: R$ 100,00              │
└────────────────┬────────────────┘
                 ↓
    ┌───────────────────────────────┐
    │  Impostos (% do valor bruto)  │
    │  ─────────────────────────────│
    │  PIS:    1,65%  = R$ 1,65     │
    │  COFINS: 7,60%  = R$ 7,60     │
    │  CSLL:   1,00%  = R$ 1,00     │
    │  IR:     0,5%-5% = R$ 2,50    │
    │  ISSQN:  variável = R$ 5,00   │
    │  ─────────────────────────────│
    │  Total: R$ 17,75 (17,75%)     │
    └────────────┬──────────────────┘
                 ↓
    ┌──────────────────────────┐
    │  Valor Final Recebível   │
    │  R$ 100,00 - R$ 17,75    │
    │  = R$ 82,25              │
    └──────────────────────────┘
```

---

## 🔐 Segurança & Validações

### Row Level Security (RLS)
```sql
-- financial_audit_logs: Cada usuário só vê sua própria clínica
SELECT * FROM financial_audit_logs 
WHERE clinic_id = auth.uid()  -- Isolamento por clínica
```

### Validações Frontend
```javascript
validateForm()
  ├─ Paciente: required
  ├─ Convênio: required
  ├─ Profissional: required
  ├─ Sala: required
  ├─ Serviços: minimum 1
  └─ Observations: optional
```

### Validações Backend
```javascript
validateAppointmentDataIntegrity()
  ├─ Verifica se agendamento existe
  ├─ Verifica se já tem recebível
  ├─ Valida campos obrigatórios
  ├─ Verifica integridade de referências
  └─ Retorna { valid, errors }
```

---

## 📊 Estados do Agendamento

```
┌─────────────┐
│  scheduled  │  (Agendado)
│  (Inicial)  │
└──────┬──────┘
       │ [Usuário clica "Finalizar"]
       ↓
┌─────────────────────┐
│ Validar dados       │
│ ✓ Paciente OK       │
│ ✓ Profissional OK   │
│ ✓ Serviços OK       │
└──────┬──────────────┘
       │ ✅ Validação passou
       ↓
┌──────────────────────┐
│ completed            │  (Atualizar status)
│ (Status mudado)      │
└──────┬───────────────┘
       │ [Trigger dispara automaticamente]
       ↓
┌───────────────────────────────────┐
│ create_receivable_from_appointment │ [RPC]
│ (Orquestração de 8 passos)        │
└──────┬────────────────────────────┘
       │ ✅ Recebível criado
       ↓
┌─────────────────────────────────────┐
│ Logs registrados em audit_logs      │
│ ├─ appointment_completed            │
│ ├─ receivable_created               │
│ ├─ taxes_calculated                 │
│ └─ cashflow_updated                 │
└─────────────────────────────────────┘
```

---

## 🧪 Teste End-to-End (E2E)

```
1. User at /clinica/agenda
   ├─ Agenda carrega com calendário
   └─ Mostra agendamentos do dia

2. User clicks agendamento existente
   ├─ Modal AtendimentoUnificado abre
   ├─ Tab "Dados" mostra: paciente, convênio, prof, sala
   ├─ Tab "Serviços" mostra: lista de serviços
   ├─ Tab "Financeiro" mostra: status em tempo real
   ├─ Tab "Auditoria" mostra: eventos anteriores
   └─ Tab "Check-in" mostra: chegada/saída

3. User adiciona serviço
   ├─ Clica "+" no tab Serviços
   ├─ Seleciona serviço
   ├─ Serviço aparece na lista
   └─ Salvar atualiza database

4. User clica "Finalizar Atendimento"
   ├─ Status muda para "completed"
   ├─ Trigger dispara automaticamente
   ├─ RPC create_receivable_from_appointment executa
   ├─ Recebível criado em ar_invoices
   ├─ Auditoria registrada
   └─ Modal fecha com sucesso

5. User verifica resultados
   ├─ Supabase: ar_invoices tem novo record
   ├─ Supabase: financial_audit_logs mostra eventos
   ├─ Supabase: cashflow_entries atualizado
   └─ Frontend: Toast "Sucesso! Recebível criado"
```

---

## 📝 Checklist de Produção

- [x] ✅ Componente criado e testado
- [x] ✅ SQL migrations deployadas
- [x] ✅ 3 Triggers ativados
- [x] ✅ RLS habilitado
- [x] ✅ APIs integradas
- [x] ✅ Validações implementadas
- [ ] ⏳ Testes E2E com dados reais
- [ ] ⏳ Performance testing (carga)
- [ ] ⏳ User acceptance testing (UAT)
- [ ] ⏳ Deploy para staging
- [ ] ⏳ Deploy para produção
- [ ] ⏳ Monitoramento pós-deploy

---

**Versão:** 1.0  
**Data:** 29/05/2026  
**Status:** ✅ Implementação Completa - Aguardando Testes
