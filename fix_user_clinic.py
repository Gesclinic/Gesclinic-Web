#!/usr/bin/env python3
"""
Script para associar o usuário Fernando.cooper@gesclinic.com.br a uma clínica
"""

import requests
import json

# Credenciais do Supabase
SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A"

headers = {
    "apikey": ANON_KEY,
    "Content-Type": "application/json",
}

print("🔍 PASSO 1: Buscando todas as clínicas...")
clinics_resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/clinics?select=id,name",
    headers=headers,
)
clinics_resp.raise_for_status()
clinics = clinics_resp.json()
print(f"✅ Encontradas {len(clinics)} clínica(s):")
for clinic in clinics:
    print(f"  - ID: {clinic['id']}, Nome: {clinic['name']}")

if not clinics:
    print("❌ Nenhuma clínica encontrada! Crie uma clínica primeiro.")
    exit(1)

clinic_id = clinics[0]["id"]
clinic_name = clinics[0]["name"]

print(f"\n🔍 PASSO 2: Buscando usuário Fernando.cooper@gesclinic.com.br...")
users_resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/users?email=eq.Fernando.cooper@gesclinic.com.br",
    headers=headers,
)
users_resp.raise_for_status()
users = users_resp.json()

if not users:
    print("❌ Usuário não encontrado no banco de dados!")
    exit(1)

user = users[0]
print(f"✅ Usuário encontrado:")
print(f"  - ID: {user['id']}")
print(f"  - Email: {user['email']}")
print(f"  - Clinic ID atual: {user.get('clinic_id', 'NULL')}")

print(f"\n🔧 PASSO 3: Atualizando usuário com clinic_id={clinic_id}...")
update_resp = requests.patch(
    f"{SUPABASE_URL}/rest/v1/users?id=eq.{user['id']}",
    headers=headers,
    json={"clinic_id": clinic_id},
)
update_resp.raise_for_status()
print(f"✅ Usuário atualizado com sucesso!")
print(f"   Agora o usuário está associado à clínica: {clinic_name}")

print("\n✅ TUDO PRONTO! Recarregue a página e tente criar um paciente novamente.")
