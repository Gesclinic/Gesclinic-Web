const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260712_add_drawer_movement_manual_detail_columns.sql',
);

const sql = fs.readFileSync(migrationPath, 'utf8');
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

function printManualInstructions() {
  console.log('Migration pendente: colunas de detalhes manuais em drawer_movements');
  console.log('');
  console.log('Aplique no Supabase Dashboard > SQL Editor:');
  console.log('');
  console.log(sql);
}

async function run() {
  if (!dbUrl) {
    printManualInstructions();
    return;
  }

  let Client;
  try {
    ({ Client } = require('pg'));
  } catch (error) {
    console.error('Pacote pg nao instalado. Execute: npm install pg');
    printManualInstructions();
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query(sql);
    console.log('Migration aplicada com sucesso.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Erro ao aplicar migration:', error.message);
  printManualInstructions();
  process.exit(1);
});
