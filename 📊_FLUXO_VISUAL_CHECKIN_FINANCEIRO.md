```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   FLUXO DO SISTEMA CHECK-IN FINANCEIRO                       ║
║                        (Entrada de Paciente - Recepção)                      ║
╚══════════════════════════════════════════════════════════════════════════════╝


┌──────────────────────────────────────┐
│         AGENDAMENTO NA AGENDA         │
│  Status: AGENDADO / CONFIRMADO       │
│       Hora: 10:00                    │
│       Paciente: João Silva           │
└─────────────────┬────────────────────┘
                  │
                  │ Paciente chega na recepção
                  │
                  ▼
        ┌──────────────────┐
        │  RECEPCIONISTA   │
        │  Clica em        │
        │ "📍 CHECK-IN"    │
        └────────┬─────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│      MODAL ABRE: CHECK-IN RÁPIDO             │
│                                               │
│  ┌─ ABA 1: DADOS ESSENCIAIS 👤              │
│  │   ├─ Nome: João Silva (preenchido)       │
│  │   ├─ CPF: 123.456.789-00 (obrigatório)   │
│  │   └─ Telefone: 11 99999-9999 (obrigatório)
│  │                                           │
│  ├─ ABA 2: FINANCEIRO 💳                    │
│  │   ├─ Tipo: [▼ Selecionar]                │
│  │   │   ├─ Convênio                        │
│  │   │   ├─ Particular                      │
│  │   │   └─ Cortesia                        │
│  │   ├─ Plano: _________________ ⭐ OBRIGATÓRIO
│  │   ├─ Carteirinha: ___________             │
│  │   ├─ Verificada: [☐]                     │
│  │   ├─ Autorização: ___________             │
│  │   ├─ Vencimento: [__/__/____]             │
│  │   ├─ Guia: ____________________           │
│  │   ├─ Valor: R$ ________________           │
│  │   ├─ Desconto: R$ ____________            │
│  │   ├─ Coparticipação: R$ _______           │
│  │   └─ Forma Pagamento: [▼ Selecionar]     │
│  │       ├─ Dinheiro                        │
│  │       ├─ Cartão Crédito                  │
│  │       ├─ Cartão Débito                   │
│  │       ├─ PIX                             │
│  │       ├─ Cheque                          │
│  │       ├─ Boleto                          │
│  │       └─ Transferência                   │
│  │                                           │
│  └─ BOTÕES                                   │
│      ├─ ❌ CANCELAR                         │
│      └─ ✅ CONFIRMAR CHECK-IN               │
│                                               │
└─────────────────┬──────────────────────────┘
                  │
                  ▼
              VALIDAÇÃO
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼ ❌ ERRO            ▼ ✅ OK
    REJEITA              PROCESSA
                             │
                             ▼
                    UPDATE appointments
                    └─ status = 'at_reception'
                    └─ payer_type
                    └─ health_plan
                    └─ card_number
                    └─ authorization_number
                    └─ guide_number
                    └─ payment_method
                    └─ financial_value
                    └─ copayment
                    └─ discount
                    └─ financial_data_captured_at
                             │
                             ▼
                    PROCESSA FINANCEIRO
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
      payer_type          payer_type        payer_type
    = 'PARTICULAR'      = 'CONVENIO'    = 'CORTESIA'
           │                 │                 │
           ▼                 ▼                 ▼
    INSERT INTO      INSERT INTO           (Sem
  accounts_         invoices +            ações
  receivable        invoice_items      financeiras)
           │                 │                 │
      ✅ Conta a        ✅ Guia de            │
      Receber criada   Faturamento          │
           │           criada               │
           │                │                │
           └────────┬───────┘                │
                    │                        │
                    ▼                        │
            LOG AUDITORIA                   │
            (appointment_                   │
            financial_audit_               │
            logs)                          │
                    │                       │
                    └───────────┬──────────┘
                                │
                                ▼
                    MODAL FECHA AUTOMATICAMENTE
                                │
                                ▼
                    AGENDA RECARREGA
                                │
                                ▼
        STATUS MUDA PARA: 📍 NA RECEPÇÃO (AMARELO)
                                │
                                ▼
                    PACIENTE SEGUE PARA PROFISSIONAL
                    E/OU ESPERA NA RECEPÇÃO
                                │
                                ▼
                    FINANCEIRO PROCESSADO 🎉
                    
┌────────────────────────────────────────────────┐
│  RESULTADO FINAL NO SUPABASE:                  │
│                                                 │
│  1. appointments                               │
│     └─ status: 'at_reception'                  │
│     └─ financial_data_captured_at: NOW()       │
│     └─ todos os dados preenchidos              │
│                                                 │
│  2. accounts_receivable (SE PARTICULAR)        │
│     ├─ appointment_id: <id>                    │
│     ├─ patient_id: <id>                        │
│     ├─ value: total_value - desconto           │
│     ├─ copayment: coparticipação               │
│     ├─ due_date: +5 dias                       │
│     └─ status: 'open'                          │
│                                                 │
│  3. invoices (SE CONVENIO)                     │
│     ├─ appointment_id: <id>                    │
│     ├─ health_plan_name: plano                 │
│     ├─ authorization_number: auth              │
│     ├─ guide_number: guia                      │
│     ├─ invoice_type: 'HEALTH_INSURANCE'        │
│     ├─ total_value: valor                      │
│     └─ status: 'pending_submission'            │
│                                                 │
│  4. invoice_items (SE CONVENIO)                │
│     ├─ invoice_id: <id>                        │
│     ├─ service_id: <id>                        │
│     ├─ quantity: 1                             │
│     └─ unit_value: valor                       │
│                                                 │
│  5. appointment_financial_audit_logs           │
│     ├─ appointment_id: <id>                    │
│     ├─ financial_event_type:                   │
│     │  'RECEIVABLE_CREATED' ou                 │
│     │  'BILLING_GUIDE_CREATED'                 │
│     ├─ amount: valor                           │
│     └─ context: { payer_type, plan, ... }     │
│                                                 │
└────────────────────────────────────────────────┘


MENSAGENS AO USUÁRIO:
═══════════════════════════════════════════════════

┌─────────────────────────────────────────────────┐
│  SE TIPO = PARTICULAR:                          │
│                                                  │
│  ✅ Check-in realizado!                        │
│                                                  │
│  💳 Conta a Receber criada com sucesso!        │
│                                                  │
│  ID: <uuid>                                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  SE TIPO = CONVENIO:                            │
│                                                  │
│  ✅ Check-in realizado!                        │
│                                                  │
│  🏥 Guia de Faturamento criada!                │
│                                                  │
│  Aguardando processamento para envio            │
│  ao convênio.                                   │
│  ID: <uuid>                                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  SE TIPO = CORTESIA:                            │
│                                                  │
│  ✅ Check-in realizado!                        │
│                                                  │
│  🎁 Atendimento marcado como cortesia.         │
└─────────────────────────────────────────────────┘


DADOS CAPTURADOS:
═══════════════════════════════════════════════════

Essenciais (obrigatórios):
  ✅ Nome do paciente
  ✅ CPF (11 dígitos)
  ✅ Telefone

Financeiros (conforme preenchido):
  ✅ Tipo de pagador (CONVENIO/PARTICULAR/CORTESIA)
  ✅ Nome do plano/convênio (obrigatório)
  ✅ Número da carteirinha
  ✅ Número da autorização
  ✅ Data de vencimento da autorização
  ✅ Número da guia
  ✅ Valor da consulta
  ✅ Desconto
  ✅ Coparticipação
  ✅ Forma de pagamento
  ✅ Carteirinha verificada?
  ✅ Timestamp de captura


PRÓXIMAS AÇÕES DO SISTEMA:
═══════════════════════════════════════════════════

1. CONTAS A RECEBER (PARTICULAR)
   └─ Ir para: Financeiro > Fluxo de Caixa
   └─ Receber pagamento
   └─ Gerar comprovante

2. FATURAMENTO (CONVENIO)
   └─ Ir para: Financeiro > Faturamento
   └─ Enviar guia ao convênio (TISS API)
   └─ Rastrear recebimento
   └─ Registrar glosa (se houver)

3. AUDITORIA & RASTREAMENTO
   └─ Todos os passos registrados
   └─ Histórico financeiro completo
   └─ Relatórios por tipo de paciente
```

---

## 🎯 RESUMO

1. **Paciente chega** → Recepcionista faz check-in
2. **Dados financeiros** → Capturados no modal (2 abas)
3. **Validação** → Sistema valida dados obrigatórios
4. **Geração automática** → 
   - PARTICULAR → Cria Conta a Receber
   - CONVENIO → Cria Guia de Faturamento
5. **Resultado** → Paciente vira "Na Recepção" + financeiro processado
6. **Auditoria** → Tudo registrado em log imutável

**Tudo acontece em ~1-2 segundos!** ⚡
