# ⚡ GUIA RÁPIDO — TESTAR O CHECK-IN

## 🚀 5 MINUTOS PARA FUNCIONAR

### Passo 1: Integrar (1 minuto)

Em `src/AppRoutes.jsx`, adicione:

```javascript
import CheckinRecepacao from "@/pages/clinica/agenda/views/CheckinRecepacao";

// Dentro das rotas /clinica:
{
  path: "agenda/checkin",
  element: <ProtectedRoute><CheckinRecepacao /></ProtectedRoute>,
}
```

### Passo 2: Navegar (30 segundos)

Faça login como **recepcionista** e acesse:
```
http://localhost:3000/clinica/agenda/checkin
```

### Passo 3: Testar Cenários (3 minutos)

#### ✅ Cenário 1: Liberar Paciente Completo

1. Selecione um paciente na lista
2. Abra aba **Checklist** → tudo verde? ✅
3. Abra aba **Financeiro** → tudo resolvido?
4. Abra aba **Ações** → botão "LIBERAR" aparece em verde?
5. Clique em "LIBERAR"
6. Confirme no modal
7. Status muda para 🟢 **Liberado para Atendimento**

#### ❌ Cenário 2: Bloquear por Checklist Incompleto

1. Selecione um paciente
2. Abra aba **Checklist**
3. Veja itens com ❌ pendentes
4. Aba **Ações** → botão "LIBERAR" está CINZA (desabilitado)
5. Vê mensagem: "❌ Checklist incompleto"

#### 💳 Cenário 3: Bloquear por Financeiro Pendente

1. Selecione paciente com convênio
2. Abra aba **Financeiro**
3. Se guia não está gerada → bloqueado
4. Aba **Ações** → mensagem: "❌ Financeiro pendente"

---

## 🧪 CHECKLIST DE TESTES

| Cenário | Status | Checklist | Financeiro | Resultado | ✅ |
|---------|--------|-----------|-----------|-----------|-----|
| Paciente OK | AGUARDANDO | ✅ 100% | ✅ OK | Libera | ☐ |
| Falta nome paciente | AGUARDANDO | ❌ 50% | ✅ OK | Bloqueia | ☐ |
| Convênio sem guia | AGUARDANDO | ✅ 100% | ❌ Sem guia | Bloqueia | ☐ |
| Particular sem pagto | AGUARDANDO | ✅ 100% | ❌ Sem pagto | Bloqueia | ☐ |
| Já liberado | LIBERADO | ✅ 100% | ✅ OK | Botão cinza | ☐ |
| Marcar falta | AGUARDANDO | ✅ 100% | ✅ OK | Muda para FALTA | ☐ |
| Remarcar | PENDENTE | ❌ Pendente | ✅ OK | Abre reagendamento | ☐ |

---

## 🔍 VERIFICAÇÕES IMPORTANTES

### 1. Profissional NÃO acessa Check-in?

Faça login como **profissional** e tente:
```
http://localhost:3000/clinica/agenda/checkin
```

Resultado esperado:
```
⚠️ Você não tem permissão para acessar o check-in da recepção.
```

### 2. Profissional vê APENAS liberados?

Faça login como **profissional** e vá para:
```
http://localhost:3000/clinica/agenda
```

Resultado esperado:
- Só aparecem pacientes com status 🟢 **LIBERADO_PARA_ATENDIMENTO**
- Pacientes 🟡 **Aguardando** e 🔴 **Pendentes** desaparecem

### 3. Liberação registra data/hora?

Ao liberar um paciente, no banco de dados deve ter:
```sql
SELECT liberado_em, liberado_por FROM appointments 
WHERE id = 'paciente_liberado';
```

Resultado esperado:
```
liberado_em  | 2026-01-14 10:30:45
liberado_por | uuid_da_recepcao
```

---

## 💡 DICAS DE DEBUG

### Dica 1: Verificar status do agendamento

Abra DevTools (F12) → Console:
```javascript
// Loga o agendamento selecionado
console.log("Agendamento:", selectedAppointment);

// Verifica se checklist está completo
console.log("Checklist completo:", isChecklistComplete);

// Verifica se financeiro OK
console.log("Financeiro OK:", isFinanceResolved);
```

### Dica 2: Forçar refresh de dados

Na tela de Check-in, pressione `F5` ou feche/abra a aba.

O polling a cada 30s atualiza automaticamente.

### Dica 3: Simular paciente sem dados

No banco de dados, limpe dados de um agendamento:
```sql
UPDATE appointments 
SET patient_verified = false,
    service_name = null,
    professional_name = null
WHERE id = 'test-id';
```

Volte ao Check-in → vai estar 🔴 **Bloqueado**

---

## 🎯 ÁREAS CRÍTICAS PARA VALIDAR

### ✅ Checklist

- [ ] Todos os itens aparecem
- [ ] Itens base sempre obrigatórios
- [ ] Itens extras aparecem conforme convênio
- [ ] Barra de progresso funciona
- [ ] Cores visuais corretas

### 💰 Financeiro

- [ ] Convênio mostra plano/guia/autorização
- [ ] Particular mostra formas de pagamento
- [ ] Selecionar pagamento atualiza estado
- [ ] Bloqueios corretos quando pendente

### ⚙️ Ações

- [ ] Botão LIBERAR aparece verde quando OK
- [ ] Botão LIBERAR fica cinza quando bloqueado
- [ ] Mensagens de bloqueio são claras
- [ ] Modal de confirmação funciona
- [ ] Outras ações disponíveis (Falta, Remarcar, etc)

### 🔐 Permissões

- [ ] Recepcionista acessa
- [ ] Profissional não acessa
- [ ] Gestor acessa (opcional)

---

## 📝 ANOTAÇÕES

Escreva aqui seus testes:

```
[Data/Hora]: _______________
Navegador: __________________
Usuário: _____________________
Resultado: __________________
```

---

## ❓ PROBLEMAS COMUNS

### Problema: "Nenhum agendamento para hoje"

**Solução:**
- Verifique se existem agendamentos no banco de dados
- Confirme se a data está correta (hoje)
- Verifique se clinic_id está correto

### Problema: Checklist mostra vazio

**Solução:**
- Agendamento pode estar incompleto no banco
- Verifique se campos como `patient_verified`, `service_name` existem
- Confira API em `appointmentsApi.js`

### Problema: Botão "Liberar" não aparece

**Solução:**
- Checklist não está 100% completo
- Financeiro não está resolvido
- Status já é LIBERADO
- Verifique console (F12) para erros

### Problema: Não consegue clicar em "Liberar"

**Solução:**
- Pode estar carregando (loading = true)
- Revise as validações em `CheckinAcoes.jsx`
- Confirme que permissões estão corretas

---

## ✨ QUANDO ESTÁ PRONTO

Você saberá que o Check-in está pronto quando:

✅ Recepcionista consegue liberar paciente  
✅ Profissional NÃO vê pacientes não-liberados  
✅ Liberação registra data/hora/usuário  
✅ Checklist bloqueia liberação incompleta  
✅ Financeiro resolvido antes de liberar  
✅ Polling atualiza a cada 30s  
✅ Mensagens de erro são claras  

🎉 **PRONTO PARA PRODUÇÃO**

