# 🧪 Guia de Teste - Sistema de Usuários

## ✅ Pré-requisitos

1. **Migração SQL executada:**
   - [ ] Copie e execute a migração `supabase/migrations/2026-01-13_add_user_fields.sql` no Supabase Console
   - [ ] Confirme que as colunas foram adicionadas à tabela `users`

2. **App iniciado:**
   ```bash
   npm run dev
   ```

## 🧪 Testes de Funcionalidade

### Teste 1: Criar Novo Usuário

**URL:** http://localhost:3000/admin/new-user

**Passos:**
1. [ ] Preencha o formulário:
   - Nome Completo: "João Silva Teste"
   - Email: "joao.silva.teste@clinic.com"
   - Username: "joao.silva"
   - CPF: "123.456.789-00"
   - Data Nascimento: "01/01/1990"
   - Senha: "Senha@123456"
   - Perfil: "recepcao"

2. [ ] Selecione permissões:
   - [ ] Dashboard (leitura)
   - [ ] Agenda (leitura/escrita)

3. [ ] Clique em "Criar Usuário"

**Resultado Esperado:**
- [ ] Mensagem: "✓ Usuário João Silva Teste criado com sucesso!"
- [ ] Redireciona para `/admin/usuarios` após 2 segundos
- [ ] Novo usuário aparece na lista

**No Supabase (validação):**
```sql
SELECT name, email, username, cpf, birthdate, password_hash FROM users 
WHERE email = 'joao.silva.teste@clinic.com';
```

---

### Teste 2: Validação de Duplicação

**URL:** http://localhost:3000/admin/new-user

**Teste 2A: Email Duplicado**
1. [ ] Tente criar outro usuário com email: "joao.silva.teste@clinic.com"
2. [ ] Resultado esperado: ❌ Erro "Este email já está cadastrado nesta clínica"

**Teste 2B: Username Duplicado**
1. [ ] Tente criar outro usuário com username: "joao.silva"
2. [ ] Resultado esperado: ❌ Erro "Este nome de usuário já está cadastrado nesta clínica"

**Teste 2C: CPF Duplicado**
1. [ ] Tente criar outro usuário com CPF: "123.456.789-00"
2. [ ] Resultado esperado: ❌ Erro "Este CPF já está cadastrado nesta clínica"

---

### Teste 3: Listar Usuários

**URL:** http://localhost:3000/admin/usuarios

**Passos:**
1. [ ] Página carrega com lista de usuários
2. [ ] Veja se "João Silva Teste" aparece na lista
3. [ ] Teste a busca:
   - [ ] Busque por "João" - deve aparecer o usuário
   - [ ] Busque por "joao.silva" - deve aparecer o usuário
4. [ ] Teste filtros:
   - [ ] Filtro por Role: "Recepção" - deve aparecer João
   - [ ] Filtro por Status: "Ativo" - deve aparecer João

---

### Teste 4: Editar Usuário - Dados Básicos

**URL:** http://localhost:3000/admin/edit-user/[ID]
(Clique no ícone ✏️ do usuário "João Silva Teste")

**Passos:**
1. [ ] Página carrega e exibe os dados:
   - [ ] Nome: "João Silva Teste"
   - [ ] Email: "joao.silva.teste@clinic.com"
   - [ ] Username: "joao.silva"
   - [ ] CPF: "123.456.789-00"
   - [ ] Data Nascimento: "01/01/1990"
   - [ ] Perfil: "Recepção" selecionado

2. [ ] Altere o nome para: "João Silva Teste Atualizado"

3. [ ] Clique em "Salvar Alterações"

**Resultado Esperado:**
- [ ] Mensagem: "✓ Usuário João Silva Teste Atualizado atualizado com sucesso!"
- [ ] Redireciona para `/admin/usuarios` após 2 segundos
- [ ] Volta para editar e confirme que nome foi atualizado

---

### Teste 5: Editar Usuário - Alterar Senha

**URL:** http://localhost:3000/admin/edit-user/[ID] (mesmo usuário)

**Passos:**
1. [ ] Campo "Alterar Senha" está vazio
2. [ ] Digite uma nova senha: "NovaSenh@123456"
3. [ ] Observe:
   - [ ] Campo fica com borda verde
   - [ ] Mostra "✓ Senha válida" em verde abaixo
4. [ ] Clique em "Salvar Alterações"
5. [ ] Observe aviso verde: "✓ Senha será atualizada ao salvar"

**Resultado Esperado:**
- [ ] Mensagem: "✓ Usuário João Silva... atualizado com sucesso!"
- [ ] Campo de senha limpa
- [ ] No Supabase, `password_hash` foi atualizado

**Validação no Supabase:**
```sql
SELECT email, password_hash FROM users 
WHERE email = 'joao.silva.teste@clinic.com';
-- Deve mostrar um password_hash diferente do anterior
```

---

### Teste 6: Validação de Senha Fraca

**URL:** http://localhost:3000/admin/edit-user/[ID]

**Passos:**
1. [ ] No campo "Alterar Senha", digite: "123"
2. [ ] Observe:
   - [ ] Campo fica com borda cinza (não verde)
   - [ ] Mostra "⚠️ Mínimo 6 caracteres" em vermelho
3. [ ] Tente salvar - pode salvar mas senha NÃO será alterada
4. [ ] Deixe o campo vazio e salve - campos de dados são atualizados, senha não muda

---

### Teste 7: Validação de Duplicação ao Editar

**URL:** http://localhost:3000/admin/edit-user/[ID do João]

**Teste 7A: Email Duplicado**
1. [ ] Crie/tenha um segundo usuário (ex: Maria)
2. [ ] Tente alterar o email do João para o email da Maria
3. [ ] Resultado esperado: ❌ "Este email já está cadastrado nesta clínica"

**Teste 7B: Username Duplicado**
1. [ ] Tente alterar o username do João para o username da Maria
2. [ ] Resultado esperado: ❌ "Este nome de usuário já está cadastrado nesta clínica"

**Teste 7C: Permitir alterar para o próprio valor**
1. [ ] Altere apenas o nome: "João Silva Final"
2. [ ] Mantenha email: "joao.silva.teste@clinic.com"
3. [ ] Mantenha username: "joao.silva"
4. [ ] Clique Salvar
5. [ ] Resultado esperado: ✅ Sucesso (permite o próprio valor)

---

### Teste 8: Deletar Usuário

**URL:** http://localhost:3000/admin/usuarios

**Passos:**
1. [ ] Procure o usuário de teste na lista
2. [ ] Clique no ícone 🗑️
3. [ ] Confirme a exclusão
4. [ ] Resultado esperado:
   - [ ] Mensagem: "✓ Usuário deletado com sucesso"
   - [ ] Usuário desaparece da lista

---

### Teste 9: Menu Dinâmico por Perfil

**Login como Admin:**
1. [ ] Menu deve mostrar: Dashboard, Usuários, Clínicas, Financeiro, Estoque, Agenda

**Login como Recepcão:**
1. [ ] Menu deve mostrar: Dashboard, Agenda, Estoque (movimentação)
2. [ ] NÃO deve ver: Usuários, Clínicas, Financeiro

**Login como Dentista:**
1. [ ] Menu deve mostrar: Dashboard, Agenda, Estoque (visualizar)
2. [ ] Acesso reduzido a Financeiro

---

### Teste 10: Validação de Campos Obrigatórios

**URL:** http://localhost:3000/admin/new-user

**Passos:**
1. [ ] Deixe os campos vazios
2. [ ] Tente clicar em "Criar Usuário"
3. [ ] Resultado esperado:
   - [ ] ❌ "Nome completo é obrigatório"
   - [ ] ❌ "E-mail é obrigatório"
   - [ ] ❌ "Nome de usuário é obrigatório"
   - [ ] ❌ "CPF é obrigatório"
   - [ ] ❌ "Data de nascimento é obrigatória"
   - [ ] ❌ "Senha é obrigatória"

---

## 🔍 Testes de Segurança

### Teste 11: Proteção de Rota

**Sem estar logado:**
1. [ ] Tente acessar: http://localhost:3000/admin/usuarios
2. [ ] Resultado esperado: ❌ Redireciona para login

**Com login de Recepção:**
1. [ ] Faça login como usuário com role "recepcao"
2. [ ] Tente acessar: http://localhost:3000/admin/usuarios
3. [ ] Resultado esperado: ❌ Acesso negado (não é admin)

**Com login de Admin:**
1. [ ] Faça login como admin
2. [ ] Acesse: http://localhost:3000/admin/usuarios
3. [ ] Resultado esperado: ✅ Página carrega normalmente

---

## 📊 Teste de Banco de Dados

```sql
-- Verificar tabela users com novos campos
SELECT 
  id, 
  name, 
  email, 
  username, 
  cpf, 
  birthdate, 
  password_hash, 
  role, 
  clinic_id
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar se há duplicatas
SELECT email, COUNT(*) 
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Mesma coisa para username e cpf
SELECT username, COUNT(*) 
FROM users 
WHERE username IS NOT NULL
GROUP BY username 
HAVING COUNT(*) > 1;
```

---

## ✅ Checklist Final

- [ ] Migração SQL executada no Supabase
- [ ] Teste 1 passado (criar usuário)
- [ ] Teste 2 passado (validação duplicação)
- [ ] Teste 3 passado (listar usuários)
- [ ] Teste 4 passado (editar dados básicos)
- [ ] Teste 5 passado (alterar senha)
- [ ] Teste 6 passado (validação senha fraca)
- [ ] Teste 7 passado (validação duplicação edit)
- [ ] Teste 8 passado (deletar usuário)
- [ ] Teste 9 passado (menu dinâmico)
- [ ] Teste 10 passado (campos obrigatórios)
- [ ] Teste 11 passado (proteção de rota)
- [ ] Teste DB passado (dados no Supabase)

---

## 🐛 Se Algo Não Funcionar

1. **Campos aparecem vazios ao editar:**
   - Verifique no console (F12) se há erros
   - Confirme que a migração foi executada
   - Verifique se os dados existem no Supabase

2. **Erro ao salvar:**
   - Abra DevTools (F12) → Console
   - Copie a mensagem de erro
   - Verif e a migração SQL foi executada

3. **Duplicação não funciona:**
   - Verifique se a coluna é UNIQUE no Supabase
   - Confirme que a migração foi aplicada

4. **Senha não está sendo salva:**
   - Verifique se a coluna `password_hash` existe
   - Veja se há erros no console
   - Confirme a migração

---

**Última atualização:** 13 de Janeiro de 2026
**Status:** ✅ Pronto para Teste
