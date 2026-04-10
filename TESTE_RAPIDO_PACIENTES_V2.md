# 🧪 Guia Rápido de Testes - Módulo de Pacientes

**Versão:** 2.0 (Corrigida)  
**Servidor:** http://localhost:3001

---

## ⚡ Testes Rápidos (5 minutos)

### ✅ Teste 1: Menu Sem Paciente

```
1. Abrir: http://localhost:3001/clinica/pacientes
2. VERIFICAR MENU:
   ✅ Mostrar "Lista de Pacientes"
   ✅ Mostrar "Novo Paciente"
   ❌ NÃO mostrar "Convênios", "Documentos", etc
3. VERIFICAR:
   ✅ Seção "Paciente Ativo" vazia/oculta
```

**Esperado:** Menu com apenas 2 itens

---

### ✅ Teste 2: Criar Novo Paciente

```
1. Clicar em "Novo Paciente"
2. URL deve ser: /clinica/pacientes/novo
3. Preencher:
   - Nome: "João Silva"
   - CPF: "123.456.789-00"
   - Data Nascimento: "01/01/1990"
4. Clicar "Próxima Etapa" ou "Salvar"
5. VERIFICAR:
   ✅ Redireciona para /clinica/pacientes/{ID}
   ✅ Menu agora mostra 6 itens
   ✅ Seção "Paciente Ativo" exibe "João Silva"
```

**Esperado:** Menu completo com paciente selecionado

---

### ✅ Teste 3: Navegação Entre Abas

```
COM PACIENTE SELECIONADO:

1. Clicar em "Dados Cadastrais"
   ✅ URL: /clinica/pacientes/{ID}/dados
   ✅ Aba destacada
   
2. Clicar em "Convênios"
   ✅ URL: /clinica/pacientes/{ID}/convenios
   ✅ Aba destacada
   
3. Clicar em "Documentos"
   ✅ URL: /clinica/pacientes/{ID}/documentos
   ✅ Aba destacada
```

**Esperado:** Navegação fluida entre abas

---

### ✅ Teste 4: Breadcrumbs

```
COM PACIENTE SELECIONADO:

1. Ir para /clinica/pacientes/{ID}/dados
2. VERIFICAR breadcrumb:
   Pacientes > João Silva > Dados Cadastrais
   
3. Clicar em "Pacientes" no breadcrumb
   ✅ Volta para lista
   ✅ Menu volta ao estado "sem paciente"
```

**Esperado:** Breadcrumbs refletem navegação corretamente

---

### ✅ Teste 5: Acesso Inválido (Guard)

```
TESTAR ACESSO SEM AUTORIZAÇÃO:

1. Abrir console (F12)
2. Tentar acessar:
   http://localhost:3001/clinica/pacientes/invalid/dados
   
3. VERIFICAR:
   ✅ Console mostra warning: "❌ PatientRouteGuard: patientId inválido"
   ✅ Redireciona para /clinica/pacientes
   ✅ Menu volta ao estado "sem paciente"
```

**Esperado:** Guard funciona e redireciona

---

## 🔍 Checks no Console

Abrir DevTools (F12) e verificar:

### ✅ Sem Erros Vermelhos

```
❌ NÃO deve conter:
- "patientId inválido"
- "Cannot read property 'name' of null"
- "TypeError: Cannot"

✅ PODE conter:
- "❌ PatientRouteGuard: patientId inválido" (warning apenas)
- HMR updates (reload automático)
```

### ✅ Logs Informativos

Quando navegar com patientId inválido:
```
❌ PatientRouteGuard: patientId inválido ou ausente
```

Quando tentar salvar sem paciente:
```
Toast: "ID do paciente inválido"
```

---

## 📱 Teste Responsivo

### Desktop (1920x1080)

```
1. Menu deve ocupar 256px (w-64)
2. Footer "Completar Cadastro" deve ficar ao bottom
3. Conteúdo deve preencher resto da tela
```

### Tablet (768px)

```
1. Menu deve ser visível
2. Footer não deve sobrepor conteúdo
3. Buttons devem ter espaço adequado
```

### Mobile (375px)

```
1. Menu pode colapsar ou scroll horizontal
2. Footer deve estar acessível
3. Nenhum layout quebrado
```

---

## 🚨 Erros Esperados (Normais)

Estes erros são ESPERADOS e NÃO indicam problema:

✅ **Ao salvar sem dados completos:**
```
Toast: "Erro: Por favor preencha todos os campos"
```

✅ **Ao tentar deletar e cancelar:**
```
Dialog fecha sem ação
```

✅ **Network error (sem Supabase configurado):**
```
Console: "Erro ao carregar paciente: ..."
Toast: "Erro ao carregar dados"
```

---

## ❌ Erros NÃO Esperados

Se encontrar ESTES erros, é um problema:

❌ "patientId inválido" no console  
❌ Menu mostra itens de paciente sem estar selecionado  
❌ "Cannot read property 'name' of undefined"  
❌ Footer sobrepõe conteúdo principal  
❌ URL não muda ao clicar menu item  

---

## 📋 Checklist de Validação

```
ANTES DE DEPLOY:

☐ Teste 1 passado (menu sem paciente)
☐ Teste 2 passado (novo paciente)
☐ Teste 3 passado (navegação entre abas)
☐ Teste 4 passado (breadcrumbs)
☐ Teste 5 passado (guard + redirect)

☐ Console sem erros vermelhos
☐ Teste responsivo (desktop/tablet/mobile)
☐ Nenhum erro não esperado

STATUS: ✅ PRONTO PARA PRODUÇÃO
```

---

## 🎬 Próximo Passo

Após validar tudo acima, proceder com:

1. **Testes de Integração**
   - Conectar com Supabase real
   - Testar CRUD completo
   - Validar upload de documentos

2. **Testes de Performance**
   - Load time das páginas
   - Memory leaks no context
   - Carregamento de muitos pacientes

3. **Testes de Segurança**
   - Validar permissões por role
   - Teste de SQL injection (N/A React)
   - Validação de CORS

---

**Desenvolvido por:** AI Assistant  
**Data:** 14 de Janeiro de 2026  
**Tempo estimado de testes:** 15-20 minutos
