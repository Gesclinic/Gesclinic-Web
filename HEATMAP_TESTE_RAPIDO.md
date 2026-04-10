# 🧪 TESTE RÁPIDO: HEATMAP DE OCUPAÇÃO

## ✅ Como Testar em 2 Minutos

### 1. Abra a Agenda
```
http://localhost:3001/clinica/agenda
```

### 2. Veja o Heatmap
```
Localização: Entre [Filtros] e [Grade de Horários]

Você verá:
┌─────────────────────────────────────────┐
│ Heatmap de Ocupação                     │
│ Taxa de ocupação por horário            │
│                                         │
│ [Verde] [Amarelo] [Vermelho] [Cores] │
│ < 30%   30-70%    > 70%                │
│                                         │
│ ██ ██ ██ ██ ██ ██ ██ (20 quadrados)   │
│ 08% 15% 32% ... 90% 78% ...           │
│                                         │
│ Melhor │ Pior   │ Média                │
│ 08:00  │ 10:00  │ 52%                  │
└─────────────────────────────────────────┘
```

---

## 🎯 O Que Validar

### ✓ Aparência
```
[x] Heatmap aparece entre filtros e grade
[x] 20 quadrados coloridos (um por horário)
[x] Cada quadrado tem percentual dentro
[x] Legenda de cores aparece (Verde, Amarelo, Vermelho)
[x] Três métricas resumidas aparecem abaixo
```

### ✓ Cores
```
[x] Verde para horários vazios (< 30%)
[x] Amarelo para horários parciais (30-70%)
[x] Vermelho para horários cheios (> 70%)
[x] Degradê visual intuitivo
```

### ✓ Interatividade
```
[x] Passe o mouse sobre um quadrado
[x] Tooltip aparece com horário
[x] Tooltip mostra percentual
[x] Tooltip mostra ocupados/total
[x] Quadrado aumenta ao passar o mouse (hover)
```

### ✓ Dados Dinâmicos
```
[x] Percentuais fazem sentido
[x] Melhor horário tem menor %
[x] Pior horário tem maior %
[x] Média está entre eles
```

### ✓ Responsividade
```
[x] Desktop: Todos 20 horários visíveis
[x] Tablet: Scroll horizontal se necessário
[x] Mobile: Scroll horizontal funciona
[x] Tooltip funciona em touch (pode não haver hover)
```

---

## 🔄 Teste Dinâmico

### 1. Teste Mudança de Modo

```
Passo 1: Olhe o heatmap no modo "Geral"
Passo 2: Clique em "Por Profissional"
Passo 3: Heatmap deve ATUALIZAR com novos percentuais
Passo 4: Clique em "Por Sala"
Passo 5: Heatmap deve ATUALIZAR novamente
```

**Esperado:**
- Percentuais mudam conforme o modo
- Legenda "Taxa de ocupação por horário • N profissionais/salas"
- Sem erro ou flicker

### 2. Teste Mudança de Data

```
Passo 1: Note os percentuais atuais
Passo 2: Clique em seta "Próximo dia"
Passo 3: Heatmap deve atualizar com dados do novo dia
Passo 4: Percentuais diferentes ou similares (conforme agendamentos)
```

**Esperado:**
- Transição suave
- Sem delay notável
- Dados precisos

### 3. Teste com Filtros

```
Passo 1: Veja heatmap sem filtros
Passo 2: Selecione um "Profissional" no filtro
Passo 3: Heatmap deve atualizar (apenas aquele profissional)
Passo 4: Percentuais mudam para refletir apenas esse profissional
```

**Esperado:**
- Filtragem funciona
- Dados precisos
- Sem lag

---

## 📊 Exemplos de Valores Esperados

### Exemplo 1: Agenda com Agendamentos
```
08:00 - 25% ocupado (1 de 4 agendamentos)
08:30 - 50% ocupado (2 de 4 agendamentos)
09:00 - 75% ocupado (3 de 4 agendamentos) ← Pior
09:30 - 10% ocupado (0 de 4 agendamentos) ← Melhor
...
Média: 40%
```

### Exemplo 2: Modo Profissional (3 profissionais)
```
08:00 - 33% (1 prof tem agendamento)
08:30 - 67% (2 profs têm agendamentos)
09:00 - 100% (3 profs têm agendamentos) ← Pior
10:00 - 0% (nenhum prof) ← Melhor
...
Média: 45%
```

---

## 🎨 Validar Cores

### Verde (< 30%)
```
Valores: 0%, 10%, 20%, 25%, 30%
Cor esperada: #10b981 (verde bright)
Comportamento: Pode encaixar
```

### Amarelo (30-70%)
```
Valores: 35%, 50%, 70%
Cor esperada: #eab308 (amarelo bright)
Comportamento: Parcialmente disponível
```

### Vermelho (> 70%)
```
Valores: 75%, 80%, 90%, 100%
Cor esperada: #f87171 (vermelho bright)
Comportamento: Lotado/Sem vagas
```

---

## 💡 Debug se Algo Não Funcionar

### Problema: Heatmap não aparece

**Solução:**
1. Abra DevTools (F12)
2. Vá em Console
3. Procure por erros
4. Verifique se agendamentos carregaram
5. Recarregue página (F5)

**Causa Comum:**
- Dados ainda carregando
- Filtro escondeu tudo
- Navegador cache

### Problema: Percentuais errados

**Solução:**
1. Compare com grade de horários abaixo
2. Conte manualmente quantos agendamentos em cada hora
3. Calcule: (ocupados / total) * 100

**Debug:**
```javascript
// No console:
console.log(filteredAppointments.filter(a => 
  a.start_time?.substring(0, 5) === "10:00"
));
// Deveria mostrar agendamentos às 10:00
```

### Problema: Tooltip não aparece

**Solução:**
1. Passe o mouse sobre um quadrado
2. Aguarde 500ms
3. Tooltip deveria aparecer acima

**Se não funcionar:**
- Check if styles are loaded
- Verificar z-index (z-50 deve estar acima)
- Pode ser issue do navegador (test em outro)

### Problema: Cores erradas

**Solução:**
1. Verifique se Tailwind CSS carregou
2. Abra DevTools → Elements
3. Procure pela classe do quadrado (ex: `bg-green-400`)
4. Verifique se CSS foi aplicado

---

## ✅ Checklist Completo

```
Visual:
[x] Heatmap aparece
[x] 20 quadrados visíveis
[x] Números dentro dos quadrados
[x] Legenda de cores visible
[x] Métricas resumidas aparecem
[x] Bem formatado e alinhado

Cores:
[x] Verde para baixa ocupação
[x] Amarelo para média ocupação
[x] Vermelho para alta ocupação
[x] Degradê faz sentido visual

Interatividade:
[x] Hover mostra tooltip
[x] Tooltip formatado bem
[x] Scroll horizontal funciona
[x] Sem lag ou glitches

Dados:
[x] Percentuais fazem sentido
[x] Melhor/Pior corretos
[x] Média correcta
[x] Muda com filtros

Responsividade:
[x] Desktop OK
[x] Tablet OK
[x] Mobile OK
[x] Sem quebra de layout

Performance:
[x] Carrega rápido (< 1s)
[x] Transições suaves
[x] Sem freeze ao interagir
[x] Sem memory leaks
```

---

## 🎯 Status Esperado

Após 2 minutos de teste, você deveria ver:

✅ Heatmap visual bonito e intuitivo  
✅ Cores que fazem sentido  
✅ Tooltips informativos  
✅ Dados precisos e dinâmicos  
✅ Performance excelente  
✅ UX premium tipo ERP profissional  

---

## 🚀 Próximos Passos

Se tudo funcionar:
1. ✅ Use a agenda normalmente
2. ✅ Note como o heatmap ajuda a encontrar vagas
3. ✅ Aproveite a visualização de gargalos
4. ✅ Sugira melhorias se necessário

Se algo não funcionar:
1. 🔧 Siga "Debug" acima
2. 🔧 Verifique console
3. 🔧 Recarregue página
4. 🔧 Teste em navegador diferente

---

**Data:** 14 de Janeiro de 2026  
**Tempo de Teste:** ~2-5 minutos  
**Dificuldade:** Fácil (nada para testar, apenas observar)

Aproveite o novo heatmap! 🎨

