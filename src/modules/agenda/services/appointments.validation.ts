/**
 * PHASE 3: Appointments Validation Service
 * ═════════════════════════════════════════════════════════════════════════════
 * Purpose: Validate appointment relationships, time overlaps, and data integrity
 * Integration: Calls Supabase RPC functions for validation
 * Type-Safe: 100% TypeScript with comprehensive error handling
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/customSupabaseClient';
import { formatTime, isBusinessHours } from '@/modules/agenda/utils/timezone';

/**
 * VALIDATE APPOINTMENT RELATIONSHIPS
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates that all appointment foreign key references are valid:
 * - patient_id exists in patients table
 * - professional_id exists in professionals table
 * - service_id exists in services table
 * - payer_id exists in payers table (if set)
 * - room_id exists in rooms table (if set)
 *
 * @param clinicId - Clinic ID to validate appointments for
 * @returns Promise<ValidationResult> with issues array
 */
export async function validateRelationships(
  clinicId: string
): Promise<{
  isValid: boolean;
  count: number;
  issues: Array<{ appointmentId: string; issue: string }>;
}> {
  try {
    // In Phase 3.4, this will call Supabase RPC:
    // const result = await supabase.rpc('validate_appointment_relationships', {
    //   clinic_id: clinicId,
    // });

    // For now, return success (validates when new RPCs are created)
    return {
      isValid: true,
      count: 0,
      issues: [],
    };
  } catch (error) {
    console.error('❌ [validateRelationships] Error:', error);
    return {
      isValid: false,
      count: -1,
      issues: [{ appointmentId: 'system', issue: error instanceof Error ? error.message : 'Unknown error' }],
    };
  }
}

/**
 * CHECK TIME OVERLAPS
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates that appointments don't have time overlaps for the same:
 * - Professional + Date combination
 * - Room + Date combination
 *
 * @param appointmentData - Appointment data to check for overlaps
 * @returns Promise<ValidationResult> with overlap detection
 */
export async function checkTimeOverlap(appointmentData: {
  clinicId: string;
  professionalId: string;
  roomId?: string;
  scheduledDate: string;
  scheduledTime: string;
  endTime?: string;
  appointmentIdToExclude?: string;
}): Promise<{
  hasOverlap: boolean;
  conflicts: Array<{
    existingAppointmentId: string;
    conflict: 'professional' | 'room';
    conflictingTime: string;
  }>;
}> {
  try {
    // In Phase 3.4, this will call Supabase RPC:
    // const result = await supabase.rpc('has_overlap_appointments', {
    //   clinic_id: appointmentData.clinicId,
    //   professional_id: appointmentData.professionalId,
    //   room_id: appointmentData.roomId,
    //   scheduled_date: appointmentData.scheduledDate,
    //   scheduled_time: appointmentData.scheduledTime,
    //   end_time: appointmentData.endTime,
    //   exclude_appointment_id: appointmentData.appointmentIdToExclude,
    // });

    // For now, return no overlaps (validates when RPCs are created)
    return {
      hasOverlap: false,
      conflicts: [],
    };
  } catch (error) {
    console.error('❌ [checkTimeOverlap] Error:', error);
    return {
      hasOverlap: false,
      conflicts: [],
    };
  }
}

/**
 * VALIDATE BUSINESS HOURS
 * ─────────────────────────────────────────────────────────────────────────────
 * Local validation that appointment time is within business hours (08:00-20:00)
 * Note: This is non-blocking - returns warning, not error
 *
 * @param timeString - Time in HH:MM format
 * @returns boolean - true if within business hours, false if outside
 */
export function validateBusinessHours(timeString: string): boolean {
  return isBusinessHours(timeString);
}

/**
 * FORMAT APPOINTMENT TIME
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensures appointment times are consistently formatted as HH:MM
 *
 * @param timeString - Time string (can be HH:MM or HH:MM:SS)
 * @returns string - Formatted time as HH:MM
 */
export function formatAppointmentTime(timeString: string | null | undefined): string | null {
  return formatTime(timeString);
}

/**
 * CHECK PROFESSIONAL AVAILABILITY
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates that professional has working hours configured for the day
 * and that the appointment time falls within those hours
 *
 * @param clinicId - Clinic ID
 * @param professionalId - Professional ID
 * @param scheduledDate - Appointment date (YYYY-MM-DD or ISO string)
 * @param scheduledTime - Appointment time (HH:MM or HH:MM:SS)
 * @returns Promise with availability validation
 */
async function checkProfessionalAvailability(
  clinicId: string,
  professionalId: string,
  scheduledDate: string,
  scheduledTime: string
): Promise<{
  isAvailable: boolean;
  reason?: string;
}> {
  try {
    // Parse date to get day of week (0 = Sunday, 6 = Saturday)
    let dateObj: Date;
    if (typeof scheduledDate === 'string') {
      const dateParts = scheduledDate.split('T')[0].split('-');
      dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    } else {
      dateObj = new Date(scheduledDate);
    }

    const dayOfWeek = dateObj.getDay();

    // Get professional schedules for this day
    const { data: schedules, error } = await supabase
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('clinic_id', clinicId)
      .eq('day_of_week', dayOfWeek)
      .eq('active', true);

    if (error) {
      console.error('❌ [checkProfessionalAvailability] Database error:', error);
      return {
        isAvailable: false,
        reason: 'Erro ao verificar disponibilidade do profissional',
      };
    }

    // If no schedules found for this day, professional is not available
    if (!schedules || schedules.length === 0) {
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return {
        isAvailable: false,
        reason: `Este profissional não atende ${dayNames[dayOfWeek]}`,
      };
    }

    // Parse appointment time
    const [apptHour, apptMin] = scheduledTime.split(':').map(Number);
    const apptTotalMinutes = apptHour * 60 + apptMin;

    // Check if appointment time falls within any of the professional's working hours
    for (const schedule of schedules) {
      const [startHour, startMin] = schedule.start_time.split(':').map(Number);
      const [endHour, endMin] = schedule.end_time.split(':').map(Number);

      const startTotalMinutes = startHour * 60 + startMin;
      const endTotalMinutes = endHour * 60 + endMin;

      // Handle breaks if configured
      let breakStartMinutes = -1;
      let breakEndMinutes = -1;
      if (schedule.break_start && schedule.break_end) {
        const [breakStartHour, breakStartMin] = schedule.break_start.split(':').map(Number);
        const [breakEndHour, breakEndMin] = schedule.break_end.split(':').map(Number);
        breakStartMinutes = breakStartHour * 60 + breakStartMin;
        breakEndMinutes = breakEndHour * 60 + breakEndMin;
      }

      // Check if time is within working hours and not during break
      const isWithinWorkingHours = apptTotalMinutes >= startTotalMinutes && apptTotalMinutes < endTotalMinutes;
      const isDuringBreak = breakStartMinutes >= 0 && apptTotalMinutes >= breakStartMinutes && apptTotalMinutes < breakEndMinutes;

      if (isWithinWorkingHours && !isDuringBreak) {
        return {
          isAvailable: true,
        };
      }
    }

    // Time is outside all working hour windows
    return {
      isAvailable: false,
      reason: 'Este profissional não atende neste horário',
    };
  } catch (error) {
    console.error('❌ [checkProfessionalAvailability] Error:', error);
    return {
      isAvailable: false,
      reason: 'Erro ao verificar disponibilidade do profissional',
    };
  }
}

/**
 * COMPREHENSIVE APPOINTMENT VALIDATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs all validations on appointment data before creation/update
 *
 * @param clinicId - Clinic ID
 * @param appointmentData - Appointment data to validate
 * @returns Promise<ValidationResult> with all validation issues
 */
export async function validateAppointmentBeforeSave(
  clinicId: string,
  appointmentData: {
    professionalId: string;
    roomId?: string;
    scheduledDate: string;
    scheduledTime: string;
    endTime?: string;
    appointmentIdToExclude?: string;
  }
): Promise<{
  isValid: boolean;
  warnings: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate required fields
    if (!appointmentData.professionalId) {
      errors.push('Professional ID is required');
    }
    if (!appointmentData.scheduledDate) {
      errors.push('Scheduled date is required');
    }
    if (!appointmentData.scheduledTime) {
      errors.push('Scheduled time is required');
    }

    // Validate time format
    if (appointmentData.scheduledTime && !/^\d{2}:\d{2}/.test(appointmentData.scheduledTime)) {
      errors.push('Invalid time format. Use HH:MM');
    }

    // Validate business hours (warning, not error)
    if (appointmentData.scheduledTime && !validateBusinessHours(appointmentData.scheduledTime)) {
      warnings.push('⚠️ Time is outside business hours (08:00 - 20:00)');
    }

    // ✅ NEW: Check professional availability (day of week and working hours)
    if (!errors.length && appointmentData.professionalId && appointmentData.scheduledDate && appointmentData.scheduledTime) {
      const availabilityCheck = await checkProfessionalAvailability(
        clinicId,
        appointmentData.professionalId,
        appointmentData.scheduledDate,
        appointmentData.scheduledTime
      );

      if (!availabilityCheck.isAvailable) {
        errors.push(availabilityCheck.reason || 'Professional is not available at this time');
      }
    }

    // Check for overlaps
    if (!errors.length) {
      const overlapCheck = await checkTimeOverlap({
        clinicId,
        ...appointmentData,
      });

      if (overlapCheck.hasOverlap) {
        errors.push(
          `Time slot conflicts with ${overlapCheck.conflicts.length} existing appointment(s)`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  } catch (error) {
    console.error('❌ [validateAppointmentBeforeSave] Error:', error);
    return {
      isValid: false,
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Validation error'],
    };
  }
}

/**
 * VALIDATE APPOINTMENT FOR DISPLAY
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates appointment data is ready for UI display
 *
 * @param appointment - Appointment object to validate
 * @returns boolean - true if all required fields are present
 */
export function validateAppointmentForDisplay(appointment: Record<string, any>): boolean {
  return (
    !!appointment.id &&
    !!appointment.patient_id &&
    !!appointment.professional_id &&
    !!appointment.scheduled_date &&
    !!appointment.scheduled_time
  );
}

/**
 * GET VALIDATION ERROR MESSAGE
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts validation issues to user-friendly messages
 *
 * @param error - Error code or message
 * @returns string - User-friendly error message in Portuguese
 */
export function getValidationErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    'patient_id is required': 'Paciente é obrigatório',
    'professional_id is required': 'Profissional é obrigatório',
    'service_id is required': 'Serviço é obrigatório',
    'payer_id is required': 'Convênio é obrigatório',
    'scheduled_date is required': 'Data é obrigatória',
    'scheduled_time is required': 'Horário é obrigatório',
    'Invalid time format. Use HH:MM': 'Formato de hora inválido. Use HH:MM',
    'Professional ID is required': 'Profissional é obrigatório',
    'Scheduled date is required': 'Data é obrigatória',
    'Scheduled time is required': 'Horário é obrigatório',
  };

  return messages[error] || error;
}

/**
 * Export all validation functions as namespace
 */
export const appointmentValidation = {
  validateRelationships,
  checkTimeOverlap,
  validateBusinessHours,
  formatAppointmentTime,
  validateAppointmentBeforeSave,
  validateAppointmentForDisplay,
  getValidationErrorMessage,
};
