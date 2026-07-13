import { supabase } from './customSupabaseClient';
import { getAppointmentServices, syncAppointmentServices } from './appointmentsApi';

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeServiceItem(item = {}) {
  const unitPrice = toNumber(item.value ?? item.unit_price ?? item.price, 0);
  const quantity = toNumber(item.quantity, 1);
  const billableQuantity = item.package_billable_quantity !== undefined && item.package_billable_quantity !== null
    ? Math.max(0, toNumber(item.package_billable_quantity, 0))
    : quantity;
  const discount = toNumber(item.discount, 0);
  const additions = toNumber(item.additions, 0);
  const totalPrice = Math.max(0, unitPrice * billableQuantity - discount + additions);
  const professionalPercentage = toNumber(item.professional_percentage ?? item.repasse_percent, 0);
  const professionalFixed = toNumber(item.professional_discount ?? item.professional_value, 0);

  return {
    ...item,
    service_name: item.service_name || item.services?.name || '',
    service_code: item.service_code || item.services?.tuss_code || item.services?.code || '',
    value: unitPrice,
    unit_price: unitPrice,
    quantity,
    package_billable_quantity: billableQuantity,
    discount,
    additions,
    total_price: totalPrice,
    professional_percentage: professionalPercentage,
    professional_value: professionalFixed || totalPrice * (professionalPercentage / 100),
    billing_type: item.billing_type || 'per_consultation',
    status: item.status || 'pending',
  };
}

function normalizeItems(items = []) {
  return (items || []).map(normalizeServiceItem);
}

async function getAppointmentIdFromService(itemId) {
  const { data, error } = await supabase
    .from('appointment_services')
    .select('appointment_id')
    .eq('id', itemId)
    .single();

  if (error) throw error;
  return data?.appointment_id;
}

export async function getAppointmentItems(appointmentId) {
  return normalizeItems(await getAppointmentServices(appointmentId));
}

export async function getAppointmentItem(itemId) {
  const { data, error } = await supabase
    .from('appointment_services')
    .select('*, services(id, name, code, tuss_code)')
    .eq('id', itemId)
    .single();

  if (error) throw error;
  return normalizeServiceItem(data);
}

export async function getAppointmentTotals(appointmentId) {
  try {
    return calculateAppointmentItemsTotals(await getAppointmentItems(appointmentId));
  } catch (err) {
    console.error('[appointmentItemsApi.getAppointmentTotals]', err);
    return {
      subtotal: 0,
      total_discount: 0,
      total_additions: 0,
      grand_total: 0,
      professional_total: 0,
    };
  }
}

export async function createAppointmentItem(appointmentId, itemData) {
  const currentItems = await getAppointmentItems(appointmentId);
  await syncAppointmentServices(appointmentId, [...currentItems, normalizeServiceItem(itemData)]);
  const updatedItems = await getAppointmentItems(appointmentId);
  return updatedItems[updatedItems.length - 1] || null;
}

export async function createAppointmentItemsBatch(appointmentId, itemsData) {
  const currentItems = await getAppointmentItems(appointmentId);
  await syncAppointmentServices(appointmentId, [...currentItems, ...normalizeItems(itemsData)]);
  return getAppointmentItems(appointmentId);
}

export async function updateAppointmentItem(itemId, updates) {
  const appointmentId = await getAppointmentIdFromService(itemId);
  const currentItems = await getAppointmentItems(appointmentId);
  const originalItem = currentItems.find((item) => item.id === itemId);
  const updatedItems = currentItems.map((item) =>
    item.id === itemId ? normalizeServiceItem({ ...item, ...updates }) : item,
  );

  await syncAppointmentServices(appointmentId, updatedItems);
  const refreshedItems = await getAppointmentItems(appointmentId);
  return refreshedItems.find((item) => item.service_id === (updates.service_id || originalItem?.service_id))
    || refreshedItems[0]
    || null;
}

export async function updateAppointmentItemQuantity(itemId, quantity) {
  return updateAppointmentItem(itemId, { quantity });
}

export async function updateAppointmentItemPrice(itemId, unitPrice) {
  return updateAppointmentItem(itemId, { value: unitPrice, unit_price: unitPrice });
}

export async function updateAppointmentItemDiscount(itemId, discount) {
  return updateAppointmentItem(itemId, { discount });
}

export async function updateAppointmentItemProfessionalPercentage(itemId, percentage) {
  return updateAppointmentItem(itemId, { professional_percentage: percentage });
}

export async function softDeleteAppointmentItem(itemId) {
  return hardDeleteAppointmentItem(itemId);
}

export async function hardDeleteAppointmentItem(itemId) {
  const appointmentId = await getAppointmentIdFromService(itemId);
  const currentItems = await getAppointmentItems(appointmentId);
  await syncAppointmentServices(appointmentId, currentItems.filter((item) => item.id !== itemId));
  return true;
}

export async function deleteAllAppointmentItems(appointmentId) {
  const { error } = await supabase.from('appointment_services').delete().eq('appointment_id', appointmentId);
  if (error) throw error;
  return true;
}

export async function appointmentHasItems(appointmentId) {
  return (await getAppointmentItems(appointmentId)).length > 0;
}

export async function migrateAppointmentToItems(appointmentId) {
  const hasItems = await appointmentHasItems(appointmentId);
  if (hasItems) return { migrated: false, reason: 'already_migrated' };

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('id, service_id, value, services(id, name, code, tuss_code)')
    .eq('id', appointmentId)
    .single();

  if (error) throw error;
  if (!appointment?.service_id) return { migrated: false, reason: 'no_service' };

  const item = await createAppointmentItem(appointmentId, {
    service_id: appointment.service_id,
    service_name: appointment.services?.name || 'Servico',
    service_code: appointment.services?.tuss_code || appointment.services?.code || '',
    quantity: 1,
    value: appointment.value || 0,
  });

  return { migrated: true, item };
}

export async function migrateAllAppointmentsToItems() {
  return { migrated_count: 0, skipped_count: 0, source: 'appointment_services' };
}

export async function duplicateAppointmentItem(itemId) {
  const originalItem = await getAppointmentItem(itemId);
  return createAppointmentItem(originalItem.appointment_id, { ...originalItem, id: undefined });
}

export function calculateAppointmentItemsTotals(items = []) {
  return normalizeItems(items).reduce(
    (totals, item) => ({
      subtotal: totals.subtotal + item.unit_price * item.quantity,
      total_discount: totals.total_discount + item.discount,
      total_additions: totals.total_additions + item.additions,
      grand_total: totals.grand_total + item.total_price,
      professional_total: totals.professional_total + item.professional_value,
    }),
    {
      subtotal: 0,
      total_discount: 0,
      total_additions: 0,
      grand_total: 0,
      professional_total: 0,
    },
  );
}

export function calculateDiscountPercentage(subtotal, totalDiscount) {
  if (subtotal <= 0) return 0;
  return ((totalDiscount / subtotal) * 100).toFixed(2);
}

export function formatAppointmentItem(item) {
  return normalizeServiceItem(item);
}