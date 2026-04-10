import { customSupabaseClient } from "./customSupabaseClient";

/**
 * Professional Schedule API
 * Manages professional availability and schedules
 */

/**
 * Get all schedules for a professional
 */
export async function getProfessionalSchedules(professionalId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("professional_schedules")
      .select("*")
      .eq("professional_id", professionalId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching professional schedules:", error);
    throw error;
  }
}

/**
 * Get all schedules for a clinic (all professionals in that clinic)
 */
export async function getClinicSchedules(clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("professional_schedules")
      .select("*")
      .eq("clinic_id", clinicId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching clinic schedules:", error);
    throw error;
  }
}

/**
 * Create a new professional schedule
 */
export async function createProfessionalSchedule(clinicId, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from("professional_schedules")
      .insert([
        {
          clinic_id: clinicId,
          professional_id: data.professional_id,
          unit_name: data.unit_name || null,
          room_id: data.room_id || null,
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
          break_start: data.break_start || null,
          break_end: data.break_end || null,
          active: data.active ?? true,
          duration_minutes: data.duration_minutes || 30,
          observations: data.observations || null,
          allowed_health_insurances: data.allowed_health_insurances || null,
        },
      ])
      .select();

    if (error) throw error;
    return result?.[0];
  } catch (error) {
    console.error("Error creating professional schedule:", error);
    throw error;
  }
}

/**
 * Upsert (create or update) a professional schedule
 */
export async function upsertSchedule(clinicId, professionalId, data) {
  try {
    if (data.id) {
      // Update existing schedule
      const { data: result, error } = await customSupabaseClient
        .from("professional_schedules")
        .update({
          unit_name: data.unit_name || null,
          room_id: data.room_id || null,
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
          break_start: data.break_start || null,
          break_end: data.break_end || null,
          active: data.active ?? true,
          duration_minutes: data.duration_minutes || 30,
          observations: data.observations || null,
          allowed_health_insurances: data.allowed_health_insurances || null,
        })
        .eq("id", data.id)
        .select();

      if (error) throw error;
      return result?.[0];
    } else {
      // Create new schedule
      const { data: result, error } = await customSupabaseClient
        .from("professional_schedules")
        .insert([{
          clinic_id: clinicId,
          professional_id: professionalId,
          unit_name: data.unit_name || null,
          room_id: data.room_id || null,
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
          break_start: data.break_start || null,
          break_end: data.break_end || null,
          active: data.active ?? true,
          duration_minutes: data.duration_minutes || 30,
          observations: data.observations || null,
          allowed_health_insurances: data.allowed_health_insurances || null,
        }])
        .select();

      if (error) throw error;
      return result?.[0];
    }
  } catch (error) {
    console.error("Error upserting professional schedule:", error);
    throw error;
  }
}

/**
 * Update a professional schedule
 */
export async function updateProfessionalSchedule(id, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from("professional_schedules")
      .update({
        unit_name: data.unit_name || null,
        room_id: data.room_id || null,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        break_start: data.break_start || null,
        break_end: data.break_end || null,
        active: data.active ?? true,
        note: data.note || "",
        blocked: data.blocked || false,
        duration_minutes: data.duration_minutes || 30,
        observations: data.observations || null,
        allowed_health_insurances: data.allowed_health_insurances || null,
      })
      .eq("id", id)
      .select();

    if (error) throw error;
    return result?.[0];
  } catch (error) {
    console.error("Error updating professional schedule:", error);
    throw error;
  }
}

/**
 * Delete a professional schedule
 */
export async function deleteProfessionalSchedule(id) {
  try {
    const { error } = await customSupabaseClient
      .from("professional_schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting professional schedule:", error);
    throw error;
  }
}

/**
 * Get all schedules for a clinic with professional info
 */
export async function getAllSchedulesByClinic(clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("professional_schedules")
      .select(
        `
        id,
        professional_id,
        day_of_week,
        start_time,
        end_time,
        break_start,
        break_end,
        active,
        professionals:professional_id (id, name)
      `
      )
      .eq("clinic_id", clinicId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching all schedules by clinic:", error);
    throw error;
  }
}
