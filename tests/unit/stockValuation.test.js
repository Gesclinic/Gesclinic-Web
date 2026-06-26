import { describe, it, expect } from 'vitest';
import { stockValuationApi } from '@/lib/stockValuationApi';

describe('Stock Valuation API', () => {
  const sampleMovements = [
    // Entrada 1: 10 unidades a R$ 100
    {
      id: '1',
      created_at: '2024-01-01T10:00:00Z',
      quantity: 10,
      unit_cost: 100,
      movement_type: 'entry',
    },
    // Entrada 2: 5 unidades a R$ 110
    {
      id: '2',
      created_at: '2024-01-05T10:00:00Z',
      quantity: 5,
      unit_cost: 110,
      movement_type: 'entry',
    },
    // Saída: 8 unidades
    {
      id: '3',
      created_at: '2024-01-10T10:00:00Z',
      quantity: 8,
      movement_type: 'exit',
    },
    // Entrada 3: 3 unidades a R$ 120
    {
      id: '4',
      created_at: '2024-01-15T10:00:00Z',
      quantity: 3,
      unit_cost: 120,
      movement_type: 'entry',
    },
  ];

  describe('PEPS', () => {
    it('deve valorizar estoque com preços mais antigos primeiro', () => {
      const result = stockValuationApi.calculatePEPS(sampleMovements);
      
      // Total entrada: 10 + 5 + 3 = 18
      // Total saída: 8
      // Estoque final: 10 unidades
      // PEPS: 8 da primeira entrada (removidas), ficam 2 da primeira (2 * 100) + 5 da segunda (5 * 110) + 3 da terceira (3 * 120)
      // = 200 + 550 + 360 = 1.110
      
      expect(result.method).toBe('PEPS');
      expect(result.totalQuantity).toBe(10);
      expect(result.totalValue).toBe(1110);
      expect(result.unitCostAverage).toBeCloseTo(111, 2);
    });
  });

  describe('UEPS', () => {
    it('deve valorizar estoque com preços mais novos primeiro', () => {
      const result = stockValuationApi.calculateUEPS(sampleMovements);
      
      // Total entrada: 18
      // Total saída: 8
      // Estoque final: 10 unidades
      // UEPS: Remove primeiros 8 das entradas mais novas
      // 3 (última entrada) + 5 (segunda entrada) = 8 removidas
      // Ficam: 10 (primeira entrada) = 10 * 100 = 1.000
      
      expect(result.method).toBe('UEPS');
      expect(result.totalQuantity).toBe(10);
      expect(result.totalValue).toBeCloseTo(1000, 2);
    });
  });

  describe('Custo Médio', () => {
    it('deve calcular média ponderada de custos', () => {
      const result = stockValuationApi.calculateWeightedAverage(sampleMovements);
      
      // Total entrada: 18 unidades
      // Total valor: 10*100 + 5*110 + 3*120 = 1000 + 550 + 360 = 1.910
      // Custo médio: 1910 / 18 = 106.11
      // Estoque final: 18 - 8 = 10 unidades
      // Valor final: 10 * 106.11 = 1.061,11
      
      expect(result.method).toBe('Custo Médio');
      expect(result.totalQuantity).toBe(10);
      expect(result.unitCostAverage).toBeCloseTo(106.11, 2);
      expect(result.totalValue).toBeCloseTo(1061.11, 2);
    });
  });

  describe('Últimas Compras', () => {
    it('deve valorizar com preço da compra mais recente', () => {
      const result = stockValuationApi.calculateLastPurchases(sampleMovements);
      
      // Preço mais recente: 3 * 120 = 360 (da última entrada)
      // Estoque final: 10 unidades
      // Valor: 10 * 120 = 1.200
      
      expect(result.method).toBe('Últimas Compras');
      expect(result.totalQuantity).toBe(10);
      expect(result.unitCostAverage).toBe(120);
      expect(result.totalValue).toBe(1200);
    });
  });

  describe('Comparação entre métodos', () => {
    it('deve retornar todos os métodos com diferentes resultados', () => {
      const result = stockValuationApi.calculateAllMethods(sampleMovements);
      
      expect(result).toHaveProperty('peps');
      expect(result).toHaveProperty('ueps');
      expect(result).toHaveProperty('weighted');
      expect(result).toHaveProperty('lastPurchases');
      
      // UEPS deve ser menor que Custo Médio que deve ser menor que Últimas Compras
      expect(result.ueps.totalValue).toBeLessThan(result.weighted.totalValue);
      expect(result.weighted.totalValue).toBeLessThan(result.lastPurchases.totalValue);
    });
  });

  describe('Edge cases', () => {
    it('deve lidar com sem movimentos', () => {
      const result = stockValuationApi.calculateWeightedAverage([]);
      
      expect(result.totalQuantity).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it('deve lidar com apenas entradas (sem saídas)', () => {
      const movementsOnly = [
        {
          id: '1',
          created_at: '2024-01-01T10:00:00Z',
          quantity: 10,
          unit_cost: 100,
          movement_type: 'entry',
        },
      ];
      
      const result = stockValuationApi.calculateWeightedAverage(movementsOnly);
      
      expect(result.totalQuantity).toBe(10);
      expect(result.totalValue).toBe(1000);
    });

    it('deve lidar com custos nulos (sem informação de preço)', () => {
      const movementsWithoutCost = [
        {
          id: '1',
          created_at: '2024-01-01T10:00:00Z',
          quantity: 10,
          unit_cost: null,
          movement_type: 'entry',
        },
        {
          id: '2',
          created_at: '2024-01-05T10:00:00Z',
          quantity: 5,
          movement_type: 'exit',
        },
      ];
      
      const result = stockValuationApi.calculateWeightedAverage(movementsWithoutCost);
      
      expect(result.totalQuantity).toBe(5);
      expect(result.totalValue).toBe(0);
    });
  });
});
