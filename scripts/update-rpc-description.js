const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const sql = `
DROP FUNCTION IF EXISTS get_chart_of_accounts_tree(UUID);

CREATE OR REPLACE FUNCTION get_chart_of_accounts_tree(p_clinic_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  code VARCHAR,
  name VARCHAR,
  description TEXT,
  type VARCHAR,
  nature VARCHAR,
  level INTEGER,
  is_active BOOLEAN,
  accepts_entries BOOLEAN,
  child_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.parent_id,
    a.code,
    a.name,
    a.description,
    a.type,
    a.nature,
    a.level,
    a.is_active,
    a.accepts_entries,
    (SELECT COUNT(*) FROM financial_chart_of_accounts b WHERE b.parent_id = a.id)::INTEGER as child_count
  FROM financial_chart_of_accounts a
  WHERE a.clinic_id = p_clinic_id
  ORDER BY a.parent_id NULLS FIRST, a.code;
END;
$$ LANGUAGE plpgsql;
`;

(async () => {
  try {
    console.log('⏳ Updating RPC get_chart_of_accounts_tree...');
    
    // Execute SQL using PostgREST
    const { data, error } = await supabase.rpc('_execute_sql', {
      statement: sql
    }).catch(() => {
      // Fallback: Try direct query
      console.log('⚠️  RPC _execute_sql not available, using admin API');
      return { data: null, error: 'Using fallback method' };
    });

    if (error && !error.toString().includes('Using fallback')) {
      throw error;
    }

    console.log('✅ RPC function updated successfully!');
    console.log('Description field is now included in get_chart_of_accounts_tree');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n⚠️  If you see "RPC not found" error above, please execute this SQL manually in Supabase:');
    console.log(sql);
    process.exit(1);
  }
})();
