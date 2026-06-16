# ✅ CHECKLIST DE VALIDAÇÃO - RLS FIX

## PRÉ-REQUISITOS

- [ ] Servidor React rodando: `npm run dev` (port 3000)
- [ ] Supabase conectado e funcional
- [ ] Browser com DevTools disponível (F12)
- [ ] Pelo menos 10 minutos disponíveis para teste

---

## FASE 1: SETUP (2 minutos)

### 1.1 - Verificar Servidor Node
```bash
# Terminal 1
cd c:\dev\gesclinic-web
npm run dev
```

**Esperado**: 
```
✅ Vite v5.x.x ready at http://localhost:3000/
✅ Local: http://127.0.0.1:3000/
✅ press h to show help
```

- [ ] Servidor iniciado sem erros
- [ ] Port 3000 disponível
- [ ] Vite mostra "ready"

### 1.2 - Abrir Browser
- [ ] Navegar para http://localhost:3000/login
- [ ] Página de login carrega corretamente
- [ ] Ver campos: Código Clínica, Usuário, Senha

---

## FASE 2: AUTENTICAÇÃO (3 minutos)

### 2.1 - Preencher Credenciais
```
Código Clínica: GESCL-A1B2-C3D4
Usuário: fernando
Senha: senha123
```

- [ ] Digitado sem erros
- [ ] Todos os campos preenchidos

### 2.2 - Fazer Login
- [ ] Clicar botão "Entrar"
- [ ] Aguardar carregamento (5-10 segundos)

**Esperado**:
- [ ] URL muda para: http://localhost:3000/clinica/agenda
- [ ] Dashboard carrega com menu à esquerda
- [ ] Nenhuma mensagem de erro vermelha

### 2.3 - Verificar Console
```
F12 → Console
```

**Procure por**:
- [ ] NÃO há erros em vermelho
- [ ] VER "✅ Contexto carregado" ou similar

Se vir erro:
```
❌ Error: Usuário sem clinic_id vinculado
```
→ Problema de setup. Contacte antes de continuar.

---

## FASE 3: NAVEGAR PARA AGENDA (1 minuto)

### 3.1 - Confirmar Localização
- [ ] URL é: http://localhost:3000/clinica/agenda
- [ ] Tela mostra "Agenda" ou "Calendar"
- [ ] Há appointments visíveis no calendário

### 3.2 - Encontrar Agendamento de Teste
- [ ] Procure por: "Fernando Medeiros" ou similar
- [ ] Ou qualquer agendamento que tenha clinic_id correto

**Dica**: Procure em agendamentos FUTUROS (próximos dias)

- [ ] Agendamento encontrado
- [ ] Clique para abrir modal/detalhes

---

## FASE 4: ACESSAR ITENS (1 minuto)

### 4.1 - Abrir Modal de Agendamento
- [ ] Modal/página de edição abriu
- [ ] Ver abas no topo (opcional, dependendo do layout)

### 4.2 - Navegar para "ITENS DO ATENDIMENTO"
**Opções**:
- [ ] Aba "ITENS" ou "Itens do Atendimento" (clique)
- [ ] Ou seção "Serviços" ou "Procedimentos"
- [ ] Ou scroll para encontrar grid de itens

**Esperado**:
- [ ] Seção carrega sem erro
- [ ] Pode estar vazia ("Nenhum procedimento adicionado")
- [ ] Vê componente ServiceAddRow com dropdowns

---

## FASE 5: ADICIONAR PRIMEIRO SERVIÇO (3 minutos) ⭐ TESTE PRINCIPAL

### 5.1 - Verificar Estado Inicial
- [ ] Nenhum item visível na lista
- [ ] Mensagem: "Nenhum procedimento adicionado" ou similar

### 5.2 - Selecionar Serviço
```
Componente: Dropdown "Serviço"
```

- [ ] Clique no dropdown de Serviço
- [ ] Selecione qualquer serviço (ex: "Consulta")
- [ ] Vê "Consulta" selecionado

### 5.3 - Selecionar Pagador/Convênio
```
Componente: Dropdown "Pagador" ou "Convênio"
```

- [ ] Clique no dropdown de Pagador
- [ ] Selecione "Particular" ou "Unimed"
- [ ] Vê seleção confirmada

### 5.4 - Verificar Preço Dinâmico
- [ ] Campo de Preço atualiza automaticamente
- [ ] Mostra um valor numérico (ex: 700, 500, etc)

**SE NÃO VER PREÇO**:
```
Procure por erro no console (F12 → Console)
Erro: "Serviço não encontrado" ou "Preço inválido"?
```

- [ ] Preço visível e não zero

### 5.5 - TESTE CRÍTICO: Clique em Adicionar
```
Botão: "Adicionar" ou "Add" ou "+"
```

- [ ] Clique no botão "Adicionar"

**OBSERVAÇÃO CRÍTICA** ⭐:
```
Antes (❌ Quebrado): Item desaparecia após clicar Add
Depois (✅ Funcionando): Item aparece e PERSISTE na lista
```

- [ ] Item aparece na lista abaixo
- [ ] Item NÃO desaparece após 2 segundos
- [ ] Item mostra: Código, Serviço, Pagador, Preço
- [ ] Nenhuma mensagem de erro

**SE ITEM DESAPARECER**:
```
❌ Problema de RLS ainda presente
✗ Contacte suporte
```

- [ ] Item permaneceu na lista ✅

---

## FASE 6: VERIFICAR PERSISTÊNCIA (2 minutos) ⭐ TESTE CRÍTICO #2

### 6.1 - Recarregar Página
```
Atalho: F5 ou Ctrl+R
```

- [ ] Página recarregando
- [ ] Modal desaparece
- [ ] Aguarde recarregar completamente

### 6.2 - Reabrir Mesmo Agendamento
- [ ] Clique no mesmo agendamento novamente
- [ ] Modal abre novamente

### 6.3 - Verificar Persistência do Item
- [ ] Volte para aba "ITENS DO ATENDIMENTO"
- [ ] **ESPERADO**: Item que adicionou ainda está lá!

**ESTE É O TESTE MAIS IMPORTANTE** ⭐⭐⭐:
```
✅ SE ITEM PERMANECEU: RLS FIX FUNCIONANDO!
❌ SE ITEM DESAPARECEU: RLS problema continua
```

- [ ] Item ainda visível após reload ✅

### 6.4 - Verificar Dados
- [ ] Código do serviço correto
- [ ] Serviço correto
- [ ] Pagador correto
- [ ] Preço correto

- [ ] Todos os dados persistiram corretamente

---

## FASE 7: TESTE ADICIONAL (2 minutos)

### 7.1 - Adicionar Segundo Serviço (Opcional)
- [ ] Selecione OUTRO serviço
- [ ] Selecione OUTRO pagador
- [ ] Clique Adicionar

**Esperado**:
- [ ] Dois itens na lista
- [ ] Cada um com seu pagador/preço correto

- [ ] Segundo item adicionado com sucesso

### 7.2 - Salvar Agendamento
```
Botão: "Salvar" ou "Salvar Dados" ou "Save"
```

- [ ] Clique em Salvar
- [ ] Aguarde resposta (2-5 segundos)

**Esperado**:
```
✅ "Sucesso!" ou "Agendamento salvo"
ou
✅ Modal fecha e retorna para agenda
ou
✅ Toast green em canto da tela
```

- [ ] Mensagem de sucesso exibida
- [ ] Nenhuma mensagem de erro

---

## FASE 8: TESTE FINAL (1 minuto)

### 8.1 - Reload Completo
- [ ] Feche browser completamente (Ctrl+W)
- [ ] Abra nova aba: http://localhost:3000/login
- [ ] Faça login novamente

### 8.2 - Verificar Persistência Final
- [ ] Vá para Agenda
- [ ] Abra mesmo agendamento
- [ ] Vá para ITENS

**Esperado**: 
- [ ] Itens ainda estão lá ✅
- [ ] Dados intactos

---

## ANÁLISE DE RESULTADOS

### ✅ SUCESSO COMPLETO
Se passou em TODOS os checks acima:
```
🎉 RLS FIX FUNCIONANDO PERFEITAMENTE!

O requisito foi atendido:
"Precisa permitir salvar o agendamento após inclusão dos dados"
✅ VALIDADO
```

**Próximos passos**: Deploy para produção

### ⚠️ PARCIALMENTE OK
Se apenas alguns testes passaram:
```
⚠️ Pode haver problema em outro aspecto

Procure por:
- Erros no console (F12)
- Timeout de carregamento
- Problema de conexão ao Supabase
```

### ❌ FALHA
Se não passou nos testes críticos (5.5 ou 6.3):
```
❌ RLS FIX NÃO FUNCIONOU

Verificar:
1. RLS policies aplicadas? (Supabase → SQL Editor)
2. Usuário tem permissão? (user_clinic_roles table)
3. Tabela appointment_items existe? (Supabase → Tables)

Contacte: suporte@gesclinic.com.br
```

---

## DÚVIDAS DURANTE TESTE?

### Erro: "Clinic não encontrada"
- [ ] Verificar código clínica: GESCL-A1B2-C3D4
- [ ] Ou usar código de outra clínica se disponível

### Erro: "Usuário não encontrado"
- [ ] Usuário: fernando
- [ ] Verificar se existe em Supabase table `users`

### Item desaparece após Add
- [ ] Isso significa RLS ainda está bloqueando
- [ ] Verifique console (F12) por erro de SQL

### Preço não atualiza
- [ ] Pode ser service não encontrado
- [ ] Ou payer não tem preço definido
- [ ] Continuae testando mesmo assim

### Página fica carregando
- [ ] Aguarde 10-15 segundos
- [ ] Se não carregar, F5 reload
- [ ] Se problema persistir, restart npm run dev

---

## PRÓXIMOS PASSOS APÓS VALIDAÇÃO ✅

1. [ ] Documentar resultado (este checklist preenchido)
2. [ ] Comunicar ao usuário: "RLS fix validado ✅"
3. [ ] Deploy para staging (se houver ambiente)
4. [ ] Deploy para production
5. [ ] Monitorar erros em produção (primeiras 24h)

---

## INFORMAÇÕES PARA SUPORTE

Se algo der errado, colete:

```
Browser DevTools Console Output:
F12 → Console → Screenshot ou copie erro

Network Error (se houver):
F12 → Network → Procure por erro de API

URL na falha:
http://...

Hora do erro:
HH:MM

Ação que causou erro:
(ex: "cliquei em Adicionar")
```

---

## CONCLUSÃO

**Este checklist valida completamente** se a solução RLS está funcionando.

- ✅ = Funcionando corretamente
- ⚠️ = Possível problema
- ❌ = Erro crítico

**Objetivo**: Confirmar que usuários conseguem:
1. ✅ Adicionar serviços a agendamentos
2. ✅ Ver serviços na interface
3. ✅ Recarregar página sem perder dados
4. ✅ Salvar agendamento com múltiplos serviços

---

**Data de Validação**: _______________
**Resultado**: ✅ ⚠️ ❌
**Tester**: _______________
**Notas**: _______________

