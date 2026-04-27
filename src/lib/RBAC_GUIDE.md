# 🔐 RBAC - Role-Based Access Control

## Objetivo
Implementar controle de acesso baseado em papéis (roles) para garantir segurança operacional e evitar erros humanos.

---

## 1️⃣ Arquitetura

### Componentes

```
authorizationHelper.js (src/lib/)
├── PERMISSIONS object (matriz de permissões)
├── can(user, action) → função principal
├── canAll(user, actions) → AND lógico
├── canAny(user, actions) → OR lógico
└── helpers (isAdmin, isGestor, etc)

useAuthorization.js (src/modules/agenda/hooks/)
└── Hook React que integra com useAuth()
```

### Fluxo

```
Component renderiza
    ↓
useAuthorization() hook
    ↓
can('agendamento:criar') → verifica permissão
    ↓
if (true) → renderiza botão/componente
if (false) → esconde ou desabilita
```

---

## 2️⃣ Roles e Permissões

### Admin (Acesso Completo) ✅

| Ação | Pode? |
|------|-------|
| criar agendamento | ✅ |
| editar horário | ✅ |
| editar valor | ✅ |
| deletar agendamento | ✅ |
| confirmar presença | ✅ |
| visualizar | ✅ |
| editar config | ✅ |
| criar usuário | ✅ |
| deletar usuário | ✅ |
| ver auditoria | ✅ |
| exportar auditoria | ✅ |

### Gestor (Gerente de Clínica)

| Ação | Pode? |
|------|-------|
| criar agendamento | ✅ |
| editar horário | ✅ |
| editar valor | ❌ |
| deletar agendamento | ✅ |
| confirmar presença | ✅ |
| visualizar | ✅ |
| editar config | ✅ |
| criar usuário | ✅ |
| deletar usuário | ❌ |
| ver auditoria | ✅ |
| exportar auditoria | ❌ |

### Recepção (Atendimento)

| Ação | Pode? |
|------|-------|
| criar agendamento | ✅ |
| editar horário | ✅ |
| editar valor | ❌ |
| deletar agendamento | ❌ |
| confirmar presença | ❌ |
| visualizar | ✅ |
| editar config | ❌ |
| criar usuário | ❌ |
| deletar usuário | ❌ |
| ver auditoria | ❌ |
| exportar auditoria | ❌ |

### Médico/Profissional

| Ação | Pode? |
|------|-------|
| criar agendamento | ❌ |
| editar horário | ❌ |
| editar valor | ❌ |
| deletar agendamento | ❌ |
| confirmar presença | ✅ |
| visualizar (seus) | ✅ |
| editar config | ❌ |
| criar usuário | ❌ |
| deletar usuário | ❌ |
| ver auditoria | ❌ |
| exportar auditoria | ❌ |

---

## 3️⃣ Como Usar

### Exemplo 1: Função Simples

```javascript
import { can } from '@/lib/authorizationHelper';

const user = { id: '123', role: 'recepcao' };

if (can(user, 'agendamento:criar')) {
  console.log('Pode criar agendamento');
} else {
  console.log('Não tem permissão');
}
```

### Exemplo 2: Hook React (Recomendado)

```javascript
import useAuthorization from '@/modules/agenda/hooks/useAuthorization';

export function AgendaToolbar() {
  const { canCreateAppointment, canEditAppointmentValue, isAdmin } = useAuthorization();

  return (
    <div>
      {canCreateAppointment && (
        <button>➕ Novo Agendamento</button>
      )}

      {canEditAppointmentValue && (
        <button>💰 Editar Valores</button>
      )}

      {isAdmin && (
        <button>⚙️ Configurações</button>
      )}
    </div>
  );
}
```

### Exemplo 3: Múltiplas Permissões

```javascript
const { canAll, canAny } = useAuthorization();

// AND: User precisa ter TODAS
if (canAll(['agendamento:criar', 'agendamento:editar'])) {
  // Pode fazer ambas
}

// OR: User precisa ter PELO MENOS UMA
if (canAny(['agendamento:deletar', 'config:editar'])) {
  // Pode fazer pelo menos uma
}
```

### Exemplo 4: Desabilitar Botão

```javascript
export function CriarAgendamentoBtn() {
  const { canCreateAppointment } = useAuthorization();

  return (
    <button 
      disabled={!canCreateAppointment}
      title={!canCreateAppointment ? 'Permissão negada' : 'Criar novo'}
    >
      ➕ Novo
    </button>
  );
}
```

### Exemplo 5: Renderizar Condicional Completo

```javascript
export function AgendamentoForm({ appointment }) {
  const { canEditAppointment, canEditAppointmentValue, permissionReport } = useAuthorization();

  if (!canEditAppointment) {
    return <div>Você não tem permissão para editar agendamentos</div>;
  }

  return (
    <form>
      <input type="text" placeholder="Horário" /> {/* Sempre visível */}

      {canEditAppointmentValue && (
        <input type="number" placeholder="Valor" /> {/* Apenas admin/gestor */}
      )}

      <button type="submit">Salvar</button>
    </form>
  );
}
```

---

## 4️⃣ Integração em Componentes

### AgendamentoEditarModal.jsx

```javascript
import useAuthorization from '@/modules/agenda/hooks/useAuthorization';

export function AgendamentoEditarModal({ appointmentId, onClose }) {
  const { canEditAppointment, canEditAppointmentValue } = useAuthorization();

  if (!canEditAppointment) {
    return <div className="alert-error">Permissão negada</div>;
  }

  return (
    <Modal onClose={onClose}>
      <form>
        <input placeholder="Horário" /> {/* Sempre habilitado */}
        <input placeholder="Paciente" /> {/* Sempre habilitado */}

        {/* Campo de valor: apenas se tem permissão */}
        {canEditAppointmentValue ? (
          <input type="number" placeholder="Valor" />
        ) : (
          <input type="number" placeholder="Valor" disabled />
        )}

        <button type="submit">Salvar</button>
      </form>
    </Modal>
  );
}
```

### AgendaToolbar.jsx

```javascript
import useAuthorization from '@/modules/agenda/hooks/useAuthorization';

export function AgendaToolbar() {
  const {
    canCreateAppointment,
    canDeleteAppointment,
    canExportReport,
    isAdmin,
  } = useAuthorization();

  return (
    <div className="toolbar">
      {canCreateAppointment && (
        <button className="btn-primary">➕ Novo Agendamento</button>
      )}

      {canDeleteAppointment && (
        <button className="btn-danger">🗑️ Deletar</button>
      )}

      {canExportReport && (
        <button className="btn-secondary">📥 Exportar</button>
      )}

      {isAdmin && (
        <button className="btn-dark">⚙️ Admin Panel</button>
      )}
    </div>
  );
}
```

---

## 5️⃣ Adição de Novas Permissões

### Passo 1: Adicionar em authorizationHelper.js

```javascript
// Em PERMISSIONS, em cada role, adicione:

admin: {
  // Seu novo item...
  'novo-modulo:acao': true,
},

gestor: {
  'novo-modulo:acao': true, // ou false
},

// ... etc
```

### Passo 2: Adicionar em ALL_PERMISSIONS

```javascript
export const ALL_PERMISSIONS = [
  // ... existentes...
  'novo-modulo:acao', // ← NOVO
];
```

### Passo 3: (Opcional) Adicionar em useAuthorization.js

```javascript
// Se é muito usada, adicione um helper:
canNewAction: can(user, 'novo-modulo:acao'),
```

### Passo 4: Usar no Componente

```javascript
const { canNewAction } = useAuthorization();

if (canNewAction) {
  // renderizar
}
```

---

## 6️⃣ Debug

### Verificar Permissões (Dev Console)

```javascript
// No navegador, console F12

window.__RBAC_DEBUG__.can(user, 'agendamento:criar')
// → true/false

window.__RBAC_DEBUG__.getPermissionReport(user)
// → { role, totalPermissions, allowed, denied, summary }

window.__RBAC_DEBUG__.PERMISSIONS
// → Matriz completa
```

### Exemplo Debug

```javascript
// Ver todas permissões do usuário atual
const { permissionReport } = useAuthorization();
console.log(permissionReport);

// Saída:
// {
//   role: 'recepcao',
//   totalPermissions: 6,
//   allowed: [
//     'agendamento:criar',
//     'agendamento:editar',
//     'agendamento:visualizar',
//     ...
//   ],
//   denied: [...],
//   summary: 'recepcao pode fazer 6 ações de 22 possíveis'
// }
```

---

## 7️⃣ Segurança

### ✅ Princípios

1. **Fail-Safe:** Se permissão não definida, nega
2. **Least Privilege:** Admin > Gestor > Recepção > Médico
3. **Sem Bypass:** Sempre verifica no backend também
4. **Auditoria:** Todas ações registradas (veja AUDIT_TRAIL)
5. **Frontend + Backend:** RBAC aqui é UX, validar sempre no BD

### ❌ O QUE FAZER

- ✅ Usar RBAC para esconder botões/formulários
- ✅ Validar NOVAMENTE no backend antes de salvar
- ✅ Logar tentativas de acesso negado
- ✅ Testar com diferentes roles

### ❌ O QUE NÃO FAZER

- ❌ Confiar APENAS em RBAC frontend para segurança
- ❌ Deixar dados sensíveis no localStorage
- ❌ Esquecer de validar no BD
- ❌ Hardcoding roles em componentes

---

## 8️⃣ Testes

### Teste 1: Recepção não pode editar valor

```javascript
// Mock user
const user = { id: '123', role: 'recepcao' };

// Verificar
expect(can(user, 'agendamento:editar-valor')).toBe(false);
```

### Teste 2: Admin pode tudo

```javascript
const user = { id: '123', role: 'admin' };

// Deve retornar true para todas permissões
ALL_PERMISSIONS.forEach(action => {
  expect(can(user, action)).toBe(true);
});
```

### Teste 3: Médico não pode criar

```javascript
const user = { id: '123', role: 'medico' };

expect(can(user, 'agendamento:criar')).toBe(false);
expect(can(user, 'agendamento:confirmar-presenca')).toBe(true);
```

---

## 9️⃣ Checklist de Deploy

- [ ] authorizationHelper.js em src/lib/
- [ ] useAuthorization.js em src/modules/agenda/hooks/
- [ ] Integrado em AgendamentoEditarModal
- [ ] Integrado em AgendaToolbar
- [ ] Testado com diferentes roles
- [ ] Validação backend OK (critical!)
- [ ] Documentação revisada

---

## 🔟 Exemplo Completo: Workflow de Agendamento

```javascript
// RECEPCIONISTA cria agendamento
useAuthorization().can('agendamento:criar') ✅
→ Clica "Novo"
→ Formulário aparece
→ Não vê campo "Valor" (escondido)
→ Salva com hora + paciente

// GESTOR edita agendamento
useAuthorization().can('agendamento:editar') ✅
useAuthorization().can('agendamento:editar-valor') ✅
→ Clica "Editar"
→ Formulário com TODOS campos incluindo "Valor"
→ Salva alterações

// MÉDICO confirma presença
useAuthorization().can('agendamento:confirmar-presenca') ✅
useAuthorization().can('agendamento:editar') ❌
→ Vê agendamentos dele
→ Botão "Confirmar Presença" disponível
→ Não consegue editar

// ADMIN vê tudo
useAuthorization().isAdmin ✅
→ Acesso completo a todas permissões
→ Pode ver relatórios e auditoria
```

---

## Status

✅ **RBAC Implementado e Pronto para Uso**

- Matriz de permissões: 22 ações × 5 roles
- Hook React: useAuthorization()
- Funções helper: can, canAll, canAny, isAdmin, etc
- Debug tools: console helpers
- Documentação: Completa

**Integração próxima:** Adicionar checks em componentes principais