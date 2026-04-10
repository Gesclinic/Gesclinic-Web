#!/usr/bin/env python3
"""
Apply database migration using Supabase REST API
This script reads the migration SQL and executes it against the database
"""

import os
import json
import urllib.request
import urllib.error
import sys
from pathlib import Path

# Configuration
SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A"

def read_migration():
    """Read the SQL migration file"""
    script_dir = Path(__file__).parent
    sql_file = script_dir.parent / "supabase" / "migrations" / "2026-01-07_create_stock_balance_function.sql"
    
    if not sql_file.exists():
        print(f"❌ Migration file not found: {sql_file}")
        return None
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        return f.read()

def main():
    print("🔧 Supabase Stock Balance Migration")
    print("=" * 70)
    print()
    
    sql_content = read_migration()
    if not sql_content:
        sys.exit(1)
    
    print("✅ Migration SQL loaded")
    print()
    print("📌 IMPORTANT:")
    print("   The Supabase REST API does not support executing raw SQL directly")
    print("   for security reasons. You must apply this migration manually.")
    print()
    print("=" * 70)
    print()
    
    print("📋 MANUAL STEPS TO APPLY MIGRATION:")
    print()
    print("1. Open Supabase Dashboard:")
    print(f"   🔗 {SUPABASE_URL}")
    print()
    print("2. Navigate to SQL Editor")
    print()
    print("3. Click 'New Query'")
    print()
    print("4. Copy and paste the SQL below:")
    print()
    print("-" * 70)
    print(sql_content)
    print("-" * 70)
    print()
    print("5. Click 'Run' button or press Ctrl+Enter")
    print()
    print("6. Verify success (no error messages)")
    print()
    print("7. Refresh your browser and test the Produtos page")
    print()
    print("=" * 70)
    print()
    print("✨ Once applied, the stock balance errors will be resolved!")
    print()

if __name__ == "__main__":
    main()
