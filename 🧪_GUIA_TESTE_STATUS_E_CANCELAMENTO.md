# 🧪 GUIA RÁPIDO: Testando Status Automático + Cancelamento

## ⚡ 2 MINUTOS - Status Automático

### Passo 1: Abrir Agenda
```
http://localhost:3000/clinica/agenda
```

### Passo 2: Liberar Atendimento
1. Clique em um atendimento (status: AGUARDANDO)
2. Complete checklist + financeiro
3. Clique **"LIBERAR PARA ATENDIMENTO"**
4. Veja o modal com "Processando..." (3 etapas)

### Passo 3: Observar
```
Modal mostra:
1️⃣ Atualizar status → LIBERADO_PARA_ATENDIMENTO ✅
2️⃣ Criar lançamento financeiro ✅
3️⃣ Transicionar para EM_ATENDIMENTO (Aguardando Profissional) ⏳ → ✅
```

### Passo 4: Verificar
```javascript
// No console (F12):
✅ "[1/3] Atualizando status..."
✅ "[2/3] Criando lançamento..."
✅ "[3/3] Transitando para EM_ATENDIMENTO..."
✅ "FASE 1 concluído"
```

### Passo 5: Confirmar no Banco
```sql
-- Supabase SQL:
SELECT status, updated_at FROM appointments 
WHERE id = 'SEU_ID' LIMIT 1;

-- Esperado:
status: 'em_atendimento'
updated_at: Agora!
```

---

## 💳 5 MINUTOS - Cancelamento/Estorno

### ⚠️ Pré-requisitos
- Sua role deve ser: admin, gerente ou operador_financeiro
- Atendimento deve estar em status: AGUARDANDO, LIBERADO_PARA_ATENDIMENTO, EM_ATENDIMENTO ou FINALIZADO
- Deve ter lançamento financeiro criado

### Como Testar (Quando integrado na UI)

1. **Abra a aba de Edição do Atendimento**
2. **Role para baixo até "Cancelamento/Estorno"**
3. **Selecione "Cancelamento Total"**
4. **Preencha:**
   - Motivo: "Teste de cancelamento - valide rastreabilidade" (mín. 10 chars)
   - Autorização: "TEST_AUTH_12345" (mín. 6 chars)
5. **Clique "Confirmar Estorno"**
6. **Confirme no modal final**

### Verificação
```javascript
// Console deve mostrar:
✅ "[CANCELAMENTO] Iniciando processo..."
✅ "Autorização validada"
✅ "Lançamento de estorno criado"
✅ "Cancelamento registrado na auditoria"
✅ "Processo de estorno concluído!"
```

### Verificar no Banco
```sql
-- Ver lançamento de estorno:
SELECT * FROM invoices
WHERE appointment_id = 'SEU_ID'
AND amount < 0
ORDER BY created_at DESC LIMIT 1;

-- Ver auditoria:
SELECT * FROM audit_financial_events
WHERE appointment_id = 'SEU_ID'
AND financial_event_type = 'CHARGEBACK_INITIATED'
LIMIT 1;

-- Esperado:
- invoices.amount: NEGATIVO (ex: -700.00)
- context.origin: "manual_cancellation"
- context.authorized_role: "gerente" (ou seu role)
```

---

## 📊 O QUE ESPERAR

### Status Automático
| Métrica | Esperado |
|---------|----------|
| Tempo total | < 500ms |
| Etapas | 3 completadas |
| Status final | EM_ATENDIMENTO |
| Lançamento | Criado |
| Auditoria | Registrada |

### Cancelamento
| Métrica | Esperado |
|---------|----------|
| Requer autorização | ✅ SIM |
| Valida role | ✅ SIM |
| Cria lançamento negativo | ✅ SIM |
| Registra auditoria | ✅ SIM |
| Permite reverter | ❌ NÃO (por design) |

---

## 🔍 CHECKLIST DE TESTE

### Status Automático
- [ ] Cliquei em "Liberar para Atendimento"
- [ ] Vi o modal com 3 etapas
- [ ] Modal levou < 2 segundos
- [ ] Console mostrou todas as mensagens ✅
- [ ] Status final no banco é EM_ATENDIMENTO
- [ ] Lançamento foi criado

### Cancelamento (Quando integrado)
- [ ] Acesso ao componente (se integrado na UI)
- [ ] Preenchi motivo (> 10 chars)
- [ ] Preenchi autorização (> 6 chars)
- [ ] Cliquei "Confirmar Estorno"
- [ ] Confirmei no modal final
- [ ] Console mostrou sucesso ✅
- [ ] Lançamento negativo no banco
- [ ] Auditoria registrada com tudo

---

## ⚠️ PROBLEMAS POSSÍVEIS

### ❌ Status não muda para EM_ATENDIMENTO
```
Causa: onUpdateStatus falha na 3ª etapa
Solução:
1. Verifique console para erro específico
2. Verifique RLS policy em appointments table
3. Verifique se clinicId está correto
```

### ❌ Lançamento não é criado (etapa 2)
```
Causa: createAR falha
Solução:
1. Verifique se valor > 0
2. Verifique RLS em invoices table
3. Verifique se clinicId está correto
```

### ❌ "Você não tem permissão para cancelar"
```
Causa: Seu role não está em allowedRoles
Solução:
- Role deve ser: admin, gerente ou operador_financeiro
- Verifique seu role no usuário
```

### ❌ Erro de autorização
```
Causa: Campo de autorização < 6 chars
Solução:
- Digite um código/frase com 6+ caracteres
```

---

## 📞 RESULTADOS ESPERADOS

✅ **Status Automático Funcionando:**
- [Status: LIBERADE_PARA_ATENDIMENTO] → [Status: EM_ATENDIMENTO]
- Transição em < 500ms
- Lançamento criado automaticamente
- Profissional vê na agenda dele
- Auditoria registrada

✅ **Cancelamento Funcionando:**
- Modal pede autorização
- Valida motivo
- Cria lançamento negativo
- Registra tudo na auditoria
- Sucesso confirmado na UI

---

## 🚀 PRÓXIMA AÇÃO

1. **Teste o status automático AGORA**
2. **Compartilhe o resultado**
3. **Quando integrado a UI, teste cancelamento também**
4. **Confirme rastreabilidade no banco**

---

Bora testar! 🧪
