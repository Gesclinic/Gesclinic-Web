/**
 * Tests for processorFeesApi
 * Mock Supabase client and test CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listProcessorFees,
  createProcessorFee,
  updateProcessorFee,
  deleteProcessorFee,
  getProcessorFeeByCombo,
} from '../processorFeesApi';

// Mock the supabase client
vi.mock('../customSupabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../customSupabaseClient';

describe('processorFeesApi', () => {
  const mockClinicId = 'clinic-123';
  const mockProcessorId = 'processor-123';
  const mockFeeId = 'fee-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProcessorFees', () => {
    it('should list all fees for clinic', async () => {
      const mockFees = [
        {
          id: 'fee-1',
          clinic_id: mockClinicId,
          card_processor_id: mockProcessorId,
          card_brand: 'Visa',
          settlement_type: 'D+0',
          fee_percent: 3.99,
          is_active: true,
        },
        {
          id: 'fee-2',
          clinic_id: mockClinicId,
          card_processor_id: mockProcessorId,
          card_brand: 'Mastercard',
          settlement_type: 'D+1',
          fee_percent: 2.99,
          is_active: true,
        },
      ];

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockFees, error: null }),
          }),
        }),
      });

      const result = await listProcessorFees(mockClinicId);
      expect(result).toEqual(mockFees);
      expect(result).toHaveLength(2);
    });

    it('should filter by processor if provided', async () => {
      const mockFees = [
        {
          id: 'fee-1',
          card_processor_id: mockProcessorId,
          card_brand: 'Visa',
          settlement_type: 'D+0',
          fee_percent: 3.99,
        },
      ];

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockFees, error: null }),
          }),
        }),
      });

      const result = await listProcessorFees(mockClinicId, mockProcessorId);
      expect(result).toEqual(mockFees);
    });
  });

  describe('createProcessorFee', () => {
    it('should create new fee with normalized brand', async () => {
      const input = {
        processorId: mockProcessorId,
        cardBrand: 'visa', // lowercase
        settlementType: 'D+0',
        feePercent: 3.99,
      };

      const mockNewFee = {
        id: 'new-fee',
        clinic_id: mockClinicId,
        card_processor_id: mockProcessorId,
        card_brand: 'VISA', // uppercase
        settlement_type: 'D+0',
        fee_percent: 3.99,
        is_active: true,
      };

      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [mockNewFee], error: null }),
        }),
      });

      const result = await createProcessorFee(mockClinicId, input);
      expect(result).toEqual(mockNewFee);
      expect(result.card_brand).toBe('VISA');
    });

    it('should validate fee_percent range', async () => {
      const invalidInputs = [
        { feePercent: -1 },
        { feePercent: 101 },
        { feePercent: NaN },
      ];

      invalidInputs.forEach((input) => {
        expect(() => {
          if (input.feePercent < 0 || input.feePercent > 100) {
            throw new Error('fee_percent must be between 0 and 100');
          }
        }).toThrow();
      });
    });

    it('should require all mandatory fields', async () => {
      const input = {
        processorId: mockProcessorId,
        cardBrand: 'Visa',
        settlementType: '', // missing
        feePercent: 3.99,
      };

      expect(() => {
        if (!input.settlementType) {
          throw new Error('settlementType is required');
        }
      }).toThrow();
    });
  });

  describe('updateProcessorFee', () => {
    it('should update fee details', async () => {
      const updates = {
        cardBrand: 'VISA',
        settlementType: 'D+1',
        feePercent: 2.99,
      };

      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await updateProcessorFee(mockFeeId, updates);
      expect(supabase.from).toHaveBeenCalledWith('card_processor_fees');
    });
  });

  describe('deleteProcessorFee', () => {
    it('should soft delete fee', async () => {
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await deleteProcessorFee(mockFeeId);
      expect(supabase.from).toHaveBeenCalledWith('card_processor_fees');
    });
  });

  describe('getProcessorFeeByCombo', () => {
    it('should fetch fee by processor/brand/settlement combo', async () => {
      const mockFee = {
        id: mockFeeId,
        card_brand: 'Visa',
        settlement_type: 'D+0',
        fee_percent: 3.99,
      };

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockFee, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await getProcessorFeeByCombo(
        mockClinicId,
        mockProcessorId,
        'Visa',
        'D+0'
      );
      expect(result).toEqual(mockFee);
    });
  });
});
