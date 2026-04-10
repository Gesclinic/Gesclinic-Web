# 🧪 GUIA RÁPIDO DE TESTES LOCAIS - ETAPA 10 FASE 2

## ⚡ Testar em 5 Minutos

### Passo 1: Iniciar Dev Server
```bash
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
npm run dev
```

Esperar até ver:
```
➜ Local: http://localhost:3000/
```

### Passo 2: Login
```
URL: http://localhost:3000/login
Email: seu-email@clinica.com
Senha: sua-senha
```

### Passo 3: Acessar Base do Sistema
```
URL: http://localhost:3000/clinica/base-sistema/servicos
```

Se houver erro 404, significa FASE 3 não feita ainda.

### Passo 4: Testar Um Componente (Serviços)
1. Clique em "Novo Serviço"
2. Digite: "Consulta Geral"
3. Descrição: "Atendimento padrão"
4. Clique "Criar"
5. Verifique se aparece na tabela
6. Recarregue página (F5) → ainda aparece? ✅
7. Clique editar → modal abre? ✅
8. Clique deletar → desaparece? ✅

Se tudo funcionar = ✅ Componente pronto!

---

## 🔍 Verificar Cada Componente

### Componente 1: Serviços
```
URL: http://localhost:3000/clinica/base-sistema/servicos
Teste:
  - Criar: Nome + Descrição
  - Editar: Alterar nome
  - Delete: Soft delete
  - Validação: Nome vazio → erro
```

### Componente 2: Profissionais
```
URL: http://localhost:3000/clinica/base-sistema/profissionais
Teste:
  - Criar: Name + Email + Phone
  - Validação: Email inválido → erro
  - Delete: Soft delete
```

### Componente 3: Convênios
```
URL: http://localhost:3000/clinica/base-sistema/convenios
Teste:
  - Criar: Code + Name + Type + CNPJ
  - Delete: Soft delete
```

### Componente 4: Salas
```
URL: http://localhost:3000/clinica/base-sistema/salas
Teste:
  - Criar: Name + Description + Location + Capacity
  - Validação: Capacity numérico → erro se texto
  - Delete: Soft delete
```

### Componente 5: Recursos
```
URL: http://localhost:3000/clinica/base-sistema/recursos
Teste:
  - Criar: Name + Category + Description
  - Delete: Soft delete
```

### Componente 6: Prof-Serviços (M:M)
```
URL: http://localhost:3000/clinica/base-sistema/professional-services
Teste:
  - Criar: Selecionar Prof + Selecionar Serviço
  - Validação: Sem duplicatas
  - Delete: Remove vinculação
```

### Componente 7: Regras Agenda
```
URL: http://localhost:3000/clinica/base-sistema/agenda-rules
Teste:
  - Criar: Name + Type selecionável + Value
  - Types: default, min_interval, max_per_day, buffer_time, blackout
```

### Componente 8: Sala-Recursos (M:M)
```
URL: http://localhost:3000/clinica/base-sistema/room-resources
Teste:
  - Criar: Sala + Recurso + Quantity
  - Validação: Quantity > 0
```

### Componente 9: Horários Profissionais
```
URL: http://localhost:3000/clinica/base-sistema/professional-schedule
Teste:
  - Criar: Prof + Day + StartTime + EndTime
  - Validação: Start < End → sucesso, Start >= End → erro
  - Opcional: Intervalo (break_start/end)
```

### Componente 10: Preços Serviços
```
URL: http://localhost:3000/clinica/base-sistema/service-prices
Teste:
  - Criar: Serviço + Price + Cost (opcional) + Currency
  - Validação: Price > 0
  - Visualizar: Margem % calculada
```

### Componente 11: Regras Receita
```
URL: http://localhost:3000/clinica/base-sistema/revenue-rules
Teste:
  - Criar: Name + Type + Percentage/Fixed Value
  - Types: percentage, fixed, combined, tiered
```

### Componente 12: Prof-Convênio (M:M)
```
URL: http://localhost:3000/clinica/base-sistema/professional-payer
Teste:
  - Criar: Prof + Convênio + Commission% + Registration
  - Validação: Commission 0-100%
```

---

## 🐛 Troubleshooting Rápido

### Problema: "404 Not Found"
**Causa**: FASE 3 (AppRoutes) não feita ainda  
**Solução**: Aguarde integração em AppRoutes.jsx

### Problema: "Erro ao carregar dados"
**Causa**: API problema ou clinic_id inválido  
**Solução**:
1. Abrir DevTools (F12)
2. Aba "Network" → procurar requisição com erro
3. Ler mensagem de erro
4. Verificar se clinic selecionado está correto

### Problema: "Form não salva"
**Causa**: Validação falhando silenciosamente  
**Solução**:
1. Preencher todos campos obrigatórios
2. Verificar se validação HTML está correta
3. Abrir console (F12) → procurar erro

### Problema: "Dados desaparecem após reload"
**Esperado**: Se deletou, é soft delete (certo!)  
**Não esperado**: Se não deletou mas desapareceu → verificar cache

### Problema: "Modal não fecha"
**Causa**: Submissão ainda em progresso  
**Solução**: Aguardar submitting = false (botão volta ao normal)

---

## 📱 Testar Responsividade

### Desktop (1920x1080)
```bash
F12 → Modo normal
Verificar tabela visível sem scroll horizontal
```

### Tablet (768x1024)
```bash
F12 → Device Toggle (Ctrl+Shift+M)
Selecionar "iPad"
Verificar tabela ainda legível
```

### Mobile (375x667)
```bash
F12 → Device Toggle
Selecionar "iPhone SE"
Verificar tabela scrollável
Verificar botões clicáveis
```

---

## ⚙️ Verificar Console

Abrir DevTools (F12) → Aba "Console"

### ✅ Esperado Ver:
- Sem erros vermelhos grandes
- Apenas warnings normais do React

### ❌ Não Esperado Ver:
- Errors tipo "undefined is not a function"
- Errors tipo "Cannot read property X of undefined"
- Network errors (Status 500, 401, 403)

---

## 📊 Performance Check

### Carregamento
- [ ] Página carrega < 2 segundos
- [ ] Skeleton loader mostra
- [ ] Dados aparecem

### Criação
- [ ] Form abre < 100ms
- [ ] Submissão leva < 1 segundo
- [ ] Tabela atualiza < 500ms

### Edição
- [ ] Modal abre < 100ms
- [ ] Dados preenchem < 200ms
- [ ] Salva < 1 segundo

### Deleção
- [ ] Confirmar < 100ms
- [ ] Tabela atualiza < 500ms
- [ ] Efeito visual < 300ms

---

## 🎯 Teste Completeness

Para cada componente:
```
[ ] CRUD Create
[ ] CRUD Read (lista)
[ ] CRUD Update
[ ] CRUD Delete
[ ] Validação 1 (required)
[ ] Validação 2 (format)
[ ] Error handling
[ ] Loading state
[ ] Empty state
[ ] Modal behavior
```

Total: 12 componentes × 10 checks = **120 checks**

---

## 📝 Relatório de Testes

Salvar em arquivo txt:

```txt
DATA: 2025-01-20
COMPONENTE: Serviços
STATUS: ✅ FUNCIONAL
  - ✅ Create
  - ✅ Read
  - ✅ Update
  - ✅ Delete
  - ✅ Validações
  - ✅ Error handling
NOTAS: Tudo funcionando sem problemas

COMPONENTE: Profissionais
STATUS: ✅ FUNCIONAL
...
```

---

## 🚀 Se Tudo Passar

Próximo passo: FASE 3 (Integração AppRoutes)

Comando:
```
"próxima fase" ou "continuar com fase 3"
```

---

## 📞 Se Algo Quebrar

Informações úteis para reportar:
1. URL exato da página
2. Ação realizada (ex: "Cliquei em Novo Serviço")
3. Erro exato (screenshot do erro)
4. DevTools Console (Ctrl+Shift+K) → copiar erro
5. Network tab → procurar request falhado

---

## ✅ Checklist Final

- [ ] npm run dev executa sem erro
- [ ] Login funciona
- [ ] Pelo menos 1 componente carrega
- [ ] CRUD funciona em 1 componente
- [ ] Validações funcionam
- [ ] Soft delete funciona
- [ ] Recarregamento mantém dados
- [ ] Console sem erros críticos
- [ ] DevTools Network sem 500/401

**Se todos checked**: ✅ Sistema pronto para FASE 3!

