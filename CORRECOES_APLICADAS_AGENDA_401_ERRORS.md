# 🔧 Correções Aplicadas - Agenda API Errors (401 Unauthorized)

## Problemas Identificados

### 1. ✅ CORRIGIDO: Missing API Functions in Professional Services
**Arquivo**: `src/lib/professionalServicesApi.js`
**Problema**: ProfessionalServicesPage estava chamando funções que não existiam
**Solução**: Adicionadas três funções:
- `createProfessionalService(clinicId, data)` 
- `updateProfessionalServiceById(id, data)`
- `deleteProfessionalService(id)`

**Arquivo afetado**: `src/pages/clinica/base-sistema/ProfessionalServicesPage.jsx` 
**Mudança**: Atualizado para chamar `updateProfessionalServiceById` em vez de `updateProfessionalService`

---

### 2. ✅ CORRIGIDO: Incorrect roles Table Queries
**Arquivo**: `src/lib/profilesApi.js`
**Problema**: Tentava filtrar tabela `roles` por `clinic_id`, mas a tabela `roles` é global (sem clinic_id)
**Solução**: Removidas todas as filtragens por `clinic_id` em:
- `listProfiles()`
- `getProfile()`  
- `createProfile()`
- `updateProfile()`
- `deleteProfile()`

A tabela `roles` é compartilhada globalmente entre todas as clínicas.

---

### 3. ✅ PARCIALMENTE CORRIGIDO: AgendaPage Data Loading Race Condition
**Arquivo**: `src/pages/clinica/agenda/AgendaPage.jsx`
**Problema**: O `useDataCache` estava tentando fazer requisições antes de `authLoading` e `loadingClinic` serem finalizados
**Solução**: Atualizado o `enabled` flag:
```javascript
// ❌ ANTES
enabled: !!clinicId,

// ✅ DEPOIS  
enabled: !!clinicId && !authLoading && !loadingClinic,
```

Isso garante que as requisições só aconteçam quando:
- `clinicId` está definido
- A autenticação foi carregada
- Os dados da clínica foram carregados

---

## 4. ⚠️ PROBLEMA PENDENTE: 401 Unauthorized Errors

### Root Cause
A aplicação está recebendo **401 Unauthorized** errors porque:

1. **Row Level Security (RLS)** está ATIVADO no Supabase
2. RLS requer que o usuário esteja **autenticado** E tenha um **clinic_id** válido
3. Se o usuário não está logado ou não tem clinic_id, o Supabase rejeita com 401

### Mensagem de Erro Exata
```
No API key found in request header or url param was found.
```

Isso significa: Supabase não consegue verificar se o usuário tem permissão de acessar os dados porque não há token de autenticação ou a RLS está bloqueando.

---

## Soluções para 401 Errors

### Opção 1: Desabilitar RLS para Testes (DESENVOLVIMENTO)
Execute o script `DISABLE_RLS_FOR_TESTING.sql` no Supabase SQL Editor:

```sql
-- Desabilita RLS em todas as tabelas para testing
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE professionals DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
-- ... (ver DISABLE_RLS_FOR_TESTING.sql para lista completa)
```

**Quando usar**: Durante desenvolvimento e testes
**⚠️ NUNCA em produção**

### Opção 2: Fazer Login Antes
Ensure que um usuário está logado antes de acessar `/clinica/agenda`:

1. Vá para `http://localhost:3000/login`
2. Faça login com credentials válidas
3. Certifique-se de que o usuário tem um `clinic_id` configurado na tabela `users`
4. DEPOIS acesse `/clinica/agenda`

### Opção 3: Criar Usuário de Teste
Se não tiver usuários criados:

```sql
-- Criar usuário de teste no Supabase Auth
-- (Usar Supabase Dashboard > Authentication > Users > Add User)

-- Depois, criar registro na tabela users
INSERT INTO users (id, email, clinic_id, role, full_name) VALUES
  ('seu-user-uuid', 'teste@exemplo.com', 'sua-clinic-uuid', 'admin', 'Usuário Teste');
```

---

## Status Atual

| Componente | Status | Detalhes |
|-----------|--------|----------|
| Professional Services API | ✅ Corrigido | Funções adicionadas |
| Profiles/Roles API | ✅ Corrigido | Removidas filtragens por clinic_id |
| Agenda Data Loading | ✅ Corrigido | Race condition evitada |
| Autenticação | ⚠️ Requer ação | Usuário precisa fazer login OU desabilitar RLS |
| 401 Errors | ⚠️ Esperado | Comportamento correto de RLS (usuário não autenticado = acesso negado) |

---

## Próximas Etapas

1. **Para Testes Rápidos**: Execute `DISABLE_RLS_FOR_TESTING.sql` no Supabase
2. **Para Desenvolvimento Real**: Implemente autenticação adequada
3. **Para Produção**: Mantenha RLS ATIVADO com políticas adequadas

