# 🚀 EQUIPARAÇÃO ISSQN→ISS - GUIA DE EXECUÇÃO

## 📋 Status
- ✅ Plano criado: `📋_EQUIPACAO_ISSQN_ISS_PLANO.md`
- ✅ Migration SQL criada: `supabase/migrations/2026-05-21_add_issqn_equiparation_fields.sql`
- ⬜ UI não atualizada ainda (próxima etapa)

---

## 🔧 Etapa 1: Executar Migration no Supabase

### Opção A: Via Supabase Dashboard (Recomendado)
1. Abra https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql
2. Clique em "New Query"
3. Cole o conteúdo de: `supabase/migrations/2026-05-21_add_issqn_equiparation_fields.sql`
4. Clique em "Run"
5. Verificar se não há erros

### Opção B: Via CLI
```bash
cd c:\dev\gesclinic-web
npx supabase db push --db-url "postgresql://postgres:[sua_senha]@db.gvdkdjyupktlflwurike.supabase.co:5432/postgres"
```

---

## ✅ Verificação Pós-Migration

### Verificar Colunas Adicionadas
No Supabase SQL Editor, execute:

```sql
-- Verificar services
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'services' AND column_name LIKE '%equiparation%';

-- Verificar health_insurances
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'health_insurances' AND column_name LIKE '%equiparation%';

-- Verificar service_prices
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'service_prices' AND column_name LIKE '%equiparation%';
```

### Verificar Função Criada
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_service_tax_treatment'
AND routine_schema = 'public';
```

### Testar Função
```sql
-- Teste com UUIDs fictícios (será vazio se não existirem dados)
SELECT * FROM public.get_service_tax_treatment(
  '00000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000002'::UUID,
  '00000000-0000-0000-0000-000000000003'::UUID
);
```

---

## 📊 Campos Adicionados

### Tabela: services
```sql
has_issqn_equiparation BOOLEAN DEFAULT FALSE
```
**Exemplos:**
- FALSE (padrão): Serviço tributado por ISSQN municipal
- TRUE: Serviço PODE estar equiparado para ISS

### Tabela: health_insurances
```sql
has_issqn_equiparation BOOLEAN DEFAULT FALSE
```
**Exemplos:**
- FALSE (padrão): Convênio usa ISSQN para todos os serviços
- TRUE: Convênio aplica ISS para serviços equipáveis

### Tabela: service_prices
```sql
service_issqn_equiparation BOOLEAN DEFAULT NULL
```
**Exemplos:**
- NULL: Usa configuração do convênio
- TRUE: Força ISS neste serviço×convênio
- FALSE: Força ISSQN neste serviço×convênio

---

## 🔄 Próximas Etapas

### ETAPA 2: Atualizar APIs
- [ ] Atualizar `servicesApi.js` para incluir `has_issqn_equiparation`
- [ ] Atualizar `healthInsurancesApi.js` para incluir `has_issqn_equiparation`
- [ ] Criar função auxiliar para determinar equiparação

### ETAPA 3: Atualizar UI - Serviços
- [ ] Adicionar checkbox em `ServicosPage.jsx`
- [ ] Integrar com salvamento de serviço
- [ ] Mostrar status na lista

### ETAPA 4: Atualizar UI - Convênios
- [ ] Adicionar seção em `ConveniosPage.jsx` (aba Tributos)
- [ ] Checkbox "Aplicar equiparação ISSQN→ISS"
- [ ] Integrar com salvamento de convênio

### ETAPA 5: Atualizar UI - Tabela de Preços
- [ ] Adicionar coluna de equiparação
- [ ] Permitir override por serviço×convênio
- [ ] Salvar `service_issqn_equiparation`

### ETAPA 6: Integração - Financeiro
- [ ] Consultar equiparação ao registrar receita
- [ ] Classificar por tipo (ISS vs ISSQN)
- [ ] Aplicar alíquota correta

### ETAPA 7: Integração - NF-e
- [ ] Consultar equiparação ao emitir NF
- [ ] Aplicar tipo de imposto correto
- [ ] Integrar com módulo de NF

---

## 🧪 Testes Unitários

### Teste 1: Função get_service_tax_treatment
```sql
-- Setup: Criar dados de teste
INSERT INTO services (id, clinic_id, name, has_issqn_equiparation) 
VALUES ('uuid-1', 'clinic-1', 'Serviço Equipável', true);

INSERT INTO health_insurances (id, clinic_id, name, has_issqn_equiparation)
VALUES ('uuid-2', 'clinic-1', 'Convênio com Equiparação', true);

-- Teste: Verificar equiparação
SELECT * FROM get_service_tax_treatment('uuid-1', 'uuid-2', 'clinic-1');

-- Esperado: is_issqn_equiparated = true, tax_type = 'ISS'
```

### Teste 2: Override
```sql
INSERT INTO service_prices 
(service_id, health_insurance_id, clinic_id, service_issqn_equiparation)
VALUES ('uuid-1', 'uuid-2', 'clinic-1', false);

-- Teste: Verificar se override funciona
SELECT * FROM get_service_tax_treatment('uuid-1', 'uuid-2', 'clinic-1');

-- Esperado: is_issqn_equiparated = false, tax_type = 'ISSQN' (override)
```

---

## 📝 Documentação Relacionada

- 📋 Plano completo: `📋_EQUIPACAO_ISSQN_ISS_PLANO.md`
- 🚀 Este guia: `⚡_EQUIPACAO_ISSQN_ISS_EXECUCAO.md`
- 📊 Migration SQL: `supabase/migrations/2026-05-21_add_issqn_equiparation_fields.sql`

---

## ❓ Perguntas Frequentes

### P: A equiparação afeta retroativamente os registros existentes?
**R:** Não. Todos os registros existentes herdarão o padrão (FALSE = ISSQN). Você precisará marcar convênios/serviços que usam ISS.

### P: Posso ter equiparação por convênio mas não em serviço específico?
**R:** Sim! Use o override em `service_prices`. Marque convênio com equiparação, mas coloque FALSE no `service_prices` para serviços que não devem ser equiparados.

### P: A função `get_service_tax_treatment` é usada automaticamente?
**R:** Não ainda. Você precisará consultá-la no código de emissão de NF e financeiro. Próximas etapas.

### P: Como impacta em NF-e/RPS já emitidas?
**R:** Não impacta. Apenas afeta novas emissões. Para reemissão, será necessário ajustar manualmente.

---

## 🎯 Próximo Passo
Quando a migration estiver executada com sucesso, prosseguir com:
**ETAPA 2: Atualizar APIs**

---

**Status:** 🟡 Aguardando Execução da Migration  
**Timestamp:** 2026-05-21  
**Responsável:** Implementação (próxima sessão)
