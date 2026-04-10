# 🧪 TESTE RÁPIDO: HEATMAP COM AJUSTES FINOS

**Tempo:** 3 minutos  
**Pré-requisito:** Agenda com agendamentos

---

## ✅ Checklist de Teste

### Teste 1: Tooltip Rico (1 min)

**Como:**
```
1. Abra http://localhost:3001/clinica/agenda
2. Modo: GERAL
3. Passe mouse sobre cada bloco do heatmap
```

**Validar:**
- [ ] Tooltip aparece ACIMA do bloco
- [ ] Tooltip desaparece ao tirar mouse
- [ ] Horário em AZUL no topo
- [ ] Ocupação com CORES (verde/amarelo/vermelho)
- [ ] Contador "Agendamentos: X / Y"
- [ ] Contador "Livres: X"
- [ ] Mensagem "💡 Clique para filtrar por horário"
- [ ] Seta apontando para o bloco

**Se der erro:**
```
❌ Tooltip não aparece
  → Check: hoveredSlot state
  → Check: CSS z-50 pointer-events-none

❌ Tooltip aparece mas cortado
  → Aumentar left offset
  → Adicionar margin-bottom
```

---

### Teste 2: Clique + Filtro (1 min)

**Como:**
```
1. Ainda em GERAL
2. Clique em um bloco (ex: 10:00)
3. Observe:
   - Timeline atualiza?
   - Scroll é suave?
   - Vê agendamentos de 10:00?
```

**Validar:**
- [ ] Ao clicar, tooltip desaparece
- [ ] Cursor muda para pointer
- [ ] Timeline atualiza instantaneamente
- [ ] Scroll é suave (não "pula")
- [ ] Agendamentos filtrados para aquele horário
- [ ] Limpar filtro volta ao normal

**Se der erro:**
```
❌ Clique não funciona
  → Check: onTimeSlotClick prop passado
  → Check: handleTimeSlotClick chamado

❌ Scroll não funciona
  → Check: data-timeline-time atributo
  → Check: setTimeout delay

❌ Filtro não funciona
  → Check: agenda.updateFilter() chamado
  → Check: searchText prop
```

---

### Teste 3: Tooltip por Modo (1 min)

**Modo PROFISSIONAL (mude via tab "Por Profissional"):**

```
Hover em um bloco:
- Deve mostrar "Agendamentos:"
- Listar por profissional: "• Dr. Silva: 2"
- Detalhamento correto
```

**Validar:**
- [ ] Hover mostra profissionais
- [ ] Contagem correta por profissional
- [ ] Nomes dos profissionais aparecem

**Modo SALA (mude via tab "Por Sala"):**

```
Hover em um bloco:
- Deve mostrar "Agendamentos:"
- Listar por sala: "• Sala 1: Paciente A"
- Detalhamento correto
```

**Validar:**
- [ ] Hover mostra salas
- [ ] Nomes das salas aparecem
- [ ] Pacientes mostrados (até 3)

---

## 🚀 Teste de Integração Completo

### Cenário Real: Recepcionista

```
1. Abre agenda no período da manhã
2. Vê heatmap geral com cores mistas
3. Cliente chega querendo agendar
4. Procura um slot verde (< 30% ocupado)
5. Encontra 14:30 com 15%
6. Clica em 14:30
7. Tooltip desaparece, timeline atualiza
8. Vê que 14:30 tem 1 paciente
9. Clica no slot vago (ao lado)
10. Abre formulário de agendamento
11. Agenda cliente com sucesso
12. Heatmap atualiza (14:30 fica 25% em vez de 15%)
```

**Resultado Esperado:** ✅ Fluxo suave, sem erros

---

## 📊 Exemplo de Dados Esperados

### Tooltip em Modo Geral
```
     08:30
━━━━━━━━━━━━━━━━
Ocupação: 75%
Agendamentos: 3 / 4
Livres: 1

Agendamentos:
 • 3 agendamentos

━━━━━━━━━━━━━━━━
💡 Clique para filtrar por horário
```

### Tooltip em Modo Profissional (3 profissionais)
```
     10:00
━━━━━━━━━━━━━━━━━━━━
Ocupação: 67%
Agendamentos: 2 / 3
Livres: 1

Agendamentos:
 • Dr. Silva: 1
 • Dra. Maria: 1

━━━━━━━━━━━━━━━━━━━━
💡 Clique para filtrar por horário
```

### Tooltip em Modo Sala (2 salas)
```
     14:30
━━━━━━━━━━━━━━━━━━━━
Ocupação: 50%
Agendamentos: 1 / 2
Livres: 1

Agendamentos:
 • Sala 1: João Silva

━━━━━━━━━━━━━━━━━━━━
💡 Clique para filtrar por horário
```

---

## 🎯 Pontos Críticos de Teste

### Visual
- [ ] Tooltip centralizado sobre bloco
- [ ] Seta apontando para bloco
- [ ] Cores internas corretas (branco no verde/amarelo/vermelho)
- [ ] Fonte legível (tamanho xs adequado)
- [ ] Espaçamento entre seções

### Funcional
- [ ] Clique em qualquer bloco funciona
- [ ] Filtro persiste até limpar manualmente
- [ ] Scroll não interfere com hover
- [ ] Tooltip desaparece ao sair do mouse

### Responsivo
- [ ] Tooltip não sai da tela em blocos nas extremidades
- [ ] Funciona em modo fullscreen
- [ ] Funciona em tablet/mobile (sem hover, mas clique funciona)

---

## 🐛 Debug: Se Algo Não Funcionar

### Tooltip não aparece
```javascript
// Verificar no DevTools:
1. Elemento com z-50?
2. Position absolute?
3. pointer-events-none?
4. hoveredSlot state updating?

// Abrir Console e clicar:
console.log('Hovering:', hoveredSlot)
```

### Clique não funciona
```javascript
// Verificar:
1. onTimeSlotClick prop passado?
2. handleTimeSlotClick chamado?
3. Button element (não div)?
4. onClick handler presente?

// Abrir Console:
console.log('Click:', time)
```

### Filtro não funciona
```javascript
// Verificar:
1. agenda.updateFilter() existe?
2. searchText é o filtro correto?
3. AgendaFilters reconhece searchText?

// Check AgendaPage:
console.log('Filter:', agenda.filters)
```

### Scroll não funciona
```javascript
// Verificar:
1. data-timeline-time atributo existe em TimelineGeral/Columnas?
2. setTimeout delay (100ms) adequado?
3. scrollIntoView() suportado?

// Debug:
const elem = document.querySelector('[data-timeline-time="10:00"]');
console.log('Element:', elem);
```

---

## 📱 Teste em Diferentes Tamanhos

### Desktop (1920px)
- [ ] Todos 20 blocos visíveis
- [ ] Tooltip cabe sem sair da tela
- [ ] Scroll horizontal não precisa

### Laptop (1440px)
- [ ] Todos 20 blocos visíveis ou scroll horizontal
- [ ] Tooltip aparece com espaço

### Tablet (768px)
- [ ] Scroll horizontal funciona
- [ ] Tooltip em posição correta (bottom-full)
- [ ] Clique funciona (sem hover)

### Mobile (375px)
- [ ] Heatmap scrollável
- [ ] Clique funciona
- [ ] Tooltip legível

---

## ⏱️ Métricas

**Antes de Clicar:**
- Renderização: ~15ms
- Nenhuma ação no timeline

**Ao Passar Mouse:**
- Tooltip aparece: ~0ms (useState síncrono)
- Hover scale: ~200ms (CSS transition)

**Ao Clicar:**
- Função chamada: ~0ms
- Filtro aplicado: ~0ms
- State update: ~1ms
- Scroll inicia: ~100ms (setTimeout)

**Esperado:** < 150ms total do clique ao resultado visual ✅

---

## 🎨 Visual Esperado

```
┌─────────────────────────────────────────────────┐
│ Heatmap de Ocupação                             │
│ Taxa de ocupação por horário • Todos os agenda  │
│                                                 │
│ Legenda: ■ < 30%  ■ 30-70%  ■ > 70%           │
│                                                 │
│ [08%][15%][32%][52%][75%][88%][90%][78%]... │
│  ██   ██   ██   ██   ██   ██   ██   ██         │
│                                                 │
│    ↑ Ao passar mouse aqui:                     │
│    ┌─────────────────────┐                    │
│    │       10:30         │                    │
│    │ ─────────────────   │                    │
│    │ Ocupação: 75%       │                    │
│    │ Agendamentos: 6 / 8 │                    │
│    │ Livres: 2           │                    │
│    │                     │                    │
│    │ Agendamentos:       │                    │
│    │  • Dr. Silva: 2     │                    │
│    │  • Dra. Maria: 1    │                    │
│    │                     │                    │
│    │ 💡 Clique...        │                    │
│    └─────────────────────┘ ← Ao clicar,      │
│                              agenda             │
│                              filtra 10:30     │
│ Melhor: 08:00 (8%)                             │
│ Pior: 10:00 (90%)                              │
│ Média: 52% de ocupação                         │
└─────────────────────────────────────────────────┘
```

---

## ✅ Passou no Teste?

```
Se todos os pontos passaram:

✅ Tooltip aparece correto
✅ Clique funciona e filtra
✅ Scroll automático funciona
✅ Funciona em todos os modos
✅ Sem erros no console

RESULTADO: 🎉 PRONTO PARA PRODUÇÃO!
```

---

## 📞 Suporte Rápido

| Problema | Solução |
|----------|---------|
| Tooltip virado | Check position absolute, z-50 |
| Clique não funciona | Check onTimeSlotClick prop |
| Filtro não persiste | Check updateFilter chamado |
| Scroll lento | Check setTimeout delay |
| Visual feia | Check Tailwind build |

---

**Data:** 14/01/2026  
**Versão:** 2.0 com Ajustes Finos  
**Tempo Esperado:** 3-5 minutos

Bom teste! 🚀

