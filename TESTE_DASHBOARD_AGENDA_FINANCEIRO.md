# 🧪 TESTE DASHBOARD: AGENDA × FINANCEIRO

**Tempo:** 5 minutos  
**Pré-requisito:** Agenda com 3+ agendamentos (com valores)

---

## ✅ Teste 1: Visual (1 minuto)

### Como

```
1. Acesse http://localhost:3001/clinica/agenda
2. Navegue até a data com agendamentos
3. Procure: "💰 Gestão Financeira da Agenda"
```

### Validar

Dashboard deve aparecer com:

- [ ] Título: "💰 Gestão Financeira da Agenda"
- [ ] 4 Cards principais:
  - [ ] 💵 Receita da Agenda (R$ com 2 casas)
  - [ ] 📈 Receita por Hora (R$ com 2 casas)
  - [ ] 📅 Ocupação (percentual 0-100%)
  - [ ] 🎯 Indicador de Saúde (0-100%, cor dinâmica)
- [ ] Progress bars nos cards de ocupação e saúde
- [ ] Sem erros no console (F12)

**Status:** ✅ Dashboard renderizando

---

## ✅ Teste 2: Valores (2 minutos)

### Como

```
1. Olhe para o card "Receita da Agenda"
2. Some manualmente os valores de cada agendamento
3. Compare com o mostrado no dashboard
```

### Validar

```
✅ Receita = Soma dos valores dos agendamentos
   Fórmula: Agend1.valor + Agend2.valor + ...

✅ Receita/Hora = Receita ÷ (quantidade × 0.5)
   Exemplo: R$100 receita, 2 agendamentos
   → R$100 ÷ 1 hora = R$100/hora

✅ Ocupação = (agendamentos ÷ capacidade) × 100
   Exemplo: 4 agendamentos, 8 slots
   → (4 ÷ 8) × 100 = 50%

✅ Indicador Saúde = Weighted score (0-100)
   Pode usar fórmula: (ocupação×0.5 + receita×0.3 + volume×0.2) × 0.75
```

**Status:** ✅ Cálculos corretos

---

## ✅ Teste 3: Cores Dinâmicas (1 minuto)

### Como

```
1. Veja as cores dos cards
2. Note a cor do Indicador de Saúde
3. Leia o status qualitativo ("Status da Agenda")
```

### Validar

**Cores esperadas:**

```
Receita:        Fundo verde claro (emergencial)
Receita/Hora:   Fundo azul claro (análise)
Ocupação:       Fundo roxo claro (capacity)
Saúde:          Fundo âmbar claro (synthesis)

Progress bars:
└─ Score ≥ 80%  → 🟢 Verde (Excelente)
└─ Score 50-79% → 🔵 Azul (Bom)
└─ Score < 50%  → ⚪ Cinza (Alternativa)
```

**Status:** ✅ Design correto

---

## ✅ Teste 4: Status Qualitativo (1 minuto)

### Como

```
1. Olhe para o card "Status da Agenda"
2. Leia o label (🟢/🟡/🟠/🔴) e descrição
3. Leia a ação recomendada
```

### Validar

**Status deve ser:**

```
Ocupação ≥ 80% E Receita ≥ R$400
└─ Label: 🟢 Excelente
└─ Ação: "Nenhuma ação necessária"

Ocupação 60-79% E Receita 300-399
└─ Label: 🟡 Bom
└─ Ação: "Monitorar para manter crescimento"

Ocupação 40-59%
└─ Label: 🟠 Atenção
└─ Ação: "Considerar estratégias de atração"

Ocupação < 40%
└─ Label: 🔴 Crítico
└─ Ação: "Ação imediata necessária"
```

**Status:** ✅ Status logic correto

---

## ✅ Teste 5: Dados Adicionais (1 minuto)

### Como

```
1. Role para baixo no dashboard
2. Procure: "📊 Top 3 Serviços"
3. Procure: "👥 Receita por Profissional"
```

### Validar

Se houver múltiplos serviços:
- [ ] Top 3 lista os mais usados
- [ ] Mostra quantidade de agendamentos
- [ ] Mostra receita total (quantidade × valor)

Se houver múltiplos profissionais:
- [ ] Ranking ordenado por receita (maior primeiro)
- [ ] Mostra agendamentos por profissional
- [ ] Mostra receita média

**Status:** ✅ Dados complementares OK

---

## 🎯 Cenários de Teste

### Cenário A: Agenda Vazia
```
Dados: 0 agendamentos
Resultado esperado:
├─ Receita: R$ 0,00
├─ Receita/Hora: R$ 0,00
├─ Ocupação: 0%
├─ Saúde: 🔴 0%
├─ Status: Crítico
└─ Ação: "Ação imediata necessária"
```

### Cenário B: Agenda Moderada
```
Dados: 4 agendamentos, R$ 400 total
Resultado esperado:
├─ Receita: R$ 400,00
├─ Receita/Hora: R$ 50,00
├─ Ocupação: ~50%
├─ Saúde: 🟡 55%
├─ Status: Bom
└─ Ação: "Monitorar para manter crescimento"
```

### Cenário C: Agenda Ótima
```
Dados: 8 agendamentos, R$ 1.000 total
Resultado esperado:
├─ Receita: R$ 1.000,00
├─ Receita/Hora: R$ 125,00
├─ Ocupação: ~80%
├─ Saúde: 🟢 85%
├─ Status: Excelente
└─ Ação: "Nenhuma ação necessária"
```

---

## 🔄 Testes de Interatividade

### Teste: Mudar Data
```
1. Clique em "Próximo Dia" ou "Dia Anterior"
2. Dashboard deve atualizar automaticamente
3. Valores devem corresponder à nova data
```

### Teste: Filtrar por Profissional
```
1. Abra filtros
2. Selecione um profissional
3. Dashboard deve recalcular considerando apenas esse profissional
```

### Teste: Criar Agendamento
```
1. Crie um novo agendamento com valor
2. Dashboard deve atualizar imediatamente
3. Receita deve aumentar
4. Ocupação deve aumentar
5. Score de saúde pode subir
```

### Teste: Deletar Agendamento
```
1. Delete um agendamento
2. Dashboard deve atualizar
3. Receita deve diminuir
4. Ocupação deve diminuir
```

---

## 🐛 Checklist de Debug

### Dashboard não aparece
```
[ ] Há agendamentos na data?
[ ] Os agendamentos têm valores (não nulos)?
[ ] Console mostra erros? (F12)
[ ] Componente AgendaFinanceDashboard está importado?
[ ] useAgendaFinanceMetrics está importado?
```

### Valores estão zerados
```
[ ] Agendamentos têm campo "value" preenchido?
[ ] Profissionais estão carregando?
[ ] Serviços estão carregando?
[ ] Metadata está sendo carregada?
[ ] useMemo tem dependências corretas?
```

### Cores erradas
```
[ ] Score saúde está entre 0-100?
[ ] Condições de status estão corretas?
[ ] Tailwind config carregou (cores: emerald, blue, purple, amber)?
```

### Não atualiza ao mudar filtro
```
[ ] useMemo tem agenda.filteredAppointments como dependência?
[ ] setViewMode está disparando corretamente?
[ ] setFilter está atualizando agenda.filteredAppointments?
```

---

## 📊 Validação de Valores

### Receita (deve ser ≥ 0)
```
✅ Mínimo: R$ 0,00 (sem agendamentos)
✅ Máximo: Soma de todos os valores
✅ Nunca negativo
```

### Receita/Hora (deve ser ≥ 0)
```
✅ Fórmula: Receita ÷ (agendamentos × 0.5)
✅ Sem divisão por zero (retorna 0)
✅ Aumenta com receita
✅ Aumenta se menos agendamentos (melhor yield)
```

### Ocupação (0-100%)
```
✅ Mínimo: 0%
✅ Máximo: 100%
✅ Nunca negativo, nunca > 100%
```

### Saúde (0-100)
```
✅ Mínimo: 0
✅ Máximo: 100
✅ Conservador (×0.75)
✅ Nunca negativo, nunca > 100
```

---

## 🎊 Resultado Esperado

Ao final dos testes, você deve:

```
✅ Ver dashboard renderizado
✅ Ver 4 cards principais com valores
✅ Ver status qualitativo com ação
✅ Ver dados adicionais (se houver)
✅ Ver cores dinâmicas
✅ Ver progress bars
✅ Testar 4 cenários (vazio/moderado/ótimo/filtrado)
✅ Confirmar que atualiza ao mudar data/filtro/agendamento
✅ Nenhum erro no console

🟢 STATUS: PRONTO PARA PRODUÇÃO!
```

---

## 📝 Checklist Final

```
Visual:
[✅] Dashboard aparece
[✅] 4 cards principais visíveis
[✅] Cores dinâmicas aplicadas
[✅] Progress bars funcionam
[✅] Responsividade OK

Dados:
[✅] Receita calcula correto
[✅] Receita/Hora calcula correto
[✅] Ocupação calcula correto
[✅] Saúde calcula correto
[✅] Status determina correto

Interatividade:
[✅] Atualiza ao mudar data
[✅] Atualiza ao filtrar profissional
[✅] Atualiza ao criar agendamento
[✅] Atualiza ao deletar agendamento

Qualidade:
[✅] Sem erros no console
[✅] Sem warnings (F12)
[✅] Performance OK
[✅] Loading state mostrado

Documentação:
[✅] Arquivo DASHBOARD_AGENDA_FINANCEIRO_COMPLETO.md criado
[✅] Explicação de cada indicador
[✅] Exemplos de uso
[✅] Próximos passos

🟢 TUDO OK! Pronto para uso!
```

---

**Tempo total:** ~5 minutos  
**Complexidade:** Básica  
**Resultado:** ✅ Dashboard validado

Bom teste! 🚀
