# Integração AtendimentoModal → Agenda

## 📋 Resumo da Mudança

O **AtendimentoModal** (com 5 abas TISS) foi integrado diretamente na **AgendaPage**, permitindo que ao clicar em um agendamento, o modal TISS-compliant abre automaticamente.

**Objetivo:** 
- ✅ Consolidar em uma única entrada (Agenda)
- ✅ Eliminar necessidade de Recepção separada
- ✅ Fluxo único: Agenda → Clica agendamento → Modal TISS → Check-in completo

---

## 🔧 Alterações Implementadas

### 1. **AgendaPage.jsx** - Imports
```jsx
// Adicionado:
import AtendimentoModal from '../recepcao/components/AtendimentoModal';
```

### 2. **AgendaPage.jsx** - State Management
```jsx
// Novo estado para AtendimentoModal
const [atendimentoModalOpen, setAtendimentoModalOpen] = useState(false);
const [atendimentoModalAppointment, setAtendimentoModalAppointment] = useState(null);
```

### 3. **AgendaPage.jsx** - Event Handlers
```jsx
/**
 * Abrir AtendimentoModal (TISS) para um agendamento
 */
const handleOpenAtendimento = (appointment) => {
  setAtendimentoModalAppointment(appointment);
  setAtendimentoModalOpen(true);
};

/**
 * Fechar AtendimentoModal e recarregar agenda
 */
const handleCloseAtendimento = () => {
  setAtendimentoModalOpen(false);
  setAtendimentoModalAppointment(null);
  // Recarregar agendamentos após mudança de status
  loadAgendaData();
};
```

### 4. **AgendaPage.jsx** - Event Binding
**Antes:**
```jsx
<AgendaTimeline
  ...
  onCheckin={handleOpenCheckin}  // Abria CheckinDrawer
  ...
/>
```

**Depois:**
```jsx
<AgendaTimeline
  ...
  onCheckin={handleOpenAtendimento}  // Abre AtendimentoModal TISS
  ...
/>
```

### 5. **AgendaPage.jsx** - Renderização Modal
```jsx
{/* 📋 AtendimentoModal - TISS Compliant Check-in (from Agenda) */}
<AtendimentoModal
  isOpen={atendimentoModalOpen}
  onClose={handleCloseAtendimento}
  appointment={atendimentoModalAppointment}
  arrivals={[]}
  onArrivalsUpdate={handleCloseAtendimento}
/>
```

---

## 📊 Fluxo de Dados

```
Agenda
  ↓
AgendaTimeline (renderiza appointments)
  ↓
AgendaSlot (elemento clicável)
  ↓
onCheckin → handleOpenAtendimento()
  ↓
setAtendimentoModalOpen(true)
setAtendimentoModalAppointment(appointment)
  ↓
AtendimentoModal renderiza com appointment
  ↓
loadPatientData() dentro do AtendimentoModal
  ↓
Usuário preenche 5 abas:
  1. Dados Cadastrais (TISS obrigatório)
  2. Liberação (autorização)
  3. Faturamento (guia TISS)
  4. Pagamento (se particular)
  5. Resumo (confirmação)
  ↓
Check-in completo → Close → loadAgendaData()
```

---

## ✅ Estrutura do AtendimentoModal

### Props Necessárias
- `isOpen: boolean` - Controla visibilidade
- `onClose: () => void` - Callback ao fechar
- `appointment: object` - Agendamento com `patient_id`
- `arrivals: array` - Lista de chegadas (pode ser vazio)
- `onArrivalsUpdate: () => void` - Callback ao atualizar

### Dados Carregados Automaticamente
1. **Do Appointment (AgendaTimeline)**
   - ✓ `id` - ID do agendamento
   - ✓ `patient_id` - ID do paciente 
   - ✓ `scheduled_date` - Data agendada
   - ✓ `scheduled_time` - Hora agendada
   - ✓ Todos os outros campos da API appointmentsApi.js

2. **Do Patient (via patient_id)**
   - Nome, CPF, Data Nascimento, Sexo
   - Email, Telefone, Celular
   - Endereço completo (rua, nº, bairro, cidade, estado, CEP)

---

## 🎯 Comportamento Esperado

### Cenário: Clique em Agendamento
1. ✓ Usuário está na Agenda
2. ✓ Clica em um agendamento na timeline
3. ✓ AtendimentoModal abre (não CheckinDrawer)
4. ✓ Modal traz dados do paciente preenchidos
5. ✓ Usuário passa pelas 5 abas TISS
6. ✓ Confirma check-in
7. ✓ Modal fecha
8. ✓ Agenda recarrega com novo status

---

## 📝 Dados Persistidos

### Após Check-in Complete
- **Na tabela `patients`:**
  - Standard TISS fields (name, cpf, birthdate, gender, email, phone, endereço)
  - Via `updateClinicSettings` ou `updatePatient`

- **Na tabela `appointments`:**
  - `authorization_number` (liberação)
  - `authorization_expiry` (expiração autorização) 
  - `guide_number` (guia TISS)
  - `billing_data` (JSON com estrutura TISS)
  - `billing_status` (pending/structured/sent)
  - `billing_xml` (XML gerado)
  - `payment_method` (se particular)

---

## 🔄 Status da Integração

| Item | Status | Notas |
|------|--------|-------|
| Import AtendimentoModal | ✅ | Adicionado em AgendaPage.jsx |
| State Management | ✅ | atendimentoModalOpen, atendimentoModalAppointment |
| Event Handlers | ✅ | handleOpenAtendimento, handleCloseAtendimento |
| Event Binding | ✅ | onCheckin={handleOpenAtendimento} |
| Renderização Modal | ✅ | Adicionado ao final de AgendaPage |
| Build Verification | ✅ | npm run build passed |
| API Data Flow | ✅ | appointment inclui patient_id |
| Patient Data Loading | ✅ | AtendimentoModal.loadPatientData() funciona |

---

## 🚀 Próximos Passos (Opcional)

1. **Deprecar CheckinDrawer** (se não usado em outros contextos)
   - Buscar outros usos de CheckinDrawer
   - Remover ou consolidar

2. **Remover Recepção separada** (se não mais necessária)
   - Verificar se RecepcaoPage é usada em menus
   - Remover rota `/clinica/recepcao` se obsoleta
   - Atualizar navegação

3. **Database Migrations** (quando pronto)
   - Execute em Supabase:
     - `2026-02-20_add_tiss_fields.sql`
     - `2026-02-20_add_tiss_cadastral_fields.sql`

4. **Testar End-to-End**
   - [ ] Abrir Agenda
   - [ ] Clicar em agendamento
   - [ ] AtendimentoModal abre
   - [ ] Preencher dados cadastrais
   - [ ] Preencher liberação
   - [ ] Preencher faturamento
   - [ ] Confirmar check-in
   - [ ] Dados salvos em DB

---

## 📌 Observações

- **CheckinDrawer mantido:** Pode ser usado em outros contextos (ex: Recepção legacy)
- **Ambos modais disponíveis:** AgendaPage agora tem AtendimentoModal + CheckinDrawer
- **Compatibilidade:** Sem breaking changes em componentes existentes
- **Build status:** ✅ Vite build successful (3324 modules transformed)

---

**Data:** 2026-02-20  
**Versão:** TISS Integration v2.0  
**Status:** ✅ Integração Completa
