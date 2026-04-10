#!/usr/bin/env python3
"""
Execute repasse_config migration on Supabase
"""

import os
import sys
import subprocess

migration_file = "supabase/migrations/20260318_create_repasse_config.sql"

print("=" * 80)
print("SUPABASE MIGRATION EXECUTOR - repasse_config")
print("=" * 80)

# Check if migration file exists
if not os.path.exists(migration_file):
    print(f"❌ Migration file not found: {migration_file}")
    sys.exit(1)

print(f"✓ Migration file found: {migration_file}")

# Read migration content
with open(migration_file, 'r') as f:
    sql_content = f.read()

print(f"✓ Migration size: {len(sql_content)} bytes")

# Try using supabase-cli
try:
    result = subprocess.run(
        ['supabase', 'db', 'push'],
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.returncode == 0:
        print("✓ Migration executed successfully via supabase-cli!")
        print(result.stdout)
    else:
        print("⚠ supabase-cli output:")
        print(result.stderr)
        
except FileNotFoundError:
    print("ℹ supabase-cli not found. Instructions to apply migration manually:")
    print("\n" + "=" * 80)
    print("MANUAL EXECUTION STEPS:")
    print("=" * 80)
    print("\n1. Go to: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike")
    print("2. Click 'SQL Editor' in the left sidebar")
    print("3. Click 'New query'")
    print("4. Copy and paste the SQL below:")
    print("\n" + "=" * 80)
    print(sql_content)
    print("=" * 80)
    print("\n5. Click 'Run' button")
    print("6. Verify table 'repasse_config' was created successfully")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

print("\n✓ Migration process completed!")
