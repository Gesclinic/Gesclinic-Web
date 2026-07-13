import { supabase } from './customSupabaseClient';

const PACKAGE_BILLING_TYPES = new Set(['package', 'per_package']);
const CONSUMABLE_BILLING_TYPES = new Set(['per_consultation', 'sessions', 'per_session', 'class', 'per_class']);

function isMissingPackageSchemaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('patient_service_packages');
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getServiceUnitValue(item) {
  return toNumber(item.value ?? item.unit_price ?? item.services?.price, 0);
}

function getServiceQuantity(item) {
  return Math.max(1, toNumber(item.quantity, 1));
}

function getPackageRemainingSessions(pkg) {
  return Math.max(0, toNumber(pkg.total_sessions, 0) - toNumber(pkg.used_sessions, 0));
}

function buildUnavailableResult(services, warning) {
  return {
    services: services || [],
    consumptionPlans: [],
    warnings: warning ? [warning] : [],
    available: false,
  };
}

export async function listPatientServicePackageBalances({ clinicId, patientId, serviceIds = [] }) {
  const uniqueServiceIds = [...new Set((serviceIds || []).filter(Boolean))];

  if (!clinicId || !patientId || uniqueServiceIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('patient_service_packages')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .in('service_id', uniqueServiceIds)
    .neq('status', 'canceled')
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingPackageSchemaError(error)) {
      console.warn('Tabela de pacotes de paciente ainda nao aplicada. Saldo de pacote indisponivel.');
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function listAppointmentPackageConsumptionMovements(appointmentId) {
  if (!appointmentId) {
    return [];
  }

  const { data, error } = await supabase
    .from('patient_service_package_movements')
    .select('*')
    .eq('appointment_id', appointmentId)
    .eq('movement_type', 'consume');

  if (error) {
    if (isMissingPackageSchemaError(error)) {
      console.warn('Tabela de movimentos de pacote ainda nao aplicada. Consumo do atendimento indisponivel.');
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function preparePackageConsumption(appointment, appointmentServices = []) {
  if (!appointment?.clinic_id || !appointment?.patient_id || appointmentServices.length === 0) {
    return buildUnavailableResult(appointmentServices);
  }

  const candidateServices = appointmentServices.filter((item) => {
    const billingType = item.billing_type || 'per_consultation';
    return item.service_id && CONSUMABLE_BILLING_TYPES.has(billingType);
  });

  if (candidateServices.length === 0) {
    return buildUnavailableResult(appointmentServices);
  }

  const serviceIds = [...new Set(candidateServices.map((item) => item.service_id))];

  const { data: packages, error } = await supabase
    .from('patient_service_packages')
    .select('*')
    .eq('clinic_id', appointment.clinic_id)
    .eq('patient_id', appointment.patient_id)
    .in('service_id', serviceIds)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingPackageSchemaError(error)) {
      console.warn('Tabela de pacotes de paciente ainda nao aplicada. Baixa automatica de pacote ignorada.');
      return buildUnavailableResult(appointmentServices, 'Tabela de pacotes ainda nao aplicada');
    }
    throw error;
  }

  const availablePackages = new Map();
  (packages || []).forEach((pkg) => {
    if (getPackageRemainingSessions(pkg) <= 0) return;
    const list = availablePackages.get(pkg.service_id) || [];
    list.push({ ...pkg, _remainingForPlan: getPackageRemainingSessions(pkg) });
    availablePackages.set(pkg.service_id, list);
  });

  const consumptionPlans = [];
  const services = appointmentServices.map((item) => {
    const billingType = item.billing_type || 'per_consultation';
    if (!item.service_id || !CONSUMABLE_BILLING_TYPES.has(billingType)) {
      return item;
    }

    let requestedQuantity = getServiceQuantity(item);
    let consumedQuantity = 0;
    const itemPlans = [];
    const packagesForService = availablePackages.get(item.service_id) || [];

    packagesForService.forEach((pkg) => {
      if (requestedQuantity <= 0 || pkg._remainingForPlan <= 0) return;
      const quantity = Math.min(requestedQuantity, pkg._remainingForPlan);
      const previousUsedSessions = toNumber(pkg.used_sessions, 0) + toNumber(pkg._plannedConsumption, 0);
      const newUsedSessions = previousUsedSessions + quantity;

      pkg._remainingForPlan -= quantity;
      pkg._plannedConsumption = toNumber(pkg._plannedConsumption, 0) + quantity;
      requestedQuantity -= quantity;
      consumedQuantity += quantity;

      itemPlans.push({
        packageId: pkg.id,
        appointmentServiceId: item.id,
        serviceId: item.service_id,
        quantity,
        previousUsedSessions,
        newUsedSessions,
        totalSessions: toNumber(pkg.total_sessions, 0),
      });
    });

    if (consumedQuantity <= 0) {
      return item;
    }

    consumptionPlans.push(...itemPlans);
    const billableQuantity = Math.max(0, getServiceQuantity(item) - consumedQuantity);
    const unitValue = getServiceUnitValue(item);

    return {
      ...item,
      package_consumed_sessions: consumedQuantity,
      package_billable_quantity: billableQuantity,
      package_covered_value: consumedQuantity * unitValue,
      package_consumption_plans: itemPlans,
    };
  });

  return {
    services,
    consumptionPlans,
    warnings: [],
    available: true,
  };
}

export async function createPackagesFromAppointmentServices({ appointment, appointmentServices = [], receivableId }) {
  if (!appointment?.clinic_id || !appointment?.patient_id) {
    return [];
  }

  const packageServices = appointmentServices.filter((item) => (
    item.service_id && PACKAGE_BILLING_TYPES.has(item.billing_type || '')
  ));

  if (packageServices.length === 0) {
    return [];
  }

  const createdPackages = [];

  for (const item of packageServices) {
    const totalSessions = getServiceQuantity(item);
    const unitValue = getServiceUnitValue(item);
    const packageValue = Math.max(0, unitValue * totalSessions - toNumber(item.discount, 0));

    const payload = {
      clinic_id: appointment.clinic_id,
      patient_id: appointment.patient_id,
      payer_id: appointment.payer_id || null,
      service_id: item.service_id,
      source_appointment_id: appointment.id,
      source_appointment_service_id: item.id,
      source_receivable_id: receivableId || null,
      billing_type: item.billing_type,
      total_sessions: totalSessions,
      used_sessions: 0,
      package_value: packageValue,
      unit_value: unitValue,
      status: 'active',
      valid_from: appointment.scheduled_date || new Date().toISOString().split('T')[0],
      metadata: {
        service_name: item.services?.name || item.service_name || null,
        billing_summary: item.billing_summary || null,
      },
    };

    const { data, error } = await supabase
      .from('patient_service_packages')
      .upsert(payload, { onConflict: 'source_appointment_service_id' })
      .select()
      .single();

    if (error) {
      if (isMissingPackageSchemaError(error)) {
        console.warn('Tabela de pacotes de paciente ainda nao aplicada. Pacote nao criado.');
        return createdPackages;
      }
      throw error;
    }

    createdPackages.push(data);

    await supabase.from('patient_service_package_movements').insert({
      package_id: data.id,
      clinic_id: appointment.clinic_id,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      appointment_service_id: item.id,
      receivable_id: receivableId || null,
      movement_type: 'purchase',
      quantity: totalSessions,
      previous_used_sessions: 0,
      new_used_sessions: 0,
      note: 'Pacote gerado a partir do financeiro do atendimento',
    });
  }

  return createdPackages;
}

export async function commitPackageConsumption({ appointment, consumptionPlans = [], receivableId }) {
  if (!appointment?.clinic_id || !appointment?.patient_id || consumptionPlans.length === 0) {
    return [];
  }

  const movements = [];

  for (const plan of consumptionPlans) {
    const status = plan.newUsedSessions >= plan.totalSessions ? 'exhausted' : 'active';
    const { data: pkg, error: packageError } = await supabase
      .from('patient_service_packages')
      .update({
        used_sessions: plan.newUsedSessions,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.packageId)
      .select()
      .single();

    if (packageError) {
      if (isMissingPackageSchemaError(packageError)) {
        console.warn('Tabela de pacotes de paciente ainda nao aplicada. Baixa automatica ignorada.');
        return movements;
      }
      throw packageError;
    }

    const { data: movement, error: movementError } = await supabase
      .from('patient_service_package_movements')
      .insert({
        package_id: plan.packageId,
        clinic_id: appointment.clinic_id,
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        appointment_service_id: plan.appointmentServiceId,
        receivable_id: receivableId || null,
        movement_type: 'consume',
        quantity: plan.quantity,
        previous_used_sessions: plan.previousUsedSessions,
        new_used_sessions: plan.newUsedSessions,
        note: 'Baixa automatica por atendimento',
        metadata: {
          service_id: plan.serviceId,
          package_status: pkg?.status || status,
        },
      })
      .select()
      .single();

    if (movementError) {
      throw movementError;
    }

    movements.push(movement);
  }

  return movements;
}