# 🧪 Guia de Testes: Modo Profissional (Layout Switch)

## Setup

```bash
npm run dev
# Acesse: http://localhost:3001
# Login com credenciais admin ou profissional
```

---

## Teste 1: Toggle de Modo Aparece ✅

### Passos
1. Ir para `/clinica/agenda`
2. Procurar pela seção "Modo da Agenda:"
3. Verificar se existem 3 botões: `📞 Recepção | 👨‍⚕️ Profissional | 📊 Gestor`

### Resultado Esperado
- ✅ 3 botões visíveis (ou 2 se usuário for receptivo)
- ✅ Modo atual destacado em branco
- ✅ Descrição do modo abaixo

### Se Falhar
- ❌ Verificar se `canAccessProfessionalMode = true`
- ❌ Verificar console para erros de render

---

## Teste 2: Modo Profissional - Layout Minimalista ✅

### Passos
1. Clicar em `👨‍⚕️ Profissional`
2. Observar tela inteira

### Resultado Esperado
- ✅ Desaparece: Banner "Agenda Única"
- ✅ Desaparece: Cards de Indicadores
- ✅ Desaparece: Tabs (Geral, Por Prof, Por Sala)
- ✅ Desaparece: Filtros Avançados
- ✅ Desaparece: Heatmap
- ✅ Desaparece: Dashboard Financeiro
- ✅ Desaparece: AgendaTimeline (linha do tempo)
- ✅ **Permanece:** Header (navegação de datas)
- ✅ **Permanece:** Título "👨‍⚕️ Meus Atendimentos"
- ✅ **Permanece:** Botão "↩️ Voltar"
- ✅ **Permanece:** AgendaProfessionalView (próximo + lista)

### Se Falhar
```
Sintomas                           Diagnóstico
─────────────────────────────────────────────────
Banner ainda visível          → Condicional perdeu-se
Tabs ainda visíveis           → Still in old pattern
Filtros ainda visíveis        → Component leak
Timeline visível              → Wrong layout branch
```

**Ação:** Verificar que o ternário principal está em lugar certo (linha ~450)

---

## Teste 3: Modo Profissional - Dados Corretos ✅

### Passos
1. Estar em Modo Profissional
2. Verificar que mostra apenas atendimentos do profissional logado
3. Clicar em expandir um atendimento

### Resultado Esperado
- ✅ Apenas seus atendimentos (ex: 5 agendamentos do Dr. Silva)
- ✅ Não mostra atendimentos de outros profissionais
- ✅ Mostra "Próximo Atendimento" em destaque (azul)
- ✅ Botões "Confirmar" e "Cancelar" funcionam

### Se Falhar
```
Sintomas                           Diagnóstico
─────────────────────────────────────────────────
Mostra todos atendimentos     → professionalAppointments not filtering
Nenhum atendimento mostra     → currentProfessionalId is null
Próximo não destaca           → AgendaProfessionalView styling issue
```

**Ação:** Verificar `professionalAppointments` useMemo (linha ~122)

---

## Teste 4: Voltar de Profissional → Recepção ✅

### Passos
1. Estar em Modo Profissional
2. Clicar botão "↩️ Voltar" (canto superior direito)

### Resultado Esperado
- ✅ Volta para Recepção (modo padrão)
- ✅ **Reaparece:** Banner
- ✅ **Reaparece:** Indicadores
- ✅ **Reaparece:** Tabs
- ✅ **Reaparece:** Filtros
- ✅ **Reaparece:** Timeline
- ✅ Modo toggleado para Recepção (botão destacado)

### Se Falhar
```
Sintomas                           Diagnóstico
─────────────────────────────────────────────────
Fica em view prof              → onClick handler perdido
Timeline não aparece          → Else branch quebrada
Modo não muda no toggle       → setAgendaMode não funcionou
```

**Ação:** Verificar onClick button (linha ~456)

---

## Teste 5: Togglear Profissional ↔ Recepção ✅

### Passos
1. Clicar várias vezes entre os botões
2. Alternar rapidamente: Prof → Rec → Prof → Gest → Prof

### Resultado Esperado
- ✅ Layout muda instantaneamente
- ✅ Sem flashes ou delays
- ✅ Dados filtram corretamente para cada modo
- ✅ Sem erros no console

### Se Falhar
```
Sintomas                           Diagnóstico
─────────────────────────────────────────────────
Componentes "pisca"               → Remount desnecessário
Erro no console                   → State desync
Dados antigos mostram            → Não filtrando properly
```

**Ação:** Verificar console F12, procurar por error warnings

---

## Teste 6: Modo Recepção - Tudo Intacto ✅

### Passos
1. Voltar para `📞 Recepção`
2. Comparar com situação anterior aos testes

### Resultado Esperado
- ✅ Tudo funciona como antes
- ✅ Banner visível
- ✅ Indicadores visível
- ✅ Tabs funcionando
- ✅ Filtros funcionando
- ✅ Timeline visível e interativa
- ✅ Modal abre ao clicar em slot

### Se Falhar
- ❌ Se quebrou algo, revert para versão anterior
- ❌ Verificar se else clause está intacta

---

## Teste 7: Modo Gestor (Admin) ✅

### Passos
1. Se admin, clicar em `📊 Gestor`
2. Observar layout

### Resultado Esperado
- ✅ **Permanece:** Banner
- ✅ **Permanece:** Indicadores
- ✅ **Permanece:** Tabs
- ✅ **Permanece:** Filtros
- ✅ **Aparece:** Dashboard Financeiro (💰 seção)
- ✅ **Aparece:** Sugestões de Encaixe (💡 seção)
- ✅ **Aparece:** Heatmap (🔥 seção)
- ✅ **Permanece:** Timeline

### Se Falhar
- ❌ Verificar se `agendaMode === 'gestor'` condicional está em lugar certo
- ❌ Dashboard pode estar quebrado por falta de `metrics`

---

## Teste 8: Console Check 🔍

### Abrir DevTools: F12 → Console

### Procurar por:

❌ **Erros Vermelhos**
```
Uncaught TypeError: Cannot read property 'map' of undefined
Uncaught SyntaxError: Unexpected token
Cannot find module 'AgendaProfessionalView'
```

❌ **Warnings Amarelos**
```
Each child in a list should have a unique "key" prop
Missing dependency in useEffect
```

✅ **Ok se ver:**
```
CurrentRole: profissional
IsProfissional: true
AgendaMode: profissional
[Normal requests logs]
```

---

## Performance Checklist 🚀

### Navegação entre modos
- Esperado: < 100ms
- Cada clique muda layout instantaneamente
- Se > 500ms: Há re-renders desnecessários

### Renderização
- Profissional: Menos componentes = mais rápido
- Recepção/Gestor: Mesmo que antes
- Gestor: Pode ser mais pesado (Heatmap, Dashboard)

---

## Casos Extremos

### Usuário sem acesso a Profissional
```
// Se role === 'recepcao' ou 'auxiliar'
canAccessProfessionalMode = false
// Resultado: Botão Prof não aparece
// ✅ Esperado
```

### Usuário sem acesso a Gestor
```
// Se role === 'profissional'
canAccessGestorMode = false
// Resultado: Botão Gest não aparece
// ✅ Esperado
```

### Admin (acesso a tudo)
```
// Se role === 'admin'
canAccessProfessionalMode = true
canAccessGestorMode = true
// Resultado: Todos 3 botões visíveis
// ✅ Esperado
```

---

## Relatório de Testes

Preencha após rodar todos os testes:

```markdown
# Testes Modo Profissional - Resultado

## Ambiente
- OS: Windows / Mac / Linux
- Browser: Chrome / Firefox / Safari
- Versão do projeto: ?

## Testes Passando ✅
- [ ] Teste 1: Toggle aparece
- [ ] Teste 2: Layout minimalista
- [ ] Teste 3: Dados corretos
- [ ] Teste 4: Voltar funciona
- [ ] Teste 5: Toggle rápido
- [ ] Teste 6: Recepção intacta
- [ ] Teste 7: Gestor funciona
- [ ] Teste 8: Console limpo

## Testes Falhando ❌
(se houver)

## Observações
(screenshots, comportamentos estranhos, etc)

## Assinado
Data: ?
Tester: ?
```

---

## Próximos Passos (Se Tudo Passar)

1. ✅ Commit da mudança
2. ✅ Push para repositório
3. ✅ Comunicar ao time: "Modo Profissional com layout switch correto ✅"
4. ⏳ Colher feedback dos profissionais
5. ⏳ Possíveis ajustes visuais/UX

---

## Suporte Rápido

Se algo der errado:

1. **Verificar linha 450** - Ternário principal
2. **Verificar linha 122** - Filter do profissional
3. **Console F12** - Procurar erros
4. **Recarregar** - Ctrl+Shift+R (hard refresh)
5. **npm run dev** - Reiniciar servidor

---

**Boa sorte nos testes!** 🚀
