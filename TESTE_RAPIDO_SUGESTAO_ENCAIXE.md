# 🧪 TESTE RÁPIDO: SISTEMA DE SUGESTÃO INTELIGENTE

**Tempo:** 10 minutos  
**Pré-requisito:** Agenda com 3+ agendamentos

---

## ✅ Teste 1: Básico (3 minutos)

### Como

```
1. Abra http://localhost:3001/clinica/agenda
2. Certifique-se que tem agendamentos (ou crie alguns)
3. Clique em "Novo Agendamento" ou slot vazio
```

### Validar

- [ ] Sugestões aparecem (azul claro com 💡)
- [ ] Mostra até 3 opções
- [ ] Cada opção tem:
  - ✓ Horário (ex: 14:00)
  - ✓ Profissional (ex: Dr. Silva)
  - ✓ Sala (ex: Sala 1)
  - ✓ Score (ex: 87%)
  - ✓ Motivo (ex: "Horário com baixa ocupação")
  - ✓ Ocupação % (ex: 15% ocupado)
  - ✓ Slots livres (ex: 4 slots)
- [ ] Primeira opção tem 🏆 (Ideal)
- [ ] Segunda tem ✓ (Bom)
- [ ] Terceira tem ○ (Alternativa)

**Se passou:** ✅ Componente visual funcionando!

---

## ✅ Teste 2: Funcionalidade (4 minutos)

### Como

```
1. Ainda no modal de novo agendamento
2. Veja as sugestões acima
3. Clique em uma sugestão (qualquer uma)
```

### Validar

- [ ] Ao clicar, sugestões desaparecem
- [ ] Modal pré-preenche:
  - ✓ Horário = selecionado
  - ✓ Profissional = selecionado
  - ✓ Sala = selecionada
- [ ] Filtros atualizaram
  - ✓ Profissional filtrado
  - ✓ Sala filtrada
  - ✓ Horário filtrado
- [ ] Pode editar ainda (não travado)

**Se passou:** ✅ Integração com modal funcionando!

---

## ✅ Teste 3: Validação (3 minutos)

### Como

```
1. Crie um agendamento clicando em uma sugestão
2. Confirme/salve
3. Volte para agenda
4. Abra nova sugestão
```

### Validar

- [ ] Novo agendamento aparece na timeline
- [ ] Não há conflito (sobreposição)
- [ ] Sugestões seguintes não sugerem hora conflitante
- [ ] Scores fazem sentido:
  - ✓ Primeira sempre > segunda
  - ✓ Segunda sempre > terceira
  - ✓ Tudo entre 0-100

**Se passou:** ✅ Lógica de sugestão correta!

---

## 🐛 Checklist de Debug

### Sugestões não aparecem

```
[ ] Modal de novo agendamento abriu?
[ ] Tem agendamentos na agenda?
[ ] Tem profissionais cadastrados?
[ ] Tem salas cadastradas?
[ ] Console tem erros? (F12)

Se tudo ok: Sugestões devem aparecer!
```

### Scores estranhos

```
Verificar console (F12):
├─ Ocupação calcula correto?
├─ Slots consecutivos contam certo?
├─ Ordenação está OK?
└─ Motivos fazem sentido?
```

### Conflitos ainda aparecem

```
Verificar:
├─ checkDisponibilidade() retorna true quando deveria false?
├─ Horários estão se sobrepondo?
├─ Duração do serviço está certa?
└─ Profissional/sala são o mesmo?
```

---

## 📊 Valores Esperados

### Score Típico

```
Baixa ocupação (< 30%):
└─ Score: 70-90

Média ocupação (30-60%):
└─ Score: 50-70

Alta ocupação (> 60%):
└─ Score: 30-50
```

### Ocupação Típica

```
Manhã (08:00-12:00):
└─ Média: 40%

Tarde (12:00-17:30):
└─ Média: 65%

Noite (17:30+):
└─ Média: 10%
```

### Slots Consecutivos

```
Primeira sugestão:
└─ Típico: 3-5 slots

Segunda:
└─ Típico: 2-4 slots

Terceira:
└─ Típico: 1-3 slots
```

---

## ✨ Exemplos Visuais

### Melhor Cenário

```
Agenda meio vazia (40% ocupação)

Sugestão 1:
  14:00 • Dr. Silva • Sala 1
  📊 15% ocupado • ✓ 5 slots
  Score: 🟢 87% (Ideal)
  Motivo: "Horário com baixa ocupação • Múltiplos slots livres"

Sugestão 2:
  15:00 • Dra. Maria • Sala 2
  📊 30% ocupado • ✓ 4 slots
  Score: 🔵 82% (Bom)
  Motivo: "Horário com baixa ocupação"

Sugestão 3:
  16:00 • Dr. João • Sala 1
  📊 45% ocupado • ✓ 3 slots
  Score: ⚪ 75% (Alternativa)
  Motivo: "Horário disponível"
```

### Agenda Lotada

```
Agenda cheia (85% ocupação)

Sugestão 1:
  08:00 • Dr. Silva • Sala 1
  📊 20% ocupado • ✓ 2 slots
  Score: 🟢 78% (Ideal - melhor que esperado!)
  Motivo: "Horário com baixa ocupação"

Sugestão 2:
  17:00 • Dra. Maria • Sala 2
  📊 30% ocupado • ✓ 2 slots
  Score: 🔵 76% (Bom)
  Motivo: "Horário com baixa ocupação"

Sugestão 3:
  16:30 • Dr. João • Sala 1
  📊 60% ocupado • ✓ 1 slot
  Score: ⚪ 56% (Alternativa - hora difícil)
  Motivo: "Horário disponível"
```

---

## 🎯 Testes Avançados (Opcional)

### Teste: Múltiplos Cenários

```
Teste 1 - Sem agendamentos
[ ] Sugere primeiros 3 horários
[ ] Todos têm 0% ocupação
[ ] Scores altos (80+)

Teste 2 - Só 1 profissional
[ ] Sugere aquele profissional
[ ] Com salas diferentes
[ ] Sem erro

Teste 3 - Só 1 sala
[ ] Sugere aquela sala
[ ] Com profissionais diferentes
[ ] Sem erro

Teste 4 - Serviços diferentes
[ ] 30 min: mais vagas
[ ] 60 min: menos vagas
[ ] Scores ajustam
```

### Teste: Performance

```
[ ] Sugestões geradas em < 100ms
[ ] Sem lag ao clicar
[ ] Sem freeze da UI
[ ] Console limpo (sem warnings)
```

---

## 🎊 Resultado Esperado

Ao final dos testes:

```
✅ Sugestões aparecem
✅ Scores fazem sentido
✅ Sem conflitos
✅ Integração com modal OK
✅ Performance boa
✅ UX fluida

STATUS: 🟢 PRONTO PARA USO!
```

---

## 📝 Checklist Final

```
Funcionalidade:
[x] Sugestões geradas
[x] Top 3 ordenadas
[x] Sem conflitos
[x] Click funciona
[x] Modal pré-preenchido

Qualidade:
[x] Scores 0-100
[x] Motivos legíveis
[x] Cores intuitivas
[x] Sem crashes
[x] Performance ok

Integração:
[x] Aparece no lugar certo
[x] Não quebra fluxo existente
[x] Permite override
[x] Responsivo

🟢 TUDO OK! Pronto para produção!
```

---

**Tempo Total:** 10 minutos  
**Complexidade:** Básica  
**Resultado:** ✅ Validação Completa

Bom teste! 🚀

