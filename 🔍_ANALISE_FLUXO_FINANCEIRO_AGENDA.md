# 📊 FLUXO DE GERAÇÃO DE FINANCEIRO - AGENDA

## 🎯 RESPOSTA DIRETA

A **Conta a Receber (AR) é gerada em DOIS momentos diferentes** dependendo de qual interface está sendo usada:

---

## 🔄 CENÁRIO 1: Check-in da Recepção (Tela Principal de Agenda)

```
FLUXO:
  1. Recepcionista marca "Marcar Chegada"
     └─ Status: AGENDADO → AGUARDANDO
  
  2. Recepcionista clica "LIBERAR PARA ATENDIMENTO" ✅
     └─ Status: AGUARDANDO → LIBERADO_PARA_ATENDIMENTO
     └─ ❌ AR NÃO é criada aqui
     └─ ⚠️ Financeiro NÃO é gerado neste passo

  3. Profissional começa atendimento
  
  4. Profissional finaliza atendimento
     └─ Status: LIBERADO → EM_ATENDIMENTO → FINALIZADO
```

**Arquivo:** `src/pages/clinica/agenda/views/components/CheckinAcoes.jsx`
**Função:** `handleRelease()` (linha 117)
**O que faz:**
- Apenas muda status para `LIBERADO_PARA_ATENDIMENTO`
- Registra data/hora da liberação
- Não toca em dados financeiros

---

## 💰 CENÁRIO 2: Modal de Atendimento (AtendimentoModal)

Este é o modal que está vendo na screenshot!

```
FLUXO DAS ABAS:
  1️⃣ ABA: Cadastrais
     └─ Dados do paciente
  
  2️⃣ ABA: Liberação
     └─ Autorização (cartão/autorizações)
  
  3️⃣ ABA: Faturamento
     └─ Guia TISS, procedimento, valores
  
  4️⃣ ABA: Pagamento
     └─ Forma de pagamento
     └─ ✅ AQUI CRIA A CONTA A RECEBER!
  
  5️⃣ ABA: Resumo Financeiro
     └─ Exibe o que foi criado
```

**Arquivo:** `src/pages/clinica/agenda/components/AtendimentoModal.jsx`
**Função:** `handleSavePagamento()` (linha 1698)
**O que faz:**
- Salva informações de pagamento
- Cria Conta a Receber automaticamente
- Registra na auditoria financeira

---

## ⏰ TIMING CORRETO

### ❌ ERRADO (O que NÃO acontece)
```
Clica "Liberar para Atendimento" → Cria Financeiro imediatamente
```

### ✅ CORRETO (O que REALMENTE acontece)

**Se usando CHECK-IN (Recepção):**
```
1. Marca chegada          (Status: AGUARDANDO)
2. Libera para atendimento (Status: LIBERADO)
3. ❌ Nada de financeiro ainda
4. Profissional atende   (Status: EM_ATENDIMENTO)
5. Profissional finaliza  (Status: FINALIZADO)
6. ❓ Quando cria financeiro? → MANUAL (via botão ou evento pós-atendimento)
```

**Se usando MODAL DE ATENDIMENTO:**
```
1. Abre modal "Editar Agendamento"
2. Preenche: cadastrais → liberação → faturamento → PAGAMENTO
3. Ao salvar aba "PAGAMENTO":
   ✅ Cria Conta a Receber
   ✅ Registra na auditoria
   ✅ Mostra no resumo
```

---

## 🔍 VERIFICAÇÃO: Onde seu financeiro está sendo criado?

### Para saber ONDE está acontecendo, execute no browser console:

```javascript
// Procure por estes logs:

// CHECK-IN (Recepção):
// "💾 Tentando salvar liberação:" → Arquivo: CheckinAcoes.jsx

// ATENDIMENTO MODAL:
// "📤 Iniciando processo de registro financeiro..." → Arquivo: AtendimentoModal.jsx
// "✅ Conta a Receber criada" → Significa que AR foi criada

// Para ver todos os logs de financeiro:
localStorage.setItem('debug:financeiro', 'true');
// Recarregue a página
```

---

## 📋 FLUXO VISUAL - O QUE VOCÊ VÊ

### Screenshot 1 & 2 (Modal que você mostrou):
```
Modal: "Editar Agendamento"
├─ Serviço: Consulta em horário normal...
├─ Valor: R$ 700,00
├─ Pagamento: Particular - DINHEIRO
├─ Status: Agendado (verde)
└─ Botão: "Liberar para Atendimento" (verde)

IMPORTANTE:
├─ Este é o AtendimentoModal.jsx
├─ NÃO é a tela de check-in da recepção
├─ Ao clicar "Liberar", NÃO cria financeiro
└─ Financeiro é criado nas abas abaixo de "Pagamento"
```

---

## 🎯 O QUE DEVERIA ACONTECER (Fase 1 do Plano)

Você estava lendo minha documentação anterior sobre Fase 1 de integração.

**Ideal seria:**
```
Clica "Liberar para Atendimento" → Automático criar:
  ✅ Conta a Receber
  ✅ Lançamento Financeiro
  ✅ Aparecer em Fluxo de Caixa
  ✅ Impactar DRE

STATUS ATUAL: ❌ NÃO está assim
STATUS DEVERIA SER: ✅ Fase 1 a implementar
```

---

## 🔎 COMO VERIFICAR ATUAL

### No database (Supabase):

```sql
-- Ver todas as Contas a Receber criadas
SELECT id, appointment_id, amount, due_date, created_at, status
FROM accounts_receivable
ORDER BY created_at DESC
LIMIT 20;

-- Ver em qual momento foi criado cada uma
SELECT 
  ar.id,
  ar.appointment_id,
  apt.status as appointment_status,
  ar.created_at as ar_created_at,
  EXTRACT(EPOCH FROM (ar.created_at - apt.updated_at)) as seconds_diff
FROM accounts_receivable ar
LEFT JOIN appointments apt ON ar.appointment_id = apt.id
ORDER BY ar.created_at DESC
LIMIT 10;
```

**O que você vai ver:**
- Se `seconds_diff` é **negativo** = AR criada ANTES de liberar
- Se `seconds_diff` é **positivo** = AR criada DEPOIS de liberar

---

## 🚨 PROBLEMA IDENTIFICADO (O que você quer verificar)

Você perguntou:
> "Verificar se o financeiro está sendo gerado após o status Aguardando Profissional (Criado após clicar no botão Liberar para atendimento)"

**Resposta:**
- Status "Aguardando Profissional" = `LIBERADO_PARA_ATENDIMENTO`
- Clique em "Liberar para Atendimento" = Transição para esse status
- Financeiro sendo gerado? = Pode ser, mas **NÃO DEVERIA SER AQUI**

**O financeiro deveria ser gerado:**
1. **Manualmente** nas abas do modal (aba "Pagamento")
2. **OU automaticamente** via Fase 1 (quando você implementar)

---

## 📝 RESUMO

| Aspecto | Detalhes |
|---------|----------|
| **Onde cria AR** | `AtendimentoModal.jsx` → `handleSavePagamento()` |
| **Quando cria AR** | Ao clicar "Salvar" na aba "Pagamento" |
| **Não cria em** | Ao clicar "Liberar para Atendimento" |
| **Status depois** | Muda para `LIBERADO_PARA_ATENDIMENTO` |
| **Financeiro gerado** | SIM, mas na aba "Pagamento", não na "Liberar" |
| **Problema** | AR criada com delay/manualmente, não automático |
| **Solução** | Implementar Fase 1 (integração automática) |

---

## 🎯 PRÓXIMAS AÇÕES

### Imediato (Para validar):
1. Abra DevTools (F12)
2. Procure pelos logs de financeiro
3. Compare timestamp de "Liberar" com "AR criada"
4. Verifique banco de dados

### Para Fase 1:
1. Implementar automático ao clicar "Liberar para Atendimento"
2. Usar `createLancamentoFromAppointment()` do helper
3. Rastrear origem como 'agenda'

Quer que eu implemente agora?

