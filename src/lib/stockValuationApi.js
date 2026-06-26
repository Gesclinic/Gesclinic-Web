import { supabase } from '@/lib/customSupabaseClient.js';

/**
 * Stock Valuation Methods:
 * - PEPS: Primeiro a Entrar, Primeiro a Sair
 * - UEPS: Último a Entrar, Primeiro a Sair
 * - Custo Médio: Média ponderada
 * - Últimas Compras: Últimas transações de entrada
 */

export const stockValuationApi = {
  /**
   * Get stock movements for a specific item to calculate valuation
   */
  getItemMovements: async (clinicId, itemId) => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('id, created_at, quantity, unit_cost, movement_type, notes')
      .eq('clinic_id', clinicId)
      .eq('stock_item_id', itemId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Calculate PEPS (Primeiro a Entrar, Primeiro a Sair)
   * Entries are valued at oldest purchase prices first
   */
  calculatePEPS: (movements) => {
    const entries = movements
      .filter((m) => m.movement_type === 'entry')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const exits = movements
      .filter((m) => m.movement_type === 'exit')
      .map((m) => m.quantity)
      .reduce((a, b) => a + b, 0);

    let remaining = entries.map((e) => ({
      quantity: e.quantity,
      unit_cost: e.unit_cost,
      created_at: e.created_at,
    }));

    let toRemove = exits;
    const valued = [];

    for (const item of remaining) {
      if (toRemove <= 0) {
        valued.push(item);
      } else if (toRemove >= item.quantity) {
        toRemove -= item.quantity;
      } else {
        valued.push({
          ...item,
          quantity: item.quantity - toRemove,
        });
        toRemove = 0;
      }
    }

    const totalQuantity = valued.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = valued.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0);

    return {
      method: 'PEPS',
      totalQuantity,
      totalValue,
      unitCostAverage: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      items: valued,
    };
  },

  /**
   * Calculate UEPS (Último a Entrar, Primeiro a Sair)
   * Entries are valued at newest purchase prices first
   */
  calculateUEPS: (movements) => {
    const entries = movements
      .filter((m) => m.movement_type === 'entry')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const exits = movements
      .filter((m) => m.movement_type === 'exit')
      .map((m) => m.quantity)
      .reduce((a, b) => a + b, 0);

    let remaining = entries.map((e) => ({
      quantity: e.quantity,
      unit_cost: e.unit_cost,
      created_at: e.created_at,
    }));

    let toRemove = exits;
    const valued = [];

    for (const item of remaining) {
      if (toRemove <= 0) {
        valued.push(item);
      } else if (toRemove >= item.quantity) {
        toRemove -= item.quantity;
      } else {
        valued.push({
          ...item,
          quantity: item.quantity - toRemove,
        });
        toRemove = 0;
      }
    }

    const totalQuantity = valued.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = valued.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0);

    return {
      method: 'UEPS',
      totalQuantity,
      totalValue,
      unitCostAverage: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      items: valued,
    };
  },

  /**
   * Calculate Weighted Average Cost
   */
  calculateWeightedAverage: (movements) => {
    const entries = movements.filter((m) => m.movement_type === 'entry');
    const exits = movements
      .filter((m) => m.movement_type === 'exit')
      .map((m) => m.quantity)
      .reduce((a, b) => a + b, 0);

    const totalEntryValue = entries.reduce((sum, e) => sum + (e.quantity * (e.unit_cost || 0)), 0);
    const totalEntryQty = entries.reduce((sum, e) => sum + e.quantity, 0);
    const averageUnitCost = totalEntryQty > 0 ? totalEntryValue / totalEntryQty : 0;

    const finalQuantity = totalEntryQty - exits;
    const finalValue = finalQuantity > 0 ? finalQuantity * averageUnitCost : 0;

    return {
      method: 'Custo Médio',
      totalQuantity: finalQuantity,
      totalValue: finalValue,
      unitCostAverage: averageUnitCost,
      items: [{
        quantity: finalQuantity,
        unit_cost: averageUnitCost,
        created_at: new Date().toISOString(),
      }],
    };
  },

  /**
   * Calculate using last purchase prices
   */
  calculateLastPurchases: (movements) => {
    const entries = movements
      .filter((m) => m.movement_type === 'entry')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const exits = movements
      .filter((m) => m.movement_type === 'exit')
      .map((m) => m.quantity)
      .reduce((a, b) => a + b, 0);

    const totalEntryQty = entries.reduce((sum, e) => sum + e.quantity, 0);
    const finalQuantity = totalEntryQty - exits;

    const recentPurchases = entries.slice(0, 3).map((entry) => ({
      unitCost: entry.unit_cost || 0,
      createdAt: entry.created_at,
    }));

    const lastEntry = entries[0];
    const lastUnitCost = lastEntry?.unit_cost || 0;
    const finalValue = finalQuantity > 0 ? finalQuantity * lastUnitCost : 0;

    return {
      method: 'Últimas Compras',
      totalQuantity: finalQuantity,
      totalValue: finalValue,
      unitCostAverage: lastUnitCost,
      recentPurchases,
      items: [{
        quantity: finalQuantity,
        unit_cost: lastUnitCost,
        created_at: lastEntry?.created_at || new Date().toISOString(),
      }],
    };
  },

  /**
   * Calculate all valuation methods for a given item
   */
  calculateAllMethods: (movements) => {
    const peps = stockValuationApi.calculatePEPS(movements);
    const ueps = stockValuationApi.calculateUEPS(movements);
    const weighted = stockValuationApi.calculateWeightedAverage(movements);
    const lastPurchases = stockValuationApi.calculateLastPurchases(movements);

    return {
      peps,
      ueps,
      weighted,
      lastPurchases,
    };
  },

  /**
   * Get all items with their valuations for a clinic
   */
  getClinicValuation: async (clinicId, method = 'weighted') => {
    const { data: items, error: itemsError } = await supabase
      .from('stock_items')
      .select('id, name, sku, category_id')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (itemsError) throw itemsError;

    const valuations = await Promise.all(
      (items || []).map(async (item) => {
        const movements = await stockValuationApi.getItemMovements(clinicId, item.id);
        const allMethods = stockValuationApi.calculateAllMethods(movements);
        
        return {
          ...item,
          valuations: allMethods,
          selectedMethod: allMethods[method] || allMethods.weighted,
        };
      }),
    );

    return valuations;
  },
};
