# 🧪 TESTE PASSO A PASSO (Guia Prático)

## ⏱️ Tempo Total: 5 Minutos

---

## 📍 PASSO 0: Preparar Ambiente (1 MIN)

### 0.1 - Dev Server
```bash
# Terminal:
npm run dev
```
- Aguarde: "ready in Xms"
- URL: http://localhost:3000

### 0.2 - Abrir Browser
```
http://localhost:3000/clinica/agenda
```
- Efetuar login (se necessário)
- Ver lista de atendimentos

### 0.3 - Abrir Console
```
F12 (ou Ctrl+Shift+I no Windows)
```
- Clique: "Console"
- Deixe visível durante teste

---

## 📋 PASSO 1: Encontrar Atendimento (1 MIN)

### 1.1 - Filtrar por Status
No módulo de agenda:
```
Procurar um atendimento com status: AGUARDANDO
```

Se não houver:
```
Pode criar fake colocando SQL manualmente, ou:
- Faça um agendamento novo
- Deixe com status AGUARDANDO
```

### 1.2 - Clicar no Atendimento
```
Clique no line item do atendimento
```
- Modal/página abre com detalhes
- Deve mostrar formulário de edição

---

## ✅ PASSO 2: Completar Checklist (1 MIN)

### 2.1 - Seção de Recepção
Se houver checkboxes:
```
☑️ Paciente confirmou presença
☑️ Dados pessoais verificados
☑️ Cobrança revisada
```

### 2.2 - Seção Financeira
Se houver campos de valor:
```
Valor: Verifique se está preenchido
Desconto: Deixe em branco ou 0
Forma de pagamento: Selecione qualquer uma
```

### 2.3 - Validação
- [ ] Sem campos obrigatórios vazios
- [ ] Nenhuma mensagem de erro visível

---

## 🟢 PASSO 3: Clicar "LIBERAR PARA ATENDIMENTO" (1 MIN)

### 3.1 - Localizar Botão
```
Procure por um botão com texto:
- "LIBERAR PARA ATENDIMENTO"
- "LIBERTAR PARA ATENDIMENTO"
- "LIBERAR"
- "Release for Service"

Cor: Verde ou azul
```

### 3.2 - Clicar
```
Clique UMA VEZ
```
- **Não clique de novo!** (pode duplicar)

### 3.3 - Observar Modal
```
Deve aparecer um modal com:
"Processando sua solicitação..."
```

---

## 🔍 PASSO 4: Monitorar Console (1 MIN)

### 4.1 - Procurar Mensagens
No console (F12 → Console tab):
```
Procure por estas mensagens (nesta ordem):
```

#### Mensagem 1/3:
```
✅ [1/3] Atualizando status para LIBERADO_PARA_ATENDIMENTO...
```

#### Mensagem 2/3:
```
✅ [2/3] Criando lançamento financeiro automático...
```

#### Mensagem 3/3:
```
✅ [3/3] Transitando para EM_ATENDIMENTO (Aguardando Profissional)...
```

#### Mensagem 4 (Final):
```
✅ FASE 1 concluído com sucesso! Status agora: em_atendimento
```

### 4.2 - Checklist de Console
- [ ] Todas as 4 mensagens aparecem
- [ ] Nenhuma mensagem vermelha (erro)
- [ ] Ordem está: 1 → 2 → 3 → Final
- [ ] Timestamps fazem sentido

### 4.3 - Se Tiver Erro
```javascript
// Procure por linhas com:
❌ "Error"
❌ "failed"
❌ "rejected"

Se encontrar, copie e compartilhe comigo!
```

---

## 📊 PASSO 5: Validação Visual (1 MIN)

### 5.1 - Modal Desaparece
```
Após ~2 segundos:
Modal deve fechar automaticamente
```

- [ ] Modal fechou
- [ ] UI voltou ao normal
- [ ] Nenhuma mensagem de erro visível

### 5.2 - Status Muda
```
Na lista de atendimentos:
Status deve mudar para: EM_ATENDIMENTO
ou: Aguardando Profissional
```

- [ ] Status na tabela atualizou
- [ ] Timestamp é recente (agora)
- [ ] Cor/badge mudou se aplicável

### 5.3 - Dados Persistiram
```
Recarregue a página (F5):
Status deve continuar: EM_ATENDIMENTO
```

- [ ] Recarregou OK
- [ ] Status manteve
- [ ] Sem erros 404

---

## 🎯 PASSO 6: Validação no Banco (Opcional, Técnico)

Se souber SQL:

### 6.1 - Abrir Supabase Console
```
Vá para: https://supabase.com/dashboard
Login com sua conta
Projeto: seu projeto
Tab: SQL Editor
```

### 6.2 - Consultar Appointments
```sql
SELECT 
  id, 
  status, 
  updated_at, 
  patient_id,
  professional_id
FROM appointments 
WHERE status = 'em_atendimento'
ORDER BY updated_at DESC 
LIMIT 5;
```

- [ ] Seu atendimento aparece
- [ ] Status é `em_atendimento`
- [ ] `updated_at` é recente

### 6.3 - Consultar Invoices
```sql
SELECT 
  id, 
  amount, 
  status, 
  appointment_id, 
  created_at
FROM invoices 
WHERE appointment_id = 'COPIE_ID_AQUI'
ORDER BY created_at DESC 
LIMIT 1;
```

- [ ] 1 fatura criada
- [ ] `amount` é positivo
- [ ] `status` é `open`
- [ ] `created_at` é recente

### 6.4 - Consultar Auditoria
```sql
SELECT 
  id,
  financial_event_type, 
  context, 
  created_at
FROM audit_financial_events 
WHERE appointment_id = 'COPIE_ID_AQUI'
ORDER BY created_at DESC 
LIMIT 1;
```

- [ ] Evento registrado
- [ ] Type: `RECEIVABLE_CREATED`
- [ ] Context tem: `origin: 'agenda'`

---

## 📋 Checklist Final

Marque cada item:

```
✅ Dev server rodando
✅ Consegui acessar /clinica/agenda
✅ Encontrei atendimento AGUARDANDO
✅ Completei checklist de recepção
✅ Cliquei "LIBERAR PARA ATENDIMENTO"
✅ Modal apareceu com progresso
✅ Vi todas as 4 mensagens no console
✅ Modal fechou automaticamente
✅ Status mudou para EM_ATENDIMENTO
✅ Página recarregou e status persistiu
✅ [Opcional] Validei no banco de dados
```

---

## 🎉 SE TUDO DEU CERTO

Congratulations! 🎊

Você tem:
- ✅ Status automático funcionando
- ✅ Lançamento criado automaticamente
- ✅ Rastreabilidade completa
- ✅ Sistema pronto para produção

---

## ❌ SE DEU ERRO

### Erro Comum 1: "Botão não encontrado"
```
Solução:
- Aba pode estar em outra seção
- Procure por texto "LIBERAR", "LIBRER", "RELEASE"
- Pode estar em um menu dropdown
```

### Erro Comum 2: "Modal fica preso em 'Processando'"
```
Solução:
- Verifique console para erros
- Pode ser timeout
- Feche modal e tente novamente
```

### Erro Comum 3: "Mensagens não aparecem no console"
```
Solução:
- Limpe o console (botão 🚫)
- Tente novamente
- Verifique se não está com filter ativo
```

### Erro Comum 4: "Status não muda para EM_ATENDIMENTO"
```
Solução:
- Verifique console para erro específico
- Pode ser permissão/RLS
- Tente com usuário admin
```

---

## 💬 Feedback

Depois de testar, compartilhe:

1. **O que funcionou:**
   ```
   Exemplo: "Modal apareceu, 3 etapas OK, status mudou"
   ```

2. **O que não funcionou:**
   ```
   Exemplo: "Erro: Cannot read property 'id' of undefined"
   ```

3. **Tempo levou:**
   ```
   Exemplo: "Modal levou 2 segundos para fechar"
   ```

4. **Sugestões:**
   ```
   Exemplo: "Seria bom ter som de sucesso"
   ```

---

## 🚀 Próxima Ação

Depois que validar que status automático funciona:

1. Leia: `🔧_INTEGRACAO_CANCELAMENTO_EXEMPLO.md`
2. Integre: CancelamentoEstorno na aba de edição
3. Teste: Fluxo completo com cancelamento
4. Valide: No banco (lançamento negativo)

---

✅ **Pronto? Comece o teste agora!**

Se travar em algum lugar, avise! 🆘
