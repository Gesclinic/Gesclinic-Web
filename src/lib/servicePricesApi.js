import { customSupabaseClient } from "./customSupabaseClient";

/**
 * Service Prices API
 * Manages pricing for services by payer/health insurance
 */

/**
 * Get all service prices for a clinic
 */
export async function getServicePrices(clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("service_prices")
      .select(
        `
        id,
        service_id,
        payer_id,
        price,
        base_price,
        co_pay,
        cost,
        currency,
        plan,
        active,
        services:service_id (id, name, code, service_category),
        payers:payer_id (id, name)
      `
      )
      .eq("clinic_id", clinicId);

    if (error) throw error;
    console.log("📊 Service Prices carregados:", data?.length || 0, "items");
    console.log("📊 Exemplo de preço com relacionamento:", data?.[0]);
    console.log("📊 Estrutura completa do primeiro item:", JSON.stringify(data?.[0], null, 2));
    if (data?.[0]?.services) {
      console.log("📊 Services object do primeiro preço:", data[0].services);
      console.log("📊 Code do services:", data[0].services.code);
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching service prices:", error);
    throw error;
  }
}

/**
 * Get prices for a specific service
 */
export async function getServicePricesByService(serviceId, clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("service_prices")
      .select(
        `
        id,
        service_id,
        payer_id,
        price,
        base_price,
        co_pay,
        cost,
        currency,
        plan,
        active,
        payers:payer_id (id, name)
      `
      )
      .eq("service_id", serviceId)
      .eq("clinic_id", clinicId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching service prices by service:", error);
    throw error;
  }
}

/**
 * Get prices for a specific payer
 */
export async function getServicePricesByPayer(payerId, clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("service_prices")
      .select(
        `
        id,
        service_id,
        payer_id,
        price,
        base_price,
        co_pay,
        active,
        services:service_id (id, name)
      `
      )
      .eq("payer_id", payerId)
      .eq("clinic_id", clinicId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching service prices by payer:", error);
    throw error;
  }
}

/**
 * Create a new service price
 */
export async function createServicePrice(clinicId, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from("service_prices")
      .insert([
        {
          clinic_id: clinicId,
          service_id: data.service_id,
          payer_id: data.payer_id || null,
          price: data.price,
          plan: data.plan || null,
          active: data.active ?? true,
        },
      ])
      .select();

    if (error) throw error;
    return result?.[0];
  } catch (error) {
    console.error("Error creating service price:", error);
    throw error;
  }
}

/**
 * Update a service price
 */
export async function updateServicePrice(id, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from("service_prices")
      .update({
        service_id: data.service_id,
        payer_id: data.payer_id || null,
        price: data.price,
        plan: data.plan || null,
        active: data.active,
      }).eq("id", id).select();

    if (error) throw error;
    return result?.[0];
  } catch (error) {
    console.error("Error updating service price:", error);
    throw error;
  }
}

/**
 * Delete a service price
 */
export async function deleteServicePrice(id) {
  try {
    const { error } = await customSupabaseClient
      .from("service_prices")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting service price:", error);
    throw error;
  }
}

/**
 * Get active prices only
 */
export async function getActiveServicePrices(clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("service_prices")
      .select(
        `
        id,
        service_id,
        payer_id,
        price,
        base_price,
        co_pay,
        services:service_id (id, name),
        payers:payer_id (id, name)
      `
      )
      .eq("clinic_id", clinicId)
      .eq("active", true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching active service prices:", error);
    throw error;
  }
}

/**
 * Get prices for a specific health insurance (convenio)
 * @param {string} clinicId
 * @param {string} healthInsuranceId
 * @returns {Promise<Array>}
 */
export async function getServicePricesByHealthInsurance(clinicId, healthInsuranceId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("service_prices")
      .select(
        `
        id,
        service_id,
        payer_id,
        price,
        services:service_id (id, name)
      `
      )
      .eq("clinic_id", clinicId)
      .eq("payer_id", healthInsuranceId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching service prices by health insurance:", error);
    throw error;
  }
}

/**
 * Upsert (create or update) a service price for health insurance
 * @param {string} clinicId
 * @param {string} healthInsuranceId
 * @param {string} serviceId
 * @param {number} valor
 * @returns {Promise<Object>}
 */
export async function upsertServicePriceHealthInsurance(clinicId, healthInsuranceId, serviceId, valor) {
  try {
    // Try to find existing record
    const { data: existing, error: searchError } = await customSupabaseClient
      .from("service_prices")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("payer_id", healthInsuranceId)
      .eq("service_id", serviceId)
      .maybeSingle();

    if (existing) {
      // Update
      const { data, error } = await customSupabaseClient
        .from("service_prices")
        .update({
          price: parseFloat(valor),
        })
        .eq("id", existing.id).select();

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

      if (error) throw error;
      return data;
    } else {
      // Insert
      const { data, error } = await customSupabaseClient
        .from("service_prices")
        .insert([
          {
            clinic_id: clinicId,
            payer_id: healthInsuranceId,
            service_id: serviceId,
            price: parseFloat(valor),
          },
        ])
        .select();

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error("Error upserting service price:", error);
    throw error;
  }
}

/**
 * Delete a service price for health insurance
 * @param {string} clinicId
 * @param {string} healthInsuranceId
 * @param {string} serviceId
 * @returns {Promise<boolean>}
 */
export async function deleteServicePriceHealthInsurance(clinicId, healthInsuranceId, serviceId) {
  try {
    const { error } = await customSupabaseClient
      .from("service_prices")
      .delete()
      .eq("clinic_id", clinicId)
      .eq("payer_id", healthInsuranceId)
      .eq("service_id", serviceId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting service price:", error);
    throw error;
  }
}
