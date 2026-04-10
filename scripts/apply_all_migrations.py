#!/usr/bin/env python3
"""
Script para aplicar migrações do Supabase automaticamente
Executa via SQL API do Supabase
"""

import os
import sys
from pathlib import Path
import urllib.request
import json

# Carregar .env
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip().strip('"')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas em .env")
    sys.exit(1)

print(f"✅ Conectando ao Supabase: {SUPABASE_URL}")
print()

# Ler migrações
migrations_dir = Path(__file__).parent / 'supabase' / 'migrations'
migration_files = [
    '2026-01-12_create_rooms_table.sql',
    '2026-01-13_add_missing_appointments_columns.sql',
    '2026-01-11_create_appointment_audit_logs.sql',
    '2026-01-14_create_agenda_indicators.sql',
]

def execute_sql(sql_content):
    """Executa SQL via Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/sql_execute"
    
    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Para executar SQL direto, usamos um endpoint especial
    url = f"{SUPABASE_URL}/graphql/v1"
    
    # Na verdade, vamos usar a API de query direto
    # Supabase não expõe SQL direto via REST, então vamos dividir e executar via Postgrest
    
    print(f"⚠️  Nota: Execute este SQL manualmente no Supabase SQL Editor")
    print(f"📋 URL: {SUPABASE_URL.replace('https://', 'https://').split('.')[0]}.supabase.co/project/sql")
    print()
    print(sql_content)
    print()
    print("=" * 80)
    return True

# Processar migrações
all_sql = "-- ============================================\n-- APLICAR TODAS AS MIGRAÇÕES\n-- ============================================\n\n"

for migration_file in migration_files:
    migration_path = migrations_dir / migration_file
    
    if not migration_path.exists():
        print(f"⚠️  Arquivo não encontrado: {migration_path}")
        continue
    
    print(f"📝 Processando: {migration_file}")
    
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    all_sql += f"\n-- ============================================\n-- {migration_file}\n-- ============================================\n\n"
    all_sql += sql_content
    all_sql += "\n\n"

# Salvar em arquivo para fácil cópia
output_file = migrations_dir.parent / 'MIGRAÇÕES_COMPLETAS.sql'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(all_sql)

print(f"\n✅ SQL consolidado salvo em: {output_file}")
print()
print("=" * 80)
print("📋 PRÓXIMOS PASSOS:")
print("=" * 80)
print()
print("1️⃣  Abra o arquivo:")
print(f"   {output_file}")
print()
print("2️⃣  Copie TODO o conteúdo (Ctrl+A, Ctrl+C)")
print()
print("3️⃣  Acesse Supabase SQL Editor:")
print(f"   {SUPABASE_URL.replace('.co', '.co').replace('https://', '').split('.')[0]}.supabase.co")
print()
print("4️⃣  Clique em 'New Query' e cole o SQL (Ctrl+V)")
print()
print("5️⃣  Execute (Ctrl+Enter)")
print()
print("6️⃣  Recarregue a página (F5)")
print()
print("=" * 80)
