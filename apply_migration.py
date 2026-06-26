import os
import psycopg2
from dotenv import load_dotenv
import sys

load_dotenv()

# Parse Supabase connection string from URL
supabase_url = os.getenv('VITE_SUPABASE_URL')  # https://xxxxx.supabase.co
supabase_key = os.getenv('VITE_SUPABASE_ANON_KEY')

if not supabase_url:
    print('❌ Erro: VITE_SUPABASE_URL não configurado')
    sys.exit(1)

# Extract host from URL: https://xxxxx.supabase.co -> xxxxx.supabase.co
host = supabase_url.replace('https://', '').replace('http://', '')

# Try to read the database password from environment
db_password = os.getenv('DB_PASSWORD')
if not db_password:
    print('⚠️  DB_PASSWORD não configurado')
    print('Por favor, execute manualmente o SQL no Supabase SQL Editor:')
    print()
    with open('supabase/migrations/20260623_split_stock_suppliers_address.sql', 'r') as f:
        print(f.read())
    sys.exit(1)

try:
    # Connect to Supabase PostgreSQL
    print('⏳ Conectando ao Supabase...')
    conn = psycopg2.connect(
        host=host,
        port=5432,
        database='postgres',
        user='postgres',
        password=db_password
    )
    
    cursor = conn.cursor()
    
    print('⏳ Aplicando migração para adicionar street e number campos...\n')
    
    # Read and execute migration SQL
    with open('supabase/migrations/20260623_split_stock_suppliers_address.sql', 'r') as f:
        migration_sql = f.read()
    
    cursor.execute(migration_sql)
    conn.commit()
    
    print('✅ Migração aplicada com sucesso!')
    print('\n📋 Próximos passos:')
    print('1. Atualize a página do navegador (F5)')
    print('2. Importe um fornecedor via XML do módulo de Contas a Pagar')
    print('3. Verifique se o campo "Rua" agora é preenchido automaticamente')
    
    cursor.close()
    conn.close()
    
except psycopg2.Error as e:
    print(f'❌ Erro ao conectar ao banco: {e}')
    print('\nPor favor, execute manualmente o SQL no Supabase SQL Editor:')
    with open('supabase/migrations/20260623_split_stock_suppliers_address.sql', 'r') as f:
        print(f.read())
    sys.exit(1)

except FileNotFoundError:
    print('❌ Arquivo de migração não encontrado')
    sys.exit(1)
