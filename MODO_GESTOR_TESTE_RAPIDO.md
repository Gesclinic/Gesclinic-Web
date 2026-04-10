# 🧪 MODO GESTOR — SCRIPT DE TESTE RÁPIDO

**Objetivo:** Validar implementação em 5 minutos  
**Status:** ✅ Pronto para executar  
**Tempo:** 5 minutos total

---

## ✅ PRÉ-REQUISITOS

```
[ ] Browser aberto
[ ] Projeto rodando em http://localhost:3000
[ ] npm run dev está ativo
[ ] DevTools (F12) disponível
[ ] 2 contas de usuário: 1 recepção, 1 gestor
```

---

## 🧪 TESTE 1: RECEPÇÃO (2 min)

### Passo 1.1: Login

```
1. Abra http://localhost:3000/clinica/agenda
2. Faça login com usuário RECEPÇÃO
3. Verifique que está em /clinica/agenda
```

**Resultado esperado:**
- ✅ Página carrega
- ✅ Dados aparecem

---

### Passo 1.2: Verificar Toggle

```
4. Procure por "Modo da Agenda:"
5. Procure por botões "📞 Recepção" e "📊 Gestor"
```

**Resultado esperado:**
- ❌ Toggle NÃO existe (invisível para recepção)
- ❌ Nenhum botão de modo visível

**Se vir o toggle:**
- 🔴 FALHA: Toggle não deveria renderizar
- Verifique: `canAccessGestorMode = currentRole === 'gestor'`

---

### Passo 1.3: Verificar Análises

```
6. Procure por "💰 Gestão Financeira"
7. Procure por "🔥 Heatmap de Ocupação"
```

**Resultado esperado:**
- ❌ Dashboard NÃO visível
- ❌ Heatmap NÃO visível

**Se ver os componentes:**
- 🔴 FALHA: Não deveriam renderizar para recepção
- Verifique: `agendaMode === 'gestor'` conditions

---

### Passo 1.4: Verificar Timeline

```
8. Procure por "📅 TIMELINE" ou "Horários"
```

**Resultado esperado:**
- ✅ Timeline visível logo
- ✅ Sem scroll excessivo
- ✅ Página limpa e simples

---

### Passo 1.5: Console

```
9. F12 → Console
10. Não deve haver warnings "🚫 Acesso negado"
```

**Resultado esperado:**
- ✅ Console limpo
- ❌ Nenhum warn relacionado a Modo Gestor

---

## ✅ TESTE 2: GESTOR (3 min)

### Passo 2.1: Login

```
1. Faça logout (se ainda estiver em recepção)
2. Faça login com usuário GESTOR
3. Abra http://localhost:3000/clinica/agenda
```

**Resultado esperado:**
- ✅ Página carrega
- ✅ Dados aparecem

---

### Passo 2.2: Verificar Toggle

```
4. Procure por "Modo da Agenda:"
5. Procure por "📞 Recepção" e "📊 Gestor"
```

**Resultado esperado:**
- ✅ Toggle visível
- ✅ Dois botões renderizam
- ✅ "Recepção" está ativo inicialmente (fundo branco)

**Se não vir o toggle:**
- 🔴 FALHA: Toggle deveria renderizar para gestor
- Verifique: `{canAccessGestorMode && (...)}`

---

### Passo 2.3: Verificar Modo Recepção

```
6. Com "Recepção" ativo, procure por análises
7. Procure por "💰 Gestão Financeira"
8. Procure por "🔥 Heatmap de Ocupação"
```

**Resultado esperado:**
- ❌ Dashboard NÃO visível (modo recepcao)
- ❌ Heatmap NÃO visível (modo recepcao)
- ✅ Timeline visível

---

### Passo 2.4: Clicar em "Gestor"

```
9. Clique no botão "📊 Gestor"
10. Observe a mudança visual
```

**Resultado esperado:**
- ✅ Botão "Gestor" fica com fundo branco
- ✅ Descrição muda para "📊 Gestor - Análises..."
- ✅ Dashboard aparece (colapsível com "💰")
- ✅ Heatmap aparece (colapsível com "🔥")
- ✅ Sugestões aparecem (se houver)

**Se não aparecer:**
- 🔴 FALHA: Componentes deveriam renderizar
- Verifique: `agendaMode === 'gestor'` conditions

---

### Passo 2.5: Expandir Financeiro

```
11. Clique em "[▾] Gestão Financeira"
```

**Resultado esperado:**
- ✅ Dashboard expande com transição suave
- ✅ Vê cards com R$, ocupação, status
- ✅ Chevron rotaciona (▾ → ▸)

---

### Passo 2.6: Expandir Heatmap

```
12. Clique em "[▾] Heatmap de Ocupação"
```

**Resultado esperado:**
- ✅ Heatmap expande com transição suave
- ✅ Vê matriz de ocupação
- ✅ Chevron rotaciona

---

### Passo 2.7: Voltar para Recepção

```
13. Clique em "📞 Recepção"
```

**Resultado esperado:**
- ✅ Botão "Recepção" volta a ter fundo branco
- ✅ Dashboard desaparece
- ✅ Heatmap desaparece
- ✅ Sugestões desaparecem
- ✅ Timeline volta a estar sozinha

---

### Passo 2.8: Console

```
14. F12 → Console
15. Não deve haver warnings ao clicar nos botões
```

**Resultado esperado:**
- ✅ Console limpo
- ❌ Nenhum warn relacionado a Modo Gestor

---

## 🔒 TESTE 3: BLOQUEIO DEFENSIVO (1 min, opcional)

### Passo 3.1: Tenta Explorar

```
1. Com GESTOR logado e em Modo Recepção
2. F12 → Console
3. Digite: document.body.innerText
4. Procure por "setAgendaMode" (não encontrará)
```

**Resultado esperado:**
- ✅ Não há exposição de funções no window
- ✅ Segurança aplicada

---

### Passo 3.2: Simulação de Exploit

```
(Este passo é avançado - skip se não souber)

5. Se o agendaMode estivesse em localStorage:
   → F12 → Application → localStorage
   → Procure por "agendaMode"
   
6. Tente mudar valor de "recepcao" para "gestor"
7. Recarregue página (F5)
```

**Resultado esperado:**
- ✅ Bloqueio defensivo ativa
- ✅ console.warn aparece: "🚫 Acesso negado..."
- ✅ Modo reseta para "recepcao"

---

## 📱 TESTE 4: RESPONSIVO (1 min, opcional)

### Passo 4.1: Mobile View

```
1. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
2. Selecione "iPhone SE" ou "375px"
3. Recarregue página (F5)
```

---

### Passo 4.2: Toggle em Mobile

```
4. Procure pelo toggle (deve estar visível)
5. Toque em "Gestor" (no mobile, é toque)
```

**Resultado esperado:**
- ✅ Toggle renderiza corretamente
- ✅ Botões lado a lado (não quebra)
- ✅ Descrição aparece

---

### Passo 4.3: Dashboard em Mobile

```
6. Clique em "[▾] Gestão Financeira"
7. Observe o layout
```

**Resultado esperado:**
- ✅ Dashboard expande full-width
- ✅ Cards empilham verticalmente
- ✅ Sem overflow horizontal
- ✅ Texto legível

---

### Passo 4.4: Heatmap em Mobile

```
8. Clique em "[▾] Heatmap"
```

**Resultado esperado:**
- ✅ Heatmap expande full-width
- ✅ Matriz ajusta ao width
- ✅ Scroll horizontal se necessário (OK)
- ✅ Sem quebra de layout

---

## ✅ RESULTADO FINAL

### Checklist de Aprovação

```
[ ] Teste 1.1: Login recepção - OK
[ ] Teste 1.2: Toggle não visível - OK
[ ] Teste 1.3: Análises não visíveis - OK
[ ] Teste 1.4: Timeline visível - OK
[ ] Teste 1.5: Console limpo - OK

[ ] Teste 2.1: Login gestor - OK
[ ] Teste 2.2: Toggle visível - OK
[ ] Teste 2.3: Modo recepcao sem análises - OK
[ ] Teste 2.4: Clicar em Gestor → aparece - OK
[ ] Teste 2.5: Expandir Financeiro - OK
[ ] Teste 2.6: Expandir Heatmap - OK
[ ] Teste 2.7: Voltar para Recepção → desaparece - OK
[ ] Teste 2.8: Console limpo - OK

[ ] Teste 3: Bloqueio defensivo (opcional) - OK
[ ] Teste 4: Responsivo (opcional) - OK
```

---

## 🎯 RESULTADO

### ✅ TUDO OK?

```
Parabéns! Implementação está PRONTA PARA PRODUÇÃO.

Próximas ações:
1. git push
2. Deploy
3. Monitor em produção
```

### ❌ ALGUM FALHOU?

```
Verifique:
├─ Arquivo: src/pages/clinica/agenda/AgendaPage.jsx
├─ Linhas: 48-49 (permissão + estado)
├─ Linhas: 54-61 (bloqueio)
├─ Linhas: 418-460 (toggle)
├─ Linhas: 464+ (condicionalizações)
└─ Compile: npm run build (0 erros?)
```

---

## 📊 MATRIZ DE TESTE

| Teste | Recepção | Gestor | Status |
|-------|----------|--------|--------|
| Toggle visível | ❌ | ✅ | |
| Dashboard visível (recepção) | ❌ | ❌ | |
| Dashboard visível (gestor) | ❌ | ✅ | |
| Heatmap visível (recepção) | ❌ | ❌ | |
| Heatmap visível (gestor) | ❌ | ✅ | |
| Timeline sempre visível | ✅ | ✅ | |
| Bloqueio defensivo | N/A | ✅ | |
| Responsivo mobile | ✅ | ✅ | |

---

## ⏱️ CRONOGRAMA

```
Teste 1 (Recepção):        2 min
Teste 2 (Gestor):          3 min
Teste 3 (Bloqueio):        1 min (opcional)
Teste 4 (Responsivo):      1 min (opcional)
                    ────────────
Total:              5-7 min

Aprovação: Todos ✅ em ~5 min
```

---

**Script de Teste:** ✅ Pronto  
**Tempo estimado:** 5 minutos  
**Dificuldade:** Fácil  
**Status:** Comece agora!

🚀 Testa, aprova, deploy! 🚀

