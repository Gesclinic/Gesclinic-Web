#!/usr/bin/env python3
"""
Script para verificar dados de Março 2026 no Supabase - VERSÃO CORRIGIDA
"""

import os
from datetime import datetime
from supabase import create_client, Client

# Configuração Supabase
SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA"

# Criar cliente
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 90)
print("🔍 VERIFICAÇÃO DE DADOS MARÇO 2026 - GESCLINIC (VERSÃO CORRIGIDA)")
print("=" * 90)

# Estado global
data_check = {}

# ============================================================================
# 1. VERIFICAR AGENDAMENTOS DE MARÇO 2026
# ============================================================================
print("\n✅ 1. AGENDAMENTOS DE MARÇO 2026")
print("-" * 90)

try:
    # scheduled_date está armazenado como DATE
    response = supabase.table("appointments").select(
        "id, scheduled_date, scheduled_time, professional_id, status, service_id"
    ).gte("scheduled_date", "2026-03-01").lt("scheduled_date", "2026-04-01").execute()
    
    appointments = response.data if response.data else []
    data_check["appointments"] = len(appointments)
    
    if appointments:
        print(f"   ✅ {len(appointments)} agendamentos encontrados")
        for i, apt in enumerate(appointments[:3], 1):
            print(f"      {i}. {apt['scheduled_date']} às {apt['scheduled_time']} - Status: {apt['status']}")
    else:
        print("   ⚠️  Nenhum agendamento em março")
        
except Exception as e:
    print(f"   ❌ Erro: {str(e)[:100]}")
    data_check["appointments"] = 0

# ============================================================================
# 2. VERIFICAR PRODUÇÃO MÉDICA (Repasse)
# ============================================================================
print("\n✅ 2. PRODUÇÃO MÉDICA (Repasse)")
print("-" * 90)

try:
    # data_atendimento é a coluna de data
    response = supabase.table("medical_production").select(
        "id, professional_id, valor_bruto, valor_liquido, tipo, data_atendimento"
    ).gte("data_atendimento", "2026-03-01").lt("data_atendimento", "2026-04-01").execute()
    
    productions = response.data if response.data else []
    data_check["production"] = len(productions)
    
    if productions:
        total = sum(float(p.get('valor_bruto', 0) or 0) for p in productions)
        print(f"   ✅ {len(productions)} registros | Total: R$ {total:,.2f}")
        for i, prod in enumerate(productions[:3], 1):
            print(f"      {i}. {prod['data_atendimento']}: R$ {prod.get('valor_bruto', 0)} ({prod['tipo']})")
    else:
        print("   ⚠️  Nenhuma produção em março")
        
except Exception as e:
    print(f"   ❌ Erro: {str(e)[:100]}")
    data_check["production"] = 0

# ============================================================================
# 3. VERIFICAR REPASSE MÉDICO
# ============================================================================
print("\n✅ 3. REPASSE MÉDICO")
print("-" * 90)

try:
    # periodo_inicio e periodo_fim
    response = supabase.table("medical_repasse").select(
        "id, professional_id, periodo_inicio, valor_profissional, valor_clinica, status"
    ).gte("periodo_inicio", "2026-03-01").lt("periodo_fim", "2026-04-01").execute()
    
    repassos = response.data if response.data else []
    data_check["repasse"] = len(repassos)
    
    if repassos:
        total_prof = sum(float(r.get('valor_profissional', 0) or 0) for r in repassos)
        total_clinic = sum(float(r.get('valor_clinica', 0) or 0) for r in repassos)
        print(f"   ✅ {len(repassos)} repasses calculados")
        print(f"      Profissional: R$ {total_prof:,.2f}")
        print(f"      Clínica: R$ {total_clinic:,.2f}")
        for i, rep in enumerate(repassos[:3], 1):
            print(f"      {i}. Prof: R$ {rep.get('valor_profissional', 0)} | Clínica: R$ {rep.get('valor_clinica', 0)}")
    else:
        print("   ⚠️  Nenhum repasse calculado em março")
        
except Exception as e:
    print(f"   ❌ Erro: {str(e)[:100]}")
    data_check["repasse"] = 0

# ============================================================================
# 4. VERIFICAR TRANSAÇÕES FINANCEIRAS (DRE/Fluxo)
# ============================================================================
print("\n✅ 4. TRANSAÇÕES FINANCEIRAS (DRE/Fluxo de Caixa)")
print("-" * 90)

try:
    # created_at é a coluna de data
    response = supabase.table("financial_transactions").select(
        "id, amount, type, category, status, description"
    ).gte("created_at", "2026-03-01T00:00:00").lt("created_at", "2026-04-01T00:00:00").execute()
    
    transactions = response.data if response.data else []
    data_check["transactions"] = len(transactions)
    
    if transactions:
        # Calcular totais por tipo
        by_type = {}
        for txn in transactions:
            t_type = txn.get('type', 'unknown')
            amt = float(txn.get('amount', 0) or 0)
            if t_type not in by_type:
                by_type[t_type] = 0
            by_type[t_type] += amt
        
        total = sum(by_type.values())
        print(f"   ✅ {len(transactions)} transações | Total: R$ {total:,.2f}")
        print(f"      Resumo por tipo:")
        for t_type, amt in sorted(by_type.items()):
            print(f"        - {t_type}: R$ {amt:,.2f}")
    else:
        print("   ⚠️  Nenhuma transação em março")
        
except Exception as e:
    print(f"   ❌ Erro: {str(e)[:100]}")
    data_check["transactions"] = 0

# ============================================================================
# 5. VERIFICAR CONTAS A RECEBER
# ============================================================================
print("\n✅ 5. CONTAS A RECEBER")
print("-" * 90)

try:
    # due_date é a coluna de vencimento
    response = supabase.table("ar_receivables").select(
        "id, amount, status, due_date, description"
    ).gte("due_date", "2026-03-01").lt("due_date", "2026-04-01").execute()
    
    receivables = response.data if response.data else []
    data_check["receivables"] = len(receivables)
    
    if receivables:
        total = sum(float(r.get('amount', 0) or 0) for r in receivables)
        print(f"   ✅ {len(receivables)} contas a receber | Total: R$ {total:,.2f}")
        for i, rec in enumerate(receivables[:3], 1):
            print(f"      {i}. {rec['due_date']}: R$ {rec.get('amount', 0)} ({rec['status']})")
    else:
        print("   ⚠️  Nenhuma conta a receber em março")
        
except Exception as e:
    print(f"   ❌ Erro: {str(e)[:100]}")
    data_check["receivables"] = 0

# ============================================================================
# RESUMO FINAL
# ============================================================================
print("\n" + "=" * 90)
print("📊 RESUMO FINAL - CHECKLIST DE INTEGRAÇÃO")
print("=" * 90)

print(f"\n{'Item':<30} {'Status':<20} {'Quantidade':<20}")
print("-" * 90)

checks = [
    ("Fluxo de Caixa (Transações)", data_check.get("transactions", 0)),
    ("Repasse Médico", data_check.get("repasse", 0)),
    ("Produção Médica", data_check.get("production", 0)),
    ("Contas a Receber", data_check.get("receivables", 0)),
    ("Agendamentos", data_check.get("appointments", 0)),
]

all_ok = True
for item, count in checks:
    status = "✅ OK" if count > 0 else "⚠️  VAZIO"
    if count == 0:
        all_ok = False
    print(f"{item:<30} {status:<20} {count:<20}")

print("-" * 90)

if all_ok:
    print("\n🎉 SUCESSO! A integração está funcionando corretamente!")
    print("   ✅ Fluxo de Caixa mostra valores")
    print("   ✅ Repasse Médico foi calculado")
    print("   ✅ Produção Médica foi registrada")
    print("   ✅ Contas a Receber têm entradas")
else:
    print("\n⚠️  Alguns itens não têm dados em março 2026")
    print("   Próximos passos:")
    print("   1. Verificar se as migrations foram aplicadas")
    print("   2. Verificar se dados foram criados corretamente")
    print("   3. Validar datas no sistema")

print("\n" + "=" * 90)
