# 🎯 GUIA TÉCNICO COMPLETO - CADASTROS ESTRUTURAIS + TISS XML

**Data:** 18 de janeiro de 2026  
**Status:** 🟢 Estrutura Base Pronta - Validação Campos Obrigatórios  
**Objetivo:** Orientação técnica para cada cadastro e seus vínculos

---

## 📋 ÍNDICE NAVEGÁVEL

1. [Visão Geral Arquitetura](#-visão-geral-arquitetura)
2. [Cadastros Estruturais](#-cadastros-estruturais)
3. [Regras Operacionais e Vínculos](#-regras-operacionais-e-vínculos)
4. [Parâmetros Financeiros](#-parâmetros-financeiros)
5. [Impacto TISS XML](#-impacto-tiss-xml)
6. [Sequência de Implementação](#-sequência-de-implementação)
7. [Checklist de Validação](#-checklist-de-validação)

---

## 🏗️ VISÃO GERAL ARQUITETURA

### A Hierarquia Estrutural

```
┌─────────────────────────────────────────────────────────────┐
│                    CLÍNICA (clinic_id)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐   ┌────────────┐   │
│  │  SERVIÇOS    │      │ PROFISSIONAIS│   │ CONVÊNIOS  │   │
│  │ (services)   │      │(professionals│   │(health_    │   │
│  │              │      │  )           │   │ insurances)│   │
│  └──────────────┘      └──────────────┘   └────────────┘   │
│       ▲                      ▲                    ▲          │
│       │                      │                    │          │
│       └──────┬───────────────┼────────────────────┘          │
│              │               │                               │
│       ┌──────▼───────┐  ┌────▼──────────┐                   │
│       │ VÍNCULO 1:   │  │  VÍNCULO 3:   │                   │
│       │ Prof×Serviço │  │ Prof×Convênio │                   │
│       │(professional_│  │(professional_ │                   │
│       │ services)    │  │ payers)       │                   │
│       └──────────────┘  └───────────────┘                   │
│                                                             │
│       ┌──────────────┐      ┌──────────────┐               │
│       │ VÍNCULO 2:   │      │  VÍNCULO 4:  │               │
│       │ Sala×Serviço │      │ Preços×Conv  │               │
│       │(room_services│      │(service_     │               │
│       │  )           │      │ prices)      │               │
│       └──────────────┘      └──────────────┘               │
│                                                             │
│       ┌──────────────┐      ┌──────────────┐               │
│       │ VÍNCULO 5:   │      │  VÍNCULO 6:  │               │
│       │ Salas        │      │ Repasse      │               │
│       │(rooms)       │      │(revenue_     │               │
│       │              │      │ rules)       │               │
│       └──────────────┘      └──────────────┘               │
│                                                             │
│       ┌──────────────┐      ┌──────────────┐               │
│       │ VÍNCULO 7:   │      │  VÍNCULO 8:  │               │
│       │ Recursos     │      │ Regras Agenda│               │
│       │(resources)   │      │(agenda_rules)│               │
│       └──────────────┘      └──────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📌 Princípio Central

**Base do Sistema NÃO é um cadastro comum, é a **base estrutural** que:**

- ✅ Habilita a Agenda (sem profissionais, serviços e salas = sem agendamento)
- ✅ Habilita Faturamento (sem preços e convênios = sem faturamento)
- ✅ Habilita XML TISS (sem CBO, TUSS, CNPJ = sem integração)
- ✅ Habilita Repasse (sem profissionais e regras = sem pagamento)

---

## 📁 CADASTROS ESTRUTURAIS

### 1️⃣ SERVIÇOS / PROCEDIMENTOS

**Localização no código:**
- Tabela: `services`
- API: [src/lib/servicesApi.js](../src/lib/servicesApi.js)
- Componente: `src/pages/clinica/base-sistema/ServicesPage.jsx` ✅ EXISTE
- Rota: `/clinica/base-sistema/servicos`

#### ✅ Campos que JÁ EXISTEM no BD

```sql
-- Campos atuais:
id UUID PRIMARY KEY
clinic_id UUID (FK → clinics)
name TEXT NOT NULL
description TEXT
code VARCHAR(50) -- código interno
default_duration_minutes INT
type_billing VARCHAR(50)
allow_scheduling_fit BOOLEAN
requires_authorization BOOLEAN
base_value DECIMAL
active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### ❌ Campos QUE FALTAM para TISS XML (CRÍTICO)

| Campo | Tipo | Obrigatório | Descrição | Impacto TISS |
|-------|------|------------|-----------|-------------|
| `tuss_code` | VARCHAR(10) | **SIM** | Código TUSS de 10 dígitos | ❌ GLOSA se falta |
| `type_service` | ENUM | **SIM** | 'Consulta', 'Exame', 'Procedimento', 'Terapia' | ❌ Rejeição XML |
| `guide_type` | ENUM | NÃO | 'Consulta', 'SADT', 'Internação' | ⚠️ Desorganiza faturamento |
| `unit_measure` | VARCHAR(20) | NÃO | 'sessão', 'unidade', 'minuto' | ⚠️ Impacta repasse |
| `requires_executor` | BOOLEAN | NÃO | Exige profissional? | ⚠️ Agendamento |
| `allows_billing` | BOOLEAN | NÃO | Permite faturar? | ⚠️ Controle receita |
| `cost_value` | DECIMAL | NÃO | Custo interno (margem) | ⚠️ DRE |

#### 🔗 Dependências

```
Serviços → Professional Services (quem executa)
         → Rooms (onde se realiza)
         → Service Prices (valores negociados)
         → Agenda Slots (quando se oferece)
         → Revenue Rules (como repassa)
```

#### 📝 Exemplo de Cadastro Correto

```json
{
  "name": "Consulta Cardiologia",
  "tuss_code": "0101010100",          // ✅ OBRIGATÓRIO TISS
  "type_service": "Consulta",          // ✅ OBRIGATÓRIO TISS
  "guide_type": "Consulta",
  "code": "CARD001",
  "description": "Consulta de primeira vez",
  "default_duration_minutes": 30,
  "unit_measure": "sessão",
  "base_value": 150.00,
  "cost_value": 50.00,
  "requires_executor": true,
  "allows_billing": true,
  "active": true
}
```

#### 🚀 Ação Necessária

- [ ] Migration SQL: Adicionar `tuss_code`, `type_service`, `guide_type`, `unit_measure`
- [ ] ServicesPage.jsx: Adicionar campos no form
- [ ] Validação: TUSS_code não pode ser vazio ao ativar serviço
- [ ] Teste: Verificar se aparece em AgendaPage e FaturamentoPage

---

### 2️⃣ PROFISSIONAIS

**Localização no código:**
- Tabela: `professionals`
- API: [src/lib/professionalsApi.js](../src/lib/professionalsApi.js)
- Componente: `src/pages/clinica/base-sistema/ProfessionalsPage.jsx` ✅ EXISTE
- Rota: `/clinica/base-sistema/profissionais`

#### ✅ Campos que JÁ EXISTEM

```sql
id UUID PRIMARY KEY
clinic_id UUID (FK)
name TEXT NOT NULL
cpf VARCHAR(14)
crm VARCHAR(20) -- CRM/conselho
crm_state VARCHAR(2)
specialization TEXT
phone VARCHAR(20)
email VARCHAR(100)
professional_type VARCHAR(50) -- 'Médico', 'Fisioterapeuta', etc
active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### ❌ Campos QUE FALTAM para TISS XML (CRÍTICO)

| Campo | Tipo | Obrigatório | Descrição | Impacto TISS |
|-------|------|------------|-----------|-------------|
| `cbo_code` | VARCHAR(6) | **SIM** | Classificação Brasileira Ocupações | ❌ GLOSA |
| `cns_code` | VARCHAR(20) | **SIM** (se SUS) | Número CNS (para integração SUS) | ❌ Rejeição SUS |
| `council_type` | ENUM | **SIM** | 'CRM','CREFITO','CRP','CORE','etc' | ❌ Rejeição XML |
| `council_number` | VARCHAR(20) | **SIM** | Número do conselho (CRM/CREFITO) | ❌ Glosa |
| `council_state` | VARCHAR(2) | **SIM** | UF do conselho (SC, SP, etc) | ❌ Validação |
| `role_type` | ENUM | NÃO | 'executor', 'requester', 'both' | ⚠️ Agenda |
| `signature_base64` | TEXT | NÃO | Assinatura digitalizada | ⚠️ TISS |
| `credential_number` | VARCHAR(50) | NÃO | Número credencial operadora | ⚠️ Repasse |

#### 🔗 Dependências

```
Profissionais → Professional Services (quais serviços executa)
              → Professional Payers (quais convênios atende)
              → Agenda (quem faz atendimentos)
              → Revenue Rules (como recebe)
              → Professional Schedule (disponibilidade)
```

#### 📝 Exemplo de Cadastro Correto

```json
{
  "name": "Dr. João Silva",
  "cpf": "123.456.789-10",
  "council_type": "CRM",
  "council_number": "123456",
  "council_state": "SP",
  "cbo_code": "225101",              // ✅ Médico Clínico Geral
  "cns_code": "2000001234567890",    // Se integra com SUS
  "professional_type": "Médico",
  "role_type": "both",                // Pode prescrever e executar
  "specialization": "Cardiologia",
  "phone": "(11) 3333-4444",
  "email": "joao@clinica.com",
  "credential_number": "CRED123456", // Operadora
  "active": true
}
```

#### ⚠️ Validações OBRIGATÓRIAS

```javascript
// ANTES de permitir usar profissional em Agenda ou Faturamento:
if (!professional.cbo_code) {
  throw new Error("❌ Profissional incompleto: Falta CBO");
}
if (!professional.council_type || !professional.council_number) {
  throw new Error("❌ Profissional incompleto: Falta conselho");
}
if (professional.active === false) {
  throw new Error("❌ Profissional inativo");
}
```

#### 🚀 Ação Necessária

- [ ] Migration SQL: Adicionar `cbo_code`, `cns_code`, `council_type`, `council_number`
- [ ] ProfessionalsPage.jsx: Campos obrigatórios destacados
- [ ] Validação: Bloqueio de profissional incompleto em Agenda
- [ ] Teste: Verificar integração com GuiasConsulta (TISS)

---

### 3️⃣ CONVÊNIOS / SEGUROS

**Localização no código:**
- Tabela: `health_insurances`
- API: [src/lib/healthInsurancesApi.js](../src/lib/healthInsurancesApi.js)
- Componente: `src/pages/clinica/base-sistema/ConveniosPage.jsx` ✅ EXISTE
- Rota: `/clinica/base-sistema/convenios`

#### ✅ Campos que JÁ EXISTEM

```sql
id UUID PRIMARY KEY
clinic_id UUID (FK)
code VARCHAR(50) NOT NULL
name TEXT NOT NULL
type VARCHAR(50) -- 'private_insurance', 'health_plan', 'government'
cnpj TEXT
contact_person TEXT
contact_email TEXT
contact_phone TEXT
requires_authorization BOOLEAN DEFAULT FALSE
authorization_lead_time_days INT
active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### ❌ Campos QUE FALTAM para TISS XML (CRÍTICO)

| Campo | Tipo | Obrigatório | Descrição | Impacto TISS |
|-------|------|------------|-----------|-------------|
| `registration_ans` | VARCHAR(20) | **SIM** (se privado) | Código ANS da operadora | ❌ GLOSA |
| `tiss_pattern` | BOOLEAN | **SIM** | Segue padrão TISS? | ❌ Rejeição |
| `guide_format` | ENUM | **SIM** | 'Consulta', 'SADT', 'Internação' | ❌ Configuração |
| `authorization_required` | BOOLEAN | NÃO | Exige autorização? | ⚠️ Fluxo |
| `advance_days` | INT | NÃO | Dias antecedência autorização | ⚠️ Agendamento |
| `internal_code` | VARCHAR(50) | NÃO | Código interno da clínica | ⚠️ Integração |
| `api_endpoint` | VARCHAR(255) | NÃO | URL para integração (se houver) | ⚠️ Automação |

#### 🔗 Dependências

```
Convênios → Professional Payers (quais prof credenciados)
          → Service Prices (valores negociados)
          → Appointments (identifica paciente x convênio)
          → Revenue Rules (regras de repasse)
          → GuiasConsulta/SADT (vinculação XML)
```

#### 📝 Exemplo de Cadastro Correto

```json
{
  "code": "UNIMED001",
  "name": "Unimed São Paulo",
  "type": "health_plan",
  "cnpj": "17.197.385/0001-21",
  "registration_ans": "342856",       // ✅ OBRIGATÓRIO TISS
  "tiss_pattern": true,
  "guide_format": "Consulta",
  "authorization_required": true,
  "advance_days": 3,
  "contact_person": "Maria Silva",
  "contact_email": "contato@unimed.com.br",
  "contact_phone": "(11) 3030-3030",
  "active": true
}
```

#### 🚀 Ação Necessária

- [ ] Migration SQL: Adicionar `registration_ans`, `tiss_pattern`, `guide_format`
- [ ] ConveniosPage.jsx: Validação de ANS (obrigatório)
- [ ] GuiasConsulta.jsx: Validar convênio antes de criar guia
- [ ] Teste: Verificar se guia TISS é gerada corretamente

---

### 4️⃣ SALAS

**Localização no código:**
- Tabela: `rooms`
- API: [src/lib/roomsApi.js](../src/lib/roomsApi.js)
- Componente: `src/pages/clinica/base-sistema/SalasPage.jsx` ✅ EXISTE
- Rota: `/clinica/base-sistema/salas`

#### ✅ Campos que JÁ EXISTEM

```sql
id UUID PRIMARY KEY
clinic_id UUID (FK)
name TEXT NOT NULL
room_type VARCHAR(50)
floor INT
max_capacity INT
code VARCHAR(50)
is_active BOOLEAN / active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### ❌ Campos QUE FALTAM

| Campo | Tipo | Obrigatório | Descrição | Impacto |
|-------|------|------------|-----------|---------|
| `number` | VARCHAR(20) | NÃO | Número da sala | ⚠️ Identificação |
| `description` | TEXT | NÃO | Descrição/detalhes | ℹ️ Admin |
| `room_type` | ENUM | NÃO | 'Consultório','Exame','Procedure' | ⚠️ Agenda |
| `exclusive_resources` | BOOLEAN | NÃO | Recursos exclusivos? | ⚠️ Scheduling |
| `max_concurrent` | INT | NÃO | Quantos agendamentos simultâneos? | ⚠️ Overbooking |

#### 🔗 Dependências

```
Salas → Room Services (quais serviços cabem aqui)
      → Room Resources (que equipamentos tem)
      → Appointments (onde são agendados)
      → Agenda Rules (restrições de uso)
```

#### 📝 Exemplo Correto

```json
{
  "name": "Consultório 01",
  "code": "CONS01",
  "number": "101",
  "room_type": "Consultório",
  "floor": 1,
  "description": "Consultório cardiologia",
  "max_capacity": 2,
  "max_concurrent": 1,
  "exclusive_resources": false,
  "active": true
}
```

#### 🚀 Ação Necessária

- [ ] Validação: Sala precisa ter pelo menos 1 serviço associado
- [ ] SalasPage.jsx: Mostrar serviços vinculados
- [ ] AgendaPage: Bloquear agendamento sem sala

---

### 5️⃣ RECURSOS / EQUIPAMENTOS

**Localização no código:**
- Tabela: `resources`
- API: [src/lib/resourcesApi.js](../src/lib/resourcesApi.js)
- Componente: `src/pages/clinica/base-sistema/RecursosPage.jsx` ✅ EXISTE
- Rota: `/clinica/base-sistema/recursos`

#### ✅ Campos que JÁ EXISTEM

```sql
id UUID PRIMARY KEY
clinic_id UUID (FK)
name TEXT NOT NULL
code VARCHAR(50)
type VARCHAR(50)
is_consumable BOOLEAN
description TEXT
active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### ❌ Campos QUE FALTAM

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|-----------|
| `requires_maintenance` | BOOLEAN | NÃO | Precisa manutenção? |
| `last_maintenance` | DATE | NÃO | Última manutenção |
| `next_maintenance` | DATE | NÃO | Próxima manutenção |
| `inventory_quantity` | INT | SIM (consumível) | Qtd em estoque |
| `reorder_level` | INT | NÃO | Nível mínimo |

#### 🚀 Ação Necessária

- [ ] Validação: Recursos consumíveis precisam de quantidade
- [ ] RecursosPage.jsx: Alertar manutenção vencida
- [ ] Integração com Estoque (se consumível)

---

## 🔗 REGRAS OPERACIONAIS E VÍNCULOS

### VÍNCULO 1: Profissionais × Serviços

**Tabela:** `professional_services`  
**Significado:** Quem faz o quê  
**Localização:** [src/pages/clinica/base-sistema/ProfessionalServicesPage.jsx](../src/pages/clinica/base-sistema/ProfessionalServicesPage.jsx) ✅ EXISTE

#### 📋 Estrutura

```sql
CREATE TABLE professional_services (
  id UUID PRIMARY KEY,
  professional_id UUID (FK → professionals),
  service_id UUID (FK → services),
  clinic_id UUID (FK → clinics),
  duration_minutes_override INT,     -- Pode variar por profissional
  competence_level VARCHAR(50),      -- 'junior','standard','expert'
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(professional_id, service_id, clinic_id)
);
```

#### 🧠 Lógica de Negócio

```
Se o Serviço tem 30 min padrão, MAS o Profissional demora 45 min
→ Use duration_minutes_override = 45
→ Agenda vai agendar 45 min para este prof neste serviço
```

#### 🚀 Ação Necessária

- [ ] Validação: Não permitir duplicatas (prof+serviço na mesma clínica)
- [ ] Form: Dropdown de profissionais e serviços
- [ ] Competência: Radio buttons (junior/standard/expert)
- [ ] Teste: Verificar agendamento respeitando duração

---

### VÍNCULO 2: Profissionais × Convênios

**Tabela:** `professional_payers`  
**Significado:** Quem atende qual convênio  
**Localização:** [src/pages/clinica/base-sistema/ProfessionalPayerPage.jsx](../src/pages/clinica/base-sistema/ProfessionalPayerPage.jsx) ✅ EXISTE

#### 📋 Estrutura

```sql
CREATE TABLE professional_payers (
  id UUID PRIMARY KEY,
  professional_id UUID (FK),
  health_insurance_id UUID (FK),
  clinic_id UUID (FK),
  credential_number VARCHAR(50),     -- Número credencial
  percentage_split DECIMAL(5,2),     -- % que recebe
  fixed_value DECIMAL(12,2),         -- OU valor fixo
  active BOOLEAN,
  UNIQUE(professional_id, health_insurance_id, clinic_id)
);
```

#### 🧠 Lógica de Negócio

```
Dr. João pode atender:
├── Unimed SP (credencial: UNI123, recebe 70%)
├── Bradesco Saúde (credencial: BRA456, recebe R$ 80 fixo)
└── Particular (sempre atende, sem vínculo)
```

#### ⚠️ CRÍTICO PARA TISS

```
Se guia é do Unimed, DEVE ter prof credenciado Unimed
Se prof não tem vínculo com convênio → GLOSA GARANTIDA
```

#### 🚀 Ação Necessária

- [ ] Validação: Guia bloqueia se prof não credenciado no convênio
- [ ] Form: Mostrar % ou valor fixo (radio button)
- [ ] GuiasConsulta.jsx: Validar credencial antes de gerar XML

---

### VÍNCULO 3: Salas × Serviços

**Tabela:** `room_services` (ou campo em services)  
**Significado:** Onde cada serviço pode ser realizado  
**Localização:** Precisa validar se existe ou criar

#### 📋 Estrutura Recomendada

```sql
CREATE TABLE room_services (
  id UUID PRIMARY KEY,
  room_id UUID (FK → rooms),
  service_id UUID (FK → services),
  clinic_id UUID (FK),
  sequence_order INT,                -- Ordem de prioridade
  active BOOLEAN,
  UNIQUE(room_id, service_id, clinic_id)
);
```

#### 🧠 Lógica de Negócio

```
Consulta Cardiologia pode ser feita em:
├── Consultório 01 (prioridade 1)
├── Consultório 02 (prioridade 2)
└── NÃO pode ser na Sala de Exames (bloqueia)

Agenda vai respeitar isto
```

#### 🚀 Ação Necessária

- [ ] Criar tabela `room_services` ou validar se existe
- [ ] AgendaPage: Filtrar salas disponíveis para serviço
- [ ] Form: Multi-select de salas para cada serviço

---

### VÍNCULO 4: Salas × Recursos

**Tabela:** `room_resources`  
**Significado:** Que equipamentos tem em cada sala  
**Localização:** [src/pages/clinica/base-sistema/RoomResourcesPage.jsx](../src/pages/clinica/base-sistema/RoomResourcesPage.jsx) ✅ EXISTE

#### 📋 Estrutura

```sql
CREATE TABLE room_resources (
  id UUID PRIMARY KEY,
  room_id UUID (FK),
  resource_id UUID (FK),
  clinic_id UUID (FK),
  quantity INT DEFAULT 1,
  is_exclusive BOOLEAN DEFAULT FALSE, -- Só pode usar nesta sala
  active BOOLEAN,
  UNIQUE(room_id, resource_id, clinic_id)
);
```

#### 🧠 Lógica de Negócio

```
Consultório 01 tem:
├── Equipamento ECG (1 unidade, não exclusivo)
├── Maca (1 unidade, exclusivo)
└── Esfigmomanômetro (1 unidade, não exclusivo)

Se marcar ECG como exclusivo:
→ ECG só pode usar nesta sala
→ Outras salas não veem este ECG
```

#### 🚀 Ação Necessária

- [ ] RoomResourcesPage.jsx: Form para adicionar recursos
- [ ] Validação: Recurso exclusivo não aparece em outra sala
- [ ] Teste: Verificar overbooking de equipamento

---

### VÍNCULO 5: Serviços × Preços × Convênios

**Tabela:** `service_prices`  
**Significado:** Quanto custa cada serviço em cada convênio  
**Localização:** [src/pages/clinica/base-sistema/ServicePricesPage.jsx](../src/pages/clinica/base-sistema/ServicePricesPage.jsx) ✅ EXISTE

#### 📋 Estrutura

```sql
CREATE TABLE service_prices (
  id UUID PRIMARY KEY,
  service_id UUID (FK),
  health_insurance_id UUID (FK) NULL, -- NULL = Particular
  clinic_id UUID (FK),
  base_price DECIMAL(12,2),           -- Preço negociado
  co_pay DECIMAL(12,2),               -- Coparticipação paciente
  active BOOLEAN,
  created_at TIMESTAMP
);
```

#### 🧠 Lógica de Negócio

```
Consulta Cardiologia:
├── Particular: R$ 150.00 (nenhuma coparticipação)
├── Unimed: R$ 120.00 (coparticipação R$ 30.00 do paciente)
└── Bradesco: R$ 100.00 (coparticipação R$ 50.00)

TISS XML EXIGE estes valores
```

#### 🚀 Ação Necessária

- [ ] ServicePricesPage.jsx: Validar preço > 0
- [ ] Form: Dropdown clínica + serviço + convênio
- [ ] GuiasConsulta.jsx: Usar preço da tabela no XML

---

### VÍNCULO 6: Regras de Repasse (Revenue Rules)

**Tabela:** `revenue_rules`  
**Significado:** Como o profissional recebe pelo atendimento  
**Localização:** [src/pages/clinica/base-sistema/RevenueRulesPage.jsx](../src/pages/clinica/base-sistema/RevenueRulesPage.jsx) ✅ EXISTE

#### 📋 Estrutura

```sql
CREATE TABLE revenue_rules (
  id UUID PRIMARY KEY,
  clinic_id UUID (FK),
  professional_id UUID (FK),
  service_id UUID (FK),
  health_insurance_id UUID (FK) NULL, -- NULL = Particular
  rule_type VARCHAR(50),              -- 'percentage', 'fixed', 'table'
  percentage DECIMAL(5,2),            -- Se percentage
  fixed_value DECIMAL(12,2),          -- Se fixed
  minimum_value DECIMAL(12,2),        -- Valor mínimo garantido
  active BOOLEAN,
  UNIQUE(professional_id, service_id, health_insurance_id, clinic_id)
);
```

#### 🧠 Lógica de Negócio - EXEMPLO REAL

```
Dr. João + Consulta Cardiologia:
├── Particular: 60% do valor (ou mín R$ 90)
├── Unimed: 50% do valor negociado
└── Bradesco: Tabela fixa R$ 70/consulta

Quando agenda virar faturamento:
→ System calcula automaticamente o valor que Dr. João recebe
→ Diferença vai para clínica (margem)
```

#### 🚀 Ação Necessária

- [ ] Form: Radio buttons (%, valor fixo, tabela)
- [ ] Validação: Não permitir % e valor fixo simultaneamente
- [ ] RepasseMedicoPage.jsx: Mostrar cálculos

---

### VÍNCULO 7: Regras de Agenda

**Tabela:** `agenda_rules`  
**Significado:** Como e quando agendar  
**Localização:** [src/pages/clinica/base-sistema/AgendaRulesPage.jsx](../src/pages/clinica/base-sistema/AgendaRulesPage.jsx) ✅ EXISTE

#### 📋 Estrutura

```sql
CREATE TABLE agenda_rules (
  id UUID PRIMARY KEY,
  clinic_id UUID (FK),
  professional_id UUID (FK) NULL,     -- NULL = Para todos
  service_id UUID (FK) NULL,
  room_id UUID (FK) NULL,
  allow_double_booking BOOLEAN,       -- Pode 2 agendamentos simultâneos?
  min_advance_hours INT,              -- Mínimo com antecedência
  max_advance_days INT,               -- Máximo com antecedência
  allow_same_day BOOLEAN,
  default_duration_override INT,      -- Override de duração
  active BOOLEAN
);
```

#### 🧠 Lógica de Negócio

```
Exemplo:
- Consulta só com 24h antecedência (min_advance_hours = 24)
- Máximo 60 dias no futuro (max_advance_days = 60)
- Permite mesmo dia? Não (allow_same_day = false)
- Pode duplo? Não (allow_double_booking = false)
- Duração: 30 min (default da base) ou sobrescreve aqui?
```

#### 🚀 Ação Necessária

- [ ] AgendaPage: Respeitar min/max antecedência
- [ ] Form: Boolean toggles para cada regra
- [ ] Validação: Bloquear agendamento fora das regras

---

### VÍNCULO 8: Disponibilidade de Profissionais

**Tabela:** `professional_schedules`  
**Significado:** Horários quando o profissional trabalha  
**Localização:** [src/pages/clinica/base-sistema/ProfessionalSchedulePage.jsx](../src/pages/clinica/base-sistema/ProfessionalSchedulePage.jsx) ✅ EXISTE

#### 📋 Estrutura

```sql
CREATE TABLE professional_schedules (
  id UUID PRIMARY KEY,
  professional_id UUID (FK),
  clinic_id UUID (FK),
  day_of_week INT (0-6),              -- 0=Domingo, 6=Sábado
  room_id UUID (FK) NULL,             -- Qual sala trabalha?
  start_time TIME,                    -- 08:00
  end_time TIME,                      -- 18:00
  break_start TIME NULL,              -- 12:00
  break_end TIME NULL,                -- 13:00
  is_active BOOLEAN,
  created_at TIMESTAMP
);
```

#### 🧠 Lógica de Negócio

```
Dr. João:
├── Segunda-Sexta: 08:00-18:00 (break 12-13) em Cons01
├── Sábado: 09:00-13:00 em Cons02
└── Domingo: Não trabalha
```

#### 🚀 Ação Necessária

- [ ] Form: Seletor de dias + inputs de horário
- [ ] AgendaPage: Só mostra horários disponíveis do prof
- [ ] Teste: Verificar bloqueios fora do horário

---

## 💰 PARÂMETROS FINANCEIROS

### Tabela de Preços (Service Prices)

**Já coberto em VÍNCULO 5**, resumindo:

```
Para CADA combinação:
  Serviço + Convênio (ou Particular) = Preço + Coparticipação

TISS obriga:
✅ Preço base
✅ Coparticipação
✅ % cobertura (100% ou com limite)
```

### Regras de Repasse (Revenue Rules)

**Já coberto em VÍNCULO 6**, resumindo:

```
Determina:
- Quanto prof recebe (% ou valor fixo)
- Garantia mínima
- Por serviço + convênio

Afeta:
📊 DRE (lucro vs. despesa)
💵 Fluxo de caixa (pagamento prof)
📈 Relatórios (margem por serviço)
```

### Integração com Faturamento TISS

```
Fluxo completo:

1. Paciente marca Consulta (Agenda)
   ↓
2. System busca dados:
   - Service (TUSS code, guide_type)
   - Professional (CBO code, credential)
   - Health Insurance (ANS, TISS pattern)
   - Service Price (valor + coparticipação)
   - Revenue Rule (repasse ao prof)
   ↓
3. Gera Guia TISS (XML)
   ↓
4. Envia à operadora (integração)
   ↓
5. Se aprovada: Aparece em Faturamento
   ↓
6. Quando paciente paga: Divide valor
   - Coparticipação → Paciente paga
   - Restante → Operadora paga
   - Repasse → Prof recebe (baseado em % ou valor)
   - Diferença → Clínica (margem)
```

---

## 📄 IMPACTO TISS XML

### Checklist de Validação TISS

#### Para cada Guia de Consulta

```
✅ PROFISSIONAL:
  □ CBO Code preenchido
  □ Council Type preenchido
  □ Council Number preenchido
  □ CNS Code (se SUS)
  □ Credential number (se convênio)
  □ Assinatura disponível

✅ SERVIÇO:
  □ TUSS Code preenchido (10 dígitos)
  □ Service Type válido
  □ Guide Type válido
  □ Duração definida

✅ CONVÊNIO:
  □ ANS Registration (se privado)
  □ TISS Pattern = true
  □ Guide Format válido
  □ Ativo

✅ PREÇO:
  □ Base Price > 0
  □ Coparticipação definida
  □ Valor cobertura válido

✅ PACIENTE:
  □ CPF válido
  □ Convenio ativo
  □ Autorização (se exigido)
```

### Campos XML Obrigatórios (Segundo Padrão TISS)

```xml
<!-- CABEÇALHO DA GUIA -->
<tiss:GuiaConsultaSP>
  <NumeroGuia>{{ guia.numero }}</NumeroGuia>
  <TipoGuia>01</TipoGuia>
  
  <!-- PROFISSIONAL -->
  <Solicitante>
    <NomeProf>{{ prof.name }}</NomeProf>
    <ConselhoProf>{{ prof.council_type }}</ConselhoProf>
    <NumConselho>{{ prof.council_number }}</NumConselho>
    <CBO>{{ prof.cbo_code }}</CBO>
    <CBODescricao>Médico Clínico Geral</CBODescricao>
  </Solicitante>
  
  <!-- SERVIÇO -->
  <Procedimento>
    <TabelaTuss>{{ service.tuss_code }}</TabelaTuss>
    <CodigoTuss>{{ service.tuss_code }}</CodigoTuss>
    <DescricaoTuss>{{ service.name }}</DescricaoTuss>
  </Procedimento>
  
  <!-- OPERADORA -->
  <Beneficiario>
    <NumBeneficiario>{{ patient.insurance_number }}</NumBeneficiario>
    <RegistroANS>{{ insurance.registration_ans }}</RegistroANS>
  </Beneficiario>
  
  <!-- VALORES -->
  <Valores>
    <ValorProcedimento>{{ price.base_price }}</ValorProcedimento>
    <CoparticipacaoPatrocinador>{{ price.co_pay }}</CoparticipacaoPatrocinador>
  </Valores>
</tiss:GuiaSP>
```

### Campos Críticos para GLOSA

Se faltar QUALQUER um desses campos, a operadora GLOSA (nega pagamento):

1. ❌ **TUSS Code** → Operadora não sabe o que cobrar
2. ❌ **CBO Code** → Não identifica profissional
3. ❌ **ANS Registration** → Operadora não é válida
4. ❌ **Credential Number** → Prof não é credenciado
5. ❌ **Guide Type** → Não sabe o tipo de guia
6. ❌ **Patient Insurance Number** → Quem cobrir?
7. ❌ **Price Values** → Quanto cobrar?

---

## 🚀 SEQUÊNCIA DE IMPLEMENTAÇÃO

### ⏱️ FASE 1: VALIDAÇÕES BÁSICAS (2-3 horas)

**Objetivo:** Garantir que campos críticos existem e são validados

#### 1.1 - Criar Migrations SQL

```sql
-- Migration: 20260118_add_tiss_fields.sql

-- Services: Adicionar campos TISS
ALTER TABLE services
ADD COLUMN IF NOT EXISTS tuss_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS type_service VARCHAR(50),
ADD COLUMN IF NOT EXISTS guide_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS unit_measure VARCHAR(20),
ADD COLUMN IF NOT EXISTS cost_value DECIMAL(12,2);

-- Professionals: Adicionar campos TISS
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cbo_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS cns_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS council_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_state VARCHAR(2);

-- Health Insurances: Adicionar campos TISS
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),
ADD COLUMN IF NOT EXISTS tiss_pattern BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS guide_format VARCHAR(50);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_services_tuss ON services(tuss_code, clinic_id);
CREATE INDEX IF NOT EXISTS idx_professionals_cbo ON professionals(cbo_code, clinic_id);
```

**Status:** ❓ Verificar se já existe

#### 1.2 - Adicionar Validações nas APIs

**Arquivo:** [src/lib/servicesApi.js](../src/lib/servicesApi.js)

```javascript
export async function createService(clinicId, serviceData) {
  // ✅ VALIDAÇÃO NOVA
  if (!serviceData.tuss_code || serviceData.tuss_code.length !== 10) {
    throw new Error("TUSS Code é obrigatório (10 dígitos)");
  }
  if (!serviceData.type_service) {
    throw new Error("Tipo de Serviço é obrigatório");
  }
  
  const { data, error } = await supabase
    .from("services")
    .insert([{ ...serviceData }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

**Arquivo:** [src/lib/professionalsApi.js](../src/lib/professionalsApi.js)

```javascript
export async function createProfessional(clinicId, profData) {
  // ✅ VALIDAÇÃO NOVA
  const requiredFields = ['cbo_code', 'council_type', 'council_number'];
  for (const field of requiredFields) {
    if (!profData[field]) {
      throw new Error(`Campo obrigatório faltando: ${field}`);
    }
  }
  
  const { data, error } = await supabase
    .from("professionals")
    .insert([{ ...profData }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

#### 1.3 - Atualizar Forms (CRUD Pages)

**Arquivo:** [src/pages/clinica/base-sistema/ServicesPage.jsx](../src/pages/clinica/base-sistema/ServicesPage.jsx)

```jsx
// Adicionar ao form:

<div className="grid grid-cols-2 gap-4">
  <div>
    <Label>TUSS Code *</Label>
    <Input 
      value={formData.tuss_code}
      onChange={(e) => setFormData({...formData, tuss_code: e.target.value})}
      placeholder="0101010100"
      maxLength="10"
      required
    />
    <small className="text-red-600">Obrigatório para TISS</small>
  </div>
  
  <div>
    <Label>Tipo de Serviço *</Label>
    <Select value={formData.type_service} onValueChange={(val) => setFormData({...formData, type_service: val})}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Consulta">Consulta</SelectItem>
        <SelectItem value="Exame">Exame</SelectItem>
        <SelectItem value="Procedimento">Procedimento</SelectItem>
        <SelectItem value="Terapia">Terapia</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>

<div>
  <Label>Custo Interno</Label>
  <Input 
    type="number"
    step="0.01"
    value={formData.cost_value}
    onChange={(e) => setFormData({...formData, cost_value: parseFloat(e.target.value)})}
    placeholder="0.00"
  />
  <small className="text-gray-500">Para cálculo de margem</small>
</div>
```

**Status:** ⏳ Implementar

---

### ⏱️ FASE 2: VÍNCULOS E DEPENDÊNCIAS (3-4 horas)

**Objetivo:** Garantir que cada cadastro tem vínculos obrigatórios

#### 2.1 - Validação de Vínculos

**Exemplo:** Antes de permitir usar Serviço em Agenda

```javascript
// Em AgendaPage.jsx, ao tentar agendar:

async function validateServiceAvailability(serviceId, professionalId) {
  // Verificar se prof executa este serviço
  const { data: profService } = await supabase
    .from('professional_services')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('service_id', serviceId)
    .single();
  
  if (!profService) {
    throw new Error("❌ Profissional não está credenciado para este serviço");
  }
  
  // Verificar se serviço tem preço definido
  const { data: price } = await supabase
    .from('service_prices')
    .select('*')
    .eq('service_id', serviceId)
    .eq('health_insurance_id', insuranceId)
    .single();
  
  if (!price) {
    throw new Error("❌ Preço não definido para este convênio");
  }
  
  return true;
}
```

**Status:** ⏳ Implementar validações

#### 2.2 - Forms de Vínculos

**Exemplo:** ProfessionalServicesPage.jsx

```jsx
export function ProfessionalServicesPage() {
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [links, setLinks] = useState([]);
  
  useEffect(() => {
    loadData();
  }, [clinicId]);
  
  async function handleAddLink(profId, serviceId) {
    // ✅ Validação: Não permitir duplicata
    const exists = links.some(l => l.professional_id === profId && l.service_id === serviceId);
    if (exists) {
      throw new Error("Vínculo já existe");
    }
    
    const { data, error } = await supabase
      .from('professional_services')
      .insert([{
        professional_id: profId,
        service_id: serviceId,
        clinic_id: clinicId,
        competence_level: 'standard'
      }])
      .select();
    
    if (error) throw error;
    setLinks([...links, ...data]);
  }
  
  return (
    <div>
      <DataTable 
        data={links}
        columns={[
          { key: 'professional_name', label: 'Profissional' },
          { key: 'service_name', label: 'Serviço' },
          { key: 'competence_level', label: 'Nível' },
          { key: 'duration_minutes_override', label: 'Duração (min)' }
        ]}
      />
      
      <Dialog>
        <DialogTrigger>Novo Vínculo</DialogTrigger>
        <DialogContent>
          <Select onValueChange={setProfId}>
            <SelectTrigger><SelectValue placeholder="Profissional" /></SelectTrigger>
            <SelectContent>
              {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select onValueChange={setServiceId}>
            <SelectTrigger><SelectValue placeholder="Serviço" /></SelectTrigger>
            <SelectContent>
              {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Button onClick={() => handleAddLink(profId, serviceId)}>Adicionar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Status:** ✅ Componente já existe, validar campos

---

### ⏱️ FASE 3: INTEGRAÇÃO COM TISS (2-3 horas)

**Objetivo:** Garantir que GuiasConsulta gera XML com campos corretos

#### 3.1 - Validação em GuiasConsulta.jsx

**Arquivo:** [src/pages/clinica/faturamento/tiss/GuiasConsulta.jsx](../src/pages/clinica/faturamento/tiss/GuiasConsulta.jsx)

```jsx
async function handleCreateGuia(formData) {
  // ✅ VALIDAÇÕES ANTES DE GERAR XML
  
  // 1. Profissional completo?
  if (!formData.professional.cbo_code) {
    throw new Error("❌ CBO Code do prof faltando");
  }
  
  // 2. Serviço tem TUSS?
  if (!formData.service.tuss_code) {
    throw new Error("❌ TUSS Code do serviço faltando");
  }
  
  // 3. Convênio válido?
  if (!formData.insurance.registration_ans) {
    throw new Error("❌ ANS do convênio faltando");
  }
  
  // 4. Prof credenciado no convênio?
  const { data: credential } = await supabase
    .from('professional_payers')
    .select('*')
    .eq('professional_id', formData.professional.id)
    .eq('health_insurance_id', formData.insurance.id)
    .single();
  
  if (!credential) {
    throw new Error("❌ Prof não credenciado neste convênio");
  }
  
  // 5. Preço definido?
  const { data: price } = await supabase
    .from('service_prices')
    .select('*')
    .eq('service_id', formData.service.id)
    .eq('health_insurance_id', formData.insurance.id)
    .single();
  
  if (!price) {
    throw new Error("❌ Preço não definido");
  }
  
  // ✅ Tudo ok, gerar XML
  const guia = await generateTISSXML({
    numero_guia: generateGuiaNumber(),
    solicitante: {
      nome: formData.professional.name,
      conselho: formData.professional.council_type,
      numero_conselho: formData.professional.council_number,
      cbo: formData.professional.cbo_code,
      credential_number: credential.credential_number
    },
    procedimento: {
      codigo_tuss: formData.service.tuss_code,
      descricao: formData.service.name
    },
    valores: {
      base_price: price.base_price,
      co_pay: price.co_pay
    }
  });
  
  // Salvar no BD
  const { data, error } = await supabase
    .from('guias_consulta')
    .insert([guia])
    .select();
  
  if (error) throw error;
  return data;
}
```

**Status:** ⏳ Adicionar validações

#### 3.2 - Template XML TISS

**Arquivo:** `src/lib/tiss-templates/consultaXML.js`

```javascript
export function generateGuiaConsultaXML(guiaData) {
  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<TISSSolicitacao>
  <GuiaConsultaSP>
    <NumeroGuia>${guiaData.numero_guia}</NumeroGuia>
    <TipoGuia>01</TipoGuia>
    <DataGuia>${guiaData.data_guia}</DataGuia>
    
    <Solicitante>
      <NomeProf>${guiaData.solicitante.nome}</NomeProf>
      <ConselhoProf>${guiaData.solicitante.conselho}</ConselhoProf>
      <NumConselho>${guiaData.solicitante.numero_conselho}</NumConselho>
      <CBO>${guiaData.solicitante.cbo}</CBO>
      <CredentialNumber>${guiaData.solicitante.credential_number}</CredentialNumber>
    </Solicitante>
    
    <Procedimento>
      <TabelaTuss>${guiaData.procedimento.codigo_tuss}</TabelaTuss>
      <CodigoTuss>${guiaData.procedimento.codigo_tuss}</CodigoTuss>
      <DescricaoTuss>${guiaData.procedimento.descricao}</DescricaoTuss>
    </Procedimento>
    
    <Valores>
      <ValorProcedimento>${guiaData.valores.base_price}</ValorProcedimento>
      <CoparticipacaoPatrocinador>${guiaData.valores.co_pay}</CoparticipacaoPatrocinador>
    </Valores>
  </GuiaConsultaSP>
</TISSSolicitacao>`;
  
  return xml;
}
```

**Status:** ⏳ Criar templates

---

## ✅ CHECKLIST DE VALIDAÇÃO

### 🔴 CRÍTICO (Bloqueia TISS XML)

- [ ] **Services:** TUSS Code validado (10 dígitos exatos)
- [ ] **Services:** Type Service preenchido
- [ ] **Professionals:** CBO Code preenchido
- [ ] **Professionals:** Council Type + Council Number preenchido
- [ ] **Health Insurances:** ANS Registration preenchido
- [ ] **Health Insurances:** TISS Pattern = TRUE
- [ ] **Professional Payers:** Prof credenciado em convênio
- [ ] **Service Prices:** Preço base > 0 para cada convênio
- [ ] **GuiasConsulta:** Valida TODOS os campos acima antes de gerar XML

### 🟡 IMPORTANTE (Impacta Agenda)

- [ ] **Services:** Duração definida
- [ ] **Rooms:** Pelo menos 1 serviço vinculado
- [ ] **Professional Services:** Cada prof vinculado a serviços que executa
- [ ] **Agenda Rules:** Antecedência mínima/máxima definidas
- [ ] **Professional Schedule:** Horários disponíveis cadastrados

### 🟢 BOM PRATICAR (Melhora UX)

- [ ] **Services:** Custo interno definido
- [ ] **Health Insurances:** Contato preenchido
- [ ] **Professionals:** Especialização preenchida
- [ ] **Rooms:** Descrição preenchida
- [ ] **Resources:** Quantidade/manutenção controlada

---

## 📊 MATRIZ DE IMPACTO

| Cadastro | Se Faltar | Impacto Agenda | Impacto Faturamento | Impacto TISS |
|----------|-----------|---|---|---|
| **Serviço (TUSS)** | ❌ | ❌ Não agenda | ❌ Não fatua | ❌ GLOSA |
| **Profissional (CBO)** | ❌ | ❌ Não agenda | ⚠️ Cálculo errado | ❌ GLOSA |
| **Profissional (Conselho)** | ❌ | ⚠️ Funciona | ⚠️ Cálculo errado | ❌ GLOSA |
| **Convênio (ANS)** | ❌ | ✅ Funciona | ⚠️ Sem integração | ❌ GLOSA |
| **Prof × Serviço** | ❌ | ❌ Não agenda | ⚠️ Fatura errado | ⚠️ Prof errado |
| **Prof × Convênio** | ❌ | ✅ Funciona | ⚠️ Repasse 0 | ❌ GLOSA |
| **Preço Serviço** | ❌ | ✅ Funciona | ❌ Não fatua | ❌ Valor 0 |
| **Sala** | ❌ | ⚠️ Sem local | ✅ Funciona | ✅ Funciona |
| **Resource** | ❌ | ✅ Funciona | ✅ Funciona | ✅ Funciona |

---

## 🎬 PRÓXIMAS AÇÕES IMEDIATAS

### Hoje (Sprint Atual)

1. **Validar Migrations:** Verificar quais campos TISS já existem no BD
   ```bash
   # No Supabase Console, rodar:
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'services';
   ```

2. **Executar Migrations Faltantes:**
   ```bash
   # Terminal PowerShell
   $env:VITE_SUPABASE_URL = "..."
   $env:VITE_SUPABASE_ANON_KEY = "..."
   npx supabase db push  # ou executar SQL manualmente
   ```

3. **Atualizar Forms:** Adicionar campos obrigatórios (marcados com *)

4. **Criar Validações:** Em cada API module (servicesApi, professionalsApi, etc)

### Próxima Sprint

5. **Teste E2E:** Fluxo completo serviço → agenda → faturamento → TISS
6. **Documentação TISS:** Qual é o padrão esperado pela operadora
7. **Integração Operadora:** Configurar endpoint para envio XML

---

## 📞 RESUMO EXECUTIVO

**Se você lembrar de APENAS 3 COISAS:**

1. **TUSS + CBO + ANS são OBRIGATÓRIOS** para TISS XML
   - Serviço sem TUSS = GLOSA garantida
   - Prof sem CBO = GLOSA garantida
   - Convênio sem ANS = GLOSA garantida

2. **Vínculos (Professional×Service, Professional×Payer) são CRÍTICOS** para Agenda e Faturamento
   - Sem vínculo = Não agenda
   - Sem credencial = Repasse 0

3. **Preços devem estar definidos** para cada combinação serviço+convênio
   - Sem preço = Não fatua
   - Com preço errado = Margem errada

**Implementar campos TISS AGORA = Evitar GLOSA DEPOIS** 💰

---

**Criado em:** 18 de janeiro de 2026  
**Versão:** 1.0 - Guia Técnico Completo  
**Próxima revisão:** Após validação de campos
