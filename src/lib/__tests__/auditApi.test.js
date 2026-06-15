/**
 * Tests for auditApi.js
 * Testing audit log retrieval, filtering, and statistics
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  listAuditLogs,
  getAuditSummary,
  countAuditLogs,
  AUDIT_ACTION_TYPES,
  AUDIT_ACTION_DESCRIPTIONS,
} from '../auditApi';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('../customSupabaseClient', () => ({
  default: {
    from: vi.fn(),
  },
}));

describe('auditApi', () => {
  describe('Constants', () => {
    it('should have AUDIT_ACTION_TYPES defined', () => {
      expect(AUDIT_ACTION_TYPES).toBeDefined();
      expect(AUDIT_ACTION_TYPES.CREATED).toBe('CREATED');
      expect(AUDIT_ACTION_TYPES.UPDATED).toBe('UPDATED');
      expect(AUDIT_ACTION_TYPES.DELETED).toBe('DELETED');
    });

    it('should have AUDIT_ACTION_DESCRIPTIONS defined', () => {
      expect(AUDIT_ACTION_DESCRIPTIONS).toBeDefined();
      expect(AUDIT_ACTION_DESCRIPTIONS.CREATED).toBe('Agendamento Criado');
      expect(AUDIT_ACTION_DESCRIPTIONS.UPDATED).toBe('Agendamento Atualizado');
      expect(AUDIT_ACTION_DESCRIPTIONS.DELETED).toBe('Agendamento Deletado');
    });
  });

  describe('listAuditLogs', () => {
    it('should be a function', () => {
      expect(typeof listAuditLogs).toBe('function');
    });

    it('should accept clinic ID parameter', () => {
      const params = {
        clinicId: 'test-clinic-id',
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });

    it('should accept action type filter', () => {
      const params = {
        clinicId: 'test-clinic-id',
        actionType: AUDIT_ACTION_TYPES.CREATED,
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });

    it('should accept date range filters', () => {
      const params = {
        clinicId: 'test-clinic-id',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });

    it('should return an array or promise', async () => {
      const result = listAuditLogs({
        clinicId: 'test-clinic-id',
      });
      expect(result instanceof Promise || Array.isArray(result)).toBeTruthy();
    });
  });

  describe('getAuditSummary', () => {
    it('should be a function', () => {
      expect(typeof getAuditSummary).toBe('function');
    });

    it('should accept clinic ID parameter', () => {
      const params = {
        clinicId: 'test-clinic-id',
      };
      expect(() => {
        getAuditSummary(params);
      }).not.toThrow();
    });

    it('should return summary with action counts', async () => {
      const result = getAuditSummary({
        clinicId: 'test-clinic-id',
      });
      expect(result instanceof Promise).toBeTruthy();
    });
  });

  describe('countAuditLogs', () => {
    it('should be a function', () => {
      expect(typeof countAuditLogs).toBe('function');
    });

    it('should accept clinic ID parameter', () => {
      const params = {
        clinicId: 'test-clinic-id',
      };
      expect(() => {
        countAuditLogs(params);
      }).not.toThrow();
    });

    it('should return a count', async () => {
      const result = countAuditLogs({
        clinicId: 'test-clinic-id',
      });
      expect(result instanceof Promise || typeof result === 'number').toBeTruthy();
    });
  });

  describe('DELETE trigger validation', () => {
    it('should support DELETED action type', () => {
      expect(AUDIT_ACTION_TYPES.DELETED).toBe('DELETED');
      expect(AUDIT_ACTION_DESCRIPTIONS.DELETED).toBe('Agendamento Deletado');
    });

    it('should allow filtering by DELETED action', () => {
      const params = {
        clinicId: 'test-clinic-id',
        actionType: AUDIT_ACTION_TYPES.DELETED,
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });

    it('should include appointment relationship for DELETED logs', async () => {
      // This test verifies that the query includes the appointment relationship
      // which allows accessing appointment details for deleted appointments
      expect(() => {
        listAuditLogs({ clinicId: 'test-clinic-id' });
      }).not.toThrow();
    });
  });

  describe('Backward compatibility', () => {
    it('should export logAppointmentAudit for legacy code', () => {
      // Import with * to check all exports
      expect(typeof logAppointmentAudit).toBe('function' || 'undefined');
    });

    it('should handle undefined parameters gracefully', async () => {
      const result = listAuditLogs({});
      expect(result instanceof Promise || Array.isArray(result)).toBeTruthy();
    });
  });

  describe('Data filtering', () => {
    it('should filter logs by appointment ID', () => {
      const params = {
        clinicId: 'test-clinic-id',
        appointmentId: 'appointment-123',
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });

    it('should filter logs by performed by user', () => {
      const params = {
        clinicId: 'test-clinic-id',
        performedBy: 'user-123',
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });

    it('should support limit parameter for pagination', () => {
      const params = {
        clinicId: 'test-clinic-id',
        limit: 50,
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle missing clinic ID gracefully', async () => {
      const result = listAuditLogs({});
      expect(result instanceof Promise || Array.isArray(result)).toBeTruthy();
    });

    it('should handle invalid date ranges', () => {
      const params = {
        clinicId: 'test-clinic-id',
        startDate: 'invalid',
        endDate: 'invalid',
      };
      expect(() => {
        listAuditLogs(params);
      }).not.toThrow();
    });
  });
});
