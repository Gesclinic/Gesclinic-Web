# 🔍 TABELA DE REFERÊNCIA RÁPIDA - TODOS OS CAMPOS EM UM LUGAR

**Data:** 18 de janeiro de 2026  
**Objetivo:** Consulta visual rápida de campos, tipos e validações

---

## 📊 TABELA COMPLETA - TODOS OS CADASTROS

### SERVIÇOS (services)

| Campo | Tipo | Obrigatório | Validação | Impacto | Status |
|-------|------|------------|-----------|---------|--------|
| `id` | UUID | ✅ | PK | - | ✅ Existe |
| `clinic_id` | UUID | ✅ | FK clinics | Segurança | ✅ Existe |
| `name` | TEXT | ✅ | NOT NULL | Identificação | ✅ Existe |
| `code` | VARCHAR(50) | ❌ | Único/clinic | Referência interna | ✅ Existe |
| `description` | TEXT | ❌ | - | Documentação | ✅ Existe |
| **`tuss_code`** | VARCHAR(10) | 🔴 | 10 dígitos | **GLOSA se faltar** | ❌ FALTA |
| **`type_service`** | VARCHAR(50) | 🔴 | ENUM | **GLOSA se faltar** | ❌ FALTA |
| **`guide_type`** | VARCHAR(50) | 🟡 | ENUM | Organiza faturamento | ❌ FALTA |
| `default_duration_minutes` | INT | ❌ | > 0 | Agenda (padrão 30) | ✅ Existe |
| `type_billing` | VARCHAR(50) | ❌ | - | Cálculo valor | ✅ Existe |
| **`unit_measure`** | VARCHAR(20) | 🟡 | - | XML, margem | ❌ FALTA |
| **`cost_value`** | DECIMAL(12,2) | 🟡 | ≥ 0 | Margem (DRE) | ❌ FALTA |
| `base_value` | DECIMAL(12,2) | ❌ | ≥ 0 | Preço padrão | ✅ Existe |
| `requires_authorization` | BOOLEAN | ❌ | - | Fluxo | ✅ Existe |
| `allow_scheduling_fit` | BOOLEAN | ❌ | - | Encaixe | ✅ Existe |
| `active` | BOOLEAN | ✅ | - | Soft delete | ✅ Existe |
| `created_at` | TIMESTAMP | ✅ | - | Auditoria | ✅ Existe |
| `updated_at` | TIMESTAMP | ✅ | - | Auditoria | ✅ Existe |

**Resumo:** 4 campos FALTANDO (crítico: 2)

---

### PROFISSIONAIS (professionals)

| Campo | Tipo | Obrigatório | Validação | Impacto | Status |
|-------|------|------------|-----------|---------|--------|
| `id` | UUID | ✅ | PK | - | ✅ Existe |
| `clinic_id` | UUID | ✅ | FK | Segurança | ✅ Existe |
| `name` | TEXT | ✅ | NOT NULL | Identificação | ✅ Existe |
| `cpf` | VARCHAR(14) | ❌ | XXX.XXX.XXX-XX | Documento | ✅ Existe |
| `email` | VARCHAR(100) | ❌ | Email válido | Contato | ✅ Existe |
| `phone` | VARCHAR(20) | ❌ | - | Contato | ✅ Existe |
| `specialization` | TEXT | ❌ | - | Documentação | ✅ Existe |
| `professional_type` | VARCHAR(50) | ❌ | - | Classificação | ✅ Existe |
| **`cbo_code`** | VARCHAR(6) | 🔴 | 6 dígitos | **GLOSA se faltar** | ❌ FALTA |
| **`cns_code`** | VARCHAR(20) | 🟡 | - | SUS integration | ❌ FALTA |
| **`council_type`** | VARCHAR(50) | 🔴 | CRM/CREFITO/CRP... | **GLOSA se faltar** | ❌ FALTA |
| **`council_number`** | VARCHAR(20) | 🔴 | - | **GLOSA se faltar** | ❌ FALTA |
| **`council_state`** | VARCHAR(2) | 🔴 | UF (ex: SP) | **GLOSA se faltar** | ❌ FALTA |
| **`role_type`** | VARCHAR(50) | 🟡 | executor/requester/both | Agenda | ❌ FALTA |
| `active` | BOOLEAN | ✅ | - | Soft delete | ✅ Existe |
| `created_at` | TIMESTAMP | ✅ | - | Auditoria | ✅ Existe |
| `updated_at` | TIMESTAMP | ✅ | - | Auditoria | ✅ Existe |

**Resumo:** 6 campos FALTANDO (crítico: 4)

---

### CONVÊNIOS (health_insurances)

| Campo | Tipo | Obrigatório | Validação | Impacto | Status |
|-------|------|------------|-----------|---------|--------|
| `id` | UUID | ✅ | PK | - | ✅ Existe |
| `clinic_id` | UUID | ✅ | FK | Segurança | ✅ Existe |
| `code` | VARCHAR(50) | ✅ | Único/clinic | Referência | ✅ Existe |
| `name` | TEXT | ✅ | NOT NULL | Identificação | ✅ Existe |
| `type` | VARCHAR(50) | ✅ | ENUM | Classificação | ✅ Existe |
| `cnpj` | TEXT | ❌ | Único/clinic | Documento | ✅ Existe |
| **`registration_ans`** | VARCHAR(20) | 🔴 | (se privado) | **GLOSA se faltar** | ❌ FALTA |
| **`tiss_pattern`** | BOOLEAN | 🔴 | - | **GLOSA se false** | ❌ FALTA |
| **`guide_format`** | VARCHAR(50) | 🟡 | ENUM | Faturamento | ❌ FALTA |
| `contact_person` | TEXT | ❌ | - | Contato | ✅ Existe |
| `contact_email` | TEXT | ❌ | - | Contato | ✅ Existe |
| `contact_phone` | TEXT | ❌ | - | Contato | ✅ Existe |
| `requires_authorization` | BOOLEAN | ❌ | - | Fluxo | ✅ Existe |
| `authorization_lead_time_days` | INT | ❌ | ≥ 0 | Agendamento | ✅ Existe |
| `active` | BOOLEAN | ✅ | - | Soft delete | ✅ Existe |
| `created_at` | TIMESTAMP | ✅ | - | Auditoria | ✅ Existe |
| `updated_at` | TIMESTAMP | ✅ | - | Auditoria | ✅ Existe |

**Resumo:** 3 campos FALTANDO (crítico: 2)

---

### SALAS (rooms)

| Campo | Tipo | Obrigatório | Validação | Status |
|-------|------|------------|-----------|--------|
| `id` | UUID | ✅ | PK | ✅ Existe |
| `clinic_id` | UUID | ✅ | FK | ✅ Existe |
| `name` | TEXT | ✅ | NOT NULL | ✅ Existe |
| `code` | VARCHAR(50) | ❌ | Único | ✅ Existe |
| `room_type` | VARCHAR(50) | ❌ | - | ✅ Existe |
| `floor` | INT | ❌ | - | ✅ Existe |
| `max_capacity` | INT | ❌ | ≥ 1 | ✅ Existe |
| `active` \| `is_active` | BOOLEAN | ✅ | - | ⚠️ Nome inconsistente |
| `created_at` | TIMESTAMP | ✅ | - | ✅ Existe |
| `updated_at` | TIMESTAMP | ✅ | - | ✅ Existe |

**Resumo:** Estrutura OK, só normalizar `active`

---

### VÍNCULOS (Tabelas de Relacionamento)

#### professional_services

| Campo | Tipo | Obrigatório | Validação |
|-------|------|------------|-----------|
| `id` | UUID | ✅ | PK |
| `professional_id` | UUID | ✅ | FK |
| `service_id` | UUID | ✅ | FK |
| `clinic_id` | UUID | ✅ | FK |
| `duration_minutes_override` | INT | ❌ | > 0 se setado |
| `competence_level` | VARCHAR(50) | ❌ | junior/standard/expert |
| `active` | BOOLEAN | ✅ | - |
| `UNIQUE` | - | ✅ | (prof, serv, clinic) |

**Status:** ✅ Estrutura pronta

---

#### professional_payers

| Campo | Tipo | Obrigatório | Validação | Crítico |
|-------|------|------------|-----------|--------|
| `id` | UUID | ✅ | PK | - |
| `professional_id` | UUID | ✅ | FK | - |
| `health_insurance_id` | UUID | ✅ | FK | - |
| `clinic_id` | UUID | ✅ | FK | - |
| **`credential_number`** | VARCHAR(50) | 🔴 | - | **GLOSA se vazio** |
| `percentage_split` | DECIMAL(5,2) | ❌ | 0-100 | - |
| `fixed_value` | DECIMAL(12,2) | ❌ | ≥ 0 | - |
| `active` | BOOLEAN | ✅ | - | - |
| `UNIQUE` | - | ✅ | (prof, conv, clinic) | - |

**Status:** ✅ Existe, mas validar `credential_number` preenchido

---

#### service_prices

| Campo | Tipo | Obrigatório | Validação |
|-------|------|------------|-----------|
| `id` | UUID | ✅ | PK |
| `service_id` | UUID | ✅ | FK |
| `health_insurance_id` | UUID | ❌ | FK (NULL = Particular) |
| `clinic_id` | UUID | ✅ | FK |
| `base_price` | DECIMAL(12,2) | ✅ | > 0 |
| `co_pay` | DECIMAL(12,2) | ❌ | ≥ 0 |
| `active` | BOOLEAN | ✅ | - |
| `created_at` | TIMESTAMP | ✅ | - |

**Status:** ✅ Estrutura pronta

---

#### revenue_rules

| Campo | Tipo | Obrigatório | Validação |
|-------|------|------------|-----------|
| `id` | UUID | ✅ | PK |
| `clinic_id` | UUID | ✅ | FK |
| `professional_id` | UUID | ✅ | FK |
| `service_id` | UUID | ✅ | FK |
| `health_insurance_id` | UUID | ❌ | FK (NULL = Particular) |
| `rule_type` | VARCHAR(50) | ✅ | percentage/fixed/table |
| `percentage` | DECIMAL(5,2) | ❌ | 5-100 se type=percentage |
| `fixed_value` | DECIMAL(12,2) | ❌ | > 0 se type=fixed |
| `minimum_value` | DECIMAL(12,2) | ❌ | ≥ 0 |
| `active` | BOOLEAN | ✅ | - |

**Status:** ✅ Estrutura pronta

---

## 🎯 RESUMO POR TABELA

| Tabela | Campos Total | ✅ Pronto | ❌ Falta | 🟡 Validar |
|--------|---|---|---|---|
| **services** | 17 | 13 | 2 | 2 |
| **professionals** | 17 | 11 | 4 | 2 |
| **health_insurances** | 17 | 14 | 2 | 1 |
| **rooms** | 10 | 10 | 0 | 1 |
| **professional_services** | 8 | 8 | 0 | 0 |
| **professional_payers** | 9 | 8 | 1 | 0 |
| **service_prices** | 8 | 8 | 0 | 0 |
| **revenue_rules** | 10 | 10 | 0 | 0 |
| **TOTAL** | **96** | **82** | **9** | **6** |

**Conclusão:** 9 campos FALTANDO = 9% incompleto

---

## 📋 VALIDAÇÕES OBRIGATÓRIAS

### Nível 1: Criação (INSERT)

```
✅ Services.tuss_code NOT NULL quando ativar
✅ Services.type_service NOT NULL quando ativar
✅ Professionals.cbo_code NOT NULL quando ativar
✅ Professionals.council_type NOT NULL quando ativar
✅ Professionals.council_number NOT NULL quando ativar
✅ HealthInsurances.registration_ans NOT NULL se type != 'government'
✅ HealthInsurances.tiss_pattern = TRUE
✅ ServicePrices.base_price > 0
✅ professional_payers.credential_number NOT NULL
```

### Nível 2: Agendamento (ANTES de criar appointment)

```
✅ Existe professional_services (prof faz serviço?)
✅ Existe professional_payers (prof credenciado?)
✅ professional_payers.credential_number preenchido
✅ Existe service_prices (preço definido?)
✅ Profissional tem schedule para este dia?
```

### Nível 3: Faturamento (ANTES de gerar guia TISS)

```
✅ Appointment.status = 'completed' ou 'attended'
✅ Todos os validações nível 1 OK
✅ Todos os validações nível 2 OK
✅ service.tuss_code válido (10 dígitos)
✅ professional.cbo_code válido (6 dígitos)
✅ professional.council_type + number preenchidos
✅ health_insurance.registration_ans preenchido
✅ professional_payers.credential_number preenchido
✅ service_prices.base_price > 0
```

---

## 🔴 GLOSA SE FALTAR

| Campo | Consequ |
|-------|---------|
| `tuss_code` | ❌ 100% GLOSA |
| `type_service` | ❌ 100% GLOSA |
| `cbo_code` | ❌ 100% GLOSA |
| `council_type/number` | ❌ 100% GLOSA |
| `registration_ans` | ❌ 100% GLOSA |
| `credential_number` | ❌ 100% GLOSA (CRÍTICO) |
| `base_price` (0 ou NULL) | ❌ Não fatua |

---

## 📊 SQL PARA AUDITORIA RÁPIDA

### Ver o que FALTA em Serviços

```sql
SELECT 
  id, name, 
  tuss_code, type_service, guide_type, cost_value,
  CASE 
    WHEN tuss_code IS NULL THEN '❌ TUSS'
    WHEN type_service IS NULL THEN '❌ TYPE'
    WHEN guide_type IS NULL THEN '⚠️ GUIDE'
    WHEN cost_value IS NULL THEN '⚠️ COST'
    ELSE '✅ OK'
  END AS status
FROM services
WHERE clinic_id = 'UUID_CLINICA'
ORDER BY status;
```

### Ver o que FALTA em Profissionais

```sql
SELECT 
  id, name,
  cbo_code, council_type, council_number, council_state,
  CASE 
    WHEN cbo_code IS NULL THEN '❌ CBO'
    WHEN council_type IS NULL THEN '❌ COUNCIL_TYPE'
    WHEN council_number IS NULL THEN '❌ COUNCIL_NUM'
    WHEN council_state IS NULL THEN '❌ STATE'
    ELSE '✅ OK'
  END AS status
FROM professionals
WHERE clinic_id = 'UUID_CLINICA'
ORDER BY status;
```

### Ver Credential Numbers Vazios

```sql
SELECT 
  pp.id,
  p.name AS prof_name,
  hi.name AS conv_name,
  pp.credential_number,
  CASE WHEN pp.credential_number IS NULL THEN '❌ FALTA' ELSE '✅ OK' END AS status
FROM professional_payers pp
JOIN professionals p ON pp.professional_id = p.id
JOIN health_insurances hi ON pp.health_insurance_id = hi.id
WHERE pp.clinic_id = 'UUID_CLINICA'
ORDER BY status;
```

### Ver Preços Zerados/Nulos

```sql
SELECT 
  s.name,
  hi.name,
  sp.base_price,
  CASE 
    WHEN sp.base_price IS NULL THEN '❌ NULL'
    WHEN sp.base_price <= 0 THEN '❌ ZERO'
    ELSE '✅ OK'
  END AS status
FROM service_prices sp
JOIN services s ON sp.service_id = s.id
LEFT JOIN health_insurances hi ON sp.health_insurance_id = hi.id
WHERE sp.clinic_id = 'UUID_CLINICA'
ORDER BY status;
```

---

**Versão:** 1.0  
**Data:** 18 de janeiro de 2026  
**Próxima atualização:** Após implementação dos campos faltantes
