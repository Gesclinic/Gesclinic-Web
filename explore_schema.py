#!/usr/bin/env python3
"""
Script para explorar o schema das tabelas no Supabase
"""

from supabase import create_client, Client

# Configuração Supabase
SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA"

# Criar cliente
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("🔍 EXPLORANDO SCHEMA DAS TABELAS")
print("=" * 80)

# Tabelas para explorar
tables_to_check = [
    "appointments",
    "medical_production", 
    "medical_repasse",
    "financial_transactions",
    "ar_receivables"
]

for table_name in tables_to_check:
    print(f"\n📋 Tabela: {table_name}")
    print("-" * 80)
    
    try:
        # Buscar 1 linha para ver as colunas
        response = supabase.table(table_name).select("*").limit(1).execute()
        
        if response.data and len(response.data) > 0:
            first_row = response.data[0]
            print(f"✅ Tabela existe com {len(first_row)} colunas:")
            for col, value in sorted(first_row.items()):
                print(f"   • {col}: {type(value).__name__}")
        else:
            print(f"⚠️  Tabela vazia, não foi possível listar colunas")
            
    except Exception as e:
        print(f"❌ Erro: {e}")

print("\n" + "=" * 80)
