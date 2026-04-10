# ✅ CHECKLIST COMPLETO - STRIPE + SUPABASE INTEGRATION

## 🔴 PASSO 1: STRIPE DASHBOARD (CRIAR PRODUCTS E PRICES)

### ✅ Products
- [ ] **Gesclinic Web – Básico**
  - [x] Name, Description criados
  - [ ] Metadata adicionada (plan_key: basic, max_users: 2, max_doctors: 2)
  - [ ] Product ID copiado (salvar como `PRODUCT_BASIC`)

- [ ] **Gesclinic Web – Profissional**
  - [x] Name, Description criados
  - [ ] Metadata adicionada (plan_key: professional, max_users: 10, max_doctors: 5)
  - [ ] Product ID copiado (salvar como `PRODUCT_PROFESSIONAL`)

- [ ] **Gesclinic Web – Enterprise**
  - [x] Name, Description criados
  - [ ] Metadata adicionada (plan_key: enterprise, max_users: unlimited)
  - [ ] Product ID copiado (salvar como `PRODUCT_ENTERPRISE`)

### ✅ Prices (Básico)
- [ ] **Monthly - R$ 99.00**
  - [ ] Price ID: `PRICE_BASIC_MONTHLY`
  - [ ] Metadata: plan_key: basic, billing_cycle: monthly

- [ ] **Annual - R$ 990.00**
  - [ ] Price ID: `PRICE_BASIC_ANNUAL`
  - [ ] Metadata: plan_key: basic, billing_cycle: annual

### ✅ Prices (Profissional)
- [ ] **Monthly - R$ 249.00**
  - [ ] Price ID: `PRICE_PROFESSIONAL_MONTHLY`
  - [ ] Metadata: plan_key: professional, billing_cycle: monthly

- [ ] **Annual - R$ 2,490.00**
  - [ ] Price ID: `PRICE_PROFESSIONAL_ANNUAL`
  - [ ] Metadata: plan_key: professional, billing_cycle: annual

### ✅ Prices (Enterprise)
- [ ] **❌ Sem price fixo** (lead via contato comercial)

---

## 🔵 PASSO 2: SUPABASE SQL MIGRATIONS

### ✅ Executar Migration
```bash
# Copiar conteúdo de:
# supabase/migrations/20260112_plans_and_subscriptions.sql

# E executar no Supabase SQL Editor:
```

- [ ] Tabela `plans` criada
  - [ ] Inserir dados iniciais (basic, professional, enterprise)
  - [ ] Atualizar `stripe_product_id` com os IDs do Stripe

- [ ] Tabela `clinic_subscriptions` criada
  - [ ] Colunas de controle criadas (status, stripe_subscription_id, etc)
  - [ ] RLS policies configuradas

- [ ] Coluna `plan_id` adicionada em `clinics`

---

## 🟢 PASSO 3: ATUALIZAR CÓDIGO (Integration)

### ✅ Criar arquivo config
- [ ] Criar `src/config/stripe-products.js` com:
  ```javascript
  export const STRIPE_PRODUCTS = {
    basic: { productId: 'prod_...', prices: { monthly: 'price_...', annual: 'price_...' } },
    professional: { productId: 'prod_...', prices: { monthly: 'price_...', annual: 'price_...' } },
    enterprise: { productId: 'prod_...', prices: {} }
  };
  ```

### ✅ Feature Hooks
- [x] `src/hooks/useFeatureAccess.js` criado
  - [x] `useFeatureAccess(feature)` - verificar feature
  - [x] `usePlanLimits()` - limites de usuários/médicos
  - [x] `usePlanInfo()` - informações do plano
  - [x] `UpgradePlanBanner` - componente de upgrade
  - [x] `ProtectFeature` - HOC para proteger features

### ✅ Checkout atualizado
- [ ] Edge Function atualizada para salvar plano_id
- [ ] Webhook atualiza `clinic_subscriptions`

### ✅ Context Provider
- [ ] `ClinicContext` atualizado para buscar plan
- [ ] `useClinicContext()` retorna `clinic.plan`

---

## 🟡 PASSO 4: IMPLEMENTAR FEATURE GUARDS

### ✅ Em componentes críticos:
- [ ] Financeiro (bloquear se `!has_financial`)
- [ ] Estoque (bloquear se `!has_stock`)
- [ ] Relatórios (bloquear se `!has_reports`)
- [ ] Multiunidades (bloquear se `!has_multi_unit`)

### ✅ No Menu/Navigation
- [ ] Menu itens mostrados/ocultos baseado em features

### ✅ Limites de Usuários
- [ ] Validação ao adicionar novo usuário
- [ ] Aviso quando limite atingido

---

## 🔥 PASSO 5: TESTES

### ✅ Fluxo Complete
- [ ] Registrar com plano Básico
- [ ] Checkout funciona
- [ ] Stripe cria subscription
- [ ] Webhook atualiza plano em Supabase
- [ ] `clinic.plan` carrega corretamente
- [ ] Feature guards funcionam

### ✅ Feature Guards
- [ ] Usuário Basic não vê menu Financeiro
- [ ] Usuário Professional vê tudo
- [ ] Enterprise tem acesso total

### ✅ Upgrade
- [ ] Upgrade de Basic → Professional
- [ ] Plano atualiza em tempo real
- [ ] Features desbloqueadas imediatamente

---

## 📋 VARIÁVEIS DE AMBIENTE (.env)

```
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_STRIPE_PRODUCT_BASIC=prod_...
VITE_STRIPE_PRODUCT_PROFESSIONAL=prod_...
VITE_STRIPE_PRODUCT_ENTERPRISE=prod_...

# Prices
VITE_STRIPE_PRICE_BASIC_MONTHLY=price_...
VITE_STRIPE_PRICE_BASIC_ANNUAL=price_...
VITE_STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_...
```

---

## 📚 DOCUMENTAÇÃO CRIADA

- [x] `STRIPE_PRODUCTS_SETUP.md` - Guia passo a passo Stripe
- [x] `supabase/migrations/20260112_plans_and_subscriptions.sql` - SQL migration
- [x] `src/hooks/useFeatureAccess.js` - Hooks de feature flags
- [x] `FEATURE_FLAGS_EXAMPLES.md` - Exemplos de uso
- [x] `CHECKLIST.md` - Este arquivo

---

## 🚀 PRÓXIMOS PASSOS

1. **Ir para Stripe Dashboard** e executar PASSO 1
2. **Copiar Product IDs e Price IDs**
3. **Executar SQL** no Supabase (PASSO 2)
4. **Criar config file** com IDs (PASSO 3)
5. **Atualizar Edge Functions** para salvar plan_id
6. **Testar fluxo completo** (PASSO 5)

