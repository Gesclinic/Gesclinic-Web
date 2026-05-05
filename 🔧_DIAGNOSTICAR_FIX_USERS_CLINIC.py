#!/usr/bin/env python3
"""
🔍 DIAGNÓSTICO + FIX: Usuário não tem clínica associada

O trigger de RLS tenta buscar clinic_id da tabela users, mas se o usuário
não tem registro lá (ou clinic_id é NULL), vai dar erro.

Este script:
1. Verifica quais clínicas existem
2. Mostra status de todos os usuários
3. Associa usuário Fernando.cooper à primeira clínica
"""

import requests
import sys
from typing import Optional, List, Dict

# Supabase Config
SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODAzNTc3fQ.8h3x1Lg0kMfYgG5TfVn6Nh1W5aQ0b0Y6mJ8eQ1tX5wk"

def make_request(method: str, table: str, params: dict = None, data: dict = None, query_filter: str = "") -> requests.Response:
    """Make authenticated request to Supabase"""
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json",
    }
    
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if query_filter:
        url += f"?{query_filter}"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=data)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=data)
        else:
            raise ValueError(f"Method {method} not supported")
        
        resp.raise_for_status()
        return resp
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        if hasattr(e.response, 'text'):
            print(f"   Response: {e.response.text}")
        sys.exit(1)

def get_clinics() -> List[Dict]:
    """Get all clinics"""
    print("\n🏥 PASSO 1: Buscando clínicas...")
    resp = make_request("GET", "clinics", query_filter="select=id,name")
    clinics = resp.json()
    
    if not clinics:
        print("❌ Nenhuma clínica encontrada!")
        print("   Crie uma clínica primeiro via UI")
        return []
    
    print(f"✅ Encontradas {len(clinics)} clínica(s):")
    for i, clinic in enumerate(clinics, 1):
        print(f"   {i}. ID: {clinic['id'][:8]}... | Nome: {clinic['name']}")
    
    return clinics

def get_users() -> List[Dict]:
    """Get all users from users table"""
    print("\n👥 PASSO 2: Buscando usuários na tabela users...")
    resp = make_request("GET", "users", query_filter="select=id,email,clinic_id,role")
    users = resp.json()
    
    if not users:
        print("❌ Nenhum usuário encontrado na tabela users!")
        return []
    
    print(f"✅ Encontrados {len(users)} usuário(s):")
    for user in users:
        clinic_status = "✅ Associado" if user.get('clinic_id') else "❌ SEM CLÍNICA"
        print(f"   📧 {user['email']}")
        print(f"      ID: {user['id'][:8]}... | Role: {user.get('role', 'N/A')} | {clinic_status}")
        if user.get('clinic_id'):
            print(f"      Clinic ID: {user['clinic_id'][:8]}...")
        print()
    
    return users

def find_user_by_email(email: str) -> Optional[Dict]:
    """Find user by email"""
    query_filter = f"email=eq.{email}&select=id,email,clinic_id,role"
    resp = make_request("GET", "users", query_filter=query_filter)
    users = resp.json()
    return users[0] if users else None

def associate_user_to_clinic(user_id: str, clinic_id: str, user_email: str) -> bool:
    """Associate user to clinic"""
    print(f"\n🔧 Associando usuário {user_email} à clínica...")
    data = {"clinic_id": clinic_id}
    query_filter = f"id=eq.{user_id}"
    
    try:
        resp = make_request("PATCH", "users", data=data, query_filter=query_filter)
        print(f"✅ Usuário {user_email} agora está associado à clínica!")
        return True
    except Exception as e:
        print(f"❌ Erro ao associar usuário: {e}")
        return False

def main():
    print("╔════════════════════════════════════════════════════════════╗")
    print("║  🔍 DIAGNÓSTICO + FIX: Usuário sem Clínica Associada      ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    # Get clinics
    clinics = get_clinics()
    if not clinics:
        print("\n❌ Impossível continuar sem clínicas. Crie uma clínica primeiro!")
        return
    
    # Get users
    users = get_users()
    if not users:
        print("\n❌ Impossível continuar sem usuários.")
        print("   Faça login/signup para criar um usuário primeiro!")
        return
    
    # Find user without clinic
    print("📊 ANÁLISE:")
    users_without_clinic = [u for u in users if not u.get('clinic_id')]
    users_with_clinic = [u for u in users if u.get('clinic_id')]
    
    print(f"   ✅ Usuários COM clínica: {len(users_with_clinic)}")
    print(f"   ❌ Usuários SEM clínica: {len(users_without_clinic)}")
    
    if users_without_clinic:
        print("\n🔴 PROBLEMA DETECTADO!")
        print("   Os seguintes usuários NÃO têm clínica associada:")
        for user in users_without_clinic:
            print(f"   - {user['email']} (ID: {user['id'][:8]}...)")
        
        print("\n✅ SOLUÇÃO:")
        print("   Associando todos os usuários sem clínica à primeira clínica...")
        print()
        
        clinic_id = clinics[0]['id']
        clinic_name = clinics[0]['name']
        
        for user in users_without_clinic:
            success = associate_user_to_clinic(user['id'], clinic_id, user['email'])
            if success:
                print(f"   ✅ {user['email']} → {clinic_name}")
            else:
                print(f"   ❌ FALHOU: {user['email']}")
    else:
        print("\n✅ TUDO BEM!")
        print("   Todos os usuários têm clínica associada.")
    
    print("\n" + "="*60)
    print("🎉 PRÓXIMAS AÇÕES:")
    print("="*60)
    print("1. Recarregue a página (Ctrl+R ou Cmd+R)")
    print("2. Faça logout se necessário")
    print("3. Faça login novamente")
    print("4. Tente criar um novo agendamento")
    print("\n✅ O erro 'Usuário não tem clínica associada' deve desaparecer!")

if __name__ == "__main__":
    main()
