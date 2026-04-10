# 📋 CHECKLIST TÉCNICO - CAMPOS OBRIGATÓRIOS POR CADASTRO

**Data:** 18 de janeiro de 2026  
**Objetivo:** Validação prática, passo a passo, de cada cadastro  
**Tempo estimado:** 1-2 horas para completar

---

## 🔴 CRÍTICO - TISS XML (NÃO NEGOCIA)

### ✅ SERVIÇOS / PROCEDIMENTOS

**Arquivo:** [src/lib/servicesApi.js](../src/lib/servicesApi.js)  
**Form:** [src/pages/clinica/base-sistema/ServicesPage.jsx](../src/pages/clinica/base-sistema/ServicesPage.jsx)

#### Campos Obrigatórios (para TISS)

```javascript
const servicoTISS = {
  // 📌 Identificação (já existem)
  name: "Consulta Cardiologia",                        // ✅ Existe
  code: "CARD001",                                    // ✅ Existe
  description: "Consulta de primeira vez",            // ✅ Existe
  
  // 🔴 NOVOS - Obrigatório TISS
  tuss_code: "0101010100",                           // ❌ FALTA?
  type_service: "Consulta",                          // ❌ FALTA? (Consulta/Exame/Procedimento)
  guide_type: "Consulta",                            // ❌ FALTA? (Consulta/SADT/Internação)
  
  // 🟡 Importante (operacional)
  default_duration_minutes: 30,                       // ✅ Existe
  unit_measure: "sessão",                            // ❌ FALTA?
  
  // 🟢 Bom ter (margem)
  base_value: 150.00,                                // ✅ Existe
  cost_value: 50.00,                                 // ❌ FALTA?
  
  // 🟢 Flags
  requires_authorization: false,                      // ✅ Existe
  allow_scheduling_fit: true,                        // ✅ Existe
  active: true                                       // ✅ Existe
};
```

#### Checklist de Implementação

- [ ] **Campo `tuss_code` existe no BD?**
  ```sql
  -- Verificar:
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'services' AND column_name = 'tuss_code';
  ```
  - Se não existe: Executar migration SQL
  ```sql
  ALTER TABLE services ADD COLUMN tuss_code VARCHAR(10);
  ```

- [ ] **Campo `type_service` existe no BD?**
  ```sql
  -- Verificar:
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'services' AND column_name = 'type_service';
  ```
  - Se não: Adicionar
  ```sql
  ALTER TABLE services ADD COLUMN type_service VARCHAR(50);
  ```

- [ ] **Campo `guide_type` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'services' AND column_name = 'guide_type';
  ```

- [ ] **Validação em `servicesApi.js`:** Verificar se `tuss_code` é validado
  ```javascript
  // Em createService():
  if (!serviceData.tuss_code || serviceData.tuss_code.length !== 10) {
    throw new Error("TUSS Code é obrigatório (10 dígitos)");
  }
  ```
  - [ ] Implementar validação se não existe

- [ ] **Form `ServicesPage.jsx` tem campos?**
  ```jsx
  // Verificar se tem inputs para:
  // □ TUSS Code
  // □ Type Service (select/dropdown)
  // □ Guide Type (select/dropdown)
  // □ Unit Measure
  // □ Cost Value
  ```
  - [ ] Adicionar inputs ausentes

- [ ] **API retorna os campos?**
  ```javascript
  // Em listServices(), updateService():
  // Verificar se select() inclui:
  .select("id, name, tuss_code, type_service, guide_type, ...")
  ```

---

### ✅ PROFISSIONAIS

**Arquivo:** [src/lib/professionalsApi.js](../src/lib/professionalsApi.js)  
**Form:** [src/pages/clinica/base-sistema/ProfessionalsPage.jsx](../src/pages/clinica/base-sistema/ProfessionalsPage.jsx)

#### Campos Obrigatórios (para TISS)

```javascript
const professionalTISS = {
  // 📌 Identificação (já existem)
  name: "Dr. João Silva",                             // ✅ Existe
  cpf: "123.456.789-10",                              // ✅ Existe
  email: "joao@clinica.com",                          // ✅ Existe
  phone: "(11) 3333-4444",                            // ✅ Existe
  
  // 🔴 NOVOS - Obrigatório TISS
  council_type: "CRM",                               // ❌ FALTA? (CRM/CREFITO/CRP)
  council_number: "123456",                          // ❌ FALTA?
  council_state: "SP",                               // ❌ FALTA?
  cbo_code: "225101",                                // ❌ FALTA? (Médico Clínico)
  
  // 🟡 Importante
  professional_type: "Médico",                       // ✅ Existe (via specialization?)
  role_type: "both",                                 // ❌ FALTA? (executor/requester/both)
  
  // 🟢 Bom ter (SUS)
  cns_code: "2000001234567890",                      // ❌ FALTA?
  
  // 🟢 Outros
  specialization: "Cardiologia",                      // ✅ Existe
  active: true                                       // ✅ Existe
};
```

#### Checklist de Implementação

- [ ] **Campo `cbo_code` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'professionals' AND column_name = 'cbo_code';
  ```

- [ ] **Campo `council_type` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'professionals' AND column_name = 'council_type';
  ```

- [ ] **Campo `council_number` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'professionals' AND column_name = 'council_number';
  ```

- [ ] **Campo `council_state` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'professionals' AND column_name = 'council_state';
  ```

- [ ] **Campo `role_type` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'professionals' AND column_name = 'role_type';
  ```

- [ ] **Validação em `professionalsApi.js`:** CBO obrigatório?
  ```javascript
  if (!profData.cbo_code) {
    throw new Error("CBO Code é obrigatório");
  }
  ```

- [ ] **Validação em `professionalsApi.js`:** Conselho obrigatório?
  ```javascript
  if (!profData.council_type || !profData.council_number || !profData.council_state) {
    throw new Error("Conselho profissional é obrigatório");
  }
  ```

- [ ] **Form tem inputs para CBO + Conselho?**
  ```jsx
  // Verificar se existem:
  // □ Input CBO Code (6 dígitos)
  // □ Select Council Type (CRM, CREFITO, CRP, etc)
  // □ Input Council Number
  // □ Select Council State (UF)
  // □ Select Role Type (executor/requester/both)
  ```

---

### ✅ CONVÊNIOS / SEGUROS

**Arquivo:** [src/lib/healthInsurancesApi.js](../src/lib/healthInsurancesApi.js)  
**Form:** [src/pages/clinica/base-sistema/ConveniosPage.jsx](../src/pages/clinica/base-sistema/ConveniosPage.jsx)

#### Campos Obrigatórios (para TISS)

```javascript
const convenioTISS = {
  // 📌 Identificação (já existem)
  code: "UNIMED001",                                  // ✅ Existe
  name: "Unimed São Paulo",                           // ✅ Existe
  type: "health_plan",                                // ✅ Existe
  cnpj: "17.197.385/0001-21",                         // ✅ Existe
  
  // 🔴 NOVOS - Obrigatório TISS
  registration_ans: "342856",                        // ❌ FALTA? (ANS - obrigatório)
  tiss_pattern: true,                                // ❌ FALTA? (boolean)
  guide_format: "Consulta",                          // ❌ FALTA? (Consulta/SADT/Internação)
  
  // 🟡 Importante
  requires_authorization: true,                      // ✅ Existe
  authorization_lead_time_days: 3,                   // ✅ Existe
  
  // 🟢 Contato
  contact_person: "Maria Silva",                      // ✅ Existe
  contact_email: "contato@unimed.com.br",             // ✅ Existe
  contact_phone: "(11) 3030-3030",                    // ✅ Existe
  
  active: true                                       // ✅ Existe
};
```

#### Checklist de Implementação

- [ ] **Campo `registration_ans` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'health_insurances' AND column_name = 'registration_ans';
  ```

- [ ] **Campo `tiss_pattern` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'health_insurances' AND column_name = 'tiss_pattern';
  ```

- [ ] **Campo `guide_format` existe?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'health_insurances' AND column_name = 'guide_format';
  ```

- [ ] **Validação em `healthInsurancesApi.js`:** ANS obrigatório?
  ```javascript
  if (!insuranceData.registration_ans) {
    throw new Error("ANS Registration é obrigatório para privados");
  }
  ```

- [ ] **Form tem inputs?**
  ```jsx
  // □ Input ANS Registration (7 dígitos)
  // □ Toggle TISS Pattern
  // □ Select Guide Format
  ```

---

## 🟡 IMPORTANTE - VÍNCULOS E OPERACIONAL

### ✅ VÍNCULO: Profissionais × Serviços

**Tabela:** `professional_services`  
**Arquivo:** [src/pages/clinica/base-sistema/ProfessionalServicesPage.jsx](../src/pages/clinica/base-sistema/ProfessionalServicesPage.jsx)

#### Checklist

- [ ] **Tabela `professional_services` existe?**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name = 'professional_services';
  ```

- [ ] **Tem coluna `professional_id`?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'professional_services' AND column_name = 'professional_id';
  ```

- [ ] **Tem coluna `service_id`?**

- [ ] **Tem constraint UNIQUE?**
  ```sql
  SELECT constraint_name FROM information_schema.table_constraints 
  WHERE table_name = 'professional_services' AND constraint_type = 'UNIQUE';
  ```

- [ ] **Form permite adicionar vínculo?**
  ```jsx
  // □ Select Profissional
  // □ Select Serviço
  // □ Input Duração (override)
  // □ Select Competência (junior/standard/expert)
  // □ Botão "Adicionar"
  ```

- [ ] **Validação: Impede duplicata?**
  ```javascript
  // Verificar se API retorna erro ao tentar duplicar
  ```

- [ ] **AgendaPage respeita vínculo?**
  ```javascript
  // Ao agendar:
  // 1. Buscar professional_services
  // 2. Se não encontra → bloqueia agendamento
  // 3. Se encontra → usa duration_minutes_override
  ```

---

### ✅ VÍNCULO: Profissionais × Convênios

**Tabela:** `professional_payers`  
**Arquivo:** [src/lib/professionalPayerApi.js](../src/lib/professionalPayerApi.js)  
**Form:** [src/pages/clinica/base-sistema/ProfessionalPayerPage.jsx](../src/pages/clinica/base-sistema/ProfessionalPayerPage.jsx)

#### Checklist

- [ ] **Tabela `professional_payers` existe?**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name = 'professional_payers';
  ```

- [ ] **Tem coluna `credential_number`?** (CRÍTICO para TISS)
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'professional_payers' 
  AND column_name = 'credential_number';
  ```

- [ ] **Tem coluna `percentage_split` OU `fixed_value`?**

- [ ] **Form permite adicionar vínculo?**
  ```jsx
  // □ Select Profissional
  // □ Select Convênio
  // □ Input Credential Number
  // □ Radio: % OU Valor Fixo
  // □ Input Percentual (5-100%)
  // □ Input Valor (0.00+)
  // □ Botão "Adicionar"
  ```

- [ ] **GuiasConsulta.jsx valida credencial?**
  ```javascript
  // Ao gerar guia TISS:
  // SELECT credential_number FROM professional_payers
  // WHERE professional_id = prof AND health_insurance_id = conv
  // Se não encontra → ERRO: "Prof não credenciado"
  ```

---

### ✅ TABELA: Preços de Serviços

**Tabela:** `service_prices`  
**Arquivo:** [src/lib/servicePricesApi.js](../src/lib/servicePricesApi.js)  
**Form:** [src/pages/clinica/base-sistema/ServicePricesPage.jsx](../src/pages/clinica/base-sistema/ServicePricesPage.jsx)

#### Checklist

- [ ] **Tabela `service_prices` existe?**

- [ ] **Tem coluna `health_insurance_id` (nullable)?**
  - NULL = Particular
  - UUID = Convênio específico

- [ ] **Tem coluna `base_price`?**

- [ ] **Tem coluna `co_pay` (coparticipação)?**

- [ ] **Form permite criar preço?**
  ```jsx
  // □ Select Serviço
  // □ Select Convênio (ou "Particular" se vazio)
  // □ Input Base Price (0.00+)
  // □ Input Co-pay (0.00+)
  // □ Botão "Salvar"
  ```

- [ ] **Validação: Preço > 0?**
  ```javascript
  if (priceData.base_price <= 0) {
    throw new Error("Preço base deve ser > 0");
  }
  ```

- [ ] **GuiasConsulta.jsx busca preço correto?**
  ```javascript
  // SELECT base_price, co_pay FROM service_prices
  // WHERE service_id = serv AND health_insurance_id = conv
  ```

---

### ✅ TABELA: Regras de Repasse

**Tabela:** `revenue_rules`  
**Arquivo:** [src/lib/revenueRulesApi.js](../src/lib/revenueRulesApi.js)  
**Form:** [src/pages/clinica/base-sistema/RevenueRulesPage.jsx](../src/pages/clinica/base-sistema/RevenueRulesPage.jsx)

#### Checklist

- [ ] **Tabela `revenue_rules` existe?**

- [ ] **Tem coluna `percentage`?**

- [ ] **Tem coluna `fixed_value`?**

- [ ] **Tem coluna `rule_type`?** (percentage, fixed, table)

- [ ] **Form permite criar regra?**
  ```jsx
  // □ Select Profissional
  // □ Select Serviço
  // □ Select Convênio (opcional)
  // □ Radio: Percentual OU Valor Fixo
  // □ Input Percentual (5-100%)
  // □ Input Valor Mínimo (0.00+)
  // □ Botão "Salvar"
  ```

- [ ] **Validação: % entre 5-100?**
  ```javascript
  if (ruleData.percentage < 5 || ruleData.percentage > 100) {
    throw new Error("Percentual deve estar entre 5% e 100%");
  }
  ```

- [ ] **RepasseMedicoPage.jsx calcula corretamente?**
  ```javascript
  // Exemplo:
  // Serviço: R$ 100
  // Regra: 60%
  // Prof recebe: R$ 60
  // Clínica fica: R$ 40
  ```

---

## 🟢 BOM PRATICAR - AGENDA E OPERACIONAL

### ✅ Disponibilidade Profissional

**Tabela:** `professional_schedules`  
**Form:** [src/pages/clinica/base-sistema/ProfessionalSchedulePage.jsx](../src/pages/clinica/base-sistema/ProfessionalSchedulePage.jsx)

#### Checklist

- [ ] **Tem `day_of_week` (0-6)?**

- [ ] **Tem `start_time` e `end_time`?**

- [ ] **Tem `break_start` e `break_end`?**

- [ ] **Form permite adicionar horário?**
  ```jsx
  // □ Select Profissional
  // □ Checkboxes: Segunda até Domingo
  // □ Time: Entrada
  // □ Time: Saída
  // □ Time: Break Início (opcional)
  // □ Time: Break Fim (opcional)
  ```

- [ ] **AgendaPage respeita disponibilidade?**
  ```javascript
  // Ao agendar:
  // 1. Buscar professional_schedules para dia + prof
  // 2. Mostrar apenas horários disponíveis
  // 3. Bloquear fora do horário + breaks
  ```

---

### ✅ Salas

**Tabela:** `rooms`  
**Arquivo:** [src/lib/roomsApi.js](../src/lib/roomsApi.js)

#### Checklist

- [ ] **Tem coluna `active` (não apenas `is_active`)?**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'rooms' AND column_name IN ('active', 'is_active');
  ```

- [ ] **Tem coluna `code`?**

- [ ] **AgendaPage filtra salas ativas?**
  ```javascript
  .eq('active', true)
  ```

- [ ] **Não permite agendar sem sala?**
  ```javascript
  if (!appointmentData.room_id) {
    throw new Error("Sala é obrigatória");
  }
  ```

---

## 📊 MATRIZ DE CHECAGEM RÁPIDA

| Item | Existe no BD? | Form atualizado? | API validada? | Integração OK? |
|------|---|---|---|---|
| **Services.tuss_code** | ❓ | ❓ | ❓ | ❓ |
| **Services.type_service** | ❓ | ❓ | ❓ | ❓ |
| **Services.guide_type** | ❓ | ❓ | ❓ | ❓ |
| **Services.cost_value** | ❓ | ❓ | ❓ | ❓ |
| **Professionals.cbo_code** | ❓ | ❓ | ❓ | ❓ |
| **Professionals.council_type** | ❓ | ❓ | ❓ | ❓ |
| **Professionals.council_number** | ❓ | ❓ | ❓ | ❓ |
| **Professionals.council_state** | ❓ | ❓ | ❓ | ❓ |
| **HealthInsurances.registration_ans** | ❓ | ❓ | ❓ | ❓ |
| **HealthInsurances.tiss_pattern** | ❓ | ❓ | ❓ | ❓ |
| **HealthInsurances.guide_format** | ❓ | ❓ | ❓ | ❓ |
| **professional_services** (tabela) | ❓ | ❓ | ❓ | ❓ |
| **professional_payers** (tabela) | ❓ | ❓ | ❓ | ❓ |
| **service_prices** | ❓ | ❓ | ❓ | ❓ |
| **revenue_rules** | ❓ | ❓ | ❓ | ❓ |

---

## 🚀 COMO USAR ESTE CHECKLIST

### Passo 1: Verificar BD
```bash
# PowerShell - conectar ao Supabase
# Copiar cada SQL e rodar no Supabase Console
```

### Passo 2: Atualizar Migrations
```bash
# Se campo não existe:
# 1. Criar arquivo: supabase/migrations/YYYYMMDD_add_tiss_fields.sql
# 2. Adicionar ALTER TABLE
# 3. Testar localmente (se usar DB local)
# 4. Aplicar em produção
```

### Passo 3: Atualizar APIs
```javascript
// Em cada src/lib/*Api.js:
// 1. Adicionar validações
// 2. Adicionar campos em select()
// 3. Adicionar campos em insert/update
```

### Passo 4: Atualizar Forms
```jsx
// Em cada src/pages/clinica/base-sistema/*Page.jsx:
// 1. Adicionar inputs
// 2. Adicionar handlers
// 3. Adicionar validação visual (labels com *)
```

### Passo 5: Integração TISS
```javascript
// Em GuiasConsulta.jsx:
// 1. Validar campos obrigatórios
// 2. Bloquear guia incompleta
// 3. Gerar XML com dados corretos
```

---

## 💡 DICAS PRÁTICAS

### Query para Validar Campos Obrigatórios
```sql
-- Verificar quais serviços estão incompletos para TISS
SELECT id, name, tuss_code, type_service, guide_type, cost_value
FROM services
WHERE clinic_id = 'UUID_CLINICA'
AND (tuss_code IS NULL OR type_service IS NULL);
-- Se retornar linhas = PROBLEMA
```

### Query para Validar Profissionais
```sql
-- Quais profissionais faltam campos obrigatórios?
SELECT id, name, cbo_code, council_type, council_number, council_state
FROM professionals
WHERE clinic_id = 'UUID_CLINICA'
AND (cbo_code IS NULL OR council_type IS NULL);
```

### Query para Validar Preços
```sql
-- Quais serviços NÃO têm preço para cada convênio?
SELECT s.id, s.name, hi.name as convenio
FROM services s
CROSS JOIN health_insurances hi
WHERE s.clinic_id = 'UUID_CLINICA'
AND hi.clinic_id = s.clinic_id
AND NOT EXISTS (
  SELECT 1 FROM service_prices sp
  WHERE sp.service_id = s.id
  AND sp.health_insurance_id = hi.id
);
```

---

## ✅ CONCLUSÃO

**Quando você marcar TODOS os ✅ acima:**

1. ✅ Base do Sistema está estruturalmente correto
2. ✅ Agenda pode agendar sem conflitos
3. ✅ Faturamento calcula preços corretamente
4. ✅ TISS XML sai validado para operadora

**Se ainda tiver ❌:**
- Seguir as instruções de implementação acima
- Testar cada mudança imediatamente
- Validar em dados reais (não apenas casos felizes)

---

**Checklist versão:** 1.0  
**Última atualização:** 18 de janeiro de 2026
