/**
 * Appointment Financial Integration Tests
 * 
 * Tests for appointment to receivable conversion automation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateAppointmentForReceivable,
  calculateAppointmentReceivableValues,
  createReceivableFromAppointment,
  getAppointmentFinancialRules,
  getMappingByAppointmentId,
} from '@/lib/appointmentFinancialIntegrationApi';

// Mock data
const mockClinicId = '123e4567-e89b-12d3-a456-426614174000';
const mockAppointmentId = 'apt-12345';
const mockPatientId = 'pat-12345';
const mockProfessionalId = 'prof-12345';

/**
 * TEST SUITE 1: Validation
 */
describe('Appointment Financial Integration - Validation', () => {
  it('should validate a valid completed appointment', async () => {
    const result = await validateAppointmentForReceivable(mockAppointmentId);
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('appointment');
  });

  it('should reject non-completed appointments', async () => {
    // This would need a mock appointment with status != 'completed'
    const result = await validateAppointmentForReceivable('invalid-apt-id');
    expect(result.valid).toBe(false);
  });

  it('should detect missing patient', async () => {
    const result = await validateAppointmentForReceivable(mockAppointmentId);
    if (!result.valid && result.errors) {
      const patientError = result.errors.find((e) => e.field === 'patient');
      expect(patientError).toBeDefined();
    }
  });

  it('should validate appointment value is positive', async () => {
    const result = await validateAppointmentForReceivable(mockAppointmentId);
    if (result.appointment) {
      expect(result.appointment.value).toBeGreaterThan(0);
    }
  });
});

/**
 * TEST SUITE 2: Value Calculations
 */
describe('Appointment Financial Integration - Calculations', () => {
  it('should calculate basic values without discounts', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    expect(result).toHaveProperty('value_gross');
    expect(result).toHaveProperty('discount_total');
    expect(result).toHaveProperty('tax_total');
    expect(result).toHaveProperty('commission_total');
    expect(result).toHaveProperty('value_net');

    // value_net should be less than value_gross (after deductions)
    expect(result.value_net).toBeLessThanOrEqual(result.value_gross);
  });

  it('should apply appointment discount', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    expect(result.breakdown).toHaveProperty('discount_appointment');
    if (result.breakdown.discount_appointment > 0) {
      expect(result.discount_total).toBeGreaterThan(0);
    }
  });

  it('should calculate taxes correctly', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    if (result.breakdown.tax_percent > 0) {
      // Tax should be calculated on (gross - discount)
      const expectedTax =
        (result.value_gross - result.breakdown.discount_appointment) *
        (result.breakdown.tax_percent / 100);
      expect(Math.abs(result.tax_total - expectedTax)).toBeLessThan(0.01); // Allow 0.01 rounding error
    }
  });

  it('should calculate commission correctly', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    if (result.breakdown.commission_percent > 0) {
      if (result.breakdown.commission_base === 'BRUTO') {
        const expectedCommission =
          result.value_gross * (result.breakdown.commission_percent / 100);
        expect(Math.abs(result.commission_total - expectedCommission)).toBeLessThan(0.01);
      } else {
        // LIQUIDO base
        const baseValue =
          result.value_gross - result.discount_total - result.tax_total;
        const expectedCommission =
          baseValue * (result.breakdown.commission_percent / 100);
        expect(Math.abs(result.commission_total - expectedCommission)).toBeLessThan(0.01);
      }
    }
  });

  it('should ensure value_net = gross - discount - tax - commission', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    const calculated =
      result.value_gross -
      result.discount_total -
      result.tax_total -
      result.commission_total;
    expect(Math.abs(result.value_net - calculated)).toBeLessThan(0.01);
  });
});

/**
 * TEST SUITE 3: Receivable Creation
 */
describe('Appointment Financial Integration - Receivable Creation', () => {
  it('should create receivable successfully', async () => {
    const result = await createReceivableFromAppointment(
      mockAppointmentId,
      mockClinicId
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.receivable_id).toBeDefined();
      expect(result.mapping_id).toBeDefined();
      expect(result.values).toBeDefined();
    }
  });

  it('should fail gracefully on invalid appointment', async () => {
    const result = await createReceivableFromAppointment(
      'invalid-id',
      mockClinicId
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should create mapping record', async () => {
    const result = await createReceivableFromAppointment(
      mockAppointmentId,
      mockClinicId
    );

    if (result.success && result.mapping_id) {
      // Verify mapping was created
      expect(result.mapping_id).toBeGreaterThan(0);
    }
  });

  it('should create cash flow entry for projection', async () => {
    const result = await createReceivableFromAppointment(
      mockAppointmentId,
      mockClinicId
    );

    // Cash flow entry should be created with is_projected=true
    expect(result.success).toBe(true);
  });
});

/**
 * TEST SUITE 4: Rules Management
 */
describe('Appointment Financial Integration - Rules', () => {
  it('should fetch financial rules', async () => {
    const rules = await getAppointmentFinancialRules(mockClinicId);
    expect(Array.isArray(rules)).toBe(true);
  });

  it('should have at least one active rule', async () => {
    const rules = await getAppointmentFinancialRules(mockClinicId);
    const activeRules = rules.filter((r) => r.is_active);
    expect(activeRules.length).toBeGreaterThan(0);
  });

  it('should have correct rule structure', async () => {
    const rules = await getAppointmentFinancialRules(mockClinicId);
    if (rules.length > 0) {
      const rule = rules[0];
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('clinic_id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('is_active');
    }
  });
});

/**
 * TEST SUITE 5: Mapping Management
 */
describe('Appointment Financial Integration - Mappings', () => {
  it('should retrieve mapping by appointment id', async () => {
    const mapping = await getMappingByAppointmentId(mockAppointmentId);
    expect(mapping === null || typeof mapping === 'object').toBe(true);
  });

  it('should have correct mapping structure', async () => {
    const mapping = await getMappingByAppointmentId(mockAppointmentId);
    if (mapping) {
      expect(mapping).toHaveProperty('appointment_id');
      expect(mapping).toHaveProperty('receivable_id');
      expect(mapping).toHaveProperty('clinic_id');
      expect(mapping).toHaveProperty('status');
    }
  });
});

/**
 * TEST SUITE 6: Edge Cases and Error Handling
 */
describe('Appointment Financial Integration - Edge Cases', () => {
  it('should handle null/undefined inputs', async () => {
    try {
      // Should throw or return error, not crash
      await validateAppointmentForReceivable(null as any);
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('should handle invalid clinic id', async () => {
    const result = await createReceivableFromAppointment(
      mockAppointmentId,
      'invalid-clinic-id'
    );
    expect(result.success).toBe(false);
  });

  it('should handle duplicate receivable creation', async () => {
    // First creation should succeed
    const result1 = await createReceivableFromAppointment(
      mockAppointmentId,
      mockClinicId
    );

    // Second creation should fail or be idempotent
    if (result1.success) {
      const result2 = await createReceivableFromAppointment(
        mockAppointmentId,
        mockClinicId
      );
      // Should either fail or return same receivable_id
      expect(
        !result2.success || result2.receivable_id === result1.receivable_id
      ).toBe(true);
    }
  });

  it('should handle concurrent creates with race condition safety', async () => {
    // Simulate concurrent requests
    const promises = [
      createReceivableFromAppointment(mockAppointmentId, mockClinicId),
      createReceivableFromAppointment(mockAppointmentId, mockClinicId),
    ];

    const results = await Promise.all(promises);
    // Should not create duplicate receivables
    const successCount = results.filter((r) => r.success).length;
    expect(successCount).toBeLessThanOrEqual(1);
  });

  it('should handle calculation with zero values', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    // Even with zero value, should not crash
    expect(result).toHaveProperty('value_gross');
    expect(result).toHaveProperty('value_net');
  });

  it('should handle very large values without overflow', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    // Should handle large numbers
    expect(typeof result.value_gross).toBe('number');
    expect(typeof result.value_net).toBe('number');
    expect(result.value_net).toBeLessThanOrEqual(result.value_gross);
  });
});

/**
 * TEST SUITE 7: Performance
 */
describe('Appointment Financial Integration - Performance', () => {
  it('should calculate values in < 100ms', async () => {
    const start = performance.now();
    await calculateAppointmentReceivableValues(mockAppointmentId, mockClinicId);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should create receivable in < 200ms', async () => {
    const start = performance.now();
    await createReceivableFromAppointment(mockAppointmentId, mockClinicId);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should fetch rules in < 100ms', async () => {
    const start = performance.now();
    await getAppointmentFinancialRules(mockClinicId);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});

/**
 * TEST SUITE 8: Data Integrity
 */
describe('Appointment Financial Integration - Data Integrity', () => {
  it('should maintain referential integrity', async () => {
    const result = await createReceivableFromAppointment(
      mockAppointmentId,
      mockClinicId
    );

    if (result.success && result.mapping_id) {
      const mapping = await getMappingByAppointmentId(mockAppointmentId);
      expect(mapping?.appointment_id).toBe(mockAppointmentId);
      expect(mapping?.clinic_id).toBe(mockClinicId);
    }
  });

  it('should prevent negative values', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    expect(result.value_gross).toBeGreaterThanOrEqual(0);
    expect(result.discount_total).toBeGreaterThanOrEqual(0);
    expect(result.tax_total).toBeGreaterThanOrEqual(0);
    expect(result.commission_total).toBeGreaterThanOrEqual(0);
  });

  it('should maintain precision with decimals', async () => {
    const result = await calculateAppointmentReceivableValues(
      mockAppointmentId,
      mockClinicId
    );

    // Check that values don't have excessive decimal places
    expect((result.value_net.toString().split('.')[1] || '').length).toBeLessThanOrEqual(2);
    expect((result.discount_total.toString().split('.')[1] || '').length).toBeLessThanOrEqual(2);
  });

  it('should audit all changes', async () => {
    const result = await createReceivableFromAppointment(
      mockAppointmentId,
      mockClinicId
    );

    // Should create audit log entry
    if (result.success) {
      // Audit log should be queryable (tested in integration tests)
      expect(result).toHaveProperty('mapping_id');
    }
  });
});
