# 📋 EQUIPARAÇÃO ISSQN → ISS - PLANO DE IMPLEMENTAÇÃO

## 🎯 Objetivo
Controlar se um serviço em um convênio está equiparado de ISSQN para ISS, impactando:
- ✅ Emissão de Nota Fiscal (tipo de imposto)
- ✅ Financeiro (classificação de receita)
- ✅ Contabilidade (código contábil/natureza da receita)

---

## 📊 Contexto - Equiparação ISSQN vs ISS

### O Que É?
- **ISSQN (Imposto sobre Serviços de Qualquer Natureza):**
  - Imposto municipal
  - Alíquota: 2% a 5% (depende da atividade e município)
  - Aplicável a serviços em geral (médico, odontológico, etc.)

- **ISS (Imposto sobre Serviços):**
  - Após Reforma 2024 (IBS/CBS)
  - Alíquota: 2% (ISS federal) + IBS (estadual)
  - Equiparação: algumas atividades passaram de ISSQN para ISS

### Por Que Rastrear?
Alguns serviços podem estar equiparados de ISSQN (municipal) para ISS (federal/estadual):
- ✅ Serviços de TI/consultoria (Lei 13.985/2020)
- ✅ Alguns serviços de saúde (conforme município)
- ✅ Serviços profissionais especializados

---

## 🏗️ Estrutura de Dados

### 1. **Tabela: services**
Novo campo:
```sql
ALTER TABLE public.services ADD COLUMN has_issqn_equiparation BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN public.services.has_issqn_equiparation IS 'Serviço pode estar equiparado de ISSQN para ISS';
```

**Significado:**
- `FALSE` (padrão): Serviço é tributado por ISSQN municipal
- `TRUE`: Serviço PODE estar equiparado (será determinado por convênio)

### 2. **Tabela: health_insurances**
Novo campo:
```sql
ALTER TABLE public.health_insurances ADD COLUMN has_issqn_equiparation BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN public.health_insurances.has_issqn_equiparation IS 'Convênio aplica equiparação ISSQN→ISS nos serviços';
```

**Significado:**
- `FALSE` (padrão): Serviços tributados por ISSQN
- `TRUE`: Serviços tributados por ISS (equiparados)

### 3. **Tabela: health_insurance_service_prices** (ou relação M:M)
Campo de override (opcional):
```sql
ALTER TABLE public.health_insurance_service_prices 
ADD COLUMN service_issqn_equiparation BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN public.health_insurance_service_prices.service_issqn_equiparation 
IS 'Override: TRUE=ISS, FALSE=ISSQN, NULL=usar convênio padrão';
```

**Significado:**
- `NULL` (padrão): Usa a configuração do convênio
- `FALSE`: Força ISSQN para este serviço neste convênio
- `TRUE`: Força ISS para este serviço neste convênio

---

## 🔄 Fluxo de Lógica

```
1. SERVIÇO CADASTRADO
   └─ has_issqn_equiparation = FALSE (padrão)
      └─ Campo opcional: "Este serviço pode estar equiparado?"

2. CONVÊNIO CADASTRADO
   └─ has_issqn_equiparation = FALSE (padrão)
      └─ Campo: "Aplicar equiparação ISSQN→ISS nos serviços?"

3. PREÇO DO SERVIÇO NO CONVÊNIO
   └─ service_issqn_equiparation = NULL
      └─ Pode override o padrão (opcional)

4. NA EMISSÃO DE NF
   └─ Consulta: service.has_issqn_equiparation → health_insurance.has_issqn_equiparation → service_price.service_issqn_equiparation
   └─ Determina: ISSQN ou ISS?
   └─ Aplica imposto correto na NF

5. NO FINANCEIRO
   └─ Classifica receita por tipo de imposto
   └─ ISSQN: Receita Tributável (ISSQN)
   └─ ISS: Receita Tributável (ISS)

6. NA CONTABILIDADE
   └─ Natureza da receita diferente
   └─ Código contábil específico por tipo
```

---

## 🖼️ UI/UX - Onde Aparecer?

### 📄 Página Serviços (ServicosPage.jsx)
```
┌─────────────────────────────────────────┐
│ ☐ Pode estar equiparado de ISSQN→ISS    │
│ 💡 Marque se este serviço pode ter      │
│    tratamento fiscal diferente          │
└─────────────────────────────────────────┘
```

### 💼 Aba Tributos - Convênios (ConveniosPage.jsx)
```
┌─────────────────────────────────────────┐
│ SEÇÃO: Equiparação ISSQN → ISS         │
├─────────────────────────────────────────┤
│ ☐ Aplicar equiparação nos serviços      │
│ 💡 Marque se convênio usa ISS em vez    │
│    de ISSQN (Lei 13.985/2020)          │
│                                         │
│ ℹ️ Regra para este convênio:            │
│ • Serviços equipáveis → ISS 2%          │
│ • Demais → ISSQN conforme município    │
└─────────────────────────────────────────┘
```

### 💰 Tabela de Preços (ServicePricesPage.jsx)
```
Coluna: "Equiparação"
┌──────────────────────────────────┐
│ — (padrão do convênio)            │
│ ✓ ISS (equiparado)                │
│ ✗ ISSQN (não equiparado)          │
└──────────────────────────────────┘
```

---

## 💻 Implementação - Próximas Etapas

### ETAPA 1: Preparar Banco de Dados
1. ✅ Criar migration SQL para adicionar campos
2. ✅ Testar na Supabase
3. ✅ Documentar mudanças

### ETAPA 2: Atualizar UI - Serviços
1. ⬜ Adicionar checkbox em ServicosPage.jsx
2. ⬜ Salvar `has_issqn_equiparation` na API
3. ⬜ Mostrar na lista de serviços

### ETAPA 3: Atualizar UI - Convênios
1. ⬜ Adicionar seção em ConveniosPage.jsx (Tributos)
2. ⬜ Checkbox "Aplicar equiparação"
3. ⬜ Salvar `has_issqn_equiparation` na API

### ETAPA 4: Atualizar UI - Tabela de Preços
1. ⬜ Adicionar coluna de equiparação
2. ⬜ Permitir override por serviço×convênio
3. ⬜ Salvar `service_issqn_equiparation`

### ETAPA 5: Integração - Financeiro/NF
1. ⬜ Consultar equiparação ao emitir NF
2. ⬜ Classificar imposto corretamente
3. ⬜ Aplicar alíquota (ISS 2% ou ISSQN %)

---

## 🔗 Relacionamentos

```
services
  ├─ id
  ├─ name
  ├─ has_issqn_equiparation ← NOVO
  └─ ...

health_insurances
  ├─ id
  ├─ name
  ├─ has_issqn_equiparation ← NOVO
  └─ ...

health_insurance_service_prices (relação M:M)
  ├─ id
  ├─ service_id → services.id
  ├─ health_insurance_id → health_insurances.id
  ├─ service_value
  ├─ service_issqn_equiparation ← NOVO (override)
  └─ ...
```

---

## 📋 Checklist de Implementação

- [ ] 1. Criar migration SQL (campos no banco)
- [ ] 2. Aplicar migration no Supabase
- [ ] 3. Atualizar servicesApi.js (incluir campo)
- [ ] 4. Atualizar healthInsurancesApi.js (incluir campo)
- [ ] 5. Atualizar ServicosPage.jsx (UI para serviço)
- [ ] 6. Atualizar ConveniosPage.jsx (UI para convênio - aba Tributos)
- [ ] 7. Atualizar ServicePricesPage.jsx (coluna de equiparação)
- [ ] 8. Testar salvamento de dados
- [ ] 9. Testar lógica de prioridade (service > health_insurance > service_price)
- [ ] 10. Documentar para NF/Financeiro

---

## 🚀 Benefícios

✅ **Controle Fiscal Preciso:** Cada serviço×convênio tem regra clara  
✅ **NF-e Correta:** Imposto aplicado conforme legislação  
✅ **Financeiro Organizado:** Receitas classificadas por tipo  
✅ **Contabilidade Acurada:** Natureza de receita correta  
✅ **Auditoria:** Rastreabilidade de decisões  
✅ **Automação:** Reduz erros manuais  

---

**Status:** 📋 Planejamento Concluído  
**Próximo:** Implementar Etapa 1 (Migration SQL)
