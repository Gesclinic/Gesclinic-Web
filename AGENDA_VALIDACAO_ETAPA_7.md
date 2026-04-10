# ✅ AGENDA - CHECKLIST DE VALIDAÇÃO (ETAPA 7)

## 🎯 Objetivo
Validar que a Agenda foi refatorada corretamente com:
- Menu consolidado (apenas 1 item "Agenda" com 3 subitens)
- Visualizações internas por tabs (não mudam URL)
- Subrotas com páginas placeholder
- Redirects funcionando para rotas antigas

---

## 📋 CHECKLIST DE VALIDAÇÃO

### ✅ 1. Menu Lateral
- [ ] Sidebar mostra apenas **1 item** "Agenda" (não 8 items espalhados)
- [ ] Item "Agenda" tem **3 filhos**:
  - [ ] Confirmações
  - [ ] Lista de Espera
  - [ ] Indicadores
- [ ] Items antigos NÃO aparecem no menu:
  - [ ] ~~Agenda Geral~~ (transformado em TAB)
  - [ ] ~~Por Profissional~~ (transformado em TAB)
  - [ ] ~~Por Sala~~ (transformado em TAB)
  - [ ] ~~Comunicação~~ (será integrado depois)

**Como validar:**
```
1. Abrir app em http://localhost:3000
2. Fazer login como admin/gestor/medico/recepcao
3. Ir em Clínica
4. Verificar menu lateral esquerdo
5. Contar items de Agenda (deve ser 4 total: 1 pai + 3 filhos)
```

---

### ✅ 2. Agenda Principal com TABS Internos
- [ ] URL permanece **`/clinica/agenda`** ao mudar tabs
- [ ] Tabs internos visíveis:
  - [ ] "Geral" / "Unificada"
  - [ ] "Por Profissional"
  - [ ] "Por Sala"
- [ ] Switching entre tabs funciona
- [ ] Nenhum refresh de página
- [ ] Estado preservado ao trocar tabs

**Como validar:**
```
1. Clicar em "Agenda" no menu
2. Verificar URL (deve ser /clinica/agenda)
3. Ver tabs no topo do conteúdo
4. Clicar em "Por Profissional"
5. Verificar URL (mantém /clinica/agenda)
6. Clicar em "Por Sala"
7. Verificar URL (mantém /clinica/agenda)
```

---

### ✅ 3. Submenu Routes com Páginas Placeholder
- [ ] `/clinica/agenda/confirmacoes` **NÃO DA 404**
  - [ ] Página mostra "✅ Confirmações de Agendamento"
  - [ ] Layout correto
  - [ ] Cards de status vazios (--) é esperado (em desenvolvimento)
- [ ] `/clinica/agenda/espera` **NÃO DA 404**
  - [ ] Página mostra "⏱️ Lista de Espera"
  - [ ] Layout correto
- [ ] `/clinica/agenda/indicadores` **NÃO DA 404**
  - [ ] Página mostra "📊 Indicadores de Agenda"
  - [ ] Layout correto

**Como validar:**
```
1. Clicar em "Confirmações" (no submenu de Agenda)
2. Verificar se carrega sem 404
3. Clicar em "Lista de Espera"
4. Verificar se carrega sem 404
5. Clicar em "Indicadores"
6. Verificar se carrega sem 404
7. Testar navegação direta: /clinica/agenda/confirmacoes
```

---

### ✅ 4. Redirects para Rotas Antigas
- [ ] `/clinica/agenda/profissional` redireciona para `/clinica/agenda`
- [ ] `/clinica/agenda/sala` redireciona para `/clinica/agenda`
- [ ] `/clinica/agenda/geral` redireciona para `/clinica/agenda`
- [ ] Redirect é **silencioso** (sem flash ou erro)
- [ ] Usuários com bookmarks antigos não quebram

**Como validar:**
```
1. Ir manualmente para /clinica/agenda/profissional
2. Verificar se redireciona para /clinica/agenda
3. Ir manualmente para /clinica/agenda/sala
4. Verificar se redireciona para /clinica/agenda
5. Ir manualmente para /clinica/agenda/geral
6. Verificar se redireciona para /clinica/agenda
```

---

### ✅ 5. Roles e Permissions
- [ ] Apenas roles permitidos veem Agenda:
  - [ ] admin ✅
  - [ ] gestor ✅
  - [ ] medico ✅
  - [ ] recepcao ✅
- [ ] Indicadores visível apenas para admin/gestor:
  - [ ] admin ✅
  - [ ] gestor ✅
  - [ ] medico ❌ (não deve ver)
  - [ ] recepcao ❌ (não deve ver)
- [ ] Sala visível apenas para admin/gestor/recepcao:
  - [ ] admin ✅
  - [ ] gestor ✅
  - [ ] medico ❌ (não deve ver)
  - [ ] recepcao ✅

**Como validar:**
```
1. Logar como cada role diferente
2. Verificar se Agenda aparece no menu
3. Clicar em Indicadores com medico/recepcao (não deve aparecer)
4. Clicar em Por Sala com medico (não deve aparecer)
```

---

### ✅ 6. Funcionalidades da Agenda (Smoke Test)
- [ ] Criar novo agendamento funciona
- [ ] Editar agendamento funciona
- [ ] Deletar agendamento funciona
- [ ] Confirmar agendamento funciona
- [ ] Encaixar agendamento funciona
- [ ] Filtros funcionam
- [ ] Pesquisa funciona
- [ ] Impressão funciona (se implementado)

**Como validar:**
```
1. Criar novo agendamento
2. Editar agendamento criado
3. Confirmar agendamento
4. Deletar agendamento
5. Testar filtros (profissional, data, paciente)
6. Testar switch de tabs
```

---

### ✅ 7. Performance e Carregamento
- [ ] Agenda carrega em < 2 segundos
- [ ] Switching tabs é instant (< 300ms)
- [ ] Sem erros no console
- [ ] Sem memory leaks (verificar DevTools)
- [ ] Responsive em mobile/tablet

**Como validar:**
```
1. Abrir DevTools (F12)
2. Ir para Agenda
3. Ver aba "Network" (deve ter < 5 requests principais)
4. Ver aba "Console" (não deve ter erros vermelhos)
5. Clicar em Performance, gravar ao mudar tabs
```

---

## 📝 RESULTADO DA VALIDAÇÃO

### Data: _______________
### Validador: _______________

| Item | Status | Observações |
|------|--------|-------------|
| 1. Menu Lateral | ☐ OK ☐ NOK | ________________ |
| 2. Agenda Tabs | ☐ OK ☐ NOK | ________________ |
| 3. Submenu Routes | ☐ OK ☐ NOK | ________________ |
| 4. Redirects | ☐ OK ☐ NOK | ________________ |
| 5. Roles/Permissions | ☐ OK ☐ NOK | ________________ |
| 6. Funcionalidades | ☐ OK ☐ NOK | ________________ |
| 7. Performance | ☐ OK ☐ NOK | ________________ |

### Resultado Final: ☐ **PASSOU** ☐ **FALHOU**

---

## 🐛 Se algum item falhar:

1. **Menu não mostra "Agenda" consolidado?**
   - Verificar `src/constants/menu.js` - ETAPA 2
   - Verificar qual arquivo sidebar está usando

2. **Tabs não funcionam?**
   - Verificar `src/pages/clinica/agenda/AgendaPage.jsx`
   - Verificar `src/pages/clinica/agenda/components/AgendaTabs.jsx`
   - Verificar useAgendaStore

3. **Submenu routes dão 404?**
   - Verificar se arquivos foram criados:
     - `src/pages/clinica/agenda/AgendaConfirmacoes.jsx`
     - `src/pages/clinica/agenda/AgendaEspera.jsx`
     - `src/pages/clinica/agenda/AgendaIndicadores.jsx`
   - Verificar imports em AppRoutes.jsx

4. **Redirects não funcionam?**
   - Verificar `src/AppRoutes.jsx` linhas 239-241
   - Confirmar que `Navigate` está importado

5. **Permissions erradas?**
   - Verificar `roles` array em `src/constants/menu.js`
   - Verificar `useAuth()` em componentes

---

## 📞 Próximos Passos

Se PASSOU em todos os pontos:
✅ Agenda foi refatorada com sucesso!
✅ Menu consolidado ✅
✅ Tabs internos funcionando ✅
✅ Submenu routes com páginas ✅
✅ Redirects preservando histórico ✅

Se FALHOU em algum ponto:
- Documentar qual falhou
- Executar novamente os passos do FIXING acima
- Testar novamente
- Reportar se persistir

