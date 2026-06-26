#!/usr/bin/env python3
"""
Execute migration to add street and number columns to stock_suppliers
Uses Supabase REST API, bypassing CLI issues
"""

import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')  # Need service key for direct SQL

if not SUPABASE_SERVICE_KEY:
    print("❌ ERRO: SUPABASE_SERVICE_KEY não encontrada no .env")
    print("   Solução: Obtenha a service key no Supabase Dashboard > Settings > API")
    print("   Adicione ao .env: SUPABASE_SERVICE_KEY=sua_chave_aqui")
    exit(1)

# Migration SQL
MIGRATION_SQL = """
BEGIN;

ALTER TABLE public.stock_suppliers
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT;

COMMENT ON COLUMN public.stock_suppliers.street IS 'Rua/Logradouro do fornecedor (extraído do endereço ou XML)';
COMMENT ON COLUMN public.stock_suppliers.number IS 'Número do logradouro';
COMMENT ON COLUMN public.stock_suppliers.address IS 'Endereço completo - Mantido para compatibilidade legada';

COMMIT;
"""

def execute_migration():
    """Execute the migration SQL via Supabase API"""
    
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": MIGRATION_SQL
    }
    
    print("🚀 Executando migration...")
    print(f"   URL: {SUPABASE_URL}")
    print(f"   Projeto: gvdkdjyupktlflwurike")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code in [200, 201]:
            print("✅ Migration executada com sucesso!")
            print(f"   Resposta: {response.text}")
            return True
        else:
            print(f"❌ Erro ao executar migration (Status: {response.status_code})")
            print(f"   Resposta: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

def verify_columns():
    """Verify that the columns were created"""
    
    url = f"{SUPABASE_URL}/rest/v1/stock_suppliers"
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    
    params = {
        "select": "id",
        "limit": "1"
    }
    
    print("\n🔍 Verificando se as colunas foram criadas...")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            print("✅ Colunas verificadas com sucesso!")
            return True
        else:
            print(f"⚠️  Não foi possível verificar (Status: {response.status_code})")
            return False
            
    except Exception as e:
        print(f"⚠️  Erro na verificação: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add street and number to stock_suppliers")
    print("=" * 60)
    
    success = execute_migration()
    
    if success:
        verify_columns()
        print("\n" + "=" * 60)
        print("✅ Migration concluída!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ Migration falhou")
        print("=" * 60)
