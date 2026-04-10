/**
 * ⚡ INÍCIO RÁPIDO — 3 PASSOS
 * 
 * Copie e cole e comece a usar!
 */

# ⚡ FLUXO COMPLETO DE ATENDIMENTO — INÍCIO RÁPIDO (3 PASSOS)

## 🚀 PASSO 1: Integre o Wrapper na Rota de Agenda

**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx`

```javascript
import AgendaFluxoCompleto from "./views/AgendaFluxoCompleto";

export default function AgendaPage() {
  return <AgendaFluxoCompleto />;
}
```

**Pronto!** Agora a agenda funcionará com:
- ✅ Recepção vê checklist
- ✅ Profissional vê apenas liberados
- ✅ Gestor vê tudo

---

## 🔄 PASSO 2: Teste o Fluxo

### Cenário de Teste:

1. **Login como Recepção:**
   - Vai para `/clinica/agenda`
   - Vê `AgendaRecepcaoView` (com checklist)
   - Cria ou procura um agendamento
   - Clica em "Marcar Chegada"
   - Faz checklist
   - Clica em "LIBERAR PARA ATENDIMENTO"

2. **Login como Profissional:**
   - Vai para `/clinica/agenda`
   - Vê `AgendaProfessionalView` (interface limpa)
   - Vê APENAS agendamentos liberados
   - Clica em "Iniciar Atendimento"
   - Status muda para EM_ATENDIMENTO
   - Clica em "Finalizar Atendimento"
   - Status muda para FINALIZADO ✅

3. **Login como Gestor:**
   - Vai para `/clinica/agenda`
   - Vê `AgendaGestorView` (visão completa)
   - Vê TODOS os status
   - Vê KPIs em tempo real
   - Consegue mudar status manualmente se necessário

---

## 📚 PASSO 3: Entenda os 3 Componentes Principais

### 📋 AgendaRecepcaoView
```
├─ Responsabilidade: Check-in do paciente
├─ Status visíveis: AGENDADO → CONFIRMADO → AGUARDANDO → LIBERADO
├─ Ações principais:
│  ├─ Marcar Chegada
│  ├─ Conferir Checklist
│  ├─ Processar Financeiro
│  └─ ✅ LIBERAR PARA ATENDIMENTO (ação crítica!)
└─ Permissão: Apenas "recepção"
```

### 👨‍⚕️ AgendaProfessionalView
```
├─ Responsabilidade: Atendimento clínico
├─ Status visíveis: LIBERADO_PARA_ATENDIMENTO + EM_ATENDIMENTO
├─ Ações principais:
│  ├─ ✅ Iniciar Atendimento (LIBERADO → EM_ATENDIMENTO)
│  └─ ✅ Finalizar Atendimento (EM_ATENDIMENTO → FINALIZADO)
├─ Interface: Limpa, sem distrações
└─ Permissão: Apenas "professional"
```

### 👔 AgendaGestorView
```
├─ Responsabilidade: Visão completa e controle
├─ Status visíveis: TODOS (9 status)
├─ Ações principais:
│  ├─ Ver KPIs (total, aguardando, em progresso, etc)
│  ├─ Filtrar por status
│  ├─ Agrupar por profissional
│  └─ Mudar status via dropdown
└─ Permissão: "manager" ou "admin"
```

---

## 🔐 PERMISSÕES RÁPIDAS

| | Recepção | Profissional | Gestor |
|-|----------|-------------|--------|
| Liberar | ✅ | ❌ | ✅ |
| Iniciar | ❌ | ✅ | ❌ |
| Finalizar | ❌ | ✅ | ❌ |
| Ver Financeiro | ❌ | ❌ | ✅ |

---

## 💡 DICAS RÁPIDAS

### 1. Usar Enums no Seu Código

```javascript
import { APPOINTMENT_STATUS, getStatusLabel } from "@/lib/appointmentStatusEnums";

// Em vez de strings soltas:
// ❌ status === "liberado_para_atendimento"
// ✅ status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO

console.log(getStatusLabel(apt.status)); // "Liberado para Atendimento"
```

### 2. Validar Permissões Antes de Renderizar

```javascript
import { useAppointmentPermissions } from "@/pages/clinica/agenda/hooks/useAppointmentPermissions";

export function MeuBotao() {
  const { canReleaseForCare } = useAppointmentPermissions();

  if (!canReleaseForCare()) {
    return <p>❌ Sem permissão</p>;
  }

  return <button>✅ Liberar</button>;
}
```

### 3. Filtrar por Visibilidade de Perfil

```javascript
import { getVisibleStatusByRole } from "@/lib/appointmentStatusEnums";
import { useAuth } from "@/contexts/SupabaseAuthContext";

export function MeuComponente({ appointments }) {
  const { currentRole } = useAuth();
  const visibleStatus = getVisibleStatusByRole(currentRole);
  
  const filtered = appointments.filter(apt =>
    visibleStatus.includes(apt.status)
  );
}
```

---

## 🧪 TESTE RÁPIDO (5 MIN)

1. **Crie um agendamento:**
   ```
   Paciente: João Silva
   Profissional: Dr. Maria
   Data: Hoje
   Hora: 10:00
   ```
   Status será: `AGENDADO` ✓

2. **Como Recepção:**
   - Marque chegada → `AGUARDANDO`
   - Faça checklist
   - Clique liberar → `LIBERADO_PARA_ATENDIMENTO` ✓

3. **Como Profissional (Dr. Maria):**
   - Veja João Silva na lista
   - Clique "Iniciar" → `EM_ATENDIMENTO` ✓
   - Clique "Finalizar" → `FINALIZADO` ✓

4. **Como Gestor:**
   - Veja o fluxo todo
   - Taxa de conclusão = 1 (100%)

---

## 📁 ARQUIVOS IMPORTANTES

```
src/lib/
└─ appointmentStatusEnums.js         ← Enums e lógica central

src/pages/clinica/agenda/
├─ views/
│  ├─ AgendaFluxoCompleto.jsx        ← Roteador principal
│  ├─ AgendaRecepcaoView.jsx         ← Tela da recepção
│  ├─ AgendaProfessionalView.jsx     ← Tela do profissional
│  └─ AgendaGestorView.jsx           ← Tela do gestor
├─ hooks/
│  └─ useAppointmentPermissions.js   ← Validações
└─ FLUXO_COMPLETO_ATENDIMENTO_GUIA.md ← Documentação completa
```

---

## ❓ FAQ RÁPIDO

**P: Profissional não vê agendamentos?**
A: Verificar se status é `LIBERADO_PARA_ATENDIMENTO` e se `professional_id` está correto.

**P: Recepção consegue ver botão de profissional?**
A: Use `useAppointmentPermissions()` para validar, não CSS.

**P: Como mudar status manualmente?**
A: Apenas gestor consegue via dropdown. Recepção e profissional têm fluxo rígido.

**P: Posso criar meu próprio status?**
A: Edite `src/lib/appointmentStatusEnums.js` (mas cuidado com o fluxo!)

---

## 🎯 PRÓXIMO PASSO

Depois de implementado, considere:

- [ ] Adicionar notificações em tempo real
- [ ] Integrar prontuário
- [ ] Adicionar cobrança automática
- [ ] Relatórios por profissional
- [ ] SMS de confirmação

---

## ✅ CONCLUSÃO

Pronto! Você tem:

✔️ Fluxo real de clínica  
✔️ Sem código duplicado  
✔️ Segurança de permissões  
✔️ 3 views especializadas  
✔️ Documentação completa  

**Que comece a usar! 🚀**
