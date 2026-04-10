import { customSupabaseClient } from "./customSupabaseClient";

/**
 * Room Resources API
 * Manages resources assigned to rooms
 */

/**
 * Get all resources for a room
 */
export async function getRoomResources(roomId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("resources")
      .select("*")
      .eq("room_id", roomId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching room resources:", error);
    throw error;
  }
}

/**
 * Get all resources by clinic
 */
export async function getResourcesByClinic(clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("resources")
      .select(
        `
        id,
        name,
        room_id,
        type,
        quantity,
        active,
        rooms:room_id (id, name)
      `
      )
      .eq("clinic_id", clinicId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching resources by clinic:", error);
    throw error;
  }
}

/**
 * Create a new room resource
 */
export async function createRoomResource(clinicId, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from("resources")
      .insert([
        {
          clinic_id: clinicId,
          room_id: data.room_id,
          name: data.name,
          type: data.type,
          quantity: data.quantity,
          active: data.active ?? true,
        },
      ])
      .select();

    if (error) throw error;
    return result?.[0];
  } catch (error) {
    console.error("Error creating room resource:", error);
    throw error;
  }
}

/**
 * Update a room resource
 */
export async function updateRoomResource(id, data) {
  try {
    const { data: result, error } = await customSupabaseClient
      .from("resources")
      .update({
        name: data.name,
        type: data.type,
        quantity: data.quantity,
        active: data.active,
      })
      .eq("id", id)
      .select();

    if (error) throw error;
    return result?.[0];
  } catch (error) {
    console.error("Error updating room resource:", error);
    throw error;
  }
}

/**
 * Delete a room resource
 */
export async function deleteRoomResource(id) {
  try {
    const { error } = await customSupabaseClient
      .from("resources")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting room resource:", error);
    throw error;
  }
}

/**
 * Get resources by room with clinic context
 */
export async function getResourcesByRoomAndClinic(roomId, clinicId) {
  try {
    const { data, error } = await customSupabaseClient
      .from("resources")
      .select("*")
      .eq("room_id", roomId)
      .eq("clinic_id", clinicId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching resources by room and clinic:", error);
    throw error;
  }
}
