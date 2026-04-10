#!/usr/bin/env python3
"""
Script para verificar dados de Março 2026 no Supabase
Verifica: Fluxo de Caixa, Repasse Médico, DRE, Contas a Receber
"""

import os
import sys
from datetime import datetime
from supabase import create_client, Client

# Configuração Supabase
SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA"

# Criar cliente
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("🔍 VERIFICAÇÃO DE DADOS MARÇO 2026 - GESCLINIC")
print("=" * 80)

# ============================================================================
# 1. VERIFICAR AGENDAMENTOS DE MARÇO 2026
# ============================================================================
print("\n✅ 1. VERIFICANDO AGENDAMENTOS DE MARÇO 2026...")
print("-" * 80)

try:
    response = supabase.table("appointments").select(
        "id, appointment_date, professional_id, room_id, appointment_status, price"
    ).gte("appointment_date", "2026-03-01").lt("appointment_date", "2026-04-01").execute()
    
    appointments = response.data if response.data else []
    print(f"   ✓ Total de agendamentos em março: {len(appointments)}")
    
    if appointments:
        for apt in appointments[:5]:  # Mostrar primeiros 5
            print(f"     - {apt['appointment_date']}: R$ {apt.get('price', 'N/A')} ({apt['appointment_status']})")
    else:
        print("   ⚠️  Nenhum agendamento encontrado em março")
        
except Exception as e:
    print(f"   ❌ Erro ao buscar agendamentos: {e}")

# ============================================================================
# 2. VERIFICAR PRODUÇÃO MÉDICA (Repasse)
# ============================================================================
print("\n✅ 2. VERIFICANDO PRODUÇÃO MÉDICA (Repasse)...")
print("-" * 80)

try:
    response = supabase.table("medical_production").select(
        "id, professional_id, amount, production_type, production_date"
    ).gte("production_date", "2026-03-01").lt("production_date", "2026-04-01").execute()
    
    productions = response.data if response.data else []
    print(f"   ✓ Total de registros de produção em março: {len(productions)}")
    
    if productions:
        total_production = sum(float(p.get('amount', 0)) for p in productions)
        print(f"   ✓ Valor total de produção: R$ {total_production:,.2f}")
        for prod in productions[:5]:
            print(f"     - {prod['production_date']}: R$ {prod.get('amount', 'N/A')} ({prod['production_type']})")
    else:
        print("   ⚠️  Nenhuma produção médica encontrada em março")
        
except Exception as e:
    print(f"   ❌ Erro ao buscar produção: {e}")

# ============================================================================
# 3. VERIFICAR REPASSE MÉDICO
# ============================================================================
print("\n✅ 3. VERIFICANDO REPASSE MÉDICO...")
print("-" * 80)

try:
    response = supabase.table("medical_repasse").select(
        "id, professional_id, repasse_amount, production_total, repasse_percentage"
    ).gte("calculated_date", "2026-03-01").lt("calculated_date", "2026-04-01").execute()
    
    repassos = response.data if response.data else []
    print(f"   ✓ Total de cálculos de repasse em março: {len(repassos)}")
    
    if repassos:
        total_repasse = sum(float(r.get('repasse_amount', 0)) for r in repassos)
        print(f"   ✓ Valor total de repasse: R$ {total_repasse:,.2f}")
        for rep in repassos[:5]:
            print(f"     - Prof ID {rep['professional_id']}: R$ {rep.get('repasse_amount', 'N/A')} ({rep['repasse_percentage']}%)")
    else:
        print("   ⚠️  Nenhum repasse médico encontrado em março")
        
except Exception as e:
    print(f"   ❌ Erro ao buscar repasse: {e}")

# ============================================================================
# 4. VERIFICAR TRANSAÇÕES FINANCEIRAS (DRE/Fluxo de Caixa)
# ============================================================================
print("\n✅ 4. VERIFICANDO TRANSAÇÕES FINANCEIRAS (DRE/Fluxo)...")
print("-" * 80)

try:
    response = supabase.table("financial_transactions").select(
        "id, account_id, amount, transaction_date, transaction_type, description"
    ).gte("transaction_date", "2026-03-01").lt("transaction_date", "2026-04-01").execute()
    
    transactions = response.data if response.data else []
    print(f"   ✓ Total de transações em março: {len(transactions)}")
    
    if transactions:
        # Agrupar por tipo
        by_type = {}
        by_account = {}
        
        for txn in transactions:
            t_type = txn.get('transaction_type', 'unknown')
            if t_type not in by_type:
                by_type[t_type] = []
            by_type[t_type].append(float(txn.get('amount', 0)))
            
        print(f"   Resumo por tipo de transação:")
        for t_type, amounts in by_type.items():
            total = sum(amounts)
            print(f"     - {t_type}: {len(amounts)} transações = R$ {total:,.2f}")
            
        print(f"\n   Primeiras 5 transações:")
        for txn in transactions[:5]:
            print(f"     - {txn['transaction_date']}: R$ {txn.get('amount', 'N/A')} ({txn['transaction_type']})")
    else:
        print("   ⚠️  Nenhuma transação encontrada em março")
        
except Exception as e:
    print(f"   ❌ Erro ao buscar transações: {e}")

# ============================================================================
# 5. VERIFICAR CONTAS A RECEBER
# ============================================================================
print("\n✅ 5. VERIFICANDO CONTAS A RECEBER...")
print("-" * 80)

# Tentar ambas as tabelas (nova e legada)
try:
    # Tentar nova: ar_receivables
    response = supabase.table("ar_receivables").select(
        "id, amount, due_date, status, description"
    ).gte("due_date", "2026-03-01").lt("due_date", "2026-04-01").execute()
    
    receivables = response.data if response.data else []
    
    if receivables:
        print(f"   ✓ Total de contas a receber em março: {len(receivables)}")
        total_ar = sum(float(r.get('amount', 0)) for r in receivables)
        print(f"   ✓ Valor total a receber: R$ {total_ar:,.2f}")
        for rec in receivables[:5]:
            print(f"     - {rec['due_date']}: R$ {rec.get('amount', 'N/A')} ({rec['status']})")
    else:
        print("   ⚠️  Nenhuma conta a receber encontrada em março (ar_receivables)")
        
except Exception as e:
    print(f"   ℹ️  Tabela ar_receivables não disponível: {e}")

# ============================================================================
# RESUMO FINAL
# ============================================================================
print("\n" + "=" * 80)
print("📊 RESUMO FINAL")
print("=" * 80)

try:
    # Contar registros por tabela
    tables_check = [
        ("appointments", "2026-03-01", "2026-04-01"),
        ("medical_production", "2026-03-01", "2026-04-01"),
        ("medical_repasse", "2026-03-01", "2026-04-01"),
        ("financial_transactions", "2026-03-01", "2026-04-01"),
    ]
    
    summary = {}
    for table_name, start_date, end_date in tables_check:
        try:
            response = supabase.table(table_name).select("count", count="exact").execute()
            summary[table_name] = "✅ Pronta"
        except:
            summary[table_name] = "⚠️  Vazia/Indisponível"
    
    print("\nEstado das Tabelas:")
    for table, status in summary.items():
        print(f"  • {table}: {status}")
        
except Exception as e:
    print(f"Erro ao verificar tabelas: {e}")

print("\n" + "=" * 80)
print("🎯 CONCLUSÃO:")
print("-" * 80)
print("Se todos os itens acima (1-4) estão com ✅ e têm valores,")
print("a integração está funcionando corretamente! 🎉")
print("=" * 80)
