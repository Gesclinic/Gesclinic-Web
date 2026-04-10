# 👉 COMECE AQUI: MODO PROFISSIONAL - GUIA RÁPIDO

## 🚀 Em 3 Passos

### Passo 1: Abra a Agenda
```
URL: http://localhost:3001/clinica/agenda
```

### Passo 2: Clique na Aba "Por Profissional"
```
Você verá:
📊 Geral | 👨‍⚕️ Por Profissional | 🏥 Por Sala
```

### Passo 3: Veja as Colunas Aparecerem
```
Cada profissional em uma coluna com métricas
```

---

## 📊 O Que Você Vai Ver

### Layout Esperado
```
┌─────────────────┬──────────────────┬──────────────────┐
│   ⏰ HORÁRIO    │  👨‍⚕️ Dr. João     │  👨‍⚕️ Dra. Maria   │
│                 │  Cardiologia     │  Dermatologia    │
│                 │                  │                  │
│                 │ Ocupação: 75%    │ Ocupação: 50%    │
│                 │ 3 agendamentos   │ 2 agendamentos   │
│                 │ ⚠️ 1 vaga livre   │ ✓ 4 vagas livres │
├─────────────────┼──────────────────┼──────────────────┤
│ 08:00           │ [Disponível]     │ [Maria Silva]    │
├─────────────────┼──────────────────┼──────────────────┤
│ 08:30           │ [João Santos]    │ [Disponível]     │
├─────────────────┼──────────────────┼──────────────────┤
│ 09:00           │ [Disponível]     │ [Carlos Costa]   │
└─────────────────┴──────────────────┴──────────────────┘
```

---

## 🎯 O Que Cada Elemento Faz

### Header da Coluna
```
👨‍⚕️ Dr. João Silva
Cardiologia
├─ Nome e ícone
├─ Especialidade
├─ Taxa de ocupação (%)
├─ Total de agendamentos
└─ Vagas disponíveis
```

### Cores das Métricas
```
Verde (0-49%)      = Disponível ✓
Amarelo (50-74%)   = Parcialmente cheio ⚠️
Vermelho (75%+)    = Lotado 🔴
```

### Slots (Células)
```
[Disponível]     = Horário livre para agendar
[Nome Paciente]  = Agendamento confirmado
[⚡ Encaixe]     = Agendamento encaixado
[🔒 Bloqueado]   = Horário bloqueado
```

---

## 🖱️ Como Usar

### Agendar Novo Paciente
```
1. Clique em [Disponível]
2. Modal abre
3. Selecione paciente, serviço, status
4. Clique em "Salvar"
5. Agendamento aparece na coluna
```

### Editar Agendamento
```
1. Clique em [Nome Paciente]
2. Modal abre com dados
3. Edite conforme necessário
4. Clique em "Salvar"
5. Agenda atualiza
```

### Encaixar Paciente
```
1. Clique em [Disponível]
2. Clique em "⚡ Encaixar"
3. Selecione paciente
4. Status muda para "Encaixe"
```

### Bloquear Horário
```
1. Clique em [Disponível]
2. Clique em "🔒 Bloquear"
3. Horário fica bloqueado
4. Ninguém pode agendar lá
```

---

## 📱 Navegação

### Scroll Horizontal
```
Se muitos profissionais:
→ Deslize horizontalmente
→ Coluna de horários permanece visível
```

### Scroll Vertical
```
Se muitos horários:
↓ Deslize verticalmente
↓ Headers dos profissionais permanecem visíveis
```

### Fixar Header
```
✓ Nome do profissional sempre visível (top)
✓ Horários sempre visíveis (left)
✓ Sem perder referência
```

---

## 🔍 Se Não Funcionar

### Problema: Nenhuma coluna aparece
```
❌ Causa: Profissionais não carregados
✅ Solução:
   1. Abra DevTools (F12)
   2. Vá na aba "Console"
   3. Procure "profissionais" ou "professionals"
   4. Verifique se retornou dados
   5. Se não, check banco de dados
```

### Problema: Colunas aparecem mas sem nome
```
❌ Causa: Profissional sem campo "name"
✅ Solução:
   1. Edite profissional no cadastro
   2. Preencha o campo "Nome"
   3. Recarregue a página
```

### Problema: Slots vazios
```
❌ Causa: Agendamentos sem professional_id
✅ Solução:
   1. Edite agendamento no modal
   2. Selecione um profissional
   3. Clique em Salvar
   4. Slot deve aparecer
```

### Problema: Header fica para trás ao scroll
```
❌ Causa: CSS sticky não funcionando
✅ Solução:
   1. Limpe cache (Ctrl+Shift+Del)
   2. Recarregue página (F5)
   3. Se persistir, check console para erros
```

---

## ⚙️ Personalizações

### Mudar Largura das Colunas
```javascript
// Em AgendaTimeline.jsx, linha ~271
minmax(220px, 1fr)
     ↓ Aumentar para 280px
minmax(280px, 1fr)
```

### Mudar Cores do Header
```javascript
// Em TimelineColumnas, linha ~263
className="... from-blue-50 via-white to-blue-50"
                    ↓ Mudar para outro gradiente
className="... from-green-50 via-white to-green-50"
```

### Mudar Horários
```javascript
// Em AgendaTimeline.jsx, linha ~33
for (let hour = 8; hour < 18; hour++)
            ↓ Mudar para 7 até 19
for (let hour = 7; hour < 19; hour++)
```

---

## 💡 Dicas Úteis

### Filtros
```
Você pode filtrar por:
- Profissional (esconde colunas não selecionadas)
- Sala
- Status (confirmado, pendente, etc)
- Serviço
```

### Indicadores
```
Veja os números no topo:
- 📊 Total de agendamentos
- ✓ Confirmados
- ⚠️ A confirmar
- ⚡ Encaixes
```

### Navegação de Datas
```
- ← Dia anterior
- 🏠 Hoje
- → Dia seguinte
- Semana / Mês (se disponível)
```

---

## 🎓 Estrutura Técnica (Para Devs)

### Arquivo Principal
```
src/pages/clinica/agenda/components/AgendaTimeline.jsx
├─ TimelineGeral (tabela)
├─ TimelineColumnas (colunas) ← Você está aqui
└─ TimelineSala (alias para TimelineColumnas)
```

### Componentes Relacionados
```
ProfessionalColumnHeader.jsx  → Headers com métricas
AgendaSlot.jsx                → Células de horário
AgendaPage.jsx                → Carrega dados
useAgendaStore.js             → Estado centralizado
```

### Props do TimelineColumnas
```javascript
{
  timeSlots: ["08:00", "08:30", ...],
  groups: {
    [professionalId]: {
      name: "Dr. João",
      appointments: [...]
    }
  },
  metadata: {
    professionals: [...],
    rooms: [...]
  },
  viewMode: "profissional",
  columnType: "professional"
}
```

---

## 🚀 Próximas Evoluções

### 1. Drag & Drop
```
Arrastar agendamento para outro horário
```

### 2. Filtro de Especialidade
```
Mostrar apenas cardiologistas, dermatologistas, etc
```

### 3. Comparação
```
Colocar 2-3 profissionais lado-a-lado
```

### 4. Relatórios
```
Exportar ocupação por profissional
```

### 5. Histórico
```
Ver ocupação histórica
```

---

## 📞 Suporte Rápido

### Console para Debug
```javascript
// Abra DevTools (F12) e cole no Console:

// Ver profissionais carregados
console.log('Profissionais:', document.querySelector('[data-professionals]')?.dataset)

// Ver agendamentos
console.log('Agendamentos:', document.querySelector('[data-appointments]')?.dataset)

// Ver metadata
console.log('Metadata:', window.__metadata)
```

### Check de Compilação
```
Se a página não carrega:
1. Abra DevTools (F12)
2. Vá em "Console"
3. Procure por "error" ou "Error"
4. Copie a mensagem de erro
5. Verifique arquivo apontado
```

---

## ✨ Dicas de UX

### Para Gestor
```
✓ Ver ocupação de todos profissionais em uma tela
✓ Identificar vagas rapidamente
✓ Fazer encaixe com um clique
✓ Controlar blog de horários
```

### Para Recepcionista
```
✓ Agendar pacientes em horários livres
✓ Ver disponibilidade de todos profissionais
✓ Editar agendamentos existentes
✓ Confirmar agendamentos pendentes
```

### Para Profissional
```
✓ Ver sua agenda do dia
✓ Ver sua ocupação (%)
✓ Confirmar agendamentos
✓ Ver especialidade dos pacientes
```

---

## 🎯 Checklist de Funcionamento

- [ ] Página carrega (sem 404)
- [ ] Tab "Por Profissional" aparece
- [ ] Clico na tab e colunas aparecem
- [ ] Headers têm nomes dos profissionais
- [ ] Slots aparecem com agendamentos
- [ ] Clico em [Disponível] e modal abre
- [ ] Posso criar novo agendamento
- [ ] Scroll horizontal funciona
- [ ] Scroll vertical funciona
- [ ] Headers permanecem fixos
- [ ] Coluna de horários permanece fixa
- [ ] Clico em [Agendamento] e posso editar
- [ ] Modal fecha após salvar
- [ ] Agenda atualiza após salvar

---

## 📊 Vídeo Mental

```
Você clica em "Por Profissional"
         ↓
Página muda de layout
         ↓
Aparecem múltiplas colunas (uma por profissional)
         ↓
Cada coluna tem:
  - Nome do profissional
  - Especialidade
  - Taxa de ocupação (%)
  - Agendamentos do dia
         ↓
Você vê todos os horários na coluna da esquerda
         ↓
Você vê todos os profissionais no topo
         ↓
Cruza profissional × horário para ver o slot
         ↓
Clica no slot para agendar/editar
         ↓
Modal abre
         ↓
Você salva
         ↓
Agenda atualiza em tempo real
```

---

## 🎉 Pronto!

Agora você entende como funciona o modo "Por Profissional"!

**Dúvidas?** Consulte:
- `AGENDA_PROFISSIONAL_DIAGNOSTICO_COMPLETO.md` (técnico)
- `AGENDA_PROFISSIONAL_TESTE.md` (testes)
- `AGENDA_PROFISSIONAL_SUMARIO.md` (visual)

---

**Última Atualização:** 14 de Janeiro de 2026  
**Versão:** 1.0  
**Status:** ✅ OPERACIONAL

Divirta-se agendando! 📅

