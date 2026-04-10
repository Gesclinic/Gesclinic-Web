# 🚀 INSTRUÇÕES PASSO-A-PASSO - PRÓXIMAS ETAPAS

## ⚠️ IMPORTANTE: Ordem de Execução

Siga EXATAMENTE nesta ordem para evitar erros:

---

## 📋 PASSO 1: Executar a Migração SQL no Supabase

### Objetivo:
Adicionar as novas colunas à tabela `users` no Supabase

### Como fazer:

#### 1.1 Acesse o Supabase
- Abra: https://supabase.com/dashboard
- Entre na sua conta
- Selecione o projeto **Gesclinic Web**

#### 1.2 Abra o SQL Editor
```
Painel Esquerdo → SQL Editor (ou ícone >_)
```

#### 1.3 Copie o SQL

Abra o arquivo: **`supabase/migrations/2026-01-13_add_user_fields.sql`**

```sql
-- Adicionar colunas à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
```

#### 1.4 Cole no SQL Editor
```
1. Clique em "Query" (ou abra uma aba nova)
2. Cola o SQL acima
3. Clique em "RUN" (botão azul)
```

#### 1.5 Confirme o Resultado
```
Você deve ver:
✓ ALTER TABLE 0
✓ CREATE INDEX
```

✅ **Pronto!** A migração foi aplicada.

---

## 📱 PASSO 2: Inicie o App React

### 2.1 Abra o Terminal
```
Windows: Pressione Win + X → Windows Terminal
```

### 2.2 Navegue até o projeto
```bash
cd "C:\Users\ferna\Desktop\Projeto Gesclinic Web"
```

### 2.3 Inicie o servidor
```bash
npm run dev
```

### 2.4 Aguarde
```
Você verá:
✓ ready in XXms
➜ Local: http://localhost:3000
```

✅ **Pronto!** O app está rodando.

---

## 👤 PASSO 3: Teste Criar Novo Usuário

### 3.1 Acesse a página de novo usuário
```
Navegue para: http://localhost:3000/admin/new-user
Ou clique em: Menu → Admin → Novo Usuário
```

### 3.2 Preencha o Formulário

```
┌─────────────────────────────────────┐
│ Nome Completo *                     │
│ João Silva Teste                    │
├─────────────────────────────────────┤
│ E-mail *                            │
│ joao.silva@clinic.com               │
├─────────────────────────────────────┤
│ Nome de Usuário (Login) *           │
│ joao.silva                          │
├─────────────────────────────────────┤
│ CPF *                               │
│ 123.456.789-00                      │
├─────────────────────────────────────┤
│ Data de Nascimento *                │
│ 01/01/1990                          │
├─────────────────────────────────────┤
│ Senha *                             │
│ Senh@123456                         │ ← Mínimo 6
├─────────────────────────────────────┤
│ Perfil *                            │
│ [Recepção ▼]                        │
├─────────────────────────────────────┤
│ Clínica *                           │
│ [Sua Clínica ▼]                     │
└─────────────────────────────────────┘
```

### 3.3 Selecione Permissões
```
Marque alguns módulos:
✓ Dashboard (Leitura)
✓ Agenda (Leitura/Escrita)
```

### 3.4 Clique "Criar Usuário"
```
Espere a mensagem:
✓ Usuário João Silva Teste criado com sucesso!
```

✅ **Sucesso!** Usuário criado.

---

## 🔧 PASSO 4: Teste Editar Usuário (COM SENHA)

### 4.1 Acesse a lista de usuários
```
Navegue para: http://localhost:3000/admin/usuarios
Ou clique em: Menu → Admin → Usuários
```

### 4.2 Encontre o usuário criado
```
Procure por "João Silva Teste" na lista
```

### 4.3 Clique no ícone ✏️ (Editar)
```
┌──────────────────────────┐
│ João Silva Teste │  ✏️ 🗑️ │  ← Clique aqui
└──────────────────────────┘
```

### 4.4 Veja o Formulário de Edição
```
Todos os campos devem aparecer com dados:
✓ Nome: João Silva Teste
✓ Email: joao.silva@clinic.com
✓ Username: joao.silva
✓ CPF: 123.456.789-00
✓ Data Nascimento: (data selecionada)
```

❓ **Se campos estão VAZIOS:**
- Verifique se a migração SQL foi aplicada
- Recarregue a página (F5)
- Verifique o console (F12) por erros

### 4.5 Localize o Campo "Alterar Senha"
```
Role para baixo na página...

Você verá:
┌──────────────────────────────────┐
│ Alterar Senha                    │
│ Deixe em branco para não alterar │
│ [🔒 _______________  👁️]         │
│ Deixe em branco para não alterar │
└──────────────────────────────────┘
```

❓ **Se não vê o campo:**
- Verifique se a página `/admin/edit-user/:id` atualizou
- Limpe o cache: Pressione Ctrl+Shift+R
- Reinicie o servidor: Pare (Ctrl+C) e `npm run dev`

### 4.6 Digite uma Nova Senha
```
Clique no campo de senha
Digite: "NovaSenh123"

Você deve ver:
- Borda fica VERDE
- Mensagem: "✓ Senha válida"

┌──────────────────────────────────┐
│ Alterar Senha                    │
│ [🔒 •••••••••••• 👁️] ← VERDE!    │
│ ✓ Senha válida   ← VERDE!        │
└──────────────────────────────────┘
```

❓ **Se vê "⚠️ Mínimo 6 caracteres":**
- Digite mais caracteres (mínimo 6)
- Ex: "abc123" = válido
- Ex: "abc" = inválido

### 4.7 Clique "Salvar Alterações"
```
Role até o botão azul:
[Salvar Alterações]

Você deve ver:
┌──────────────────────────────────┐
│ ✓ Senha será atualizada ao       │ ← Verde!
│   salvar                         │
└──────────────────────────────────┘

Clique no botão
```

### 4.8 Aguarde a Mensagem de Sucesso
```
Você verá:
✓ Usuário João Silva Teste atualizado com sucesso!

E será redirecionado em 2 segundos para /admin/usuarios
```

✅ **Sucesso!** Senha alterada.

---

## 🔍 PASSO 5: Valide no Supabase

### 5.1 Abra o Supabase
```
https://supabase.com/dashboard
```

### 5.2 Vá para Table Editor
```
Painel Esquerdo → Table Editor
Selecione: users
```

### 5.3 Procure o usuário criado
```
Procure por: joao.silva@clinic.com
```

### 5.4 Verifique os Campos
```
Clique na linha para ver detalhes:

id:           [UUID]
name:         João Silva Teste ✓
email:        joao.silva@clinic.com ✓
username:     joao.silva ✓
cpf:          123.456.789-00 ✓
birthdate:    1990-01-01 ✓
password_hash: Tm92YVNlbmgxMjM= ✓  ← Senha em base64
role:         recepcao ✓
clinic_id:    [ID da clínica] ✓
```

✅ **Validação Completa!**

---

## 🧪 PASSO 6: Teste Validações

### 6.1 Teste Duplicação de Email

1. Acesse: `/admin/new-user`
2. Preencha o formulário
3. Use email: `joao.silva@clinic.com` (que já existe)
4. Clique "Criar Usuário"

**Resultado Esperado:**
```
❌ Este email já está cadastrado nesta clínica
```

### 6.2 Teste Duplicação de Username

1. Acesse: `/admin/new-user`
2. Preencha o formulário
3. Use username: `joao.silva` (que já existe)
4. Clique "Criar Usuário"

**Resultado Esperado:**
```
❌ Este nome de usuário já está cadastrado nesta clínica
```

### 6.3 Teste Duplicação de CPF

1. Acesse: `/admin/new-user`
2. Preencha o formulário
3. Use CPF: `123.456.789-00` (que já existe)
4. Clique "Criar Usuário"

**Resultado Esperado:**
```
❌ Este CPF já está cadastrado nesta clínica
```

✅ **Todas as validações funcionam!**

---

## 📊 PASSO 7: Teste Menu Dinâmico

### 7.1 Login como Admin
```
Menu deve mostrar: 8 módulos
- Dashboard
- Usuários ← Você consegue acessar
- Clínicas
- Financeiro
- Estoque
- Agenda
```

### 7.2 Login como Recepção
```
Menu deve mostrar: 3 módulos
- Dashboard
- Agenda
- Estoque (movimentação)

NÃO deve mostrar:
❌ Usuários
❌ Clínicas
❌ Financeiro
```

### 7.3 Login como Dentista
```
Menu deve mostrar: 3-4 módulos
- Dashboard
- Agenda
- Estoque (visualizar apenas)
- Financeiro (consulta)

NÃO deve mostrar:
❌ Usuários
❌ Clínicas
```

✅ **Menu dinâmico funciona!**

---

## 📝 CHECKLIST FINAL

Marque conforme completar:

```
PASSO 1: Migração SQL
[ ] Acessei Supabase
[ ] Executei o SQL
[ ] Colunas foram adicionadas

PASSO 2: App React
[ ] npm run dev funcionou
[ ] App está em localhost:3000
[ ] Sem erros no console

PASSO 3: Criar Usuário
[ ] Consegui acessar /admin/new-user
[ ] Criei um novo usuário com sucesso
[ ] Mensagem de sucesso apareceu

PASSO 4: Editar Usuário com Senha
[ ] Acessei /admin/edit-user/:id
[ ] Todos os campos estão preenchidos
[ ] Vi o campo "Alterar Senha"
[ ] Digitei nova senha
[ ] Campo ficou VERDE
[ ] Mensagem "✓ Senha válida" apareceu
[ ] Cliquei "Salvar Alterações"
[ ] Aviso verde apareceu
[ ] Mensagem de sucesso apareceu

PASSO 5: Validação Supabase
[ ] Acessei Supabase Table Editor
[ ] Vi o usuário criado
[ ] Todos os campos estão preenchidos
[ ] password_hash foi atualizado

PASSO 6: Validações
[ ] Duplicação de email funciona
[ ] Duplicação de username funciona
[ ] Duplicação de CPF funciona
[ ] Mensagens de erro aparecem

PASSO 7: Menu Dinâmico
[ ] Admin vê todos os 8 módulos
[ ] Recepção vê 3 módulos
[ ] Dentista vê 3-4 módulos
[ ] Usuários não aparece para não-admin

GERAL
[ ] Nenhum erro no console (F12)
[ ] Nenhum erro no Supabase Logs
[ ] Funcionalidade completa
```

---

## 🆘 TROUBLESHOOTING

### Problema: Campos aparecem vazios ao editar

**Solução:**
1. Confirme que a migração SQL foi executada
2. Recarregue a página: `F5`
3. Limpe o cache: `Ctrl+Shift+R`
4. Reinicie o servidor: Pare (Ctrl+C) e `npm run dev`

### Problema: Campo "Alterar Senha" não aparece

**Solução:**
1. Verifique se o arquivo `src/pages/admin/EditUser.jsx` foi atualizado
2. Limpe o cache: `Ctrl+Shift+R`
3. Abra DevTools (F12) → Console
4. Procure por erros

### Problema: Senha não está sendo salva

**Solução:**
1. Verifique se a migração SQL foi executada
2. Verifique o console (F12) por erros
3. Confirme que digitou mínimo 6 caracteres
4. Verifique se clicou "Salvar Alterações"

### Problema: Botão "Salvar Alterações" fica desabilitado

**Solução:**
1. Aguarde 2-3 segundos (está salvando)
2. Se continuar desabilitado, recarregue (F5)
3. Verifique console (F12) por erros

### Problema: Mensagem de duplicação aparece incorretamente

**Solução:**
1. Confirme que você está tentando o mesmo valor
2. Confirme que o usuário está na mesma clínica
3. Se for editar, o próprio valor do usuário é permitido

---

## ✨ RECURSOS IMPLEMENTADOS

Resumo do que você tem agora:

```
✅ Criar usuário com:
   - Nome, Email, Username, CPF, Data Nascimento
   - Senha obrigatória (mínimo 6)
   - Perfil e Permissões

✅ Editar usuário com:
   - Todos os campos acima
   - Alterar Senha (NOVO - opcional)
   - Validação visual (borda verde/cinza)
   - Mensagens de validação
   - Aviso antes de salvar

✅ Validações:
   - Email único por clínica
   - Username único por clínica
   - CPF único por clínica
   - Todos os campos obrigatórios
   - Senha mínimo 6 caracteres

✅ Menu Dinâmico:
   - Admin: 8 módulos
   - Recepcão: 3 módulos
   - Dentista: 3-4 módulos

✅ Banco de Dados:
   - Tabela users com novos campos
   - Índices para performance
   - Relacionamento com permissões
```

---

## 🎯 PRÓXIMOS PASSOS (OPCIONAIS)

Depois que confirmar que tudo funciona:

1. **Melhorar segurança de senha:**
   - Implementar bcrypt em vez de btoa()
   - Adicionar requisitos mais fortes

2. **Adicionar mais validações:**
   - Validar formato de CPF
   - Validar formato de Email mais rigorosamente
   - Confirmar senha ao alterar

3. **Adicionar features:**
   - Foto de perfil
   - Email de boas-vindas
   - Histórico de alterações
   - 2FA (autenticação de dois fatores)

---

## 📞 RESUMO RÁPIDO

| O Que | Onde | Como |
|-------|------|------|
| Criar usuário | `/admin/new-user` | Preencha formulário + clique Criar |
| Editar usuário | `/admin/edit-user/:id` | Clique ✏️ na lista de usuários |
| Alterar senha | Página de editar | Digite nova senha no campo "Alterar Senha" |
| Validar dados | Supabase | Table Editor → users |
| Menu dinâmico | Sidebar | Aparece conforme seu role |

---

**Versão:** 1.0  
**Data:** 13 de Janeiro de 2026  
**Status:** ✅ Pronto para Implementação
