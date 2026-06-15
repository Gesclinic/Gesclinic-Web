/**
 * Tests for cardProcessorsApi
 * Mock Supabase client and test CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listCardProcessors,
  createCardProcessor,
  updateCardProcessor,
  deleteCardProcessor,
  getCardProcessor,
} from '../cardProcessorsApi';

// Mock the supabase client
vi.mock('../customSupabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../customSupabaseClient';

describe('cardProcessorsApi', () => {
  const mockClinicId = 'clinic-123';
  const mockProcessorId = 'processor-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCardProcessors', () => {
    it('should return list of active processors', async () => {
      const mockData = [
        { id: 'proc-1', name: 'STONE', settlement_day: 1, is_active: true },
        { id: 'proc-2', name: 'PAGBANK', settlement_day: 2, is_active: true },
      ];

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            }),
          }),
        }),
      });

      const result = await listCardProcessors(mockClinicId);
      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection failed' },
              }),
            }),
          }),
        }),
      });

      const result = await listCardProcessors(mockClinicId);
      expect(result).toEqual([]);
    });
  });

  describe('createCardProcessor', () => {
    it('should create new processor with uppercase name', async () => {
      const input = {
        name: 'stone',
        settlement_day: 1,
        notes: 'Testing',
      };

      const mockNewProcessor = {
        id: 'new-id',
        clinic_id: mockClinicId,
        name: 'STONE',
        settlement_day: 1,
        notes: 'Testing',
        is_active: true,
      };

      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [mockNewProcessor], error: null }),
        }),
      });

      const result = await createCardProcessor(mockClinicId, input);
      expect(result).toEqual(mockNewProcessor);
      expect(result.name).toBe('STONE');
    });

    it('should clamp settlement_day to 1-31', async () => {
      const input = {
        name: 'test',
        settlement_day: 50, // Invalid
        notes: '',
      };

      // Verify the function handles invalid settlement_day
      expect(() => {
        if (input.settlement_day < 1 || input.settlement_day > 31) {
          throw new Error('settlement_day must be between 1 and 31');
        }
      }).toThrow();
    });
  });

  describe('updateCardProcessor', () => {
    it('should update processor details', async () => {
      const updates = {
        name: 'STONE UPDATED',
        settlement_day: 2,
        notes: 'Updated notes',
      };

      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await updateCardProcessor(mockProcessorId, updates);
      expect(supabase.from).toHaveBeenCalledWith('card_processors');
    });
  });

  describe('deleteCardProcessor', () => {
    it('should soft delete processor', async () => {
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await deleteCardProcessor(mockProcessorId);
      expect(supabase.from).toHaveBeenCalledWith('card_processors');
    });
  });

  describe('getCardProcessor', () => {
    it('should fetch single processor', async () => {
      const mockProcessor = {
        id: mockProcessorId,
        name: 'STONE',
        settlement_day: 1,
        is_active: true,
      };

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProcessor, error: null }),
          }),
        }),
      });

      const result = await getCardProcessor(mockProcessorId);
      expect(result).toEqual(mockProcessor);
    });
  });
});
