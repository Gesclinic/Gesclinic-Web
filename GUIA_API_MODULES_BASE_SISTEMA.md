# 📚 GUIA DE USO - API MODULES BASE DO SISTEMA

**Referência técnica para developers**  
**Data:** 15 de janeiro de 2026

---

## 🎯 OVERVIEW DOS MÓDULOS

### baseSystemApi.js - Orquestrador
Responsável por coordenar validações e obter status geral do sistema.

```javascript
import * as baseSystemApi from '@/lib/baseSystemApi'

// 1. Validar integridade (retorna issues + warnings)
const health = await baseSystemApi.validateBaseSystemSetup(clinicId)
if (!health.ok) {
  health.issues.forEach(issue => {
    console.error(issue.message)
  })
}

// 2. Obter status do wizard de setup
const steps = await baseSystemApi.getSetupWizardStatus(clinicId)
steps.forEach(step => {
  console.log(`${step.title}: ${step.completed ? '✅' : '❌'}`)
})

// 3. Validar elemento específico
const status = await baseSystemApi.getElementStatus('service', serviceId, clinicId)
console.log(status.canBeScheduled) // boolean
```

---

### professionalServicesApi.js - Vínculo Prof-Serviço

#### Listar profissionais que fazem um serviço
```javascript
import * as psApi from '@/lib/professionalServicesApi'

const professionals = await psApi.listProfessionalsByService(serviceId, clinicId)
// Retorna:
// [{
//   id, professional_id, service_id, competence_level,
//   duration_minutes_override,
//   professionals: { id, name, email, specialization }
// }, ...]
```

#### Listar serviços que um profissional oferece
```javascript
const services = await psApi.listServicesByProfessional(professionalId, clinicId)
// Retorna:
// [{
//   id, professional_id, service_id, competence_level,
//   services: { id, code, name, duration_minutes, active }
// }, ...]
```

#### Vincular profissional a serviço
```javascript
// Caso simples: vinculação padrão
await psApi.linkProfessionalService(professionalId, serviceId, clinicId)

// Com opções: duração customizada + nível de competência
await psApi.linkProfessionalService(professionalId, serviceId, clinicId, {
  competence_level: 'expert',  // 'junior', 'standard', 'expert'
  duration_minutes_override: 45  // Sobrescreve duração padrão do serviço
})

// Tratamento de erro
try {
  await psApi.linkProfessionalService(...)
} catch (error) {
  if (error.message.includes('já está vinculado')) {
    // Já existe o vínculo
  }
}
```

#### Desvincar (inativa)
```javascript
// Nunca deleta, apenas marca como inativo
await psApi.unlinkProfessionalService(professionalId, serviceId, clinicId)
```

#### Validar antes de agendar
```javascript
// Importante: sempre validar antes de permitir agendamento
const canServe = await psApi.canProfessionalServe(professionalId, serviceId, clinicId)
if (!canServe) {
  throw new Error('Profissional não pode atender este serviço')
}

// Ou obter duração com override
const duration = await psApi.getServiceDuration(professionalId, serviceId, clinicId)
console.log(`Duração: ${duration} minutos`)
```

#### Validação de integridade
```javascript
// Verificar se serviço tem pelo menos um profissional
const { valid, count } = await psApi.validateServiceHasProfessionals(serviceId, clinicId)
if (!valid) {
  showError('Serviço sem profissionais vinculados')
}
console.log(`${count} profissional(is) vinculado(s)`)
```

---

### healthInsurancesApi.js - Convênios

#### Listar convênios
```javascript
import * as hiApi from '@/lib/healthInsurancesApi'

// Apenas ativos (padrão)
const insurances = await hiApi.listHealthInsurances(clinicId)

// Incluir inativos
const all = await hiApi.listHealthInsurances(clinicId, { includeInactive: true })
```

#### Obter detalhes completos
```javascript
const insurance = await hiApi.getHealthInsurance(insuranceId, clinicId)
// Retorna: { id, code, name, type, cnpj, registration_number, contact_*, requires_authorization, ... }
```

#### Criar novo convênio
```javascript
const newInsurance = await hiApi.createHealthInsurance(clinicId, {
  code: 'UNIMED001',  // Obrigatório se usar código
  name: 'Unimed',
  type: 'private_insurance',  // 'private_insurance', 'health_plan', 'government', 'direct_pay'
  cnpj: '12.345.678/0001-90',
  contact_person: 'João Silva',
  contact_email: 'contato@unimed.com',
  contact_phone: '(11) 1234-5678'
})
```

#### Atualizar convênio
```javascript
const updated = await hiApi.updateHealthInsurance(insuranceId, clinicId, {
  contact_person: 'Maria Silva',
  contact_phone: '(11) 9876-5432'
})
```

#### Desativar convênio (não deleta)
```javascript
await hiApi.deactivateHealthInsurance(insuranceId, clinicId)
// Pode reativar depois:
await hiApi.reactivateHealthInsurance(insuranceId, clinicId)
```

#### Validações
```javascript
// Buscar por código
const insurance = await hiApi.getHealthInsuranceByCode('UNIMED001', clinicId)

// Contar convênios
const count = await hiApi.countHealthInsurances(clinicId)

// Convênios que requerem autorização
const requiring = await hiApi.listHealthInsurancesRequiringAuthorization(clinicId)
requiring.forEach(ins => {
  console.log(`${ins.name} requer autorização com ${ins.authorization_lead_time_days} dias de antecedência`)
})
```

---

### agendaRulesApi.js - Regras de Agendamento

#### Listar regras
```javascript
import * as arApi from '@/lib/agendaRulesApi'

const rules = await arApi.listAgendaRules(clinicId)
// Retorna: [{ id, service_id, default_duration_minutes, interval_minutes, ... }, ...]
```

#### Obter regra de um serviço
```javascript
const rule = await arApi.getAgendaRule(serviceId, clinicId)
// Retorna: { id, default_duration_minutes, max_days_in_future, min_days_in_advance, ... }
// ou null se não existe
```

#### Criar regra de agenda
```javascript
const newRule = await arApi.createAgendaRule(serviceId, clinicId, {
  default_duration_minutes: 30,        // Duração padrão
  interval_minutes: 15,                // Intervalo mínimo entre slots
  max_days_in_future: 90,              // Máximo de dias no futuro (null = sem limite)
  min_days_in_advance: 2,              // Mínimo de dias de antecedência
  allow_same_day_booking: true,        // Permite agendar para hoje?
  requires_specific_professional: false,
  requires_specific_room: false,
  max_per_day: 10,                     // Máximo por dia (null = sem limite)
  requires_clinic_confirmation: false
})
```

#### Atualizar regra
```javascript
const updated = await arApi.updateAgendaRule(serviceId, clinicId, {
  max_days_in_future: 120,  // Aumentar para 120 dias
  interval_minutes: 30       // Aumentar intervalo
})
```

#### Validar agendamento antes de salvar
```javascript
// IMPORTANTÍSSIMO: Sempre chamar antes de criar appointment!
const { valid, errors, rule } = await arApi.validateSchedulingByRules(
  serviceId,
  clinicId,
  new Date('2026-02-01') // data desejada
)

if (!valid) {
  errors.forEach(e => console.error(e))
  throw new Error('Agendamento não permitido pelas regras')
}

// Calcular horário fim automaticamente
const endTime = await arApi.calculateEndTime(startTime, serviceId, clinicId)
```

#### Verificar disponibilidade
```javascript
// Quantos slots ainda estão disponíveis neste dia?
const remaining = await arApi.getRemainingSlots(serviceId, clinicId, new Date('2026-02-01'))
console.log(`Ainda há ${remaining} slots disponíveis`)

// Se remaining === 0, não pode mais agendar para este dia
```

#### Contar regras incompletas
```javascript
// Útil para health check
const ruleCount = await arApi.countAgendaRules(clinicId)
const serviceCount = 10 // assumindo
if (ruleCount < serviceCount) {
  console.warn(`${serviceCount - ruleCount} serviço(s) sem regras de agenda`)
}

// Listar serviços sem regras
const servicesWithoutRules = await arApi.listServicesWithoutRules(clinicId)
servicesWithoutRules.forEach(s => {
  console.warn(`Serviço "${s.name}" sem regras de agenda`)
})
```

---

### revenueRulesApi.js - Regras de Repasse

#### Listar regras
```javascript
import * as rrApi from '@/lib/revenueRulesApi'

// Todas as regras
const all = await rrApi.listRevenueRules(clinicId)

// Filtrar por profissional
const forPro = await rrApi.listRevenueRules(clinicId, { professional_id: profId })

// Filtrar por serviço
const forSvc = await rrApi.listRevenueRules(clinicId, { service_id: serviceId })
```

#### Criar regra de repasse
```javascript
// Tipo 1: Percentual
const rule1 = await rrApi.createRevenueRule(clinicId, {
  professional_id: professionalId,
  service_id: serviceId,
  repasse_type: 'percentage',  // % do valor cobrado
  percentage: 50,              // 50% de repasse
  min_value: 100,              // Mínimo R$ 100
  max_value: 1000,             // Máximo R$ 1000
  repasse_to: 'professional',
  applies_to_status: 'completed'  // Só após completar
})

// Tipo 2: Valor fixo
const rule2 = await rrApi.createRevenueRule(clinicId, {
  professional_id: professionalId,
  service_id: serviceId,
  repasse_type: 'fixed_value',
  fixed_amount: 200,  // Sempre R$ 200
  repasse_to: 'professional'
})

// Tipo 3: Nenhum repasse
const rule3 = await rrApi.createRevenueRule(clinicId, {
  professional_id: professionalId,
  repasse_type: 'none'
})
```

#### Calcular repasse
```javascript
// FUNÇÃO MAIS IMPORTANTE - use sempre ao confirmar appointment
const result = await rrApi.calculateRepasse(
  professionalId,
  serviceId,
  clinicId,
  500,  // Valor cobrado (R$ 500)
  'completed'  // Status do agendamento
)

console.log(`Profissional deve receber: R$ ${result.amount}`)
console.log(`Regra aplicada: ${result.type}`)
```

#### Simular repasse (sem query)
```javascript
// Útil para forms interativos em tempo real
const simulated = rrApi.simulateRepasse(500, {
  percentage: 50,
  min_value: 100,
  max_value: 1000
})
console.log(`Repasse simulado: R$ ${simulated}`)
```

#### Obter regras por profissional
```javascript
const proRules = await rrApi.getProfessionalRevenueRules(professionalId, clinicId)
proRules.forEach(rule => {
  console.log(`${rule.services?.name}: ${rule.repasse_type}`)
})
```

#### Contar regras incompletas
```javascript
// Para health check
const ruleCount = await rrApi.countRevenueRules(clinicId)
if (ruleCount === 0) {
  console.warn('Nenhuma regra de repasse configurada')
}
```

---

### resourcesApi.js - Equipamentos e Insumos

#### Listar recursos
```javascript
import * as resApi from '@/lib/resourcesApi'

// Todos os ativos
const resources = await resApi.listResources(clinicId)

// Filtrar por tipo
const equipment = await resApi.listResources(clinicId, { type: 'equipment' })
const consumables = await resApi.listResources(clinicId, { type: 'consumable' })

// Incluir inativos
const all = await resApi.listResources(clinicId, { includeInactive: true })
```

#### Obter recurso específico
```javascript
const resource = await resApi.getResource(resourceId, clinicId)
// Retorna: { id, code, name, type, requires_maintenance, last_maintenance_date, ... }
```

#### Criar recurso
```javascript
const newResource = await resApi.createResource(clinicId, {
  code: 'ECG001',
  name: 'Eletrocardiógrafo',
  type: 'equipment',
  description: 'ECG modelo XYZ',
  is_consumable: false,
  requires_maintenance: true  // Precisa de manutenção
})
```

#### Alocar recurso em sala
```javascript
// Adicionar recurso a uma sala
await resApi.allocateResourceToRoom(roomId, resourceId, clinicId, {
  quantity: 2,     // 2 unidades
  is_fixed: true   // Não é móvel (permanente na sala)
})
```

#### Listar recursos de uma sala
```javascript
const roomResources = await resApi.listRoomResources(roomId, clinicId)
roomResources.forEach(rr => {
  console.log(`${rr.resources.name}: ${rr.quantity} unidade(s)`)
})
```

#### Remover alocação
```javascript
await resApi.deallocateResourceFromRoom(roomId, resourceId, clinicId)
```

#### Atualizar quantidade
```javascript
await resApi.updateRoomResourceQuantity(roomId, resourceId, clinicId, 3)  // Mudar para 3
```

#### Manutenção
```javascript
// Listar recursos que precisam de manutenção
const needMaint = await resApi.listResourcesRequiringMaintenance(clinicId)
needMaint.forEach(r => {
  const daysSinceMaint = Math.floor(
    (Date.now() - new Date(r.last_maintenance_date)) / (1000 * 60 * 60 * 24)
  )
  console.log(`${r.name}: ${daysSinceMaint} dias desde última manutenção`)
})

// Registrar manutenção
await resApi.recordMaintenance(resourceId, clinicId, {
  date: new Date().toISOString().split('T')[0]
})
```

---

## 🔄 FLUXOS TÍPICOS

### Novo Agendamento - Validação Completa
```javascript
async function validateNewAppointment(appointmentData, clinicId) {
  const { serviceId, professionalId, scheduledDate } = appointmentData

  // 1. Profissional pode fazer este serviço?
  const canServe = await psApi.canProfessionalServe(professionalId, serviceId, clinicId)
  if (!canServe) throw new Error('Profissional não autorizado')

  // 2. Respeita regras de agenda?
  const { valid, errors } = await arApi.validateSchedulingByRules(serviceId, clinicId, scheduledDate)
  if (!valid) throw new Error(errors[0])

  // 3. Ainda há slots disponíveis?
  const remaining = await arApi.getRemainingSlots(serviceId, clinicId, scheduledDate)
  if (remaining === 0) throw new Error('Nenhum slot disponível')

  // 4. Calcular duração
  const duration = await psApi.getServiceDuration(professionalId, serviceId, clinicId)

  return {
    valid: true,
    duration,
    message: 'Agendamento validado'
  }
}
```

### Cálculo de Recebimento - Repasse e Preço
```javascript
async function calculateAppointmentFinance(appointmentId, clinicId) {
  const appointment = await getAppointmentDetails(appointmentId)

  // 1. Obter preço do serviço
  const price = appointment.service_prices.price // ou usar getServicePrice()

  // 2. Calcular repasse do profissional
  const repasse = await rrApi.calculateRepasse(
    appointment.professional_id,
    appointment.service_id,
    clinicId,
    price,
    'completed'
  )

  // 3. Calcular lucro da clínica
  const clinicEarnings = price - repasse.amount

  return {
    totalPrice: price,
    professionalRepasse: repasse.amount,
    clinicEarnings,
    percentage: ((clinicEarnings / price) * 100).toFixed(2) + '%'
  }
}
```

### Setup Inicial - Validação de Completude
```javascript
async function checkSetupCompletion(clinicId) {
  const health = await baseSystemApi.validateBaseSystemSetup(clinicId)

  if (!health.ok) {
    return {
      complete: false,
      blockedFeatures: ['scheduling', 'billing'],  // Bloquear agenda e faturamento
      issues: health.issues.map(i => ({
        title: i.module,
        description: i.message,
        action: i.action
      }))
    }
  }

  return {
    complete: true,
    allFeaturesUnlocked: true
  }
}
```

---

## ⚠️ REGRAS IMPORTANTES

### 1. Sempre Validar Antes de Criar
```javascript
// ❌ NUNCA FAZER:
await createAppointment(data)

// ✅ SEMPRE FAZER:
const validation = await validateNewAppointment(data, clinicId)
if (!validation.valid) throw error
await createAppointment(data)
```

### 2. Nenhuma Exclusão Física
```javascript
// ❌ NUNCA USAR DELETE:
await supabase.from('table').delete().eq('id', id)

// ✅ SEMPRE USAR INATIVAÇÃO:
await deactivateService(id, clinicId)  // ou similar
```

### 3. Sempre Informar clinicId
```javascript
// ❌ INSEGURO (multi-tenancy):
await listServices()

// ✅ SEGURO:
await listServices(clinicId)
```

### 4. Tratamento de Erros Esperados
```javascript
// Para duplicados de código
try {
  await createHealthInsurance(...)
} catch (error) {
  if (error.code === '23505') {
    console.error('Código ou CNPJ já existe')
  }
}

// Para relacionamentos
try {
  await linkProfessionalService(...)
} catch (error) {
  if (error.message.includes('já está vinculado')) {
    console.error('Vínculo já existe')
  }
}
```

---

## 🧪 TESTES NO CONSOLE

```javascript
// F12 > Console

// Teste 1: Listar convênios
const insurances = await (await import('@/lib/healthInsurancesApi.js')).listHealthInsurances('sua-clinic-id')
console.table(insurances)

// Teste 2: Validar integridade
const health = await (await import('@/lib/baseSystemApi.js')).validateBaseSystemSetup('sua-clinic-id')
console.log(health.ok ? '✅ Sistema OK' : '❌ Problemas encontrados', health)

// Teste 3: Simular repasse
const rrApi = await import('@/lib/revenueRulesApi.js')
const repasse = rrApi.simulateRepasse(500, { percentage: 40, min_value: 100 })
console.log(`Repasse simulado: R$ ${repasse}`)
```

---

**Status:** ✅ Documentação Completa  
**Última atualização:** 15 de janeiro de 2026
