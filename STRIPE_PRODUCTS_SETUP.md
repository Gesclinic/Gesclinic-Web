# 🔐 Setup Completo: Stripe Products + Prices + Metadata

## 📌 PASSO 1: Criar Products no Stripe

Acesse: **Stripe Dashboard → Products → Add Product**

### Product 1: Gesclinic Web – Básico

```
Name: Gesclinic Web – Básico
Description: Agenda Essencial — Para clínicas que estão começando
Type: Service (recurring)
Billing scheme: Per unit
```

**Metadata:**
```
plan_key: basic
max_users: 2
max_doctors: 2
features: agenda,cadastro,historico,suporte_padrao
```

---

### Product 2: Gesclinic Web – Profissional

```
Name: Gesclinic Web – Profissional
Description: Gestão Completa — Para clínicas que querem controle e lucro
Type: Service (recurring)
Billing scheme: Per unit
```

**Metadata:**
```
plan_key: professional
max_users: 10
max_doctors: 5
features: agenda_inteligente,financeiro,contas,fluxo_caixa,estoque,relatorios,branding
```

---

### Product 3: Gesclinic Web – Enterprise

```
Name: Gesclinic Web – Enterprise
Description: Escalas & Performance — para redes, grupos e operações complexas
Type: Service (recurring)
Billing scheme: Per unit
```

**Metadata:**
```
plan_key: enterprise
max_users: unlimited
max_doctors: unlimited
features: agenda_inteligente,financeiro,contas,fluxo_caixa,estoque,relatorios,branding,multiunidades,dre,repasse_medico,integracao_custom,sla_dedicado,onboarding
lead_required: true
contact_email: contato@gesclinic.com
```

---

## 💳 PASSO 2: Criar Prices para Cada Product

### Produto: Gesclinic Web – Básico

#### Price 1 (Mensal)
```
Billing period: Monthly
Price: R$ 99.00 BRL
Recurring: Standard pricing
```

**Metadata:**
```
plan_key: basic
billing_cycle: monthly
annual_equivalent: 990
```

#### Price 2 (Anual)
```
Billing period: Yearly
Price: R$ 990.00 BRL
Recurring: Standard pricing
```

**Metadata:**
```
plan_key: basic
billing_cycle: annual
monthly_equivalent: 99
discount_percent: 16.67
```

---

### Produto: Gesclinic Web – Profissional

#### Price 1 (Mensal)
```
Billing period: Monthly
Price: R$ 249.00 BRL
Recurring: Standard pricing
```

**Metadata:**
```
plan_key: professional
billing_cycle: monthly
annual_equivalent: 2490
```

#### Price 2 (Anual)
```
Billing period: Yearly
Price: R$ 2,490.00 BRL
Recurring: Standard pricing
```

**Metadata:**
```
plan_key: professional
billing_cycle: annual
monthly_equivalent: 249
discount_percent: 16.67
```

---

### Produto: Gesclinic Web – Enterprise

❌ **NÃO CRIAR PRICE FIXO**

A negociação é feita via contato comercial (lead).

---

## 🔑 PASSO 3: Copiar Product IDs e Price IDs

Após criar, você terá:

| Produto | Product ID | Monthly Price ID | Annual Price ID |
|---------|-----------|-----------------|-----------------|
| Básico | prod_... | price_... | price_... |
| Profissional | prod_... | price_... | price_... |
| Enterprise | prod_... | (none) | (none) |

**Guarde esses IDs para a próxima etapa!**

---

## 📋 Estrutura Final (para implementar no código)

```javascript
const STRIPE_PRODUCTS = {
  basic: {
    productId: 'prod_...',
    prices: {
      monthly: 'price_...',
      annual: 'price_...'
    }
  },
  professional: {
    productId: 'prod_...',
    prices: {
      monthly: 'price_...',
      annual: 'price_...'
    }
  },
  enterprise: {
    productId: 'prod_...',
    prices: {}  // sem price fixo
  }
};
```

---

## ✅ Validação

- [ ] 3 Products criados
- [ ] 4 Prices (2 para Básico, 2 para Profissional)
- [ ] Metadata preenchida em todos
- [ ] Product IDs e Price IDs copiados
- [ ] Enterprise sem price fixo

