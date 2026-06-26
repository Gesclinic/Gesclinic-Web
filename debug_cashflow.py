#!/usr/bin/env python3
"""
Debug script to check Supabase data for Fluxo de Caixa issue
"""
import os
from datetime import datetime, timedelta
from supabase import create_client

# Load env vars from .env
import dotenv
dotenv.load_dotenv('.env')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Get clinic ID from the app or use the test one shown in browser
clinic_id = "dcee437c-fd14-463c-b25e-a318f5da60b7"

# Calculate date range for last 30 days
end_date = datetime.now().date()
start_date = end_date - timedelta(days=30)

print(f"\n=== Debugging Fluxo de Caixa Data ===")
print(f"Clinic ID: {clinic_id}")
print(f"Period: {start_date} to {end_date}")

# Query financial_transactions (any status)
try:
    response = supabase.table('financial_transactions').select('id, status, amount, description, created_at').eq('clinic_id', clinic_id).execute()
    all_ft = response.data if response.data else []
    print(f"\nAll Financial Transactions: {len(all_ft)}")
    
    # Count by status
    status_counts = {}
    total_by_type = {}
    for t in all_ft:
        status = t.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("  Status breakdown:")
    for status, count in sorted(status_counts.items()):
        print(f"    - {status}: {count}")
        
    if all_ft:
        print(f"  Sample transactions (first 3):")
        for t in all_ft[:3]:
            print(f"    - {t.get('description', 'N/A')}: R$ {t.get('amount', 0)} - Status: {t.get('status')}")
except Exception as e:
    print(f"Error querying financial_transactions: {e}")

# Query ar_invoices (receivables) - all statuses
try:
    response = supabase.table('ar_invoices').select('id, status, amount, created_at').eq('clinic_id', clinic_id).execute()
    all_invoices = response.data if response.data else []
    print(f"\nTotal Receivables (ar_invoices): {len(all_invoices)}")
    
    # Count by status
    status_counts = {}
    total_amount = 0
    for inv in all_invoices:
        status = inv.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
        total_amount += float(inv.get('amount', 0))
    
    print("  Status breakdown:")
    for status, count in sorted(status_counts.items()):
        print(f"    - {status}: {count}")
    
    print(f"  Total amount (all): R$ {total_amount:.2f}")
except Exception as e:
    print(f"Error querying ar_invoices: {e}")

# Query ap_bills (payables) - all statuses
try:
    response = supabase.table('ap_bills').select('id, status, amount, created_at').eq('clinic_id', clinic_id).execute()
    all_bills = response.data if response.data else []
    print(f"\nTotal Payables (ap_bills): {len(all_bills)}")
    
    # Count by status
    status_counts = {}
    total_amount = 0
    for bill in all_bills:
        status = bill.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
        total_amount += float(bill.get('amount', 0))
    
    print("  Status breakdown:")
    for status, count in sorted(status_counts.items()):
        print(f"    - {status}: {count}")
    
    print(f"  Total amount (all): R$ {total_amount:.2f}")
except Exception as e:
    print(f"Error querying ap_bills: {e}")

# Check what actual columns exist in ap_bills
try:
    response = supabase.table('ap_bills').select('*').eq('clinic_id', clinic_id).limit(1).execute()
    if response.data:
        print(f"\nap_bills columns available: {list(response.data[0].keys())}")
except Exception as e:
    print(f"Error checking ap_bills columns: {e}")

# Check what actual columns exist in ar_invoices
try:
    response = supabase.table('ar_invoices').select('*').eq('clinic_id', clinic_id).limit(1).execute()
    if response.data:
        print(f"ar_invoices columns available: {list(response.data[0].keys())}")
except Exception as e:
    print(f"Error checking ar_invoices columns: {e}")

print("\n=== Conclusion ===")
print("If all receivables+payables = 0, then NO DATA EXISTS and Fluxo=0 is CORRECT")
print("If data exists but Fluxo=0, then there's a bug in data filtering/calculation")

