#!/usr/bin/env python3
"""
Script para aplicar a migration da função list_stock_items_with_balance no Supabase
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados em .env")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("⚠️  Instalando supabase-py...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "supabase"])
    from supabase import create_client

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read the SQL file
sql_file = Path(__file__).parent / "supabase/migrations/2026-01-07_create_stock_balance_function.sql"

if not sql_file.exists():
    print(f"❌ Arquivo não encontrado: {sql_file}")
    sys.exit(1)

print(f"📖 Lendo arquivo: {sql_file}")
with open(sql_file, 'r', encoding='utf-8') as f:
    sql_content = f.read()

print("🚀 Aplicando migration no Supabase...")
print("-" * 60)

try:
    # Execute the SQL via Supabase's exec_sql
    # Note: This uses the admin API, requires service role key
    response = supabase.postgrest.session.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        json={"sql": sql_content},
        headers={"Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    
    print("✅ Migration aplicada com sucesso!")
    print(response)
    
except Exception as e:
    print(f"⚠️  Erro ao executar via API: {e}")
    print("\n💡 Alternativa: copie e cole o SQL abaixo na Supabase console:")
    print("-" * 60)
    print(sql_content)
    print("-" * 60)
    print("\n📍 Acesse: https://app.supabase.com")
    print("   → SQL Editor → copie o conteúdo acima → Execute")
