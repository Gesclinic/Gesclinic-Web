import { supabase } from './src/lib/customSupabaseClient.js';

async function checkStockData() {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('id, stock_item_id, quantity, unit_cost, movement_type, total_value:quantity*unit_cost, notes, created_at')
      .limit(50);
    
    if (error) throw error;
    
    console.log('\n📊 Stock Movements Data:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    data.forEach((row, idx) => {
      console.log(`\n[${idx + 1}] Movement ID: ${row.id}`);
      console.log(`    Item ID: ${row.stock_item_id}`);
      console.log(`    Type: ${row.movement_type}`);
      console.log(`    Quantity: ${row.quantity}`);
      console.log(`    Unit Cost: R$ ${row.unit_cost}`);
      console.log(`    Created: ${row.created_at}`);
      if (row.notes) console.log(`    Notes: ${row.notes}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    // Aggregate by item
    const { data: items, error: itemsError } = await supabase
      .from('stock_items')
      .select('id, name, sku')
      .limit(10);
    
    if (!itemsError) {
      console.log('\n📦 Items with movements:');
      for (const item of items) {
        const { data: itemMovements } = await supabase
          .from('stock_movements')
          .select('id, quantity, unit_cost, movement_type')
          .eq('stock_item_id', item.id);
        
        if (itemMovements?.length) {
          const totalQty = itemMovements.reduce((sum, m) => sum + (m.movement_type === 'entry' ? m.quantity : -m.quantity), 0);
          const lastEntry = itemMovements
            .filter(m => m.movement_type === 'entry')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          
          console.log(`\n${item.name} (${item.sku})`);
          console.log(`  Total movements: ${itemMovements.length}`);
          console.log(`  Current inventory: ${totalQty}`);
          console.log(`  Last entry unit cost: R$ ${lastEntry?.unit_cost || 'N/A'}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkStockData();
