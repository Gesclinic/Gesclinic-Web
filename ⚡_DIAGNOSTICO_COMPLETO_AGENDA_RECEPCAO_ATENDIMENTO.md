# 🔍 DIAGNÓSTICO COMPLETO: Fluxo Agendamento, Edição, Recepção e Atendimento

**Data:** 2026-03-03
**Status:** ❌ 4 PROBLEMAS CRÍTICOS ENCONTRADOS

---

## 📋 RESUMO EXECUTIVO

O fluxo de agendamento, edição, recepção e finalização tem **4 problemas críticos**:

1. ❌ **RLS Policy ainda não funciona para UPDATE** (mesmo após correção)
2. ❌ **Fluxo de edição tem dois caminhos diferentes** (confuso e duplicado)
3. ❌ **Modal não abre corretamente em modo edição** (falta passar dados)
4. ❌ **Recepção, Profissional e Finalização não integrados** (fluxo incompleto)

---

## 🔴 PROBLEMA 1: RLS Policy UPDATE Silenciosamente Falha

### Sintoma
- Clica em ATUALIZAR
- updateError: null (sem erro)
- updateResult: [] (array vazio)
- **Data NÃO muda no banco**

### Causa Raiz
RLS policy `appointments_update` foi corrigida com WITH CHECK, MAS pode haver:

**Opção A:** Política ainda está incompleta
```sql
-- ❌ INCOMPLETA (possível problema)
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
```

**Opção B:** Usuario não tem `clinic_id` correto em tabela `users`
```
SELECT id, clinic_id FROM users WHERE id = auth.uid();
-- Se clinic_id for NULL ou vazio → RLS rejeita UPDATE
```

**Opção C:** O .select() no UPDATE está causando problema
```javascript
// Possível problema:
.update(payload)
.eq('id', appointmentIdToEdit)
.select()  // ← Pode estar retornando [] por RLS
```

### Localização do Código
- **Modal:** `/src/pages/clinica/agenda/components/ModalCriarAgendamento.jsx` linhas 883-920
- **Migração oficial:** `/supabase/migrations/20260118_rls_policies.sql` linhas 218-226
- **Hotfix criado:** `/supabase/migrations/2026-03-03_fix_appointments_rls_update_policy.sql` (já executado)

### Solução
**PASSO 1:** Verificar se usuario tem clinic_id no Supabase
```sql
-- Execute no Supabase SQL Editor
SELECT id, email, clinic_id FROM users WHERE email = 'seu-email@aqui.com';
```

**PASSO 2:** Se clinic_id for NULL:
```sql
UPDATE users 
SET clinic_id = 'uuid-da-sua-clinica'
WHERE id = auth.uid();
```

**PASSO 3:** Para testar se RLS funciona:
```sql
-- Teste com token JWT atual
SELECT * FROM appointments WHERE id = 'seu-appointment-id';
-- Se vazio → RLS está bloqueando SELECT também (problema maior)

-- Tente UPDATE
UPDATE appointments 
SET scheduled_date = '2026-03-08'
WHERE id = 'seu-appointment-id';
-- Se error → RLS está bloqueando UPDATE
```

---

## 🟡 PROBLEMA 2: Fluxo de Edição Duplicado e Confuso

### Sintoma
Existem **2 caminhos diferentes** para editar agendamento:

**Caminho 1: Via AgendaDayView → handleEdit (MODAL LOCAL)**
```
AgendaDayView.jsx linha 573
├─ handleEdit(aptId)
├─ setAppointmentToEdit(apt)
├─ setModalCreateOpen(true)  ← Abre MODAL LOCAL no próprio view
└─ ??? Qual modal é esse? Não encontrado
```

**Caminho 2: Via AgendaDayView → handleReschedule (MODAL PRINCIPAL)**
```
AgendaDayView.jsx linha 570
├─ handleReschedule(aptId)
├─ onEditAppointment(aptId)  ← Passa para index.jsx
│
INDEX.jsx linha 561
├─ handleEditAppointment(aptId)
├─ setAppointmentIdToEdit(aptId)
├─ setNovoAgendamentoInfo(null)
├─ setModalNovoOpen(true)
└─ Abre ModalCriarAgendamento (CORRETO!)
```

### Problema
- **Código está duplicado** (dois jeitos de fazer a mesma coisa)
- **handleEdit usa `setModalCreateOpen` que não é definido** (pode estar causando erro)
- **handleReschedule usa o fluxo correto**
- **Usuario está confuso qual clicar**

### Localização
- **AgendaDayView.jsx** linhas 573-579 (handleEdit - PROBLEMA)
- **AgendaDayView.jsx** linhas 570-571 (handleReschedule - CORRETO)
- **index.jsx** linhas 553-564 (handleEditAppointment - CORRETO)

### Solução
**REMOVER handleEdit** (linha 573-579) e usar APENAS handleReschedule
```javascript
// ❌ DELETAR:
const handleEdit = (aptId) => {
  const apt = appointments.find(a => a.id === aptId);
  if (apt) {
    setAppointmentToEdit(apt);
    setModalCreateOpen(true);  // ← Esse state NÃO existe!
  }
};

// ✅ USAR APENAS:
const handleReschedule = (aptId) => {
  console.log('🔄 Remarcar:', aptId);
  onEditAppointment(aptId);  // ← Chama handleEditAppointment do index.jsx
};
```

---

## 🟠 PROBLEMA 3: Modal Não Passa Dados ao Abrir em Modo Edição

### Sintoma
- Click para editar
- Modal abre
- **Campos ficam vazios** (não aparecem dados atuais)
- Não consegue alterar porque não sabe qual agendamento está editando

### Causa
Em `index.jsx` linha 867, quando `appointmentIdToEdit` é setado:

```javascript
// ✅ Correto: setAppointmentIdToEdit(appointmentId)
// BUT: O modal NÃO carrega os dados do appointment!!

<ModalCriarAgendamento
  open={modalNovoOpen}
  appointmentIdToEdit={appointmentIdToEdit}  // ← Passa o ID
  data={novoAgendamentoInfo}  // ← Mas data é NULL em modo edição!
  // ... resto das props
/>
```

**O Modal recebe:**
- `appointmentIdToEdit` = UUID do agendamento
- `data` = NULL (porque setNovoAgendamentoInfo(null) foi chamado)

**Resultado:** Modal não sabe qual é o agendamento que deve editar!

### Localização
- **index.jsx** linhas 854-876 (ModalCriarAgendamento props)
- **ModalCriarAgendamento.jsx** linhas 440-470 (useEffect que deveria carregar dados)

### Solução
**ADICIONAR useEffect no Modal para carregar dados quando appointmentIdToEdit mudar:**

```javascript
// Em ModalCriarAgendamento.jsx, adicionar isso:
useEffect(() => {
  if (appointmentIdToEdit) {
    // Buscar dados do agendamento para edição
    const loadAppointmentData = async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, patient_id, professional_id, service_id, room_id,
          payer_id, plan_id, scheduled_date, scheduled_time, end_time,
          value, notes, status,
          patients:patient_id(id, name, phone),
          professionals:professional_id(id, name),
          services:service_id(id, name),
          rooms:room_id(id, name),
          payers:payer_id(id, name),
          plans:plan_id(id, name)
        `)
        .eq("id", appointmentIdToEdit)
        .single();

      if (data) {
        setForm({
          patientId: data.patient_id,
          patientName: data.patients?.name || '',
          phone: data.patients?.phone || '',
          professionalId: data.professional_id,
          serviceId: data.service_id,
          roomId: data.room_id,
          payerId: data.payer_id,
          planId: data.plan_id,
          date: data.scheduled_date,
          time: data.scheduled_time.substring(0, 5), // HH:MM
          value: data.value,
          notes: data.notes,
          status: data.status,
        });
        setOriginalDate(data.scheduled_date);
      }
    };

    loadAppointmentData();
  }
}, [appointmentIdToEdit]);  // ← Executar quando ID muda
```

---

## 🔴 PROBLEMA 4: Recepção, Profissional e Finalização Não Integrados

### Arquivo Estrutura Atual
```
✅ IMPLEMENTADO (Agenda/Agendamento):
├─ src/pages/clinica/agenda/ (Criação/Edição de agendamentos)
└─ src/pages/clinica/agendamento/ (Confirmação de agendamento)

❌ NÃO INTEGRADO:
├─ src/pages/clinica/recepcao/ (Recepção - Check-in)
├─ src/pages/clinica/Atendimento/ (Profissional - Execução)
└─ ? (Finalização - Onde fica?)
```

### Problemas
1. **Recepção não integrada com Agendamento**
   - Paciente agendado → Como transiciona para recepção?
   - Status não muda automaticamente
   
2. **Profissional não sabe qual é seu paciente**
   - Agenda mostra agendamento
   - Mas não integrado com Atendimento.jsx
   
3. **Finalização ausente**
   - Onde fecha/finaliza atendimento?
   - Não há workflow marcado

### Fluxo Esperado
```
1. AGENDAMENTO (✅ Existe)
   └─ Agendamento criado com status="scheduled"

2. RECEPÇÃO (❌ Não conectado)
   └─ Paciente chega
   └─ Click "Check-in" → status muda para "at_reception"
   └─ Paciente em sala de espera

3. PROFISSIONAL (❌ Não conectado)
   └─ Profissional vê paciente pronto
   └─ Click "Iniciar atendimento" → status muda para "in_progress"
   └─ Realiza atendimento

4. FINALIZAÇÃO (❌ Ausente)
   └─ Profissional termina atendimento
   └─ Click "Finalizar" → status muda para "completed"
   └─ Gera financeiro/faturamento
```

### Localização
- **Agenda:** `/src/pages/clinica/agenda/`
- **Agendamento (confirmação):** `/src/pages/clinica/agendamento/AppointmentConfirmationPage.jsx`
- **Recepção:** `/src/pages/clinica/recepcao/RecepcaoPage.jsx` (EXISTE mas não integrado)
- **Atendimento:** `/src/pages/clinica/Atendimento/Atendimento.jsx` (EXISTE mas não integrado)

### Solução
Criar fluxo integrado com status transitions:

```javascript
// Estados de agendamento
const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',        // Agendado
  AT_RECEPTION: 'at_reception',  // Em recepção
  IN_PROGRESS: 'in_progress',    // Em atendimento
  COMPLETED: 'completed',        // Finalizado
  CANCELLED: 'cancelled',        // Cancelado
};

// Transições permitidas
const STATUS_TRANSITIONS = {
  'scheduled' => ['at_reception', 'cancelled'],
  'at_reception' => ['in_progress', 'scheduled', 'cancelled'],
  'in_progress' => ['completed', 'at_reception'],
  'completed' => [],  // Final
  'cancelled' => [],  // Final
};
```

---

## 📋 CHECKLIST DE CORREÇÃO

### FASE 1: Diagnosticar RLS (URGENTE)
- [ ] Executar query: `SELECT id, clinic_id FROM users WHERE id = auth.uid();`
- [ ] Verificar se clinic_id é NULL
- [ ] Se NULL, atualizar: `UPDATE users SET clinic_id = ... WHERE id = auth.uid();`
- [ ] Testar SELECT em appointments (deve retornar dados)
- [ ] Testar UPDATE em appointments (deve funcionar)

### FASE 2: Limpar Fluxo de Edição
- [ ] Remover `handleEdit` em AgendaDayView.jsx (linha 573-579)
- [ ] Remover `setModalCreateOpen` (não existe)
- [ ] Usar APENAS `handleReschedule` → `onEditAppointment`

### FASE 3: Carregar Dados em Modo Edição
- [ ] Adicionar useEffect em ModalCriarAgendamento.jsx
- [ ] Buscar dados quando `appointmentIdToEdit` mudar
- [ ] Preencher form com dados carregados

### FASE 4: Integrar Recepção
- [ ] Criar botão "Check-in" em Agenda que muda status para "at_reception"
- [ ] Conectar RecepcaoPage.jsx com Agenda
- [ ] Mostrar pacientes com status "at_reception" na recepção

### FASE 5: Integrar Profissional
- [ ] Conectar Atendimento.jsx com Agenda
- [ ] Mostrar agendamentos com status "at_reception" para profissional
- [ ] Botão "Iniciar" muda status para "in_progress"
- [ ] Botão "Finalizar" muda para "completed"

### FASE 6: Criar Finalização
- [ ] Integração com financeiro ao completar
- [ ] Gerar fatura automaticamente
- [ ] Atualizar estoque se necessário

---

## 🚀 PRÓXIMOS PASSOS

1. **HOJE:** Execute a query do Problema 1 no Supabase
2. **HOJE:** Se clinic_id for NULL, atualizar
3. **AMANHÃ:** Remover código duplicado (Problema 2)
4. **AMANHÃ:** Adicionar useEffect para carregar dados (Problema 3)
5. **PRÓXIMA SEMANA:** Integrar fluxo completo (Problema 4)
