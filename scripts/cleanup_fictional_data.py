#!/usr/bin/env python3
"""
Script para limpar dados fictícios do Supabase
Usa API REST do Supabase para deletar registros
Uso: python scripts/cleanup_fictional_data.py
"""

import os
import sys
import json
from pathlib import Path
from typing import List
import requests

class SupabaseCleanup:
    FICTIONAL_NAMES = [
        "Dr. João Silva",
        "Dra. Maria Santos",
        "Dr. Pedro Costa",
        "Dra. Ana Lima"
    ]
    
    def __init__(self):
        self.load_env()
        self.setup_client()
    
    def load_env(self):
        """Carregar variáveis de ambiente do .env"""
        env_file = Path(".env")
        if not env_file.exists():
            print("❌ Arquivo .env não encontrado!")
            sys.exit(1)
        
        self.env = {}
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    self.env[key.strip()] = value.strip()
    
    def setup_client(self):
        """Configurar cliente Supabase"""
        self.url = self.env.get("VITE_SUPABASE_URL")
        self.key = self.env.get("VITE_SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            print("❌ Credenciais do Supabase não encontradas!")
            sys.exit(1)
        
        print(f"✅ Conectado: {self.url}\n")
        
        self.headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "apikey": self.key,
            "Accept": "application/json",
        }
    
    def delete_professionals(self):
        """Deletar profissionais fictícios"""
        print("🧹 Limpando dados fictícios...\n")
        
        for name in self.FICTIONAL_NAMES:
            self.delete_professional_by_name(name)
        
        print("✅ Limpeza concluída!\n")
    
    def delete_professional_by_name(self, name: str):
        """Deletar profissional e dados associados"""
        print(f"  Removendo '{name}'...", end=" ", flush=True)
        
        try:
            # Buscar ID
            url = f"{self.url}/rest/v1/professionals"
            response = requests.get(
                url,
                headers=self.headers,
                params={"name": f"eq.{name}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and isinstance(data, list) and len(data) > 0:
                    prof_id = data[0].get("id")
                    # Deletar associados
                    self.delete_associated(prof_id)
                    # Deletar profissional
                    del_resp = requests.delete(
                        f"{self.url}/rest/v1/professionals",
                        headers=self.headers,
                        params={"id": f"eq.{prof_id}"},
                        timeout=10
                    )
                    print("✅")
                    return
            
            print("⏭️  (não encontrado)")
        except Exception as e:
            print(f"⚠️  ({e})")
    
    def delete_associated(self, prof_id: str):
        """Deletar dados associados ao profissional"""
        tables = [
            "repasse_medico",
            "repasse_config",
            "professional_services",
            "professional_payers",
            "professional_schedules",
            "appointments"
        ]
        
        for table in tables:
            try:
                requests.delete(
                    f"{self.url}/rest/v1/{table}",
                    headers=self.headers,
                    params={"professional_id": f"eq.{prof_id}"},
                    timeout=5
                )
            except:
                pass
    
    def run(self):
        """Executar limpeza"""
        print("🗑️  Remover Dados Fictícios\n")
        print("=" * 50 + "\n")
        
        print("⚠️  Isso vai deletar:")
        for name in self.FICTIONAL_NAMES:
            print(f"   ❌ {name}")
        print("\n")
        
        response = input("Digite 'SIM' para confirmar: ").strip()
        if response.upper() != "SIM":
            print("❌ Cancelado\n")
            return
        
        print()
        self.delete_professionals()
        print("🎉 Concluído!\n")


if __name__ == "__main__":
    auto_confirm = "--yes" in sys.argv or "-y" in sys.argv
    
    try:
        cleanup = SupabaseCleanup()
        
        print("🗑️  Remover Dados Fictícios\n")
        print("=" * 50 + "\n")
        
        print("⚠️  Isso vai deletar:")
        for name in cleanup.FICTIONAL_NAMES:
            print(f"   ❌ {name}")
        print("\n")
        
        if auto_confirm:
            print("(Confirmado automaticamente)\n")
        else:
            response = input("Digite 'SIM' para confirmar: ").strip()
            if response.upper() != "SIM":
                print("❌ Cancelado\n")
                sys.exit(0)
            print()
        
        cleanup.delete_professionals()
        print("🎉 Concluído!\n")
        
    except KeyboardInterrupt:
        print("\n❌ Cancelado\n")
    except Exception as e:
        print(f"\n❌ Erro: {e}\n")
