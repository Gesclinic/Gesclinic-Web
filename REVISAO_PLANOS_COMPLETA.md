# 📋 Revisão Completa do Projeto - Planos vs Funcionalidades

## 🎯 Resumo Executivo

Revisei completamente o projeto e organizei todos os planos e funcionalidades em uma estrutura clara:

- ✅ **3 Planos** definidos: Basic, Professional, Enterprise
- ✅ **Mapeamento completo** de features por plano
- ✅ **Sistema de feature flags** implementado
- ✅ **Menu dinâmico** com bloqueios para planos
- ✅ **Hooks de acesso** para verificar permissões

---

## 📊 Estrutura de Planos

### 🟢 PLANO BÁSICO (R$ 99/mês)
**Ideal para:** Clínicas começando

**Limites:**
- Até 2 usuários
- Até 2 médicos

**Incluído:**
```
✅ Agenda
  - Agenda Unificada
  - Por Profissional
  - Por Sala
  - Confirmação de Consultas
  - Lista de Espera
  - Relatórios
  - KPIs
  - Notificações

✅ Pacientes
  - Cadastro
  - Histórico
  - Anamnese
  - Documentos

✅ Profissionais
  - Cadastro
  - Horários
  - Especialidades

✅ Serviços
  - Cadastro
  - Salas
  - Equipamentos Básicos
```

**Bloqueado:**
```
❌ Estoque (completamente)
❌ Financeiro (completamente)
❌ Relatórios Avançados
❌ Multiunidades
```

---

### 🟡 PLANO PROFISSIONAL (R$ 249/mês)
**Ideal para:** Clínicas com operações completas

**Limites:**
- Até 10 usuários
- Até 5 médicos

**Incluído:** Tudo do Básico +

```
✅ Estoque Completo
  - Dashboard
  - Produtos
  - Categorias
  - Fornecedores
  - Movimentações (Entradas/Saídas)
  - Transferências
  - Requisições
  - Inventário
  - Relatórios

✅ Financeiro Completo
  - Dashboard
  - Contas a Pagar
  - Contas a Receber
  - Fluxo de Caixa
  - Centro de Custos
  - Plano de Contas
  - Conciliação Bancária
  - Automação Financeira

✅ Profissionais Avançado
  - Documentos
  - Desempenho

✅ Relatórios Gerenciais
  - Agenda
  - Financeiro
  - Estoque
  - Pacientes
  - Profissionais
```

**Bloqueado:**
```
❌ Multiunidades
❌ Repasse Médico Avançado
❌ Comissões
```

---

### 🔵 PLANO ENTERPRISE (R$ 489/mês)
**Ideal para:** Redes e grandes operações

**Limites:**
- Usuários ilimitados
- Médicos ilimitados

**Incluído:** Tudo do Profissional +

```
✅ Multiunidades (Completo)
  - Gerenciamento de unidades
  - Transferências entre unidades
  - Consolidação de dados
  - Relatórios por unidade

✅ Estoque Multiunidades
  - Transferências entre unidades
  - Consolidação de estoque
  - Relatórios centralizados

✅ Financeiro Multiunidades
  - Centros de Custo por unidade
  - DRE por unidade
  - Consolidação financeira
  - Conciliação avançada

✅ Profissionais Completo
  - Repasse Médico
  - Comissões
  - Metas
  - Análises de desempenho

✅ Relatórios Avançados
  - Tudo do Professional +
  - Gerencial integrado
  - Export avançado
  - Dashboard executivo
```

---

## 🛠️ Arquivos Criados/Atualizados

### 1. **`src/constants/plansFeatureMap.js`** (NOVO)
Mapeamento centralizado de todos os planos e features:
```javascript
PLANS_FEATURES = {
  basic: { features: {...} },
  professional: { features: {...} },
  enterprise: { features: {...} }
}
```

**Funções:**
- `hasFeatureAccess(planSlug, featurePath)` - Verifica acesso
- `getPlanFeatures(planSlug)` - Obtém todas as features
- `getPlanInfo(planSlug)` - Info do plano

### 2. **`src/hooks/useMenuWithFeatures.js`** (NOVO)
Hook para filtrar menu baseado no plano:
```javascript
useMenuWithFeatures(baseMenu) // Retorna menu filtrado
useMenuItemAccess(featurePath) // Verifica acesso a item
```

### 3. **`src/constants/menu.js`** (ATUALIZADO)
Menu agora tem `featurePath` em cada item:
```javascript
{
  label: "Estoque",
  featurePath: "estoque", // Feature guard
  children: [...]
}
```

### 4. **`src/hooks/useFeatureAccess.js`** (JÁ EXISTIA)
Hooks para verificar features:
```javascript
useFeatureAccess(feature) // boolean
usePlanLimits() // maxUsers, maxDoctors
usePlanInfo() // planId, planName, features
UpgradePlanBanner // Componente de aviso
ProtectFeature // HOC para proteger conteúdo
```

---

## 🔌 Como Usar

### 1. Verificar Acesso a uma Feature
```javascript
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

function MyComponent() {
  const canAccessEstoque = useFeatureAccess('estoque');
  
  if (!canAccessEstoque) {
    return <UpgradePlanBanner feature="estoque" />;
  }
  
  return <EstoqueContent />;
}
```

### 2. Verificar Acesso a um Item de Menu
```javascript
import { useMenuItemAccess } from '@/hooks/useMenuWithFeatures';

function MenuItem({ featurePath }) {
  const hasAccess = useMenuItemAccess(featurePath);
  
  return (
    <button disabled={!hasAccess}>
      {hasAccess ? 'Acessar' : 'Upgrade necessário'}
    </button>
  );
}
```

### 3. Obter Info do Plano
```javascript
import { usePlanInfo, usePlanLimits } from '@/hooks/useFeatureAccess';

function PlanStatus() {
  const plan = usePlanInfo();
  const limits = usePlanLimits();
  
  return (
    <div>
      <p>Plano: {plan.planName}</p>
      <p>Usuários: {limits.currentUsers}/{limits.maxUsers}</p>
    </div>
  );
}
```

---

## 📝 Database Schema

### Tabela `plans`
```sql
id                UUID PRIMARY KEY
name              TEXT
slug              TEXT UNIQUE (basic, professional, enterprise)
description       TEXT
max_users         INT
max_doctors       INT
has_financial     BOOLEAN
has_stock         BOOLEAN
has_reports       BOOLEAN
has_multi_unit    BOOLEAN
stripe_product_id TEXT
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**3 Planos Pré-cadastrados:**
```
550e8400-e29b-41d4-a716-446655440001 | Plano Básico | basic
550e8400-e29b-41d4-a716-446655440002 | Plano Profissional | professional
550e8400-e29b-41d4-a716-446655440003 | Plano Enterprise | enterprise
```

### Tabela `clinic_subscriptions`
```sql
id                    UUID PRIMARY KEY
clinic_id             UUID (FK → clinics.id)
plan_id               UUID (FK → plans.id)
stripe_customer_id    TEXT
stripe_subscription_id TEXT
status                ENUM (active, canceled, past_due, etc)
billing_cycle         ENUM (monthly, annual)
period_start          TIMESTAMP
period_end            TIMESTAMP
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### Tabela `clinics` (Atualizada)
```sql
plan_id UUID (FK → plans.id)
```

---

## 🔐 RLS Policies

### clinic_subscriptions
- **SELECT:** Apenas usuários da clínica podem ver sua subscription
- **UPDATE:** Apenas durante webhook do Stripe
- **INSERT:** Apenas durante checkout

---

## 🧪 Fluxo de Teste

1. **Criar Clinic com Plano Basic**
   ```sql
   INSERT INTO clinics (plan_id, name) 
   VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Teste');
   ```

2. **Acessar app**
   - Menu deve mostrar apenas Agenda e Pacientes
   - Estoque e Financeiro aparecem com badge "BLOQUEADO"

3. **Fazer upgrade para Professional**
   - Via checkout Stripe
   - Atualizar plan_id da clínica
   - Menu se atualiza automaticamente

---

## ✅ Checklist de Implementação

- [x] Criar mapeamento de planos e features
- [x] Criar hooks de acesso a features
- [x] Atualizar menu com feature paths
- [x] Integrar Stripe Products & Prices
- [x] Atualizar Edge Function para usar Stripe Price IDs
- [ ] **Próximo:** Testar fluxo completo de checkout
- [ ] **Próximo:** Integrar webhook de sucesso de pagamento
- [ ] **Próximo:** Atualizar ClinicContext para carregar plan
- [ ] **Próximo:** Implementar UI de upgrade para features bloqueadas

---

## 🚀 Próximos Passos

1. **Testar checkout** com os 3 planos
2. **Implementar webhook** para atualizar plan_id após pagamento
3. **Criar componente UpgradeBanner** para features bloqueadas
4. **Adicionar upgrade flow** quando usuário tenta acessar feature bloqueada
5. **Criar dashboard de gestão de plano** na área de configurações

