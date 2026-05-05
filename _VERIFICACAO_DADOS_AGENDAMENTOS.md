# ✅ Verificação de Dados de Agendamentos

## Alterações Realizadas

### 1. **mapFromDatabase() Otimizado** ✅
- **Arquivo:** `src/lib/appointmentsApi.js` (linhas 171-261)
- **Mudança:** Adicionados campos em snake_case para compatibilidade com componentes de agenda
- **Campos Adicionados:**
  ```javascript
  patient_name: record.patients?.name || record.lead_name || null
  professional_name: record.professionals?.name || null
  service_name: record.services?.name || null
  room_name: record.rooms?.name || null
  payer_name: record.payers?.active === false ? null : (record.payers?.name || 'Particular')
  plan_name: record.plans?.name || null
  ```

### 2. **Query Otimizada** ✅
- **Arquivo:** `src/lib/appointmentsApi.js` (linhas 304-381)
- **Mudança:** Query agora traz todos os relacionamentos diretos
- **Relacionamentos Carregados:**
  ```
  patients (id, name, document_id, phone, cell_phone, prontuario_numero, photo_url)
  professionals (id, name)
  services (id, name, code, tuss_code)
  rooms (id, name)
  payers (id, name, active)
  plans (id, name, code)
  ```

### 3. **Componentes que Consomem os Dados**
- **AgendaSlot.jsx** (linha 221): Acessa `appointment.patient_name`, `appointment.professional_name`, `appointment.service_name` ✅
- **AgendaTimeline.jsx**: Usa AgendaSlot internamente ✅
- **ModalCriarAgendamento.jsx**: Usa `getAppointmentById()` para edição ✅

## 🔍 Checklist de Verificação

### Pré-Requisitos
- [ ] Dev server rodando em `http://localhost:3000/`
- [ ] Login realizado
- [ ] Clínica carregada

### Verificação 1: Dados na Agenda
1. Ir para **Clinica > Agenda > Dia 23/04/2026**
2. **Esperado:** Ver agendamentos com:
   - ✅ Nome do paciente completo (não apenas "Paciente")
   - ✅ Nome do profissional (ex: "Dr. João Silva")
   - ✅ Nome do serviço (ex: "Consulta Clínica")
   - ✅ Status com badge colorida

### Verificação 2: Console do Browser
1. Abrir **F12 > Console**
2. **Procurar por:**
   - ✅ `[listAppointments] Carregados X agendamentos para clínica`
   - ❌ Erros de tipo `Cannot read property 'name' of undefined`
   - ❌ Dados faltando

### Verificação 3: Editar Agendamento
1. Na agenda, clicar no agendamento
2. Modal deve abrir com **todos os campos preenchidos:**
   - ✅ Paciente selecionado
   - ✅ Profissional selecionado
   - ✅ Serviço selecionado
   - ✅ Data/Hora preenchidas
   - ✅ Valor (se aplicável)

### Verificação 4: Diferentes Visualizações
- [ ] **Timeline:** Dados aparecem nos slots
- [ ] **Tabela:** Todas as colunas populadas
- [ ] **Mês:** Eventos com informações básicas
- [ ] **Por Profissional:** Agendamentos agrupados

## 📊 Dados Esperados

### Exemplo de Agendamento Completo
```javascript
{
  // IDs
  id: "550e8400-e29b-41d4-a716-446655440000",
  patientId: "patient-123",
  professionalId: "prof-456",
  serviceId: "service-789",
  
  // Nomes (agora em camelCase e snake_case)
  patientName: "João Silva",           // ← CamelCase
  patient_name: "João Silva",          // ← snake_case (agenda usa)
  professionalName: "Dr. Maria Santos",
  professional_name: "Dr. Maria Santos",
  serviceName: "Consulta Clínica",
  service_name: "Consulta Clínica",
  
  // Data/Hora
  date: "2026-04-23",
  startTime: "10:00",
  endTime: "11:00",
  
  // Status
  status: "scheduled",
  notes: "Paciente confirmado"
}
```

## 🐛 Troubleshooting

Se os dados ainda não aparecerem:

1. **Verificar se a query está trazendo relacionamentos:**
   ```javascript
   // No console do browser
   await listAppointments(clinicId, new Date("2026-04-23"), new Date("2026-04-23"))
   // Deve mostrar agendamentos com:
   // - patients: { name, document_id, ... }
   // - professionals: { name }
   // - services: { name }
   ```

2. **Verificar se mapFromDatabase está funcionando:**
   ```javascript
   // No console
   const apt = await getAppointmentById("ID-DO-AGENDAMENTO")
   console.log(apt.patient_name) // Deve mostrar nome, não undefined
   console.log(apt.professional_name) // Deve mostrar nome, não undefined
   ```

3. **Verificar RLS policies:**
   - Confirmar que user tem acesso aos dados
   - Verificar se `patients`, `professionals`, `services` tables têm RLS habilitado
   - Se sim, verificar se policy permite leitura

## ✅ Status Final

- ✅ `mapFromDatabase()` completo com nomes em snake_case
- ✅ Query otimizada carregando relacionamentos
- ✅ Componentes atualizados para usar novos campos
- ✅ Dev server reiniciado com mudanças
- 🔄 **Aguardando verificação visual no navegador**

## 📝 Próximos Passos

1. Abrir agenda no navegador
2. Verificar se dados aparecem corretamente
3. Se não aparecerem: Verificar console do browser para erros
4. Se aparecerem: ✅ Problema resolvido!
