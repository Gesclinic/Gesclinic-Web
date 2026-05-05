# 📋 TELA DE CHECK-IN DA RECEPÇÃO

## 🧠 CONCEITO E OBJETIVO

A **Tela de Check-in da Recepção** é a peça-chave que garante que o profissional só atenda pacientes prontos.

### Responsabilidade:

✅ Marcar chegada  
✅ Conferir dados  
✅ Resolver pendências financeiras/convênios  
✅ Liberar para atendimento

### O que NÃO faz:

❌ Agenda novos pacientes  
❌ Atende paciente  
❌ Faz DRE completa

---

## 🎨 UX DETALHADA

### 📍 Rota Sugerida

```
/clinica/agenda/checkin
```

### 🧩 Layout Geral

**2 Colunas:**

```
┌─────────────────────────────────────────────────────────────┐
│ LEFT (Sidebar 300px)         │  RIGHT (Main Content)        │
├──────────────────────────────┼──────────────────────────────┤
│ 📋 Check-in Recepção         │                              │
│ Hoje (N)                     │  João Silva                  │
│                              │  08:30 · Consulta · Dr Paulo│
│ [Busca rápida]              │  🟡 Aguardando               │
│                              │                              │
│ 🟡 João Silva               │  ┌─────────────────────────┐ │
│    08:30 · Consulta         │  │ ✅ Checklist             │ │
│    Status: Aguardando       │  │ 💰 Financeiro            │ │
│                              │  │ ⚙️  Ações                │ │
│ 🔴 Maria Santos             │  └─────────────────────────┘ │
│    09:15 · Limpeza          │                              │
│    Status: Pendente         │  [Conteúdo da Aba Selecionada]
│                              │                              │
│ 🔵 Carlos Oliveira          │                              │
│    10:00 · Procedimento     │                              │
│    Status: Fin. Pendente    │                              │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

### 🎨 Cores de Status

| Status           | Cor      | Significado                |
| ---------------- | -------- | -------------------------- |
| 🟡 Aguardando    | Amarelo  | Espera dados ou liberação  |
| 🔴 Pendente      | Laranja  | Falta resolver algo        |
| 🔵 Fin. Pendente | Vermelho | Falta gerar guia/pagamento |
| 🟢 Liberado      | Verde    | Pronto para atender        |

---

## ✅ CHECKLIST INTELIGENTE

### Regra de Ouro:

**Sem checklist completo → NÃO libera**

### Itens Base (SEMPRE)

- ☐ Dados cadastrais conferidos
- ☐ Serviço correto
- ☐ Profissional correto

### Itens Extras (Conforme Tipo)

#### Se Convênio:

- ☐ Convênio válido
- ☐ Carteirinha conferida
- ☐ Autorização válida
- ☐ Guia gerada

#### Se Particular:

- ☐ Forma de pagamento definida
- ☐ Pagamento registrado OU Autorizado após atendimento

### UX do Checklist

Cada item tem:

- ✅ Checkbox
- 📝 Descrição clara
- ⚠️ Badge "OBRIGATÓRIO" se pendente
- 📊 Barra de progresso (X/Y completos)

---

## 💰 ABA FINANCEIRO (SIMPLIFICADA)

A recepção não faz DRE, apenas resolve bloqueios.

### Fluxo Convênio

1. Plano validado?
2. Carteirinha OK?
3. Autorização confirmada?
4. Guia gerada?

**Ação:** Se tudo OK → pode liberar  
**Se dúvida:** Encaminhar para financeiro

### Fluxo Particular

1. Valor informado?
2. Forma de pagamento definida?
3. Pagamento recebido OU autorizado para depois?

**Opções:**

- ✅ Já pagou (libera)
- ⏳ Pagar depois do atendimento (libera)

---

## ⚙️ ABA AÇÕES

### Botão Principal: LIBERAR PARA ATENDIMENTO

**Aparece apenas se:**
✅ Checklist 100% completo  
✅ Financeiro resolvido  
✅ Status permite (não é final)

**Ao clicar:**

1. Sistema pede confirmação
2. Muda status para `LIBERADO_PARA_ATENDIMENTO`
3. Registra data/hora/usuário
4. Paciente SOME da lista de pendências
5. Profissional vê o paciente

### Outras Ações

- ❌ Marcar Falta → status `FALTA`
- 🔁 Remarcar → abre modal de reagendamento
- 🛑 Marcar Pendência → status `PENDENTE`

---

## 🔓 LIBERAÇÃO PARA ATENDIMENTO (REGRA DE OURO)

### Fluxo Automático:

```javascript
{
  status: "LIBERADO_PARA_ATENDIMENTO",
  liberado_em: "2026-01-14T10:30:00Z",
  liberado_por: "user_id_da_recepcao"
}
```

### Impacto:

👉 Paciente aparece para profissional  
👉 Some da fila de pendências  
👉 NÃO pode mais ser alterado pela recepção  
👉 Profissional começa atendimento

---

## 🛠️ INTEGRAÇÃO TÉCNICA

### Importação

```javascript
import CheckinRecepacao from '@/pages/clinica/agenda/views/CheckinRecepacao';
```

### Em AppRoutes.jsx

```javascript
{
  path: "/clinica/agenda/checkin",
  element: <ProtectedRoute><CheckinRecepacao /></ProtectedRoute>,
}
```

### Permissões Requeridas

- `canMarkArrival` (recepcionista)
- ❌ Profissional não acessa
- ✅ Gestor pode visualizar/controlar

---

## 📊 FLUXO VISUAL

```
PACIENTE CHEGA
     ↓
[ CHECKLIST ]
  ✅ Dados
  ✅ Serviço
  ✅ Profissional
  ✅ Convênio/Pagto
     ↓
[ FINANCEIRO ]
  ✅ Guia gerada OU Pagto registrado
     ↓
[ LIBERAÇÃO ]
  🟢 LIBERAR PARA ATENDIMENTO
     ↓
[ PROFISSIONAL VÊ PACIENTE ]
  ✅ Inicia atendimento
  ✅ Registra horário inicio
  ✅ Marca como EM_ATENDIMENTO
  ✅ Finaliza
```

---

## ✨ BENEFÍCIOS

| Problema                            | Solução                    | Resultado      |
| ----------------------------------- | -------------------------- | -------------- |
| Glosa por falta de guia             | Validação antes            | Sem glosa      |
| Conflito dados/convênio             | Checklist obrigatório      | Dados corretos |
| Profissional vê paciente não pronto | Só libera completo         | Fluxo limpo    |
| Falta rastreamento                  | Registra data/hora/usuário | Auditoria      |

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Implementar CheckinRecepacao.jsx
2. ✅ Registrar rota em AppRoutes.jsx
3. ✅ Testar com login de recepcionista
4. ✅ Testar liberação muda para profissional
5. ⏭️ Adicionar integração com sistema de financeiro
6. ⏭️ Adicionar geração de guias automática

---

## 📝 NOTES

- Cada item do checklist é governado por dados do agendamento
- Sem dados = checkbox vazio (bloqueia liberação)
- Recepção não pode forçar liberação sem checklist
- Profissional vê APENAS pacientes com status LIBERADO_PARA_ATENDIMENTO
