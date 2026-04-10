#!/usr/bin/env python3
import traceback
from supabase import create_client

SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA"

try:
    print("Conectando ao Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Tentar buscar agendamentos
    print("\n1. Buscando agendamentos...")
    resp = supabase.table("appointments").select("*").limit(1).execute()
    if resp.data:
        print("✅ Appointments (1ª linha):")
        print(resp.data[0])
    else:
        print("⚠️  Nenhum registro")
    
    # Tentar buscar producao medica
    print("\n2. Buscando medical_production...")
    resp = supabase.table("medical_production").select("*").limit(1).execute()
    if resp.data:
        print("✅ Medical Production (1ª linha):")
        print(resp.data[0])
    else:
        print("⚠️  Nenhum registro")
    
    # Tentar buscar repasse
    print("\n3. Buscando medical_repasse...")
    resp = supabase.table("medical_repasse").select("*").limit(1).execute()
    if resp.data:
        print("✅ Medical Repasse (1ª linha):")
        print(resp.data[0])
    else:
        print("⚠️  Nenhum registro")
    
    # Tentar buscar transações
    print("\n4. Buscando financial_transactions...")
    resp = supabase.table("financial_transactions").select("*").limit(1).execute()
    if resp.data:
        print("✅ Financial Transactions (1ª linha):")
        print(resp.data[0])
    else:
        print("⚠️  Nenhum registro")
        
except Exception as e:
    print(f"❌ Erro: {e}")
    traceback.print_exc()
