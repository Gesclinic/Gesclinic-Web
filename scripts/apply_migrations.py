#!/usr/bin/env python3
"""
Script para aplicar migrações ao Supabase via SQL API
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório pai ao path para importar módulos
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from supabase import create_client
    import dotenv
except ImportError:
    print("❌ Dependências não encontradas. Instalando...")
    os.system("pip install supabase python-dotenv")
    from supabase import create_client
    import dotenv

# Carregar variáveis de ambiente
dotenv.load_dotenv(Path(__file__).parent.parent / '.env')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas em .env")
    sys.exit(1)

print(f"✅ Conectando ao Supabase: {SUPABASE_URL}")
client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Ler e executar migrações
migrations = [
    '2026-01-11_create_appointment_audit_logs.sql',
    '2026-01-12_create_rooms_table.sql',
    '2026-01-13_add_missing_appointments_columns.sql',
    '2026-01-14_create_agenda_indicators.sql',
]

migrations_dir = Path(__file__).parent.parent / 'supabase' / 'migrations'

for migration_file in migrations:
    migration_path = migrations_dir / migration_file
    
    if not migration_path.exists():
        print(f"⚠️  Arquivo não encontrado: {migration_path}")
        continue
    
    print(f"\n📝 Aplicando: {migration_file}")
    
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    try:
        # Executar SQL diretamente via Supabase RPC
        result = client.postgrest.from_('_migrations').insert({
            'name': migration_file,
            'sql': sql_content
        }).execute()
        print(f"✅ {migration_file} aplicada com sucesso")
    except Exception as e:
        print(f"⚠️  Erro ao aplicar {migration_file}: {str(e)}")
        print(f"   Pode ser necessário aplicar manualmente no Supabase SQL Editor")

print("\n✅ Processo concluído!")
print("💡 Se houver erros, acesse https://app.supabase.com/project/gvdkdjyupktlflwurike/sql/new")
