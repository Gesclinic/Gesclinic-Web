# 🔍 Codebase Search Results: Professionals & Repasse Data Structures

**Data de Busca:** 19 de Março de 2026  
**Objetivo:** Mapear estrutura de dados para Profissionais, Repassos e Profissionais Fictícios

---

## 1️⃣ PROFESSIONALS (Profissionais) - Tablas Database

### Tabela Principal: `professionals`

**Localização:** [supabase/migrations/20260113_COMPREHENSIVE_INIT.sql](supabase/migrations/20260113_COMPREHENSIVE_INIT.sql#L134-L150)

**Estrutura:**
```sql
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  specialization TEXT,
  license_number TEXT,
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Índices Criados:**
- `idx_professionals_clinic` - Filtrar por clínica
- `idx_professionals_name` - Buscar por nome
- `idx_professionals_active` - Filtrar ativos/inativos

**Campos Adicionais (em migration posterior):**
- `conselho` - Órgão regulador (CRM, CREFITO, CRP, etc)
- `numero_conselho` - Número do registro no conselho
- `uf_conselho` - UF do conselho
- `data_inscricao_conselho` - Data de inscrição
- `rqe` - Registro de Qualificação Especial
- `papel_atendimento` - Papel no atendimento (executante, solicitante, ambos)
- `permite_faturamento_direto` - Booleano para faturamento direto

---

## 2️⃣ REPASSE MÉDICO (Repassos/Repayment) - Estrutura

### Tabelas de Repasse

#### A. `repasse_medico` - Principal
**Localização:** [supabase/migrations/20260113_COMPREHENSIVE_INIT.sql](supabase/migrations/20260113_COMPREHENSIVE_INIT.sql#L531-L553)

**Estrutura:**
```sql
CREATE TABLE IF NOT EXISTS repasse_medico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID,
  professional_name TEXT,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  total_appointments INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  amount_due DECIMAL(12, 2) DEFAULT 0,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  
  status VARCHAR(50) DEFAULT 'pending',
  
  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**
- `idx_repasse_medico_clinic`
- `idx_repasse_medico_professional`
- `idx_repasse_medico_period`

#### B. `repasse_config` - Regras de Cálculo
**Localização:** [supabase/migrations/20260113_COMPREHENSIVE_INIT.sql](supabase/migrations/20260113_COMPREHENSIVE_INIT.sql#L557-L572)

**Estrutura:**
```sql
CREATE TABLE IF NOT EXISTS repasse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID,
  
  percentage DECIMAL(5, 2),
  fixed_amount DECIMAL(12, 2),
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**
- `idx_repasse_config_clinic`

#### C. `repasse_ajuste` - Ajustes e Correções
**Localização:** [supabase/migrations/20260113_COMPREHENSIVE_INIT.sql](supabase/migrations/20260113_COMPREHENSIVE_INIT.sql#L574-L586)

**Estrutura:**
```sql
CREATE TABLE IF NOT EXISTS repasse_ajuste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  repasse_id UUID NOT NULL REFERENCES repasse_medico(id) ON DELETE CASCADE,
  
  description TEXT,
  adjustment_amount DECIMAL(12, 2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**
- `idx_repasse_ajuste_repasse`

#### D. `doctor_commissions` - Comissões Médicas
**Localização:** Referenciado em [RepasseMedico.jsx](src/pages/clinica/financeiro/RepasseMedico.jsx#L63-L72)

**Estrutura (Subapostase):**
```sql
-- Tabela suportada por RPC: generate_doctor_commissions_v2
SELECT * FROM doctor_commissions
WHERE clinic_id = ? 
  AND reference_month = ? 
  AND reference_year = ?
  AND calc_mode = ?
```

**Campos principais:**
- `doctor_commissions.professional_id`
- `doctor_commissions.professional.name`
- `doctor_commissions.reference_month`
- `doctor_commissions.reference_year`
- `doctor_commissions.calc_mode`

---

## 3️⃣ PROFISSIONAIS FICTÍCIOS - NOMES VISÍVEIS NA UI

### Nomes Encontrados

#### 1. Dr. João Silva
- **Gênero:** Masculino (médico/doctor)
- **Especialidade:** Clínico Geral (por contexto)
- **Referências na Codebase:**

| Arquivo | Localização | Contexto |
|---------|-------------|---------|
| [supabase/migrations/20260114_INSERT_PROFESSIONAL_USER.sql](supabase/migrations/20260114_INSERT_PROFESSIONAL_USER.sql#L25-L40) | Seed data | Usuário profissional teste com email `profissional@gesclinic.com.br` |
| [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx#L21) | Mock data | `{ medico: 'Dr. João Silva', lucro: 15000, producao: 50000, ... }` |
| [src/pages/financeiro/RepasseAutomacaoPage.jsx](src/pages/financeiro/RepasseAutomacaoPage.jsx#L27) | Log de automação | PIX gerado com sucesso (R$ 15.000) |
| [AGENDA_PROFISSIONAL_COMECE_AQUI.md](AGENDA_PROFISSIONAL_COMECE_AQUI.md#L49) | Documentação | Exemplo de agenda por profissional |
| [dist/assets/index-DwlPX3Ow.js](dist/assets/index-DwlPX3Ow.js#L1142) | Build compilado | Array de profissionais em mock data |

**Dados Financeiros (Mock):**
- Lucro: R$ 15.000
- Produção: R$ 50.000
- Percentual: 30%
- Repasse: R$ 15.000
- Pacientes: 198

---

#### 2. Dra. Maria Santos
- **Gênero:** Feminino (médica/doctor)
- **Especialidade:** Especialista (por contexto)
- **Referências na Codebase:**

| Arquivo | Localização | Contexto |
|---------|-------------|---------|
| [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx#L22) | Mock data | `{ medico: 'Dra. Maria Santos', lucro: 18000, producao: 60000, ... }` |
| [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx#L28) | Rankings | Posição 1 em produção (R$ 60.000) |
| [src/pages/financeiro/RepasseAutomacaoPage.jsx](src/pages/financeiro/RepasseAutomacaoPage.jsx#L28) | Log de automação | PIX gerado com sucesso (R$ 18.000) |
| [ENTREGA_FINAL_MODO_PROFISSIONAL.md](ENTREGA_FINAL_MODO_PROFISSIONAL.md#L204) | Documentação | Agenda agendada 14:30 |

**Dados Financeiros (Mock):**
- Lucro: R$ 18.000 (MAIOR valor)
- Produção: R$ 60.000 (MAIOR valor)
- Percentual: 30%
- Repasse: R$ 18.000
- Pacientes: 245 (MAIOR volume)

---

#### 3. Dr. Pedro Costa
- **Gênero:** Masculino (médico/doctor)
- **Especialidade:** Clínico (por contexto)
- **Referências na Codebase:**

| Arquivo | Localização | Contexto |
|---------|-------------|---------|
| [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx#L23) | Mock data | `{ medico: 'Dr. Pedro Costa', lucro: 12000, producao: 40000, ... }` |
| [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx#L31) | Rankings | Posição 4 (menor performance) |
| [src/pages/financeiro/RepasseAutomacaoPage.jsx](src/pages/financeiro/RepasseAutomacaoPage.jsx#L29) | Log de automação | Erro ao gerar PIX (R$ 12.000) - ESTADO DE ERRO |
| [ENTREGA_FINAL_MODO_PROFISSIONAL.md](ENTREGA_FINAL_MODO_PROFISSIONAL.md#L205) | Documentação | Agenda agendada 15:00 |

**Dados Financeiros (Mock):**
- Lucro: R$ 12.000 (MENOR valor)
- Produção: R$ 40.000 (MENOR valor)
- Percentual: 30%
- Repasse: R$ 12.000
- Pacientes: 156

---

#### 4. Dra. Ana Lima
- **Gênero:** Feminino (médica/doctor)
- **Especialidade:** Odontologia/Especialista (por contexto)
- **Referências na Codebase:**

| Arquivo | Localização | Contexto |
|---------|-------------|---------|
| [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx#L24) | Mock data | `{ medico: 'Dra. Ana Lima', lucro: 16000, producao: 53000, ... }` |
| [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx#L30) | Rankings | Posição 3 |
| [ENTREGA_FINAL_MODO_PROFISSIONAL.md](ENTREGA_FINAL_MODO_PROFISSIONAL.md#L206) | Documentação | Agenda agendada 16:00 (Odonto) |
| [dist/assets/index-DwlPX3Ow.js](dist/assets/index-DwlPX3Ow.js#L1142) | Build compilado | Array de profissionais em mock data |

**Dados Financeiros (Mock):**
- Lucro: R$ 16.000
- Produção: R$ 53.000
- Percentual: 30%
- Repasse: R$ 16.000
- Pacientes: 212

---

## 4️⃣ REFERÊNCIAS EM SQL QUERIES E APIs

### SQL Queries Relacionadas

**1. Consultar Repasse Médico:**
```sql
SELECT * FROM repasse_medico
WHERE clinic_id = ? 
  AND professional_id = ?
  AND period_start >= ? 
  AND period_end <= ?
ORDER BY period_start DESC;
```

**2. Consultar Regras de Repasse:**
```sql
SELECT rc.* FROM repasse_config rc
WHERE rc.clinic_id = ? 
  AND rc.professional_id = ?
  AND rc.active = TRUE;
```

**3. RPC para Gerar Repassos:**
```sql
generate_doctor_commissions_v2(
  p_clinic_id = UUID,
  p_month = INTEGER,
  p_year = INTEGER,
  p_mode = VARCHAR('atendido'|'faturado'|'standard')
);
```

**Localização:** [supabase/migrations/20260122_fix_repasse_medico.sql](supabase/migrations/20260122_fix_repasse_medico.sql#L27-L60)

---

### APIs JavaScript/Supabase

#### A. Professionals API
**Arquivo:** [src/lib/professionalsApi.js](src/lib/professionalsApi.js)

**Funções principais:**
```javascript
// Listar profissionais
export async function listProfessionals(clinicId)

// Buscar por ID
export async function getProfessionalDetails(id)

// Buscar por usuário
export async function getProfessionalByUserId(userId, email)

// Normalizar dados
export function normalizeProfessionalProfile(professional)
```

#### B. Finance Integration API
**Arquivo:** [src/lib/financeIntegrationApi.js](src/lib/financeIntegrationApi.js)

**Funções principais:**
```javascript
// Calcular repasse automático
export async function calculateAutomaticRepasse(params)

// Simular repasse (preview)
export async function simulateRepasse(baseAmount, options)

// Obter regras de repasse de um profissional
export async function getProfessionalRepasseRules(clinicId, professionalId)

// Gerar relatório de repasses
export async function generateRepasseReport(params)
```

#### C. Repasse Reports API
**Arquivo:** [src/lib/repassesReports.js](src/lib/repassesReports.js)

**Estratégia de Carregamento:**
1. Tenta buscar da tabela `doctor_commissions`
2. Se não existir, faz SELECT direto da view `view_doctor_commissions_summary`

---

## 5️⃣ COMPONENTES QUE USAM ESTES DADOS

### Páginas React

| Componente | Arquivo | Uso |
|-----------|---------|-----|
| RepasseMedico | [src/pages/clinica/financeiro/RepasseMedico.jsx](src/pages/clinica/financeiro/RepasseMedico.jsx) | Listar e gerar repassos |
| RepasseDashboardAnalyticsPage | [src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx](src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx) | Analytics e rankings (MOCK DATA) |
| RepasseAutomacaoPage | [src/pages/financeiro/RepasseAutomacaoPage.jsx](src/pages/financeiro/RepasseAutomacaoPage.jsx) | Automação de PIX (MOCK DATA) |
| MedicoDashboard | [src/pages/portal/MedicoDashboard.jsx](src/pages/portal/MedicoDashboard.jsx) | Dashboard para profissional logado |
| ContasReceber | [src/pages/clinica/financeiro/ContasReceber.jsx](src/pages/clinica/financeiro/ContasReceber.jsx) | Integra repasse no recebimento |

### Componentes Secundários

- [src/components/RulesAlert.js](src/components/RulesAlert.js) - Alerta de regras incompletas
- [src/components/RulesSummaryCard.jsx](src/components/RulesSummaryCard.jsx) - Resumo de regras

---

## 6️⃣ RELACIONAMENTOS ENTRE TABELAS

### Diagrama de Relacionamentos

```
professionals
    ├─→ (1:N) repasse_medico
    │         ├─→ (1:N) repasse_ajuste
    │         └─→ status: 'pending', 'paid', 'partial'
    │
    └─→ (1:N) repasse_config
              ├─→ percentage: DECIMAL(5,2)
              ├─→ fixed_amount: DECIMAL(12,2)
              └─→ active: BOOLEAN

doctor_commissions
    ├─→ professional_id
    └─→ reference_month, reference_year
```

### Regras de Negócio

1. **Calculo de Repasse:**
   - Baseado em regra de `repasse_config` (percentual ou valor fixo)
   - Aplicado sobre `total_revenue` do período
   - = (total_revenue * percentage) OU fixed_amount

2. **Status de Repasse:**
   - `pending` - Aguardando pagamento
   - `paid` - Pago ao profissional
   - `partial` - Pagamento parcial

3. **Ajustes:**
   - Registrados em `repasse_ajuste`
   - Aplicados APÓS cálculo inicial
   - Podem ser positivos (acréscimo) ou negativos (desconto)

---

## 7️⃣ MIGRATION FILES CHAVE

| Arquivo | Propósito |
|---------|----------|
| [20260113_COMPREHENSIVE_INIT.sql](supabase/migrations/20260113_COMPREHENSIVE_INIT.sql) | Criação das 3 tabelas de repasse |
| [20260114_INSERT_PROFESSIONAL_USER.sql](supabase/migrations/20260114_INSERT_PROFESSIONAL_USER.sql) | Insere Dr. João Silva como teste |
| [20260116_INSERT_DEMO_USER.sql](supabase/migrations/20260116_INSERT_DEMO_USER.sql) | Insere clínica de demo |
| [20260122_fix_repasse_medico.sql](supabase/migrations/20260122_fix_repasse_medico.sql) | Colunas adicionais e funções RPC |
| [20260112_repasse_medico_dashboard_function.sql](supabase/migrations/20260112_repasse_medico_dashboard_function.sql) | RPC: dashboard_repasse_medico |
| [20260112_repasse_medico_functions.sql](supabase/migrations/20260112_repasse_medico_functions.sql) | Funções de cálculo |
| [20260112_repasse_medico_functions_detalhe.sql](supabase/migrations/20260112_repasse_medico_functions_detalhe.sql) | Funções de detalhe |
| [20260112_repasse_medico_triggers.sql](supabase/migrations/20260112_repasse_medico_triggers.sql) | Triggers automáticos |

---

## 8️⃣ RESUMO EXECUTIVO

### Tabelas Principais para Profissionais:
1. **`professionals`** - Dados base dos profissionais
2. **`professional_schedules`** - Agendas por profissional
3. **`professional_services`** - Serviços que o profissional oferece
4. **`professional_payers`** - Convênios do profissional

### Tabelas Principais para Repasse:
1. **`repasse_medico`** - Repassos calculados por período
2. **`repasse_config`** - Regras de cálculo (% ou valor fixo)
3. **`repasse_ajuste`** - Ajustes e correções
4. **`doctor_commissions`** - Comissões geradas por RPC

### Profissionais Fictícios (Para Testes):
- ✅ **Dr. João Silva** - 50.000 produção, 198 pacientes
- ✅ **Dra. Maria Santos** - 60.000 produção, 245 pacientes (LÍDER)
- ✅ **Dr. Pedro Costa** - 40.000 produção, 156 pacientes (MENOR)
- ✅ **Dra. Ana Lima** - 53.000 produção, 212 pacientes

### APIs para Integração:
- `professionalsApi.js` - Gerenciar profissionais
- `financeIntegrationApi.js` - Calcular repassos
- `repassesReports.js` - Gerar relatórios
- `appointmentsApi.js` - Agendamentos (relacionado)

---

**Criado em:** 19 de Março de 2026  
**Versão:** 1.0  
**Status:** ✅ Completo
