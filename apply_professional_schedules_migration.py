#!/usr/bin/env python3
"""
Apply professional schedules migration to fix end_date column issue
"""

import os
import sys
from pathlib import Path
import urllib.request
import json
import urllib.error

# Load .env
env_file_path = Path(__file__).parent / '.env'
env_vars = {}

try:
    with open(env_file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip().strip('"')
except Exception as e:
    print(f"❌ Error reading .env: {e}")
    sys.exit(1)

SUPABASE_URL = env_vars.get('VITE_SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = env_vars.get('VITE_SUPABASE_ANON_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in .env")
    sys.exit(1)

print("🔧 Applying professional_schedules migration...")
print(f"📍 Supabase URL: {SUPABASE_URL[:50]}...")
print()

# Read migration SQL
migration_path = Path(__file__).parent / 'supabase' / 'migrations' / '2026-02-14_add_date_range_to_professional_schedules.sql'

try:
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
except Exception as e:
    print(f"❌ Error reading migration file: {e}")
    sys.exit(1)

# Execute via Supabase SQL API
url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
headers = {
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
}

payload = json.dumps({
    'sql': sql_content
}).encode('utf-8')

try:
    req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
    with urllib.request.urlopen(req) as response:
        result = response.read().decode('utf-8')
        print(f"✅ Migration applied successfully!")
        print(f"Response: {result[:200]}")
except urllib.error.HTTPError as e:
    error_body = e.read().decode('utf-8')
    print(f"❌ HTTP Error {e.code}: {error_body}")
    
    # Try alternative approach: execute a simpler statement to verify table structure
    print("\nℹ️  Checking if columns already exist...")
    check_url = f"{SUPABASE_URL}/rest/v1/rpc/sql_query"
    check_payload = json.dumps({
        'query': "SELECT column_name FROM information_schema.columns WHERE table_name = 'professional_schedules' ORDER BY ordinal_position"
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(check_url, data=check_payload, headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            print(f"✅ Check result: {result}")
    except Exception as check_err:
        print(f"⚠️  Could not check table structure: {check_err}")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

print("\n✨ Migration process completed!")
