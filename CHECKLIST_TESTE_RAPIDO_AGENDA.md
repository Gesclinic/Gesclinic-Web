# ⚡ CHECKLIST RÁPIDO DE TESTES - AGENDA

**Tempo total:** 10 minutos  
**Data:** 14 de janeiro de 2026

---

## 🚀 PRÉ-REQUISITOS

- [ ] Node.js instalado
- [ ] npm funcionando
- [ ] .env configurado corretamente
- [ ] Internet funcionando

---

## ▶️ PASSO 1: INICIAR (1 minuto)

```bash
npm run dev
```

Espere até ver:
```
VITE v5.x.x ready in xxx ms
```

---

## 📱 PASSO 2: ACESSAR AGENDA (1 minuto)

Abra no navegador:
```
http://localhost:3000/clinica/agenda
```

Você deve ver:
- [ ] Página com layout da agenda
- [ ] Data do dia
- [ ] Botões de navegação
- [ ] Timeline com horários

---

## ➕ PASSO 3: CRIAR AGENDAMENTO (2 minutos)

1. [ ] Clique em um **slot vazio** na timeline
2. [ ] Modal abre com formulário
3. [ ] Preencha:
   - [ ] **Paciente** (obrigatório - selecione um da lista)
   - [ ] **Profissional** (opcional)
   - [ ] **Sala** (opcional)
   - [ ] **Serviço** (opcional)
4. [ ] Clique botão **"Salvar"**
5. [ ] Aguarde 2 segundos

**Resultado esperado:**
- [ ] Agendamento aparece na timeline
- [ ] Modal fecha automaticamente
- [ ] Cor do agendamento é **amarelo** (a_confirmar)

---

## ✅ PASSO 4: CONFIRMAR AGENDAMENTO (2 minutos)

1. [ ] Clique no agendamento que criou
2. [ ] Modal abre com dados
3. [ ] Clique botão **"Confirmar"**
4. [ ] Aguarde 1 segundo

**Resultado esperado:**
- [ ] Status muda para **confirmado**
- [ ] Cor muda para **verde**
- [ ] Modal fecha

---

## ❌ PASSO 5: TESTAR CANCELAMENTO (2 minutos)

1. [ ] Crie outro agendamento (repita Passos 3)
2. [ ] Clique nele
3. [ ] Clique botão **"Cancelar"**
4. [ ] Aguarde 1 segundo

**Resultado esperado:**
- [ ] Status muda para **cancelado**
- [ ] Cor muda para **vermelho**
- [ ] Modal fecha

---

## 🔐 PASSO 6: VERIFICAR NO BANCO (1 minuto)

Abra Supabase:
1. [ ] Acesse https://supabase.com
2. [ ] Abra seu projeto
3. [ ] Vá para **SQL Editor**
4. [ ] Execute:

```sql
SELECT * FROM appointments 
WHERE clinic_id = '[sua-clinic-id]'
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado esperado:**
- [ ] Agendamentos aparecem na lista
- [ ] Status está correto (confirmado, cancelado, etc)
- [ ] Timestamps foram salvos

---

## 🧪 PASSO 7: VERIFICAR CONSOLE (1 minuto)

1. [ ] Abra F12 (Developer Tools)
2. [ ] Vá para aba **Console**
3. [ ] Crie um agendamento novo

**Resultado esperado:**
- [ ] NÃO há erros em vermelho
- [ ] Pode ver logs de sucesso
- [ ] Console está limpo

---

## 📊 RESULTADO

Se marcou todos os checkboxes acima: ✅ **TUDO FUNCIONANDO!**

---

## ❌ SE ALGO NÃO FUNCIONAR

### Agendamento não aparece na timeline
- [ ] Verifique se selecionou um paciente
- [ ] Abra F12 console, procure por error
- [ ] Recarregue página (F5)

### Erro: "clinic_id obrigatório"
- [ ] Verifique se está logado
- [ ] Verifique .env está correto
- [ ] Recarregue página

### Erro: "Sem permissão"
- [ ] Pode ser seu perfil (recepcao, profissional, etc)
- [ ] Tente com outro usuário
- [ ] Verifique RBAC na documentação

### Botão "Cancelar" desabilitado
- [ ] Seu perfil pode não ter permissão
- [ ] Apenas gestor/admin podem cancelar
- [ ] Tente com outro perfil

### Nada funciona
1. [ ] Verifique F12 console para erros
2. [ ] Verifique se npm run dev está rodando
3. [ ] Verifique .env configurado
4. [ ] Verifique internet funcionando
5. [ ] Recarregue página completa (Ctrl+Shift+R)

---

## 📞 PRÓXIMO PASSO

Se tudo funcionou:

1. **Teste mais detalhado:** Leia [TESTE_RAPIDO_AGENDA.md](./TESTE_RAPIDO_AGENDA.md)
2. **Entenda a implementação:** Leia [AJUSTES_AGENDA_CONCLUIDOS.md](./AJUSTES_AGENDA_CONCLUIDOS.md)
3. **Teste com todos os perfis:** recepcao, profissional, gestor, admin

---

## ⏱️ TEMPO GASTO

- Pré-requisitos: 0 minutos (assumindo já pronto)
- npm run dev: 1 minuto
- Acessar agenda: 1 minuto
- Criar agendamento: 2 minutos
- Confirmar: 2 minutos
- Cancelar: 2 minutos
- Verificar banco: 1 minuto
- Verificar console: 1 minuto

**TOTAL: ~10 minutos**

---

## ✨ PARABÉNS!

Você acabou de testar a Agenda implementada! 🎉

Agora você sabe que:
- ✅ Criar agendamentos funciona
- ✅ Confirmar funciona
- ✅ Cancelar funciona
- ✅ Dados salvam no Supabase
- ✅ Sem erros no console

**Próximo:** Teste com todos os perfis e leia a documentação completa.

---

**Data:** 14 de janeiro de 2026  
**Status:** Pronto para testar agora mesmo! 🚀
