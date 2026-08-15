// Event contract registry and simple schema definitions
const contracts = new Map()

export function registerEventContract(name, schema) {
  contracts.set(name, schema)
}

export function getEventContract(name) {
  return contracts.get(name)
}

export function listEventContracts() {
  return Array.from(contracts.keys())
}

// seed common platform events
registerEventContract('ClinicProvisionStarted', { required: ['tenantId', 'requestedBy'] })
registerEventContract('ClinicProvisionCompleted', { required: ['clinicId', 'tenantId'] })
registerEventContract('UserCreated', { required: ['userId', 'clinicId'] })
registerEventContract('AppointmentCreated', { required: ['appointmentId', 'clinicId', 'start'] })
