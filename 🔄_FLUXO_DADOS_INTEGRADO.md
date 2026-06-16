# 🔄 FLUXO DE DADOS INTEGRADO - VISÃO COMPLETA

## 📊 ARQUITETURA DO MOTOR FINANCEIRO

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         GESCLINIC - MOTOR FINANCEIRO                           │
│                        (Agenda ↔ Lançamentos ↔ DRE)                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1️⃣ ORIGEM: AGENDA                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Paciente agenda atendimento                                                    │
│         ↓                                                                       │
│  Profissional realiza atendimento                                              │
│         ↓                                                                       │
│  Sistema clica "🟢 Liberar para Atendimento"                                   │
│         ↓                                                                       │
│  ┌─────────────────────────────────────────┐                                   │
│  │ TRIGGER AUTOMÁTICO:                     │                                   │
│  │ ✅ Criar Conta a Receber (AR)          │                                   │
│  │ ✅ Criar Lançamento Contábil           │                                   │
│  │ ✅ Marcar como "Previsão" em FC        │                                   │
│  │ ✅ Log na Auditoria Financeira         │                                   │
│  └─────────────────────────────────────────┘                                   │
│         ↓                                                                       │
│  Dados armazenados:                                                            │
│  - appointment_id                                                              │
│  - origin = 'agenda'                                                           │
│  - related_entity_type = 'accounts_receivable'                                │
│  - status = 'pending' (não confirmado ainda)                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2️⃣ MOTOR: FINANCIAL TRANSACTIONS (Lançamentos)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Tabela Central: financial_transactions                                         │
│  └─ Todas as entradas/saídas financeiras passam por aqui                       │
│                                                                                 │
│  Campos principais:                                                             │
│  ┌──────────────────────────────────────────────────────────┐                 │
│  │ id              | UUID                                  │                 │
│  │ clinic_id       | Qual clínica                         │                 │
│  │ date            | Quando                               │                 │
│  │ description     | O quê                                │                 │
│  │ account_id      | Qual conta bancária/caixa           │                 │
│  │ amount          | Quanto                               │                 │
│  │ type            | entry (entrada) / exit (saída)      │                 │
│  │ status          | pending / confirmed / canceled       │                 │
│  │ origin          | agenda / manual / receivable / etc   │ ⭐ NOVO        │
│  │ related_entity_* | Rastreia origem (AR/AP)             │ ⭐ NOVO        │
│  └──────────────────────────────────────────────────────────┘                 │
│                                                                                 │
│  Estados de uma transação:                                                      │
│  pending (previsão) → confirmed (realizado) → reconciled (conciliado)         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 3️⃣ FLUXO: MOVIMENTO DE RECEBIMENTO                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Sistema financeiro marca AR como "Recebida"                                   │
│         ↓                                                                       │
│  ┌─────────────────────────────────────────┐                                   │
│  │ TRIGGER AUTOMÁTICO:                     │                                   │
│  │ ✅ Atualizar AR: status='paid'         │                                   │
│  │ ✅ Criar Lançamento com status=confirmed│                                   │
│  │   - type='entry' (entrada)             │                                   │
│  │   - amount=valor_recebido              │                                   │
│  │   - account_id=conta_de_deposito       │                                   │
│  │ ✅ Fluxo de Caixa atualizado           │                                   │
│  │ ✅ DRE recalculada                     │                                   │
│  └─────────────────────────────────────────┘                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 4️⃣ CONSOLIDAÇÃO: FLUXO DE CAIXA                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Fluxo de Caixa = SQL SELECT de Lançamentos (leitura consolidada)             │
│                                                                                 │
│  SELECT SUM(amount) FROM financial_transactions                                │
│  WHERE clinic_id = ? AND status='confirmed' AND type='entry'                  │
│                                                                                 │
│  Resultado visualizado:                                                        │
│  ┌────────────────────────────────────┐                                        │
│  │ Entradas: R$ 5.000                 │                                        │
│  │ Saídas:   R$ 2.000                 │                                        │
│  │ Resultado: R$ 3.000                │                                        │
│  │ Saldo Final: R$ 8.000              │                                        │
│  └────────────────────────────────────┘                                        │
│                                                                                 │
│  Previsão (pending) vs Realizado (confirmed):                                 │
│  ┌────────────────────────────────────┐                                        │
│  │ Previsto: R$ 7.000  (entrada + saída)                                      │
│  │ Realizado: R$ 3.000 (apenas confirmado)                                    │
│  │ Pendente: R$ 4.000  (aguardando confirmação)                               │
│  └────────────────────────────────────┘                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 5️⃣ INTELIGÊNCIA: DEMONSTRAÇÃO DE RESULTADO (DRE)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  DRE = Agrupamento de Lançamentos por tipo de Conta Contábil                   │
│                                                                                 │
│  SELECT account_type, SUM(amount)                                             │
│  FROM financial_transactions JOIN chart_of_accounts                            │
│  WHERE clinic_id = ? AND period = ?                                           │
│  GROUP BY account_type                                                         │
│                                                                                 │
│  Resultado visualizado:                                                        │
│  ┌────────────────────────────────────────┐                                    │
│  │ RECEITAS                               │                                    │
│  │ ├─ Receita de Serviços    R$ 3.000    │                                    │
│  │ ├─ Receita de Convênios   R$ 2.000    │                                    │
│  │ └─ TOTAL RECEITAS         R$ 5.000    │                                    │
│  │                                        │                                    │
│  │ DESPESAS                               │                                    │
│  │ ├─ Pessoal               (R$ 1.500)   │                                    │
│  │ ├─ Aluguel               (R$ 500)     │                                    │
│  │ └─ TOTAL DESPESAS       (R$ 2.000)   │                                    │
│  │                                        │                                    │
│  │ RESULTADO LÍQUIDO         R$ 3.000    │                                    │
│  └────────────────────────────────────────┘                                    │
│                                                                                 │
│  Click em "Receita de Serviços":                                              │
│  ↓                                                                              │
│  Navega para Lançamentos filtrados:                                           │
│  ┌────────────────────────────────────────┐                                    │
│  │ Data | Descrição | Conta | Valor      │                                    │
│  │ 22/05| Atendimento João | 4.1.1.01 | R$ 150  │                             │
│  │ 22/05| Atendimento Maria | 4.1.1.01 | R$ 120  │                             │
│  │ 21/05| Atendimento Pedro | 4.1.1.01 | R$ 200  │                             │
│  │ ... (continua)                        │                                    │
│  └────────────────────────────────────────┘                                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 6️⃣ RASTREABILIDADE & AUDITORIA                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Cada lançamento tem origem rastreável:                                        │
│                                                                                 │
│  Lançamento #12345:                                                            │
│  ├─ origin = 'agenda'                                                         │
│  ├─ related_entity_type = 'accounts_receivable'                               │
│  ├─ related_entity_id = AR_9876                                               │
│  ├─ appointment_id = APT_5555                                                 │
│  └─ Clique: Voltar para Atendimento / AR / Paciente                           │
│                                                                                 │
│  Lançamento #12346:                                                            │
│  ├─ origin = 'manual'                                                         │
│  ├─ created_by = 'financeiro@gesclinic.com'                                   │
│  └─ notes = 'Ajuste de glosa'                                                 │
│                                                                                 │
│  Lançamento #12347:                                                            │
│  ├─ origin = 'payable'                                                        │
│  ├─ related_entity_id = AP_7777                                               │
│  └─ Clique: Ver Conta a Pagar relacionada                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 CICLO COMPLETO - EXEMPLO PRÁTICO

### Dia 1: Atendimento Realizado
```
08:00 - João marca consulta com Dr. Silva (particular, R$ 150)
10:00 - Dr. Silva atende João
10:45 - Recepcionista clica "🟢 Liberar para Atendimento"

AUTOMÁTICO:
✅ Criada AR: "João - Consulta" (R$ 150, status=open)
✅ Criado Lançamento: 
   - origin: 'agenda'
   - type: 'entry'
   - status: 'pending' (previsão)
   - account: 4.1.1.01 (Receita de Serviços)

VISÍVEL EM:
📊 Dashboard: +R$ 150 em "Receita Prevista"
💰 Fluxo de Caixa: +R$ 150 em "Pendente"
📈 DRE: +R$ 150 em "Receita de Serviços"
```

### Dia 3: Recebimento Processado
```
14:00 - Financeiro marca AR como "Recebida"
        Forma de pagamento: PIX
        Valor: R$ 150

AUTOMÁTICO:
✅ Atualizada AR: status='paid', payment_date=hoje
✅ Criado Lançamento:
   - origin: 'receivable'
   - type: 'entry'
   - status: 'confirmed' (realizado)
   - account: Pix (conta PIX da clínica)
   - related_entity_id: AR_123

VISÍVEL EM:
📊 Dashboard: 
   - Receita Prevista: -R$ 150
   - Receita Realizada: +R$ 150
💰 Fluxo de Caixa:
   - Pendente: -R$ 150
   - Realizado: +R$ 150
📈 DRE: Continua mostrando R$ 150 (já tinha contabilizado)
🏦 Conciliação Bancária: PIX recebido = R$ 150 (pronto para bater com banco)
```

### Fim do Mês: Análise
```
Gestor abre DRE de Maio:
├─ Receitas: R$ 15.000 (25 atendimentos)
├─ Despesas: R$ 8.000
└─ Resultado: R$ 7.000

Clica em "Receita de Serviços" (R$ 15.000):
↓
Navega para Lançamentos filtrados:
- Mostra todos os 25 atendimentos
- Data, paciente, valor, status
- Pode ver quais já foram recebidas e quais ainda estão pendentes

Insights:
- R$ 12.000 já recebidos (80%)
- R$ 3.000 ainda aberto (20%)
- Contato com pacientes sobre AR vencidas
```

---

## 🎯 RESULTADO FINAL

### Antes (Desintegrado):
```
AGENDA
  └─ Cria AR
     └─ Financeiro visualiza em "Contas a Receber"
        └─ Precisa digitar manualmente em "Fluxo de Caixa"
           └─ DRE não sabe de nada (recalcula manual)
           └─ Sem rastreabilidade de origem
           └─ Sem auditoria automática
```

### Depois (Integrado):
```
AGENDA
  └─ Libera atendimento
     └─ Cria AUTOMATICAMENTE:
        - AR (Contas a Receber)
        - Lançamento (Motor Financeiro)
        - Registro em Fluxo de Caixa
        - Previsão em DRE
        - Log em Auditoria
```

---

## ✨ BENEFÍCIOS

| Benefício | Impacto |
|-----------|--------|
| **Automação** | -90% de entrada manual de dados |
| **Precisão** | 100% de rastreabilidade |
| **Velocidade** | DRE atualizada em tempo real |
| **Confiabilidade** | Tudo auditado automaticamente |
| **Insight** | Drill-down em qualquer número |

---

## 📋 IMPLEMENTAÇÃO

**Status:** 🟡 Em Planejamento

**Próximas fases:**
1. [ ] Fase 1: Agenda → Lançamentos (CRITICAL)
2. [ ] Fase 2: AR → Lançamentos (HIGH)
3. [ ] Fase 3: AP → Lançamentos (HIGH)
4. [ ] Fase 4: DRE Automática (MEDIUM)

**Documentação:** Ver `🔗_PLANO_INTEGRACAO_LANCAMENTOS.md`

