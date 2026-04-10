# 📸 GUIA VISUAL - PASSO A PASSO STRIPE

## PARTE 1: CRIAR PRODUCTS

### 1.1 - Acessar Stripe Dashboard

```
https://dashboard.stripe.com/products
         ↓
     Clique em "Add product"
```

---

### 1.2 - Criar Product: Gesclinic Web – Básico

**Preencher:**
```
Name:
  "Gesclinic Web – Básico"

Description:
  "Agenda Essencial — Para clínicas que estão começando"

Pricing model:
  "Standard pricing"

Billing scheme:
  "Per unit"
```

**Depois:**
```
↓
Clicar em "Add product"
↓
Copiar o Product ID (prod_...)
↓
Salvar como: PRODUCT_BASIC
```

**Adicionar Metadata:**
```
Scroll down → "Metadata"
↓
Clique "Add metadata"

plan_key       →  basic
max_users      →  2
max_doctors    →  2
features       →  agenda,cadastro,historico,suporte
```

---

### 1.3 - Criar Product: Gesclinic Web – Profissional

**Repetir mesmo processo:**
```
Name:
  "Gesclinic Web – Profissional"

Description:
  "Gestão Completa — Para clínicas que querem controle e lucro"

Product ID → PRODUCT_PROFESSIONAL

Metadata:
  plan_key       →  professional
  max_users      →  10
  max_doctors    →  5
  features       →  agenda,financeiro,contas,estoque,relatorios,branding
```

---

### 1.4 - Criar Product: Gesclinic Web – Enterprise

**Repetir mesmo processo:**
```
Name:
  "Gesclinic Web – Enterprise"

Description:
  "Escalas & Performance — para redes, grupos e operações complexas"

Product ID → PRODUCT_ENTERPRISE

Metadata:
  plan_key       →  enterprise
  max_users      →  unlimited
  max_doctors    →  unlimited
  features       →  agenda,financeiro,contas,estoque,relatorios,branding,multi,dre,repasse,integracao,sla
  lead_required  →  true
```

---

## PARTE 2: CRIAR PRICES

### 2.1 - Acessar Product: Básico

```
Dashboard → Products
         ↓
     Gesclinic Web – Básico
         ↓
     Clique em "Add pricing"
```

---

### 2.2 - Criar Price: Básico Mensal

```
Pricing model:
  "Standard pricing"

Currency:
  "BRL" (Reais)

Price:
  "99.00"

Billing period:
  "Monthly"

Recurring:
  ✓ (checkbox)
```

**Depois:**
```
↓
Clicar "Save pricing"
↓
Copiar Price ID (price_...)
↓
Salvar como: PRICE_BASIC_MONTHLY

Metadata:
  plan_key        →  basic
  billing_cycle   →  monthly
  annual_equiv    →  990
```

---

### 2.3 - Criar Price: Básico Anual

**Na mesma página, clicar "Add pricing" novamente:**

```
Currency:
  "BRL"

Price:
  "990.00"

Billing period:
  "Yearly"

Recurring:
  ✓ (checkbox)
```

**Depois:**
```
↓
Copiar Price ID
↓
Salvar como: PRICE_BASIC_ANNUAL

Metadata:
  plan_key        →  basic
  billing_cycle   →  annual
  monthly_equiv   →  99
  discount_percent → 16.67
```

---

### 2.4 - Repetir para Profissional

**Ir para:** Gesclinic Web – Profissional → "Add pricing"

**Price 1 - Monthly:**
```
Price: 249.00
Billing: Monthly

Price ID → PRICE_PROFESSIONAL_MONTHLY
```

**Price 2 - Annual:**
```
Price: 2490.00
Billing: Yearly

Price ID → PRICE_PROFESSIONAL_ANNUAL
```

---

### 2.5 - ⚠️ Enterprise NÃO TEM PRICE

```
Gesclinic Web – Enterprise
           ↓
   NÃO adicionar prices
           ↓
   Lead via contato comercial
```

---

## PARTE 3: COMPILAR IDS

**Criar uma nota com:**

```
═══════════════════════════════════════════
STRIPE PRODUCTS & PRICES IDS
═══════════════════════════════════════════

PRODUTOS:
──────────
PRODUCT_BASIC           = prod_...
PRODUCT_PROFESSIONAL    = prod_...
PRODUCT_ENTERPRISE      = prod_...

PRICES:
──────────
PRICE_BASIC_MONTHLY     = price_...
PRICE_BASIC_ANNUAL      = price_...

PRICE_PROFESSIONAL_MONTHLY  = price_...
PRICE_PROFESSIONAL_ANNUAL   = price_...

════════════════════════════════════════════
```

---

## PARTE 4: VERIFICAR METADATAS

**Para cada produto/price:**

```
1. Ir para o produto
2. Scroll até "Metadata"
3. Verificar se todas metadatas estão preenchidas
4. ✓ Confirmar

Checklist:
─────────
[✓] PRODUCT_BASIC tem metadata
[✓] PRICE_BASIC_MONTHLY tem metadata
[✓] PRICE_BASIC_ANNUAL tem metadata
[✓] PRODUCT_PROFESSIONAL tem metadata
[✓] PRICE_PROFESSIONAL_MONTHLY tem metadata
[✓] PRICE_PROFESSIONAL_ANNUAL tem metadata
[✓] PRODUCT_ENTERPRISE tem metadata (sem prices)
```

---

## RESULTADO FINAL

**Você deve ter:**

- ✅ 3 Products (Básico, Profissional, Enterprise)
- ✅ 4 Prices (2 para Básico, 2 para Profissional)
- ✅ Metadata em tudo
- ✅ 7 IDs copiados (3 Product IDs + 4 Price IDs)

**Próximo passo:** Usar esses IDs na configuração do Supabase e do código.

