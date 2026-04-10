# Integração Stripe - Guia Completo

## 1. Configuração Inicial do Stripe

### 1.1 Criar Conta
- Acesse [stripe.com](https://stripe.com)
- Crie uma conta e complete a verificação
- Acesse o Dashboard

### 1.2 Obter Chaves de API
No Dashboard do Stripe → Developers → API Keys:

- **Publishable Key** (Pública) - Use no frontend
- **Secret Key** (Secreta) - Use apenas no backend

### 1.3 Webhook Secret
Developers → Webhooks → Criar Endpoint:

- **URL do Webhook:** `https://seu-supabase-url.functions/stripe-webhook`
- Eventos a receber:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `charge.refunded`

Copie o **Signing Secret**

---

## 2. Configurar Variáveis de Ambiente

### 2.1 `.env` (Frontend)
```
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
```

### 2.2 Supabase Edge Functions
No Supabase Dashboard → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## 3. Migrations SQL

Execute a migration em Supabase:
```sql
-- Já executada: 20260119_add_stripe_fields.sql
```

Isso cria as tabelas:
- `payment_history` - Histórico de pagamentos
- `invoices` - Notas fiscais
- Adiciona campos Stripe em `clinic_subscriptions`

---

## 4. Supabase Edge Functions

Há 3 functions já criadas:

### 4.1 `create-clinic-from-signup`
- Cria clínica para novos usuários (sem pagamento)
- Usa trial de 30 dias

### 4.2 `create-stripe-checkout`
- Cria sessão de checkout do Stripe
- Retorna URL de pagamento
- Suporta mensal e anual

### 4.3 `stripe-webhook`
- Recebe eventos do Stripe
- Atualiza status de subscrição
- Cria registros de pagamento

**Para deploy:**
```bash
# Se usar Supabase CLI
supabase functions deploy create-stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy create-clinic-from-signup
```

---

## 5. RLS Policies

Adicione RLS para as novas tabelas em Supabase:

```sql
-- payment_history
CREATE POLICY "payment_history_select"
  ON payment_history FOR SELECT
  USING (
    clinic_subscription_id IN (
      SELECT id FROM clinic_subscriptions 
      WHERE clinic_id IN (
        SELECT clinic_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- invoices
CREATE POLICY "invoices_select"
  ON invoices FOR SELECT
  USING (
    clinic_subscription_id IN (
      SELECT id FROM clinic_subscriptions 
      WHERE clinic_id IN (
        SELECT clinic_id FROM users WHERE id = auth.uid()
      )
    )
  );
```

---

## 6. Fluxo de Pagamento

### Nova Clínica com Pagamento:

```
1. /register → Escolhe plano
   ↓
2. Preenche dados da clínica
   ↓
3. Clica em "Pagar Agora"
   ↓
4. Redireciona para /checkout com plano selecionado
   ↓
5. Insere nome da clínica
   ↓
6. Escolhe mensal ou anual
   ↓
7. Clica "Pagar Agora"
   ↓
8. Stripe Checkout (cartão)
   ↓
9. Webhook confirma pagamento
   ↓
10. Cria: Clínica + Usuário + Subscrição (ativa)
   ↓
11. Redireciona para dashboard
```

### Clínica Existente Upgrade:

```
1. Dashboard → Configurações → Billing
   ↓
2. Seleciona novo plano
   ↓
3. Stripe Checkout
   ↓
4. Webhook atualiza subscrição
```

---

## 7. Testes com Stripe

### Números de Cartão de Teste:

| Cartão | Número | Exp | CVC |
|--------|--------|-----|-----|
| Sucesso | 4242 4242 4242 4242 | 12/25 | 123 |
| Falha | 4000 0000 0000 0002 | 12/25 | 123 |
| Requer Autenticação | 4000 0025 0000 3155 | 12/25 | 123 |

Use qualquer email e código postal válido.

---

## 8. Status de Subscrição

| Status | Significado |
|--------|-------------|
| `trial` | Período de teste ativo |
| `active` | Assinatura paga ativa |
| `suspended` | Pagamento falhou (necessário atualizar cartão) |
| `canceled` | Subscrição cancelada |
| `expired` | Período de teste expirou |

---

## 9. Componentes React

### Adicione as rotas em `AppRoutes.jsx`:

```jsx
import Checkout from '@/pages/Checkout';

// No Routes:
<Route path="/checkout" element={<Checkout />} />
```

### Páginas criadas:

- ✅ `/register` - Sign-up com seleção de planos
- ✅ `/checkout` - Página de pagamento (Stripe)
- Falta criar: `/clinica/billing` - Histórico de pagamentos

---

## 10. Próximos Passos (Opcional)

- [ ] Criar página de gestão de faturamento (`/clinica/billing`)
- [ ] Downgrade automático quando trial expira
- [ ] Email de confirmação de pagamento
- [ ] Integrar com NFe (Brasil)
- [ ] Dashboard de admin para gerenciar subscrições
- [ ] Suporte a múltiplos idiomas
- [ ] Integrar com Pix (via Stripe ou similar)

---

## 11. Troubleshooting

### Webhook não recebe eventos
- Confirme URL do webhook no Dashboard Stripe
- Verifique logs da Edge Function
- Teste webhook com `stripe trigger` (CLI)

### Pagamento sucesso mas subscrição não ativa
- Verifique logs da Edge Function
- Confirme webhook secret está correto
- Verifique RLS policies

### Erro "Missing stripe public key"
- Confirme `VITE_STRIPE_PUBLIC_KEY` está em `.env`
- Reinicie dev server (`npm run dev`)

---

## 12. Segurança

✅ Chaves Secret nunca no frontend
✅ Webhook signature validation
✅ RLS policies isolam dados por clínica
✅ Idempotência em operações de pagamento
✅ Rate limiting (via Supabase)

---

**Documentação Oficial:**
- [Stripe Docs](https://stripe.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
