# Configuração de Perfis e Permissões - Gesclinic Web

## Visão Geral

O sistema Gesclinic Web utiliza um modelo de controle de acesso baseado em roles (RBAC - Role-Based Access Control) para gerenciar as permissões dos usuários. Existem 4 perfis principais, cada um com um conjunto específico de módulos e funcionalidades.

---

## Perfis Disponíveis

### 1. **Administrador** (admin)
- **Descrição:** Acesso completo ao sistema
- **Cor de Identificação:** Vermelho (#dc2626)
- **Usuários Típicos:** Gerente/Diretor da Clínica

#### Módulos Acessíveis:
- Dashboard (Completo)
- Agenda (Todas as funcionalidades)
- Pacientes (Completo)
- Profissionais (Gerenciamento)
- Financeiro (Completo)
- Estoque (Completo)
- Faturamento (Completo)
- Configurações (Completo)
- Administração (Usuários, Clínicas)
- Atendimento (Completo)

#### Permissões Específicas (48 permissões):
```
- dashboard.visualizar
- agenda.visualizar, .criar, .editar, .deletar
- agenda.confirmacao, .lista_espera, .relatorios, .notificacoes
- pacientes.visualizar, .criar, .editar, .deletar
- pacientes.documentos, .historico
- profissionais.visualizar, .criar, .editar, .deletar
- financeiro.dashboard, .contas_pagar, .contas_receber
- financeiro.fluxo_caixa, .plano_contas, .centro_custos
- financeiro.conciliacao, .automacao, .repasse_medico
- estoque.dashboard, .produtos, .categorias, .fornecedores
- estoque.movimentacoes, .transferencias, .requisicoes
- estoque.inventario, .relatorios
- faturamento.visualizar, .criar, .editar
- configuracoes.gerais, .perfis, .permissoes, .agenda
- configuracoes.conta, .faturamento, .estoque
- administracao.usuarios, .clinicas
- atendimento.visualizar, .criar, .editar
```

---

### 2. **Financeiro** (financeiro)
- **Descrição:** Gerenciamento de contas a pagar e receber
- **Cor de Identificação:** Verde (#16a34a)
- **Usuários Típicos:** Contador, Analista Financeiro

#### Módulos Acessíveis:
- Dashboard (Visão Financeira)
- Financeiro (Completo)
- Faturamento (Visualização)

#### Permissões Específicas (11 permissões):
```
- dashboard.visualizar
- financeiro.dashboard
- financeiro.contas_pagar
- financeiro.contas_receber
- financeiro.fluxo_caixa
- financeiro.plano_contas
- financeiro.centro_custos
- financeiro.conciliacao
- financeiro.automacao
- financeiro.repasse_medico
- faturamento.visualizar
```

---

### 3. **Recepção** (recepcao)
- **Descrição:** Agendamento, pacientes e atendimento
- **Cor de Identificação:** Azul (#2563eb)
- **Usuários Típicos:** Recepcionista, Assistente de Recepção

#### Módulos Acessíveis:
- Dashboard (Visão Geral)
- Agenda (Agendamento e Confirmação)
- Pacientes (Completo)
- Profissionais (Visualização)
- Atendimento (Básico)

#### Permissões Específicas (17 permissões):
```
- dashboard.visualizar
- agenda.visualizar, .criar, .editar
- agenda.confirmacao, .lista_espera, .notificacoes
- pacientes.visualizar, .criar, .editar
- pacientes.documentos, .historico
- profissionais.visualizar
- atendimento.visualizar, .criar
```

---

### 4. **Profissional** (profissional)
- **Descrição:** Agenda pessoal e atendimento
- **Cor de Identificação:** Roxo (#7c3aed)
- **Usuários Típicos:** Médico, Dentista, Terapeuta

#### Módulos Acessíveis:
- Dashboard (Visão Pessoal)
- Agenda (Visualização e Confirmação)
- Pacientes (Consulta)
- Atendimento (Completo)

#### Permissões Específicas (9 permissões):
```
- dashboard.visualizar
- agenda.visualizar, .confirmacao
- pacientes.visualizar, .documentos, .historico
- atendimento.visualizar, .criar, .editar
```

---

## Estrutura de Módulos

| Módulo | Admin | Financeiro | Recepção | Profissional |
|--------|:-----:|:----------:|:--------:|:------------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Agenda | ✓ | ✗ | ✓ | ✓ |
| Pacientes | ✓ | ✗ | ✓ | ✓ |
| Profissionais | ✓ | ✗ | ✓ | ✗ |
| Financeiro | ✓ | ✓ | ✗ | ✗ |
| Estoque | ✓ | ✗ | ✗ | ✗ |
| Faturamento | ✓ | ✓ | ✗ | ✗ |
| Configurações | ✓ | ✗ | ✗ | ✗ |
| Administração | ✓ | ✗ | ✗ | ✗ |
| Atendimento | ✓ | ✗ | ✓ | ✓ |

---

## Navegação do Menu por Perfil

### Menu do Administrador (8 módulos principais)
```
📊 Dashboard
📅 Agenda
👥 Pacientes
💰 Financeiro
📦 Estoque
📄 Faturamento
⚙️ Configurações
🛡️ Administração
```

### Menu do Financeiro (3 módulos principais)
```
📊 Dashboard
💰 Financeiro
📄 Faturamento
```

### Menu da Recepção (4 módulos principais)
```
📊 Dashboard
📅 Agenda
👥 Pacientes
👨‍⚕️ Atendimento
```

### Menu do Profissional (4 módulos principais)
```
📊 Dashboard
📅 Agenda
👥 Pacientes
👨‍⚕️ Atendimento
```

---

## Fluxo de Autorização

1. **Autenticação:** Usuário faz login com email/senha
2. **Carregamento de Role:** Sistema busca o `role` do usuário na tabela `users`
3. **Filtragem de Menu:** O menu dinâmico filtra itens baseado no role do usuário
4. **Acesso a Rotas:** React Router valida o acesso à rota conforme o role
5. **Permissões de API:** Backend valida permissões antes de retornar dados

---

## Implementação Técnica

### Arquivos Principais

#### 1. `src/lib/profilesApi.js`
Gerencia operações CRUD de perfis:
- `listProfiles(clinicId)` - Lista todos os perfis
- `getProfile(roleId, clinicId)` - Busca perfil específico
- `createProfile(profileData, clinicId)` - Cria novo perfil
- `updateProfile(roleId, profileData, clinicId)` - Atualiza perfil
- `deleteProfile(roleId, clinicId)` - Deleta perfil
- `countUsersByProfile(roleId, clinicId)` - Conta usuários
- `listUsersByProfile(roleId, clinicId)` - Lista usuários do perfil

#### 2. `src/config/menu.config.js`
Define a estrutura do menu com:
- Items: Cada item contém `roles: ["admin", "financeiro", ...]`
- Filtragem automática no `useMenuFilter()`
- Ícones dinâmicos do lucide-react

#### 3. `src/hooks/useMenuFilter.js`
Lógica de filtragem:
- `filterMenuByRole(items, role)` - Filtra recursivamente
- `useMenuFilter(role)` - Hook React para uso em componentes
- Suporta até 3 níveis de aninhamento

#### 4. `src/contexts/SupabaseAuthContext.jsx`
Gerencia autenticação e carregamento de role:
- Busca user no Supabase Auth
- Carrega role de `users.role`
- UPSERT automático se user não existe
- Retorna `currentRole` para menu

---

## Adicionando um Novo Perfil

### Passo 1: Definir em `profilesApi.js`
```javascript
export const PROFILES_CONFIG = {
  // ... perfis existentes ...
  novo_perfil: {
    id: 'novo_perfil',
    label: 'Novo Perfil',
    description: 'Descrição do perfil',
    color: 'bg-color-100 text-color-800',
    permissions: [/* lista de permissões */],
    modules: ['Dashboard', 'Módulo1', 'Módulo2']
  }
}
```

### Passo 2: Adicionar ao menu.config.js
```javascript
{
  id: "modulo",
  label: "Módulo",
  roles: ["admin", "novo_perfil"],
  // ... resto da configuração
}
```

### Passo 3: Criar usuário de teste
- Acesso: Administração > Usuários
- Atribuir role: `novo_perfil`
- Login e verificar menu

---

## Testes de Autorização

### Teste 1: Menu por Perfil
- [ ] Login como Admin → Vê 8 módulos
- [ ] Login como Financeiro → Vê 3 módulos
- [ ] Login como Recepção → Vê 4 módulos
- [ ] Login como Profissional → Vê 4 módulos

### Teste 2: Acesso a Páginas
- [ ] Admin acessa `/clinica/estoque` ✓
- [ ] Recepção acessa `/clinica/estoque` → Erro 404 ✓
- [ ] Financeiro acessa `/clinica/financeiro` ✓
- [ ] Profissional acessa `/clinica/financeiro` → Erro 404 ✓

### Teste 3: Contagem de Usuários
- [ ] Visualizar perfil mostra usuários corretos
- [ ] Atribuir novo usuário atualiza contagem

---

## Troubleshooting

### Menu não aparece
- Verificar se `currentRole` está carregando em `SupabaseAuthContext`
- Verificar se role do usuário está em `MENU_ITEMS[...].roles`

### Erro 404 ao acessar página
- Verificar se rota em `AppRoutes.jsx` está dentro de `<ProtectedRoute>`
- Verificar se role do usuário tem permissão para a rota

### Usuário não consegue fazer login
- Verificar se existe registro em `users` table
- Verificar se `role` está preenchido em `users`

---

## Próximas Implementações

- [ ] Criar roles customizados por clínica
- [ ] Implementar permissões granulares no backend (RLS)
- [ ] Auditoria de acesso
- [ ] Rotinas agendadas por perfil
- [ ] Notificações contextualizadas por role

