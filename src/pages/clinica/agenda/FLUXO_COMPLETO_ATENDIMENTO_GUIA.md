/\*\*

- FLUXO_COMPLETO_ATENDIMENTO_GUIA.md
-
- 🧠 GUIA COMPLETO DE USO - FLUXO DE ATENDIMENTO
-
- Este documento descreve como usar e integrar o novo sistema
- de fluxo de atendimento com separação de responsabilidades.
  \*/

# 📋 FLUXO COMPLETO DE ATENDIMENTO — GUIA TÉCNICO

## 🎯 Objetivo

Implementar um fluxo real de clínica com separação clara de responsabilidades entre:

- **Recepção** (check-in, validação, liberação)
- **Profissional** (atendimento limpo, sem distrações)
- **Gestor** (visão completa, controle total)

---

## 🏗️ ARQUITETURA

### Estrutura de Pastas

```
src/lib/
├── appointmentStatusEnums.js        ← 📌 ENUM DE STATUS (core)
└── appointmentsApi.js               ← API para agendamentos

src/pages/clinica/agenda/
├── views/
│   ├── AgendaFluxoCompleto.jsx      ← 🎯 WRAPPER PRINCIPAL
│   ├── AgendaRecepcaoView.jsx       ← 🏥 View da Recepção
│   ├── AgendaProfessionalView.jsx   ← 👨‍⚕️ View do Profissional
│   └── AgendaGestorView.jsx         ← 👔 View do Gestor
├── hooks/
│   └── useAppointmentPermissions.js ← 🔐 Hook de Permissões
```

---

## 📊 DIAGRAMA DE STATUS

```
AGENDADO
  ↓ (Confirmar)
CONFIRMADO
  ↓ (Marcar chegada)
AGUARDANDO
  ├→ PENDENTE (falta dados)
  ├→ FINANCEIRO_PENDENTE (falta pagamento)
  ├→ LIBERADO_PARA_ATENDIMENTO ⭐ (gatilho do profissional)
  │   ↓ (Iniciar atendimento)
  │   EM_ATENDIMENTO
  │     ↓ (Finalizar atendimento)
  │     FINALIZADO ✅
  └→ FALTA (paciente não compareceu)
```

---

## 🔑 ENUM DE STATUS

**Arquivo:** `src/lib/appointmentStatusEnums.js`

```javascript
export const APPOINTMENT_STATUS = {
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  AGUARDANDO: 'aguardando',
  PENDENTE: 'pendente',
  FINANCEIRO_PENDENTE: 'financeiro_pendente',
  LIBERADO_PARA_ATENDIMENTO: 'liberado_para_atendimento',
  EM_ATENDIMENTO: 'em_atendimento',
  FINALIZADO: 'finalizado',
  FALTA: 'falta',
  CANCELADO: 'cancelado',
  REMARCADO: 'remarcado',
};
```

### Utilidades Disponíveis

```javascript
import {
  APPOINTMENT_STATUS,
  getStatusLabel, // "agendado" → "Agendado"
  getStatusColor, // "agendado" → "bg-blue-100..."
  isReadyForCare, // Verifica se pode iniciar atendimento
  isInCare, // Verifica se está em atendimento
  isCareCompleted, // Verifica se finalizou
  isPendingAction, // Verifica se aguarda ação da recepção
  getValidStatusTransitions, // Transições válidas
  canPerformAction, // Valida ação por role
  getVisibleStatusByRole, // Status visíveis por perfil
  getAgendaModeForRole, // Determina view
} from '@/lib/appointmentStatusEnums';
```

---

## 🚀 COMO USAR

### 1️⃣ Integração na Rota de Agenda

**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx`

```javascript
import AgendaFluxoCompleto from './views/AgendaFluxoCompleto';

export default function AgendaPage() {
  return <AgendaFluxoCompleto />;
}
```

### 2️⃣ Usar Hook de Permissões

```javascript
import { useAppointmentPermissions } from '@/pages/clinica/agenda/hooks/useAppointmentPermissions';

export function MyComponent() {
  const { canReleaseForCare, canStartCare, canFinishCare, getBlockReason, isProfessional } =
    useAppointmentPermissions();

  return (
    <>
      {canReleaseForCare() && <button onClick={handleRelease}>Liberar para Atendimento</button>}

      {!canReleaseForCare() && (
        <p className="text-red-600">{getBlockReason('canReleaseForCare')}</p>
      )}
    </>
  );
}
```

---

## 🎭 AS TRÊS VIEWS

### 1️⃣ AgendaRecepcaoView (Recepção/Check-in)

**Responsabilidades:**

- ✅ Marcar chegada do paciente
- ✅ Conferir checklist obrigatório
- ✅ Processar financeiro
- ✅ **Liberar para atendimento** (ação crítica)
- ✅ Marcar faltas

**Estados Visíveis:**

```
AGENDADO, CONFIRMADO, AGUARDANDO, PENDENTE,
FINANCEIRO_PENDENTE, LIBERADO_PARA_ATENDIMENTO, FALTA
```

**Fluxo:**

```
Paciente chega → CONFIRMADO → AGUARDANDO
                          ↓ (conferir)
                       Checklist OK?
                          ↓ SIM
                   LIBERADO_PARA_ATENDIMENTO
```

**Exemplo de Uso:**

```javascript
import AgendaRecepcaoView from '@/pages/clinica/agenda/views/AgendaRecepcaoView';

<AgendaRecepcaoView appointments={appointments} onRefresh={handleRefresh} />;
```

---

### 2️⃣ AgendaProfessionalView (Atendimento)

**Responsabilidades:**

- ✅ Visualizar **APENAS** agendamentos liberados
- ✅ Iniciar atendimento (registra hora_inicio)
- ✅ Finalizar atendimento (registra hora_fim)
- ❌ NÃO pode editar agendamento
- ❌ NÃO pode ver financeiro
- ❌ NÃO pode liberar pacientes

**Estados Visíveis:**

```
LIBERADO_PARA_ATENDIMENTO, EM_ATENDIMENTO
```

**Fluxo:**

```
LIBERADO_PARA_ATENDIMENTO
  ↓ (Clica "Iniciar")
EM_ATENDIMENTO (registra care_start_time)
  ↓ (Clica "Finalizar")
FINALIZADO (registra care_end_time)
```

**Exemplo de Uso:**

```javascript
import AgendaProfessionalView from '@/pages/clinica/agenda/views/AgendaProfessionalView';

<AgendaProfessionalView
  appointments={appointments}
  onRefresh={handleRefresh}
  professionalId={user.id}
/>;
```

**⚠️ IMPORTANTE:** O profissional só vê seus próprios agendamentos!

---

### 3️⃣ AgendaGestorView (Visão Completa)

**Responsabilidades:**

- ✅ Visualizar **TODOS** os status
- ✅ Controlar transições de status (dropdown)
- ✅ Ver relatórios e KPIs
- ✅ Filtrar por status
- ✅ Agrupar por profissional

**KPIs Disponíveis:**

```
- Total de agendamentos
- Aguardando liberação
- Em progresso
- Completados
- Taxa de conclusão (%)
```

**Exemplo de Uso:**

```javascript
import AgendaGestorView from '@/pages/clinica/agenda/views/AgendaGestorView';

<AgendaGestorView appointments={appointments} onRefresh={handleRefresh} />;
```

---

## 🔐 PERMISSÕES POR PERFIL

### Tabela de Controle de Acesso

| Ação                  | Recepção | Profissional | Gestor |
| --------------------- | -------- | ------------ | ------ |
| Liberar atendimento   | ✅       | ❌           | ✅     |
| Iniciar atendimento   | ❌       | ✅           | ❌     |
| Finalizar atendimento | ❌       | ✅           | ❌     |
| Ver financeiro        | ❌       | ❌           | ✅     |
| Editar agendamento    | ✅       | ❌           | ✅     |
| Marcar chegada        | ✅       | ❌           | ✅     |
| Marcar falta          | ✅       | ❌           | ✅     |

### Implementação

```javascript
// src/lib/appointmentStatusEnums.js
export const ROLE_PERMISSIONS = {
  reception: {
    canReleaseForCare: true,
    canStartCare: false,
    canFinishCare: false,
    canViewFinance: false,
    // ... outras permissões
  },
  professional: {
    canReleaseForCare: false,
    canStartCare: true,
    canFinishCare: true,
    canViewFinance: false,
    // ... outras permissões
  },
  manager: {
    canReleaseForCare: true,
    canStartCare: true,
    canFinishCare: true,
    canViewFinance: true,
    // ... todas as permissões
  },
};
```

---

## 📡 FLUXO DE DADOS

### 1. Recepção marca chegada

```javascript
// Agendamento vem como CONFIRMADO
await updateAppointment(apt.id, {
  status: APPOINTMENT_STATUS.AGUARDANDO,
});
```

### 2. Recepção faz checklist

```javascript
// Se tudo OK:
await updateAppointment(apt.id, {
  status: APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO,
});

// Se falta algo:
await updateAppointment(apt.id, {
  status: APPOINTMENT_STATUS.PENDENTE,
});
```

### 3. Profissional inicia atendimento

```javascript
await updateAppointment(apt.id, {
  status: APPOINTMENT_STATUS.EM_ATENDIMENTO,
  care_start_time: new Date().toISOString(),
});
```

### 4. Profissional finaliza atendimento

```javascript
await updateAppointment(apt.id, {
  status: APPOINTMENT_STATUS.FINALIZADO,
  care_end_time: new Date().toISOString(),
});
```

---

## 🛡️ SEGURANÇA E VALIDAÇÕES

### Validações Críticas

1. **Profissional só vê seus agendamentos**

   ```javascript
   if (apt.professional_id !== user.id && role === 'professional') {
     return false; // Bloqueado
   }
   ```

2. **Profissional não pode pular etapas**

   ```javascript
   if (currentStatus !== LIBERADO_PARA_ATENDIMENTO) {
     // Não pode iniciar
     return false;
   }
   ```

3. **Status final é imutável**

   ```javascript
   if ([FINALIZADO, CANCELADO, FALTA].includes(status)) {
     return false; // Não pode mudar
   }
   ```

4. **Recepção não vê financeiro**
   ```javascript
   if (role === 'reception' && action === 'canViewFinance') {
     return false; // Bloqueado
   }
   ```

---

## 🧪 TESTES E VALIDAÇÃO

### Checklist de Testes

**Recepção:**

- [ ] Visualiza agendamentos do dia
- [ ] Clica "Marcar Chegada" → status muda para AGUARDANDO
- [ ] Faz checklist
- [ ] Clica "Liberar para Atendimento" → status muda para LIBERADO
- [ ] Não consegue ver botões de profissional (EM_ATENDIMENTO, FINALIZADO)
- [ ] Não consegue ver financeiro

**Profissional:**

- [ ] Visualiza APENAS agendamentos LIBERADO_PARA_ATENDIMENTO
- [ ] Clica "Iniciar" → status muda para EM_ATENDIMENTO
- [ ] Visualiza "Em Atendimento Agora" em destaque
- [ ] Clica "Finalizar" → status muda para FINALIZADO
- [ ] Não consegue editar agendamento
- [ ] Não consegue ver financeiro
- [ ] Filtra por seus agendamentos

**Gestor:**

- [ ] Visualiza TODOS os agendamentos
- [ ] Vê todos os status
- [ ] Dropdown para mudar status
- [ ] Visualiza KPIs
- [ ] Filtra por status
- [ ] Agrupa por profissional
- [ ] Consegue fazer transições manuais se necessário

---

## 🐛 TROUBLESHOOTING

### "Profissional não vê agendamentos"

1. Verificar se há agendamentos com status `LIBERADO_PARA_ATENDIMENTO`
2. Verificar se `professional_id` está preenchido
3. Verificar se o usuário logado tem `currentRole = "professional"`

### "Recepção vê botões de profissional"

1. Usar `useAppointmentPermissions()` para validar permissão
2. Renderizar botão condicionalmente: `{canStartCare && <button>...}</button>`
3. NÃO usar CSS para esconder (usar lógica de permissão)

### "Status não está transicionando"

1. Verificar `getValidStatusTransitions()` para transições válidas
2. Verificar se há erro no `updateAppointment()`
3. Verificar permissões do usuário

---

## 📚 PRÓXIMOS PASSOS

### Fase 2: Melhorias

- [ ] Adicionar notificações em tempo real (WebSocket)
- [ ] Implementar prontuário eletrônico integrado
- [ ] Adicionar cobrança/pagamento automático
- [ ] Relatórios de produtividade do profissional
- [ ] SMS/Email de confirmação de liberação
- [ ] Integração com SMS de lembrete

### Fase 3: Analytics

- [ ] Dashboard com KPIs por profissional
- [ ] Tempo médio de atendimento
- [ ] Taxa de no-show
- [ ] Receita por profissional
- [ ] Ocupação da clínica

---

## 📞 SUPORTE

Para dúvidas sobre:

- **Status e fluxo**: Ver `appointmentStatusEnums.js`
- **Permissões**: Ver `ROLE_PERMISSIONS` em `appointmentStatusEnums.js`
- **Views**: Ver componentes em `views/`
- **Hooks**: Ver `useAppointmentPermissions.js`

---

## ✅ CONCLUSÃO

Este sistema fornece:

✔️ **Fluxo Real de Clínica**
✔️ **Separação Clara de Responsabilidades**
✔️ **Controle Rigoroso de Permissões**
✔️ **Interface Apropriada para Cada Perfil**
✔️ **Base Sólida para Escalar**

Cada etapa tem:

- ✅ Dono claro (Recepção/Profissional/Gestor)
- ✅ Objetivo específico
- ✅ Ações permitidas
- ✅ Status próprios

**Resultado Final:**
🎯 Sem erros de processo
🎯 Sem conflitos de acesso
🎯 Sem glosas ou retrabalho
🎯 Exatamente o que clínicas reais precisam
