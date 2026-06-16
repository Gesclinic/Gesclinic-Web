# ✅ CHECKLIST FINAL DE VALIDAÇÃO

## 📋 PRÉ-TESTE (Antes de começar)

- [ ] Dev server rodando: `npm run dev` (localhost:3000)
- [ ] Supabase conectado (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY definidos)
- [ ] Autenticado como usuário admin ou gerente
- [ ] Database carregado com dados de teste
- [ ] Console do navegador aberto (F12)

---

## 🧪 TESTE 1: STATUS AUTOMÁTICO (5 MIN)

### Preparação
- [ ] Vá para: `http://localhost:3000/clinica/agenda`
- [ ] Encontre um atendimento com status **AGUARDANDO**
- [ ] Clique nele para abrir detalhes
- [ ] Complete checklist de recepção
- [ ] Preencha dados financeiros (se houver campos)

### Execução
- [ ] Clique em "LIBERAR PARA ATENDIMENTO"
- [ ] Observe modal aparecer
- [ ] Modal deve mostrar "Processando..." com 3 etapas

### Validação - Visual
- [ ] Modal mostra [1/3] com checkbox verde ✅
- [ ] Modal mostra [2/3] com checkbox verde ✅
- [ ] Modal mostra [3/3] animando (amarelo)
- [ ] Modal fecha automaticamente (< 2 seg)
- [ ] Página atualiza com novo status

### Validação - Console
No console (F12), procure por:
```
✅ [1/3] Atualizando status para LIBERADO_PARA_ATENDIMENTO...
✅ [2/3] Criando lançamento financeiro automático...
✅ [3/3] Transitando para EM_ATENDIMENTO (Aguardando Profissional)...
✅ FASE 1 concluído com sucesso! Status agora: em_atendimento
```

- [ ] Todas as 4 mensagens aparecem
- [ ] Sem mensagens de erro
- [ ] Ordem correta (1 → 2 → 3)

### Validação - UI
- [ ] Status na tabela muda para **EM_ATENDIMENTO**
- [ ] Timestamp é recente
- [ ] Badge de status mostra "Aguardando Profissional"
- [ ] Sem modal de erro

### Validação - Banco de Dados
Na Supabase Console:
```sql
-- Tab SQL Editor, execute:
SELECT id, status, updated_at FROM appointments 
WHERE id = 'COPIE_O_ID_DO_ATENDIMENTO_AQUI' 
LIMIT 1;
```

- [ ] Status é `em_atendimento`
- [ ] `updated_at` é recente (agora)
- [ ] Nenhum erro SQL

---

## 💰 TESTE 2: LANÇAMENTO CRIADO (3 MIN)

### Validação - Banco de Dados
Na Supabase Console:
```sql
-- Verificar lançamento criado
SELECT id, amount, status, appointment_id, created_at 
FROM invoices 
WHERE appointment_id = 'COPIE_O_ID_AQUI' 
ORDER BY created_at DESC 
LIMIT 1;
```

- [ ] Existe 1 registro (ou mais se já existia)
- [ ] `amount` é positivo (> 0)
- [ ] `status` é `open`
- [ ] `appointment_id` corresponde
- [ ] `created_at` é recente

### Validação - Auditoria
```sql
-- Verificar auditoria de criação
SELECT * FROM audit_financial_events 
WHERE appointment_id = 'COPIE_O_ID_AQUI' 
ORDER BY created_at DESC 
LIMIT 3;
```

- [ ] Existe registro com `financial_event_type` = `RECEIVABLE_CREATED`
- [ ] Campo `context` contém: `origin: 'agenda'`
- [ ] Campo `context` contém: `trigger_event: 'LIBERADO_PARA_ATENDIMENTO'`
- [ ] Timestamp é recente

---

## 🔄 TESTE 3: PROFISSIONAL VÊ NA AGENDA (2 MIN)

### Cenário
Se tiver um profissional com calendário configurado:

- [ ] Faça login como profissional
- [ ] Vá para agenda dele
- [ ] O paciente deve aparecer com status **EM_ATENDIMENTO**
- [ ] Deve estar pronto para começar

(Se não tiver profissional, pule este teste)

---

## 🚨 TESTE 4: TRATAMENTO DE ERRO (2 MIN)

### Teste: O que acontece se falhar?

1. **Desconectar internet** durante o clique
   - [ ] Modal mostra erro
   - [ ] Mensagem é clara
   - [ ] Não trava a UI

2. **Restaurar internet**
   - [ ] Pode tentar novamente
   - [ ] Continua funcionando

3. **Usuário sem permissão**
   - [ ] Deve bloquear antes de começar
   - [ ] Ou mostrar erro depois

---

## 📍 TESTE 5: CANCELAMENTO (QUANDO INTEGRADO)

### Pré-requisitos
- [ ] Componente integrado na aba de edição (será instruído depois)
- [ ] Atendimento em status EM_ATENDIMENTO ou FINALIZADO
- [ ] Usuário tem role: admin/gerente/operador_financeiro

### Execução
- [ ] Abra atendimento
- [ ] Clique aba "Cancelamento/Estorno"
- [ ] Selecione "Cancelamento Total"
- [ ] Preencha motivo: "Teste de cancelamento"
- [ ] Preencha autorização: "TEST_123456"
- [ ] Clique "Confirmar Estorno"
- [ ] Confirme no modal

### Validação
- [ ] Modal de sucesso aparece
- [ ] Mensagem mostra valor do estorno
- [ ] Console mostra sucesso ✅

### Validação - Banco
```sql
-- Verificar lançamento de estorno (negativo)
SELECT * FROM invoices 
WHERE appointment_id = 'ID' 
AND amount < 0 
LIMIT 1;

-- Verificar auditoria
SELECT * FROM audit_financial_events 
WHERE appointment_id = 'ID' 
AND financial_event_type = 'CHARGEBACK_INITIATED' 
LIMIT 1;
```

- [ ] Lançamento negativo existe
- [ ] Auditoria tem CHARGEBACK_INITIATED
- [ ] Context tem motivo e autorização

---

## 🔒 TESTE 6: VALIDAÇÕES DE SEGURANÇA (2 MIN)

### Teste: Validação de Role
- [ ] Usuário sem permissão tenta acessar cancelamento
- [ ] Mensagem: "Você não tem permissão"
- [ ] Não permite prosseguir

### Teste: Validação de Motivo
- [ ] Tenta cancelar sem motivo
- [ ] Botão desabilitado
- [ ] Tenta motivo < 10 chars
- [ ] Ainda desabilitado

### Teste: Validação de Autorização
- [ ] Tenta cancelar sem autorização
- [ ] Botão desabilitado
- [ ] Tenta autorização < 6 chars
- [ ] Ainda desabilitado

---

## 📊 TESTE 7: DADOS CONSISTENTES (3 MIN)

### Verificação Final - Status
```sql
SELECT id, status, created_at, updated_at 
FROM appointments 
WHERE id = 'ID' 
LIMIT 1;
```

- [ ] Status final está correto
- [ ] Timestamps fazem sentido
- [ ] Não há values nulos inesperados

### Verificação Final - Financeiro
```sql
SELECT COUNT(*), SUM(amount) as total 
FROM invoices 
WHERE appointment_id = 'ID';
```

- [ ] Número de faturas esperado
- [ ] Total (com estorno) bate com esperado
- [ ] Se cancelado: total negativo

### Verificação Final - Auditoria
```sql
SELECT COUNT(*), financial_event_type 
FROM audit_financial_events 
WHERE appointment_id = 'ID' 
GROUP BY financial_event_type;
```

- [ ] Eventos registrados em ordem
- [ ] Tipos fazem sentido
- [ ] Todos têm timestamp

---

## 🎯 RESULTADO ESPERADO

Depois de todos os testes:

| Teste | Esperado | Status |
|-------|----------|--------|
| 1. Status Automático | Modal 3 etapas | ✅ ou ❌ |
| 2. Lançamento | Criado no banco | ✅ ou ❌ |
| 3. Profissional | Vê na agenda | ✅ ou ❌ |
| 4. Erro | Tratado bem | ✅ ou ❌ |
| 5. Cancelamento | Funciona (quando integrado) | ✅ ou ⏳ |
| 6. Segurança | Validações OK | ✅ ou ❌ |
| 7. Dados | Consistentes | ✅ ou ❌ |

---

## 📝 PROBLEMAS ENCONTRADOS

Se algo der errado, anote aqui:

```
Problema 1:
- O quê: ___________________________________
- Quando: __________________________________
- Erro: ____________________________________
- Solução: __________________________________

Problema 2:
- O quê: ___________________________________
- Quando: __________________________________
- Erro: ____________________________________
- Solução: __________________________________
```

---

## 🚀 SUCESSO!

Se todos os testes passarem:

✅ Status automático está funcionando
✅ Lançamento é criado automaticamente
✅ Profissional vê na agenda
✅ Cancelamento está pronto (quando integrado)
✅ Auditoria está completa
✅ Dados são consistentes

**Pronto para produção! 🎉**

---

## 📞 PRÓXIMO PASSO

Depois de validar:

1. **Integrar CancelamentoEstorno** na aba de edição
   - Ver: `🔧_INTEGRACAO_CANCELAMENTO_EXEMPLO.md`

2. **Testar com dados reais**
   - 10+ atendimentos
   - 2-3 cancelamentos

3. **Documentar para usuários finais**
   - Como usar novo fluxo
   - Quando não pode cancelar
   - Como autorizar estorno

---

**Bora testar!** 🧪
