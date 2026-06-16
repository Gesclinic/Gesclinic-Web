🎯 **SISTEMA DE OPERADORAS DE CARTÃO - DIAGRAMA VISUAL**

## 📊 ARQUITETURA IMPLEMENTADA

```
┌─────────────────────────────────────────────────────────┐
│                  CLÍNICA / USUÁRIO                      │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Usa
                            ▼
┌─────────────────────────────────────────────────────────┐
│            FINANCEIRO > ESTRUTURA (Menu)                │
├─────────────────────────────────────────────────────────┤
│  ✅ Cartões                                              │
│  ✅ Taxas de Cartão                                      │
│  ✅ Operadoras ← NOVO!                                   │
└─────────────────────────────────────────────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐      ┌──────────────┐    ┌──────────────┐
│  Cartões    │      │ Taxas (D+0   │    │ Operadoras   │
│  Page       │      │  D+1, D+30)  │    │  Page (NEW)  │
│             │      │              │    │              │
│ - Brand     │      │ - VISA/MC/   │    │ - Stone      │
│ - Últimos4  │      │   ELO/AMEX   │    │ - PagBank    │
│ - Titular   │      │ - Settlement │    │ - PagSeguro  │
│ - Operadora │◄─────│   Type       │    │ - Mercado P. │
│   (NOVO!)   │      │ - Fee %      │    │              │
│ - Pagto Dia │      │              │    │ - Crédito    │
│             │      │              │    │   Dia (1-31) │
└─────────────┘      └──────────────┘    └──────────────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                            │ FK Relations
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  BANCO DE DADOS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  clinic_payment_cards (Modificada)                      │
│  ├─ id UUID                                             │
│  ├─ clinic_id UUID                                      │
│  ├─ brand VARCHAR (VISA, MC, etc)                       │
│  ├─ last_4_digits                                       │
│  ├─ holder_name                                         │
│  ├─ payment_day (1-31)                                  │
│  ├─ processor_id UUID ← NOVO!                           │
│  └─ ...                                                 │
│                                                         │
│  card_processors (Nova Tabela)                          │
│  ├─ id UUID                                             │
│  ├─ clinic_id UUID (FK)                                 │
│  ├─ name VARCHAR (Stone, PagBank, etc) ← OPERADORA      │
│  ├─ settlement_day INT (1-31) ← DIA DE CRÉDITO          │
│  ├─ notes TEXT                                          │
│  ├─ is_active BOOLEAN                                   │
│  ├─ created_at TIMESTAMP                                │
│  └─ updated_at TIMESTAMP                                │
│                                                         │
│  card_processing_fees (Existente)                       │
│  └─ ... (taxas por brand/settlement_type)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔗 RELACIONAMENTOS

```
Clínica
  │
  ├─→ clinic_payment_cards (N:1)
  │    └─→ card_processors (N:1) ← NOVA RELAÇÃO!
  │
  ├─→ card_processors (1:N) ← NOVA TABELA!
  │    └─ Cada operadora tem múltiplos cartões
  │
  └─→ card_processing_fees (1:N)
       └─ Cada clínica tem múltiplas taxas
```

---

## 💾 BANCO RELACIONAL

### clinic_payment_cards (ANTES)
```
┌──────────────┬────────────┬──────────┐
│ id (PK)      │ clinic_id  │ brand    │
├──────────────┼────────────┼──────────┤
│ abc-123      │ clinic-1   │ VISA     │
│ def-456      │ clinic-1   │ MASTERC. │
│ ghi-789      │ clinic-2   │ ELO      │
└──────────────┴────────────┴──────────┘
```

### clinic_payment_cards (DEPOIS)
```
┌──────────────┬────────────┬──────────┬────────────────┐
│ id (PK)      │ clinic_id  │ brand    │ processor_id   │
├──────────────┼────────────┼──────────┼────────────────┤
│ abc-123      │ clinic-1   │ VISA     │ stone-1        │
│ def-456      │ clinic-1   │ MASTERC. │ pagbank-1      │
│ ghi-789      │ clinic-2   │ ELO      │ NULL           │
└──────────────┴────────────┴──────────┴────────────────┘
                                ▲
                                │ FK
                                │
                        ┌───────────────┐
                        │ card_processors
                        │ ┌──────────────┐
                        │ │ id (PK)      │
                        │ │ clinic_id    │
                        │ │ name (Stone) │
                        │ │ settlement_d │
                        │ └──────────────┘
                        └───────────────┘
```

### card_processors (NOVA)
```
┌──────────────┬────────────┬─────────────┬──────────────┐
│ id (PK)      │ clinic_id  │ name        │ settlement_  │
├──────────────┼────────────┼─────────────┼──────────────┤
│ stone-1      │ clinic-1   │ STONE       │ 1 (D+1)      │
│ pagbank-1    │ clinic-1   │ PAGBANK     │ 2 (D+2)      │
│ pagseg-1     │ clinic-1   │ PAGSEGURO   │ 15 (15º)     │
│ mercpag-1    │ clinic-1   │ MERCADO PAG │ 1 (D+1)      │
│ cielo-1      │ clinic-2   │ CIELO       │ 1 (D+1)      │
└──────────────┴────────────┴─────────────┴──────────────┘
```

---

## 🔄 FLUXO DE USO

### Cenário: Clínica usa Stone (crédita todo 1º do mês)

```
1. CADASTRA OPERADORA
   ↓
   Nome: STONE
   Dia de Crédito: 1 (crédita 1º de cada mês)
   ↓
   Salvo em: card_processors

2. CRIA CARTÃO VINCULADO À OPERADORA
   ↓
   Bandeira: VISA
   Últimos 4: 1234
   Operadora: STONE ← SELECT do dropdown
   ↓
   Salvo em: clinic_payment_cards com processor_id = stone-1

3. USA CARTÃO EM AGENDAMENTO
   ↓
   Agendamento criado
   Pagamento: CARTÃO (VISA ••••1234, operadora STONE)
   ↓
   (Futura) Sistema sabe que vai receber no dia 1 (settlement_day)

4. GERA CONTAS A RECEBER (AR)
   ↓
   AR criado com data de recebimento = dia 1 do mês
   ↓
   Aparece em "Contas a Receber" com data calculada
```

---

## 📈 DADOS DE EXEMPLO

### Operadoras Padrão
```
┌──────────────┬───────────┬──────────────────────────────┐
│ Nome         │ Crédita   │ Descrição                    │
├──────────────┼───────────┼──────────────────────────────┤
│ STONE        │ Dia 1     │ D+1 próximo dia útil         │
│ PAGBANK      │ Dia 1     │ D+1 ou D+2                   │
│ PAGSEGURO    │ Dia 15    │ Fixo 15º do mês              │
│ MERCADO PAGO │ Dia 1     │ D+1 a D+3                    │
│ CIELO        │ Dia 1     │ D+1 (dia útil)               │
│ REDE         │ Dia 1     │ D+1 (próximo dia)            │
└──────────────┴───────────┴──────────────────────────────┘
```

---

## 🎯 ARQUIVOS IMPLEMENTADOS

```
Backend
├─ src/lib/cardProcessorsApi.js (NOVO - 100 linhas)
│  └─ 5 funções: list, get, create, update, delete

Frontend
├─ src/pages/clinica/financeiro/CartasOperadorasPage.jsx (NOVO - 320 linhas)
│  └─ Página CRUD completa de operadoras
│
├─ src/pages/clinica/financeiro/CartasPage.jsx (MODIFICADO)
│  └─ Integrado campo de operadora ao cartão

Config
├─ src/AppRoutes.jsx (MODIFICADO)
│  └─ Rota: /clinica/financeiro/cartoes-operadoras
│
└─ src/constants/menu.js (MODIFICADO)
   └─ Menu item: Financeiro > Estrutura > Operadoras

Database
├─ supabase/migrations/2026-01-17_create_card_processors.sql
│  └─ Cria tabela card_processors com RLS
│
└─ supabase/migrations/2026-01-17_add_processor_to_cards.sql
   └─ Adiciona FK processor_id em clinic_payment_cards
```

---

## ✨ PRÓXIMA INTEGRAÇÃO (Fase 2)

```
Ao criar Agendamento com CARTÃO:
  ├─ Busca card_processors.settlement_day
  ├─ Calcula data de recebimento
  └─ Cria AR com data correta

Ao listar Contas a Receber:
  ├─ Mostra agrupado por operadora
  ├─ Exibe data prevista de crédito
  └─ Alerta se atrasou
```

---

**Status:** 🟢 IMPLEMENTAÇÃO COMPLETA
**Próximo:** Execute SQLs em `⚡_EXECUTAR_SQL_OPERADORAS_3_PASSOS.md`
