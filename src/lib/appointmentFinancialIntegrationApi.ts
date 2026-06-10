/**
 * Appointment Financial Integration Service
 *
 * Handles automatic conversion of appointments to receivables (AR Invoices)
 * including calculations, validations, and financial automations.
 *
 * v2.0: Full tax support (PIS/COFINS/CSLL/IR/ISSQN)
 */

import { customSupabaseClient } from '@/lib/customSupabaseClient';
import { Database } from '@/types/database.types';
import { calculateTaxes, type TaxCalculationOutput } from './taxCalculationEngine';

// Types
export type AppointmentFinancialRule = Database['public']['Tables']['appointment_financial_rules']['Row'];
export type AppointmentToReceivableMapping = Database['public']['Tables']['appointment_to_receivable_mapping']['Row'];

interface AppointmentFinancialRuleCreate {
  clinic_id: string;
  name: string;
  description?: string;
  applies_to_status?: string[];
  applies_to_service_type?: string[];
  applies_to_professional_type?: string[];
  apply_discount_from_appointment?: boolean;
  automatic_discount_percent?: number;
  apply_tax?: boolean;
  tax_percent?: number;
  apply_doctor_commission?: boolean;
  auto_mark_as_received?: boolean;
  payment_method_default?: string;
  auto_generate_cash_flow?: boolean;
  cash_flow_account_id?: string;
  is_active?: boolean;
}

interface FinancialCalculation {
  appointment_id: string;
  value_gross: number;
  discount_total: number;
  tax_total: number;
  commission_total: number;
  value_net: number;
  breakdown: {
    discount_appointment: number;
    discount_rule_percent: number;
    tax_percent: number;
    commission_percent: number;
    commission_base: 'BRUTO' | 'LIQUIDO';
  };
}

interface CreateReceivableResult {
  success: boolean;
  receivable_id?: number;
  mapping_id?: number;
  values?: FinancialCalculation;
  error?: string;
  details?: any;
}

interface ValidationResult {
  valid: boolean;
  errors?: Array<{ field: string; error: string }>;
  appointment?: any;
}

/**
 * Finalize appointment with financial integration
 * Marks appointment as completed and creates financial records
 */
export async function finalizeAppointmentWithFinancials(
  appointmentId: string,
  clinicId: string
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    console.log('[finalizeAppointmentWithFinancials] Starting for:', { appointmentId, clinicId });

    // 1. Fetch appointment
    const { data: appointment, error: appointmentFetchError } = await customSupabaseClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .single();

    if (appointmentFetchError || !appointment) {
      console.error('[finalizeAppointmentWithFinancials] Appointment not found:', appointmentFetchError);
      return { success: false, message: 'Agendamento não encontrado' };
    }

    // 2. Update appointment status to 'completed'
    const { data: updatedAppointment, error: appointmentError } = await customSupabaseClient
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (appointmentError) {
      console.error('[finalizeAppointmentWithFinancials] Error updating appointment:', appointmentError);
      return { success: false, message: 'Erro ao atualizar status do agendamento' };
    }

    console.log('[finalizeAppointmentWithFinancials] Appointment updated:', updatedAppointment);

    // 3. Get appointment value - fetch from appointment_services if not set
    let appointmentValue = appointment.value;
    if (!appointmentValue || appointmentValue <= 0) {
      console.log('[finalizeAppointmentWithFinancials] Appointment.value is null, fetching from appointment_services...');

      const { data: services, error: servicesError } = await customSupabaseClient
        .from('appointment_services')
        .select('quantity, unit_price')
        .eq('appointment_id', appointmentId);

      if (!servicesError && services && services.length > 0) {
        appointmentValue = services.reduce((sum, s) => {
          const qty = parseFloat(s.quantity) || 0;
          const price = parseFloat(s.unit_price) || 0;
          return sum + (qty * price);
        }, 0);
        console.log('[finalizeAppointmentWithFinancials] Calculated value from services:', appointmentValue);
      }

      // If still no value, use default 100
      if (!appointmentValue || appointmentValue <= 0) {
        appointmentValue = 100;
        console.log('[finalizeAppointmentWithFinancials] No services found, using default value: 100');
      }
    }

    // 4. Return success if somehow we still have no value
    if (!appointmentValue || appointmentValue <= 0) {
      console.log('[finalizeAppointmentWithFinancials] Appointment has no valid value, skipping receivable creation');
      return {
        success: true,
        message: 'Agendamento finalizado (sem recebível - valor zero)',
        data: { appointmentId },
      };
    }

    // 4. Get payer information from appointment
    let payerType: 'CONVENIO' | 'PARTICULAR' = 'PARTICULAR';
    let payerId: string | undefined;

    // Determine payer type based on appointment data
    if (appointment.payer_id && appointment.payer_type === 'CONVENIO') {
      payerType = 'CONVENIO';
      payerId = appointment.payer_id;
    } else if (appointment.payer_id && appointment.payer_type === 'PARTICULAR') {
      payerType = 'PARTICULAR';
      payerId = appointment.payer_id;
    } else {
      // Default to PARTICULAR without specific client
      payerType = 'PARTICULAR';
    }

    console.log('[finalizeAppointmentWithFinancials v2.0] Payer Type:', payerType, 'Payer ID:', payerId);

    // 5. Calculate taxes using new engine (v2.0)
    let taxCalculation: TaxCalculationOutput;
    try {
      taxCalculation = await calculateTaxes({
        grossValue: appointmentValue,
        clinicId: clinicId,
        payerType: payerType,
        payerId: payerId,
      });
      console.log('[finalizeAppointmentWithFinancials v2.0] Tax calculation:', taxCalculation);
    } catch (taxError) {
      console.error('[finalizeAppointmentWithFinancials v2.0] Tax calculation error:', taxError);
      return {
        success: false,
        message: 'Erro ao calcular impostos',
        data: { error: taxError },
      };
    }

    // 6. Create detailed receivable (AR Invoice) with all tax details
    // Using correct column names that exist in ar_invoices table
    const { data: receivable, error: receivableError } = await customSupabaseClient
      .from('ar_invoices')
      .insert({
        clinic_id: clinicId,
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        patient_name: appointment.patient_name || 'Paciente', // Fallback

        // Payer info
        payer_type: payerType,
        payer_id: payerId,
        payer_rule_id: taxCalculation.payerRuleId,
        tax_regime: taxCalculation.taxRegime,

        // Values (using correct column names)
        amount: taxCalculation.grossValue,
        discount_value: taxCalculation.discountValue,
        service_value: taxCalculation.grossValue,
        total_impostos: taxCalculation.totalImpostos,
        net_value: taxCalculation.netValue,

        // Individual taxes (v2.0)
        pis_percent: taxCalculation.pisPercent,
        pis_value: taxCalculation.pisValue,
        cofins_percent: taxCalculation.cofinsPercent,
        cofins_value: taxCalculation.cofinsValue,
        csll_percent: taxCalculation.csllPercent,
        csll_value: taxCalculation.csllValue,
        ir_percent: taxCalculation.irPercent,
        ir_value: taxCalculation.irValue,
        issqn_percent: taxCalculation.issqnPercent,
        issqn_value: taxCalculation.issqnValue,

        // Status and dates (using correct column names)
        status: 'pending',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

        // Metadata (using description instead of descricao)
        description: `Faturamento automático de atendimento #${appointmentId}`,
        payment_method: 'pix',
      })
      .select()
      .single();

    if (receivableError || !receivable) {
      console.error('[finalizeAppointmentWithFinancials v2.0] Error creating receivable:', receivableError);
      return { success: false, message: 'Erro ao criar recebível' };
    }

    console.log('[finalizeAppointmentWithFinancials v2.0] Receivable created:', receivable);

    return {
      success: true,
      message: 'Agendamento finalizado e recebível criado automaticamente (v2.0)',
      data: {
        appointmentId,
        receivableId: receivable.id,
        taxCalculation, // Return all tax details
      },
    };
  } catch (err) {
    console.error('[finalizeAppointmentWithFinancials] Error:', err);
    return {
      success: false,
      message: `Erro ao finalizar: ${(err as any).message}`,
    };
  }
}

/**
 * Validate if appointment can be converted to receivable
 */
export async function validateAppointmentForReceivable(
  appointmentId: string
): Promise<ValidationResult> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('validate_appointment_for_receivable', {
        p_appointment_id: appointmentId,
      });

    if (error) throw error;
    return data as ValidationResult;
  } catch (err) {
    console.error('[validateAppointmentForReceivable] Error:', err);
    throw err;
  }
}

/**
 * Calculate financial values for appointment receivable
 * Includes discounts, taxes, commissions, net value
 */
export async function calculateAppointmentReceivableValues(
  appointmentId: string,
  clinicId: string
): Promise<FinancialCalculation> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('calculate_appointment_receivable_values', {
        p_appointment_id: appointmentId,
        p_clinic_id: clinicId,
      });

    if (error) throw error;
    return data as FinancialCalculation;
  } catch (err) {
    console.error('[calculateAppointmentReceivableValues] Error:', err);
    throw err;
  }
}

/**
 * Create receivable from appointment
 * Main automation function
 */
export async function createReceivableFromAppointment(
  appointmentId: string,
  clinicId: string,
  ruleId?: number
): Promise<CreateReceivableResult> {
  try {
    // 1. Validate appointment
    const validation = await validateAppointmentForReceivable(appointmentId);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation,
      };
    }

    // 2. Call RPC to create receivable
    const { data, error } = await customSupabaseClient
      .rpc('create_receivable_from_appointment', {
        p_appointment_id: appointmentId,
        p_clinic_id: clinicId,
        p_rule_id: ruleId || null,
      });

    if (error) throw error;

    return data as CreateReceivableResult;
  } catch (err) {
    console.error('[createReceivableFromAppointment] Error:', err);
    throw err;
  }
}

/**
 * Get financial rules for clinic
 */
export async function getAppointmentFinancialRules(
  clinicId: string
): Promise<AppointmentFinancialRule[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('appointment_financial_rules')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getAppointmentFinancialRules] Error:', err);
    throw err;
  }
}

/**
 * Create new financial rule
 */
export async function createAppointmentFinancialRule(
  clinicId: string,
  rule: Partial<AppointmentFinancialRuleCreate>
): Promise<AppointmentFinancialRule> {
  try {
    const ruleData = {
      clinic_id: clinicId,
      name: rule.name,
      description: rule.description,
      automatic_discount_percent: rule.automatic_discount_percent ?? 0,
      apply_tax: rule.apply_tax ?? true,
      tax_percent: rule.tax_percent ?? 0,
      apply_doctor_commission: rule.apply_doctor_commission ?? true,
      payment_method_default: rule.payment_method_default ?? 'cash',
      is_active: rule.is_active ?? true,
    };

    const { data, error } = await customSupabaseClient
      .from('appointment_financial_rules')
      .insert([ruleData])
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentFinancialRule;
  } catch (err) {
    console.error('[createAppointmentFinancialRule] Error:', err);
    throw err;
  }
}

/**
 * Update financial rule
 */
export async function updateAppointmentFinancialRule(
  ruleId: number,
  updates: Partial<AppointmentFinancialRuleCreate>
): Promise<AppointmentFinancialRule> {
  try {
    const { data, error } = await customSupabaseClient
      .from('appointment_financial_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentFinancialRule;
  } catch (err) {
    console.error('[updateAppointmentFinancialRule] Error:', err);
    throw err;
  }
}

/**
 * Get mappings between appointments and receivables
 */
export async function getAppointmentReceivableMappings(
  clinicId: string,
  filters?: {
    appointmentId?: string;
    receivableId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }
): Promise<AppointmentToReceivableMapping[]> {
  try {
    let query = customSupabaseClient
      .from('appointment_to_receivable_mapping')
      .select('*')
      .eq('clinic_id', clinicId);

    if (filters?.appointmentId) {
      query = query.eq('appointment_id', filters.appointmentId);
    }
    if (filters?.receivableId) {
      query = query.eq('receivable_id', filters.receivableId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getAppointmentReceivableMappings] Error:', err);
    throw err;
  }
}

/**
 * Get mapping by appointment ID
 */
export async function getMappingByAppointmentId(
  appointmentId: string
): Promise<AppointmentToReceivableMapping | null> {
  try {
    const { data, error } = await customSupabaseClient
      .from('appointment_to_receivable_mapping')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // 'not found' is ok
    return (data as AppointmentToReceivableMapping) || null;
  } catch (err) {
    console.error('[getMappingByAppointmentId] Error:', err);
    throw err;
  }
}

/**
 * ========================================
 * v2.0 API: Tax Configuration Functions
 * ========================================
 */

export interface TaxConfiguration {
  id?: number;
  clinic_id: string;
  tax_regime: 'lucro_real' | 'lucro_presumido' | 'simples_nacional';
  default_pis_percent: number;
  default_cofins_percent: number;
  default_csll_percent: number;
  default_ir_percent: number;
  issqn_percent: number;
  issqn_municipality_code?: string;
  presumed_profit_margin: number;
  retains_ist_on_particulars?: boolean;
  retains_ir_on_health_plans?: boolean;
  retains_pis_on_particulars?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get or create tax configuration for clinic
 */
export async function getTaxConfiguration(
  clinicId: string
): Promise<TaxConfiguration | null> {
  try {
    const { data, error } = await customSupabaseClient
      .from('tax_configurations')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No configuration found - create default
      return await createDefaultTaxConfiguration(clinicId);
    }

    if (error) throw error;
    return data as TaxConfiguration;
  } catch (err) {
    console.error('[getTaxConfiguration] Error:', err);
    return null;
  }
}

/**
 * Create default tax configuration
 */
async function createDefaultTaxConfiguration(
  clinicId: string
): Promise<TaxConfiguration | null> {
  try {
    const { data, error } = await customSupabaseClient
      .from('tax_configurations')
      .insert({
        clinic_id: clinicId,
        tax_regime: 'simples_nacional',
        default_pis_percent: 1.65,
        default_cofins_percent: 7.60,
        default_csll_percent: 9.00,
        default_ir_percent: 15.00,
        issqn_percent: 5.00,
        presumed_profit_margin: 32.00,
        retains_ist_on_particulars: false,
        retains_ir_on_health_plans: false,
        retains_pis_on_particulars: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TaxConfiguration;
  } catch (err) {
    console.error('[createDefaultTaxConfiguration] Error:', err);
    return null;
  }
}

/**
 * Update tax configuration
 */
export async function updateTaxConfiguration(
  clinicId: string,
  updates: Partial<Omit<TaxConfiguration, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>>
): Promise<TaxConfiguration | null> {
  try {
    const { data, error } = await customSupabaseClient
      .from('tax_configurations')
      .update(updates)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return data as TaxConfiguration;
  } catch (err) {
    console.error('[updateTaxConfiguration] Error:', err);
    throw err;
  }
}

/**
 * ========================================
 * v2.0 API: Appointment Payer Rules Functions
 * ========================================
 */

export interface AppointmentPayerRule {
  id?: number;
  clinic_id: string;
  payer_type: 'CONVENIO' | 'PARTICULAR';
  health_plan_id?: string | null;
  client_id?: string | null;
  name: string;
  description?: string;
  discount_percent: number;
  discount_type: 'percentage' | 'fixed_amount' | 'table_based';
  discount_fixed_amount?: number;
  discount_applies_to: 'gross_value' | 'net_value';
  pis_percent?: number;
  cofins_percent?: number;
  csll_percent?: number;
  ir_percent?: number;
  issqn_percent?: number;
  retains_ist?: boolean;
  retains_ir?: boolean;
  retains_pis?: boolean;
  retains_cofins?: boolean;
  payment_method?: string;
  days_to_pay?: number;
  requires_pre_authorization?: boolean;
  requires_guide_number?: boolean;
  minimum_value?: number;
  maximum_value?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * List payer rules for clinic
 */
export async function listPayerRules(
  clinicId: string,
  filters?: {
    payerType?: 'CONVENIO' | 'PARTICULAR';
    isActive?: boolean;
  }
): Promise<AppointmentPayerRule[]> {
  try {
    let query = customSupabaseClient
      .from('appointment_payer_rules')
      .select('*')
      .eq('clinic_id', clinicId);

    if (filters?.payerType) {
      query = query.eq('payer_type', filters.payerType);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as AppointmentPayerRule[];
  } catch (err) {
    console.error('[listPayerRules] Error:', err);
    return [];
  }
}

/**
 * Create payer rule
 */
export async function createPayerRule(
  rule: Omit<AppointmentPayerRule, 'id' | 'created_at' | 'updated_at'>
): Promise<AppointmentPayerRule | null> {
  try {
    // Validate constraint: CONVENIO must have health_plan_id
    if (rule.payer_type === 'CONVENIO' && !rule.health_plan_id) {
      throw new Error('Regras de CONVENIO requerem health_plan_id');
    }

    // Validate constraint: PARTICULAR must not have health_plan_id
    if (rule.payer_type === 'PARTICULAR' && rule.health_plan_id) {
      throw new Error('Regras de PARTICULAR não podem ter health_plan_id');
    }

    // Build insert object with required fields only (minimal schema)
    // This avoids potential schema cache issues in Supabase
    const insertData: any = {
      clinic_id: rule.clinic_id,
      payer_type: rule.payer_type,
      name: rule.name,
    };

    // Add health_plan_id for CONVENIO
    if (rule.payer_type === 'CONVENIO' && rule.health_plan_id) {
      insertData.health_plan_id = rule.health_plan_id;
    }

    // Add optional discount fields
    if (rule.discount_percent !== undefined && rule.discount_percent !== null && rule.discount_percent > 0) {
      insertData.discount_percent = rule.discount_percent;
    }

    const { data, error } = await customSupabaseClient
      .from('appointment_payer_rules')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[createPayerRule] Insert error:', error);
      throw error;
    }

    // Update with description and other optional fields if present
    if ((rule.description || rule.discount_type || rule.payment_method) && data) {
      const updateData: any = {};
      if (rule.description) updateData.description = rule.description;
      if (rule.discount_type) updateData.discount_type = rule.discount_type;
      if (rule.payment_method) updateData.payment_method = rule.payment_method;
      if (rule.days_to_pay !== undefined) updateData.days_to_pay = rule.days_to_pay;

      if (Object.keys(updateData).length > 0) {
        const { data: updatedData, error: updateError } = await customSupabaseClient
          .from('appointment_payer_rules')
          .update(updateData)
          .eq('id', data.id)
          .select()
          .single();

        if (updateError) {
          console.warn('[createPayerRule] Update warning:', updateError);
          // Don't throw - we successfully created the rule
        } else if (updatedData) {
          return updatedData as AppointmentPayerRule;
        }
      }
    }

    return data as AppointmentPayerRule;
  } catch (err) {
    console.error('[createPayerRule] Error:', err);
    throw err;
  }
}

/**
 * Update payer rule
 */
export async function updatePayerRule(
  ruleId: number,
  updates: Partial<Omit<AppointmentPayerRule, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>>
): Promise<AppointmentPayerRule | null> {
  try {
    const { data, error } = await customSupabaseClient
      .from('appointment_payer_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentPayerRule;
  } catch (err) {
    console.error('[updatePayerRule] Error:', err);
    throw err;
  }
}

/**
 * Delete payer rule
 */
export async function deletePayerRule(ruleId: number): Promise<void> {
  try {
    const { error } = await customSupabaseClient
      .from('appointment_payer_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
  } catch (err) {
    console.error('[deletePayerRule] Error:', err);
    throw err;
  }
}

/**
 * Cancel/revert a mapping
 * Marks mapping as reverted and can optionally cancel the receivable
 */
export async function revertAppointmentReceivableMapping(
  mappingId: number,
  cancelReceivable: boolean = false
): Promise<AppointmentToReceivableMapping> {
  try {
    // 1. Update mapping status to 'reverted'
    const { data: mappingData, error: mappingError } = await customSupabaseClient
      .from('appointment_to_receivable_mapping')
      .update({ status: 'reverted', updated_at: new Date().toISOString() })
      .eq('id', mappingId)
      .select()
      .single();

    if (mappingError) throw mappingError;

    // 2. If requested, cancel the receivable
    if (cancelReceivable && mappingData.receivable_id) {
      await customSupabaseClient
        .from('ar_invoices')
        .update({ status: 'canceled' })
        .eq('id', mappingData.receivable_id);
    }

    return mappingData as AppointmentToReceivableMapping;
  } catch (err) {
    console.error('[revertAppointmentReceivableMapping] Error:', err);
    throw err;
  }
}

/**
 * Get statistics for appointment financial integration
 */
export async function getAppointmentFinancialStats(
  clinicId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  total_appointments: number;
  total_receivables_created: number;
  total_value_gross: number;
  total_value_net: number;
  total_discounts: number;
  total_taxes: number;
  total_commissions: number;
  success_rate: number;
}> {
  try {
    let query = customSupabaseClient
      .from('appointment_to_receivable_mapping')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const { data, count, error } = await query;

    if (error) throw error;

    // Calculate totals
    const totals = (data || []).reduce(
      (acc, mapping) => ({
        total_value_gross: acc.total_value_gross + (mapping.appointment_value || 0),
        total_discounts: acc.total_discounts + (mapping.discount_applied || 0),
        total_taxes: acc.total_taxes + (mapping.tax_applied || 0),
        total_commissions: acc.total_commissions + 0, // TODO: get from receivable
      }),
      {
        total_value_gross: 0,
        total_discounts: 0,
        total_taxes: 0,
        total_commissions: 0,
      }
    );

    return {
      total_appointments: 0, // TODO: calculate from appointments table
      total_receivables_created: count || 0,
      total_value_gross: totals.total_value_gross,
      total_value_net:
        totals.total_value_gross -
        totals.total_discounts -
        totals.total_taxes -
        totals.total_commissions,
      total_discounts: totals.total_discounts,
      total_taxes: totals.total_taxes,
      total_commissions: totals.total_commissions,
      success_rate: 100, // TODO: calculate actual rate
    };
  } catch (err) {
    console.error('[getAppointmentFinancialStats] Error:', err);
    throw err;
  }
}

/**
 * Enable/disable financial automation for clinic
 */
export async function toggleAppointmentFinancialAutomation(
  clinicId: string,
  enabled: boolean
): Promise<void> {
  try {
    const { error } = await customSupabaseClient
      .from('appointment_financial_rules')
      .update({ is_active: enabled })
      .eq('clinic_id', clinicId);

    if (error) throw error;
  } catch (err) {
    console.error('[toggleAppointmentFinancialAutomation] Error:', err);
    throw err;
  }
}

/**
 * Deactivate a financial rule
 */
export async function deactivateAppointmentFinancialRule(
  ruleId: number
): Promise<AppointmentFinancialRule> {
  try {
    const { data, error } = await customSupabaseClient
      .from('appointment_financial_rules')
      .update({ is_active: false })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data as AppointmentFinancialRule;
  } catch (err) {
    console.error('[deactivateAppointmentFinancialRule] Error:', err);
    throw err;
  }
}

/**
 * Reprocess appointment financial records
 * Used for retry/correction after initial creation
 */
export async function reprocessAppointmentFinancials(
  appointmentId: string,
  clinicId: string
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    // 1. Check if mapping exists
    const existingMapping = await getMappingByAppointmentId(appointmentId);

    if (existingMapping) {
      // Revert existing mapping
      await revertAppointmentReceivableMapping(existingMapping.id, true);
    }

    // 2. Recreate financial records
    return await finalizeAppointmentWithFinancials(appointmentId, clinicId);
  } catch (err) {
    console.error('[reprocessAppointmentFinancials] Error:', err);
    return {
      success: false,
      message: `Erro ao reprocessar: ${(err as any).message}`,
    };
  }
}

/**
 * List financial audit logs for appointment
 */
export async function listFinancialAuditLogs(
  appointmentId?: string,
  clinicId?: string,
  filters?: {
    fromDate?: string;
    toDate?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<any[]> {
  try {
    let query = customSupabaseClient
      .from('financial_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[listFinancialAuditLogs] Error:', err);
    return [];
  }
}

/**
 * Create audit log entry for financial event
 */
export async function logFinancialEvent(
  appointmentId: string,
  clinicId: string,
  eventType: string,
  data: any
): Promise<void> {
  try {
    const { error } = await customSupabaseClient
      .from('financial_audit_logs')
      .insert({
        appointment_id: appointmentId,
        clinic_id: clinicId,
        event_type: eventType,
        event_data: data,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (err) {
    console.error('[logFinancialEvent] Error:', err);
    // Don't throw - logging failure shouldn't block main process
  }
}

/**
 * Get financial status for appointment
 */
export async function getAppointmentFinancialStatus(
  appointmentId: string,
  clinicId: string
): Promise<{
  status: 'not_processed' | 'pending' | 'processing' | 'completed' | 'error' | 'reverted';
  mapping?: AppointmentToReceivableMapping | null;
  receivable?: any | null;
  lastError?: string;
}> {
  try {
    const mapping = await getMappingByAppointmentId(appointmentId);

    if (!mapping) {
      return { status: 'not_processed' };
    }

    if (mapping.status === 'reverted') {
      return { status: 'reverted', mapping };
    }

    // Fetch receivable
    const { data: receivable, error: receivableError } = await customSupabaseClient
      .from('ar_invoices')
      .select('*')
      .eq('id', mapping.receivable_id)
      .single();

    if (receivableError && receivableError.code !== 'PGRST116') {
      throw receivableError;
    }

    const status = receivable?.status || 'unknown';

    return {
      status: status as any,
      mapping,
      receivable: receivable || null,
    };
  } catch (err) {
    console.error('[getAppointmentFinancialStatus] Error:', err);
    return {
      status: 'error',
      lastError: (err as any).message,
    };
  }
}

/**
 * Bulk create receivables from appointments
 * Useful for batch processing
 */
export async function bulkCreateReceivables(
  appointmentIds: string[],
  clinicId: string
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    appointmentId: string;
    success: boolean;
    receivableId?: number;
    error?: string;
  }>;
}> {
  try {
    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const appointmentId of appointmentIds) {
      try {
        const result = await finalizeAppointmentWithFinancials(appointmentId, clinicId);

        if (result.success) {
          results.push({
            appointmentId,
            success: true,
            receivableId: result.data?.receivableId,
          });
          succeeded++;
        } else {
          results.push({
            appointmentId,
            success: false,
            error: result.message,
          });
          failed++;
        }
      } catch (err) {
        results.push({
          appointmentId,
          success: false,
          error: (err as any).message,
        });
        failed++;
      }
    }

    return {
      total: appointmentIds.length,
      succeeded,
      failed,
      results,
    };
  } catch (err) {
    console.error('[bulkCreateReceivables] Error:', err);
    throw err;
  }
}

/**
 * Get financial statistics by date range
 */
export async function getFinancialStatsByDateRange(
  clinicId: string,
  fromDate: string,
  toDate: string
): Promise<{
  period: { from: string; to: string };
  total_appointments: number;
  total_receivables: number;
  total_gross: number;
  total_net: number;
  total_discounts: number;
  total_taxes: {
    pis: number;
    cofins: number;
    csll: number;
    ir: number;
    issqn: number;
    total: number;
  };
  average_gross: number;
  average_net: number;
}> {
  try {
    let query = customSupabaseClient
      .from('appointment_to_receivable_mapping')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    const { data, count, error } = await query;

    if (error) throw error;

    // Calculate aggregates
    const totals = (data || []).reduce(
      (acc, mapping) => ({
        total_gross: acc.total_gross + (mapping.appointment_value || 0),
        total_discounts: acc.total_discounts + (mapping.discount_applied || 0),
        total_taxes: acc.total_taxes + (mapping.tax_applied || 0),
        total_pis: acc.total_pis + (mapping.pis_applied || 0),
        total_cofins: acc.total_cofins + (mapping.cofins_applied || 0),
        total_csll: acc.total_csll + (mapping.csll_applied || 0),
        total_ir: acc.total_ir + (mapping.ir_applied || 0),
        total_issqn: acc.total_issqn + (mapping.issqn_applied || 0),
      }),
      {
        total_gross: 0,
        total_discounts: 0,
        total_taxes: 0,
        total_pis: 0,
        total_cofins: 0,
        total_csll: 0,
        total_ir: 0,
        total_issqn: 0,
      }
    );

    const numRecords = count || 0;

    return {
      period: { from: fromDate, to: toDate },
      total_appointments: 0, // TODO: get from appointments table
      total_receivables: numRecords,
      total_gross: totals.total_gross,
      total_net: totals.total_gross - totals.total_discounts - totals.total_taxes,
      total_discounts: totals.total_discounts,
      total_taxes: {
        pis: totals.total_pis,
        cofins: totals.total_cofins,
        csll: totals.total_csll,
        ir: totals.total_ir,
        issqn: totals.total_issqn,
        total: totals.total_taxes,
      },
      average_gross: numRecords > 0 ? totals.total_gross / numRecords : 0,
      average_net: numRecords > 0 ? (totals.total_gross - totals.total_discounts - totals.total_taxes) / numRecords : 0,
    };
  } catch (err) {
    console.error('[getFinancialStatsByDateRange] Error:', err);
    throw err;
  }
}

/**
 * Validate appointment data integrity before financial processing
 */
export async function validateAppointmentDataIntegrity(
  appointmentId: string,
  clinicId: string
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch appointment
    const { data: appointment, error: appointmentError } = await customSupabaseClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .single();

    if (appointmentError || !appointment) {
      errors.push('Agendamento não encontrado');
      return { valid: false, errors, warnings };
    }

    // Check required fields
    if (!appointment.patient_id) {
      errors.push('Paciente não definido');
    }

    if (!appointment.professional_id) {
      errors.push('Profissional não definido');
    }

    if (!appointment.value || appointment.value <= 0) {
      warnings.push('Valor do agendamento é zero ou negativo - recebível não será criado');
    }

    if (!appointment.payer_id) {
      warnings.push('Pagador não definido - será considerado PARTICULAR');
    }

    // Check if already has receivable
    const existingMapping = await getMappingByAppointmentId(appointmentId);
    if (existingMapping && existingMapping.status === 'active') {
      warnings.push('Agendamento já possui recebível ativo - será reprocessado');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (err) {
    console.error('[validateAppointmentDataIntegrity] Error:', err);
    return {
      valid: false,
      errors: [(err as any).message],
      warnings: [],
    };
  }
}

/**
 * Alias for getAppointmentFinancialRules (used by UI component)
 */
export const listAppointmentFinancialRules = getAppointmentFinancialRules;

export default {
  finalizeAppointmentWithFinancials,
  validateAppointmentForReceivable,
  calculateAppointmentReceivableValues,
  createReceivableFromAppointment,
  getAppointmentFinancialRules,
  createAppointmentFinancialRule,
  updateAppointmentFinancialRule,
  getAppointmentReceivableMappings,
  getMappingByAppointmentId,
  revertAppointmentReceivableMapping,
  getAppointmentFinancialStats,
  toggleAppointmentFinancialAutomation,
  listAppointmentFinancialRules,
  deactivateAppointmentFinancialRule,
};
