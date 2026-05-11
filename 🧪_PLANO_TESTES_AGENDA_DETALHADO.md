# 🧪 PLANO DE TESTES - AGENDA AUDIT

## Objetivo
Validar cada ponto da auditoria com testes específicos sem quebrar o sistema.

---

## TESTE 1: MAPEAMENTO CAMELCASE vs SNAKE_CASE

### Teste 1.1: Verificar se mapFromDatabase retorna camelCase
```javascript
// Arquivo: src/lib/appointmentsApi.js
// Executar no console do browser após buscar um agendamento

import { listAppointments } from '@/lib/appointmentsApi';

const result = await listAppointments({
  clinicId: 'your-clinic-id',
  start: '2026-05-06T00:00:00Z',
  end: '2026-05-06T23:59:59Z'
});

console.log('✅ CamelCase fields:', {
  patientId: result[0]?.patientId,      // ✅ Deve ter valor
  professionalId: result[0]?.professionalId,
  serviceId: result[0]?.serviceId,
  roomId: result[0]?.roomId,
  payerId: result[0]?.payerId,
});

console.log('✅ Snake_case fields (compat):', {
  patient_id: result[0]?.patient_id,     // ✅ Deve ter valor (compatibilidade)
  professional_id: result[0]?.professional_id,
  service_id: result[0]?.service_id,
  room_id: result[0]?.room_id,
  payer_id: result[0]?.payer_id,
});

// ❌ Se algum campo estiver undefined, há problema no mapeamento
```

### Teste 1.2: Verificar nomes de entidades
```javascript
console.log('✅ Patient data:', {
  patientId: result[0]?.patientId,        // UUID
  patientName: result[0]?.patientName,    // "João Silva"
  patient_name: result[0]?.patient_name,  // "João Silva" (compat)
  patients: result[0]?.patients,          // { id, name, phone }
});

// ❌ Se patientName ou patient_name estiverem "—", há problema
```

---

## TESTE 2: PERSISTÊNCIA DE ROOM_ID E PAYER_ID

### Teste 2.1: Criar agendamento com room_id e payer_id
```javascript
// 1. Buscar um room_id e payer_id válidos
const rooms = await supabase.from('rooms').select('id').limit(1);
const payers = await supabase.from('payers').select('id').where('active', 'eq', true).limit(1);

const roomId = rooms.data[0].id;
const payerId = payers.data[0].id;

// 2. Criar agendamento
const newAppointment = {
  clinicId: 'your-clinic-id',
  patientId: 'patient-uuid',
  professionalId: 'prof-uuid',
  serviceId: 'service-uuid',
  roomId: roomId,           // ← CRÍTICO
  payerId: payerId,         // ← CRÍTICO
  date: '2026-05-06',
  startTime: '14:00',
  endTime: '15:00',
  status: 'scheduled',
};

const created = await createAppointment(newAppointment);

console.log('✅ Criado com:', {
  roomId: created.roomId,    // Deve ser === roomId original
  payerId: created.payerId,  // Deve ser === payerId original
});

// ❌ Se criado.roomId !== roomId, há problema
```

### Teste 2.2: Editar agendamento e validar persistência
```javascript
// 1. Buscar um agendamento existente
const apt = await getAppointmentById('appointment-id');
console.log('Antes:', { roomId: apt.roomId, payerId: apt.payerId });

// 2. Atualizar sem trocar room/payer
const updated = await updateAppointment(apt.id, {
  ...apt,
  status: 'confirmed', // Apenas status
  roomId: apt.roomId,  // Mesmo valor
  payerId: apt.payerId, // Mesmo valor
});

console.log('Depois:', { roomId: updated.roomId, payerId: updated.payerId });

// ✅ Deve ser igual
// ❌ Se room ou payer ficarem undefined, há problema
```

---

## TESTE 3: TIMEZONE - HORÁRIOS CORRETOS

### Teste 3.1: Criar agendamento em timezone diferente
```javascript
// Simular timezone diferente (ex: São Paulo vs UTC)
// 1. Criar agendamento às 14:00 (horário local)
const apt = {
  date: '2026-05-06',
  startTime: '14:00',  // 14:00 São Paulo
  // ...
};

// 2. Verificar no banco o que foi salvo
const fromDB = await supabase
  .from('appointments')
  .select('scheduled_time')
  .eq('id', created.id)
  .single();

console.log({
  enviado: apt.startTime,      // "14:00"
  noSupabase: fromDB.scheduled_time, // Deve ser "14:00" também
  noFrontend: created.startTime, // Deve ser "14:00" após mapear
});

// ✅ Todos devem ser "14:00" (sem conversão)
// ❌ Se houver diferença (ex: 18:00), há problema de timezone
```

---

## TESTE 4: REALTIME - SEM DUPLICATAS

### Teste 4.1: Monitorar realtime updates em realtime
```javascript
// 1. Abrir 2 abas do navegador na mesma agenda
// 2. Na aba 1: Criar novo agendamento
// 3. Na aba 2: Ver se aparece 1x ou 2x

// Adicionar log no useAgendaLive para detectar duplicatas
// Arquivo: src/hooks/useAgendaLive.js

let receivedIds = {};
const channel = supabase
  .channel('agenda-events')
  .on('postgres_changes', {...}, (payload) => {
    const id = payload.new?.id || payload.old?.id;
    receivedIds[id] = (receivedIds[id] || 0) + 1;
    
    if (receivedIds[id] > 1) {
      console.warn('⚠️ DUPLICATA DETECTADA:', id, receivedIds[id], 'vezes');
    } else {
      console.log('✅ Primeira recepção:', id);
    }
    
    onChange(payload);
  });

// ✅ Cada agendamento deve ser recebido 1x
// ❌ Se receber 2x+, há problema de duplicação
```

---

## TESTE 5: OPTIMISTIC UPDATES - COM ROLLBACK

### Teste 5.1: Testar UPDATE com falha
```javascript
// 1. Desconectar network (F12 → Network tab → Offline)
// 2. Editar um agendamento na UI
// 3. Aguardar erro de network
// 4. Reconectar network

// Esperado:
// ✅ UI mostra dados atualizados localmente
// ✅ Ao receber erro, UI volta aos dados anteriores (rollback)
// ❌ Se UI ficar com dados incorretos, há problema

// Implementação esperada em components:
/*
const handleUpdate = async () => {
  const backup = appointments;
  updateAppointmentLocal(); // UI atualiza
  try {
    await updateAppointment();
    // ✅ Sucesso
  } catch (error) {
    setAppointments(backup); // Rollback
  }
};
*/
```

---

## TESTE 6: VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS

### Teste 6.1: Criar agendamento com campos faltando
```javascript
// Teste cada campo crítico como null/undefined

const tests = [
  { name: 'patient_id', value: null },
  { name: 'professional_id', value: null },
  { name: 'service_id', value: null },
  // ...
];

for (const test of tests) {
  const payload = {
    clinicId: 'valid',
    date: '2026-05-06',
    startTime: '14:00',
    patientId: 'valid-uuid',
    professionalId: 'valid-uuid',
    serviceId: 'valid-uuid',
    [test.name]: test.value, // Colocar null
  };
  
  try {
    const created = await createAppointment(payload);
    console.error(`❌ Permitiu criar com ${test.name} = ${test.value}`);
  } catch (error) {
    console.log(`✅ Rejeitou ${test.name} vazio:`, error.message);
  }
}

// ✅ Deve rejeitar todos os campos obrigatórios vazios
// ❌ Se permitir criar, há problema
```

---

## TESTE 7: MÚLTIPLOS SERVIÇOS - ATOMICIDADE

### Teste 7.1: Criar agendamento com serviços
```javascript
const appointmentWithServices = {
  clinicId: 'clinic-id',
  date: '2026-05-06',
  startTime: '14:00',
  // ...
};

const services = [
  { service_id: 'svc-1', value: 100, quantity: 1 },
  { service_id: 'svc-2', value: 200, quantity: 2 },
];

const result = await createAppointmentWithServices(appointmentWithServices, services);

console.log({
  appointmentId: result.id,
  servicesCount: result.appointment_services?.length,
  services: result.appointment_services,
});

// ✅ Deve retornar agendamento + 2 serviços
// ❌ Se retornar apenas agendamento sem serviços, há problema de atomicidade

// Verificar no banco se é de verdade:
const inDB = await supabase
  .from('appointment_services')
  .select('*')
  .eq('appointment_id', result.id);

console.log('Serviços no banco:', inDB.data.length); // Deve ser 2
```

### Teste 7.2: Cascading delete ao deletar agendamento
```javascript
// 1. Criar agendamento com serviços
const apt = await createAppointmentWithServices(...);
const aptId = apt.id;
const servicesCount = apt.appointment_services.length;

// 2. Deletar agendamento
await deleteAppointment(aptId);

// 3. Verificar se serviços também foram deletados
const orphanServices = await supabase
  .from('appointment_services')
  .select('*')
  .eq('appointment_id', aptId);

console.log({
  servicesAntigo: servicesCount,
  servicesDepois: orphanServices.data.length,
});

// ✅ Deve ser 0 (cascade delete funcionou)
// ❌ Se for > 0, há problema (serviços orphans)
```

---

## TESTE 8: RLS POLICIES - SELECT APÓS UPDATE

### Teste 8.1: Verificar se RLS bloqueia SELECT após UPDATE
```javascript
// Cenário: UPDATE bem-sucedido mas SELECT retorna vazio

// 1. Atualizar agendamento
const updateResult = await updateAppointment(aptId, { status: 'confirmed' });

console.log({
  sucess: updateResult !== null,
  hasRelationships: !!updateResult?.professionals,
  hasRoomId: !!updateResult?.roomId,
});

// ✅ Se retorna dados com relacionamentos: RLS OK
// ⚠️ Se retorna sem relacionamentos: RLS pode estar bloqueando SELECT

// Verificar no banco diretamente:
const directFromDB = await supabase
  .from('appointments')
  .select('*')
  .eq('id', aptId)
  .single();

console.log('Direto do banco:', {
  exists: !!directFromDB.data,
  room_id: directFromDB.data?.room_id,
});

// ✅ Se existe no banco: RLS está bloqueando SELECT após UPDATE
```

---

## TESTE 9: OVERLAP APPOINTMENTS

### Teste 9.1: Validar if system checks overlap
```javascript
// 1. Criar agendamento de 14:00 a 15:00
const apt1 = await createAppointment({
  date: '2026-05-06',
  startTime: '14:00',
  endTime: '15:00',
  professionalId: 'prof-1',
  // ...
});

// 2. Tentar criar overlap de 14:30 a 15:30
try {
  const apt2 = await createAppointment({
    date: '2026-05-06',
    startTime: '14:30',
    endTime: '15:30',
    professionalId: 'prof-1', // Mesmo profissional
    // ...
  });
  
  console.error('❌ Permitiu criar overlap!');
} catch (error) {
  console.log('✅ Rejeitou overlap:', error.message);
}

// ✅ Deve rejeitar
// ❌ Se permitir, há problema
```

---

## TESTE 10: ESTADOS REACT - SINCRONIZAÇÃO

### Teste 10.1: Verificar se agendamentos vs appointments estão sincronizados
```javascript
// No arquivo: src/pages/clinica/agenda/views/AgendaUnificada.jsx
// Adicionar log para verificar estado

useEffect(() => {
  console.log('Estado ANTES de carregar:', {
    agendamentos: agendamentos.length,
    appointments: appointments?.length,
    synced: agendamentos.length === appointments?.length,
  });
}, [agendamentos, appointments]);

// ✅ Ambos devem ter mesmo tamanho
// ❌ Se divergem, há problema de sincronização
```

---

## RESUMO DE TESTES CRÍTICOS

| Teste | Prioridade | Risco | Status |
|-------|-----------|-------|--------|
| 1. CamelCase Mapping | 🔴 CRÍTICO | Alto | 🔄 TESTAR |
| 2. Room/Payer Persist | 🔴 CRÍTICO | Alto | 🔄 TESTAR |
| 3. Timezone Horários | 🔴 CRÍTICO | Alto | 🔄 TESTAR |
| 4. Realtime Duplicatas | 🟡 MÉDIO | Médio | 🔄 TESTAR |
| 5. Optimistic Rollback | 🟡 MÉDIO | Médio | 🔄 TESTAR |
| 6. Validação Campos | 🟡 MÉDIO | Médio | 🔄 TESTAR |
| 7. Múltiplos Serviços | 🟡 MÉDIO | Médio | 🔄 TESTAR |
| 8. RLS Select After Update | 🔴 CRÍTICO | Alto | 🔄 TESTAR |
| 9. Overlap Appointments | 🟡 MÉDIO | Médio | 🔄 TESTAR |
| 10. React State Sync | 🟡 MÉDIO | Médio | 🔄 TESTAR |

---

## TESTE DE CARGA

### Teste 11: Criar 100 agendamentos e listar
```javascript
// Simular carga de dados

const startTime = performance.now();

// 1. Criar 100 agendamentos (simular)
for (let i = 0; i < 100; i++) {
  await createAppointment({
    date: '2026-05-06',
    startTime: `${8 + Math.floor(i / 8)}:${(i % 8) * 15}`,
    patientId: 'pat-' + i,
    // ...
  });
}

// 2. Listar todos
const result = await listAppointments({
  clinicId: 'clinic-id',
  start: '2026-05-06T00:00:00Z',
  end: '2026-05-06T23:59:59Z',
});

const endTime = performance.now();

console.log({
  totalCreated: 100,
  totalListed: result.length,
  timeMs: endTime - startTime,
  avgTimePerItem: (endTime - startTime) / result.length,
});

// ✅ Deve listar em < 5s (100 items)
// ❌ Se demorar > 10s, há problema de performance
```

---

**Todos os testes devem ser executados sem modificar o código produção (apenas adicionar logs temporários).**
