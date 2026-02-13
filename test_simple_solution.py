#!/usr/bin/env python3
"""
Test a simpler approach: Can we fix the API without complex migrations?
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def test_api_direct():
    """Test API endpoints directly to see exact error."""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not supabase_url or not anon_key:
        print("❌ Missing Supabase configuration")
        return
    
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json"
    }
    
    print("🔍 TESTING DIRECT SUPABASE QUERIES")
    print("=" * 60)
    
    # Test 1: Try to query budgets table directly
    print("\n1. Testing budgets table query...")
    try:
        url = f"{supabase_url}/rest/v1/budgets?select=*&limit=1"
        response = requests.get(url, headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data:
                budget = data[0]
                if 'created_by' in budget:
                    print("   ✅ budgets table has created_by column")
                else:
                    print("   ❌ budgets table missing created_by column")
            else:
                print("   ℹ️  budgets table exists but empty")
        elif response.status_code == 400:
            error_data = response.json()
            print(f"   ❌ Error: {error_data.get('message', 'Unknown error')}")
            if "schema cache" in str(error_data):
                print("   ℹ️  Schema cache issue - table might exist but schema outdated")
        else:
            print(f"   ❓ Unexpected status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")
    
    # Test 2: Check if we can see the table schema
    print("\n2. Checking budgets table schema...")
    try:
        # Try to get just column names
        url = f"{supabase_url}/rest/v1/budgets?select=id&limit=0"
        response = requests.get(url, headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Can access budgets table")
        elif response.status_code == 406:
            print("   ⚠️  Table exists but content-type issue")
        else:
            print(f"   Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")
    
    # Test 3: Try a simpler query with minimal columns
    print("\n3. Testing minimal budgets query...")
    try:
        url = f"{supabase_url}/rest/v1/budgets?select=id,budget_code,budget_name&limit=1"
        response = requests.get(url, headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Can query budgets with minimal columns")
        else:
            print(f"   ❌ Failed with minimal columns")
            print(f"   Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")
    
    # Test 4: Check profiles table (needed for foreign key)
    print("\n4. Checking profiles table...")
    try:
        url = f"{supabase_url}/rest/v1/profiles?select=id,role&limit=1"
        response = requests.get(url, headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data:
                profile = data[0]
                print(f"   ✅ profiles table exists with {len(data)} row(s)")
                print(f"   ℹ️  Sample: id={profile['id']}, role={profile.get('role')}")
            else:
                print("   ⚠️  profiles table exists but empty")
        else:
            print(f"   ❌ profiles table error: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")
    
    # Test 5: Try to manually add created_by column via SQL
    print("\n5. Testing SQL execution capability...")
    try:
        # Try to execute a simple SQL via REST API (won't work usually)
        # But we can check if service role key works
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if service_key:
            service_headers = {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json"
            }
            
            url = f"{supabase_url}/rest/v1/"
            response = requests.get(url, headers=service_headers, timeout=10)
            print(f"   Service role key: {'✅ Valid' if response.status_code == 200 else '❌ Invalid'}")
        else:
            print("   ⚠️  No SUPABASE_SERVICE_ROLE_KEY in .env.local")
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")

def create_minimal_sql_fix():
    """Create a minimal SQL fix that's easier to run."""
    print("\n" + "=" * 60)
    print("📝 MINIMAL SQL FIX")
    print("=" * 60)
    
    minimal_sql = """
-- MINIMAL FIX FOR FINANCIAL DASHBOARD 500 ERRORS
-- Run this in Supabase Dashboard SQL Editor

-- 1. Add created_by column to budgets (make it nullable first)
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Set a default value from profiles table
UPDATE budgets 
SET created_by = (SELECT id FROM profiles LIMIT 1)
WHERE created_by IS NULL;

-- 3. Make it a foreign key
ALTER TABLE budgets 
ADD CONSTRAINT budgets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Create accounting_ledgers table with minimal schema
CREATE TABLE IF NOT EXISTS accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ledger_code VARCHAR(50) UNIQUE NOT NULL,
    ledger_name VARCHAR(255) NOT NULL,
    current_balance DECIMAL(20,2) DEFAULT 0
);

-- 5. Add one sample ledger
INSERT INTO accounting_ledgers (ledger_code, ledger_name, current_balance)
VALUES ('OPR-1001', 'Kas dan Bank', 500000000)
ON CONFLICT (ledger_code) DO NOTHING;

-- 6. Verify the fix
SELECT 
    (SELECT COUNT(*) FROM budgets WHERE created_by IS NOT NULL) as budgets_with_created_by,
    (SELECT COUNT(*) FROM accounting_ledgers) as ledger_count;
"""
    
    print(minimal_sql)
    
    # Save to file
    with open("minimal_financial_fix.sql", "w") as f:
        f.write(minimal_sql)
    
    print("\n✅ Saved to: minimal_financial_fix.sql")
    print("\n📋 TO RUN:")
    print("1. Copy the SQL above")
    print("2. Go to Supabase Dashboard → SQL Editor")
    print("3. Paste and click 'Run'")
    print("4. Wait 60 seconds for schema cache refresh")

def main():
    print("🔧 SIMPLE FINANCIAL DASHBOARD FIX TESTER")
    print("=" * 60)
    
    # Test current state
    test_api_direct()
    
    # Create minimal fix
    create_minimal_sql_fix()
    
    print("\n" + "=" * 60)
    print("📋 QUICK FIX OPTIONS:")
    print("=" * 60)
    print("\nOPTION 1: Run the minimal SQL in Supabase Dashboard")
    print("  • File: minimal_financial_fix.sql")
    print("  • Takes 1 minute")
    print("  • Fixes both issues")
    
    print("\nOPTION 2: Quick manual test (skip migration)")
    print("  • Edit financial-dashboard.tsx to use mock data")
    print("  • Temporary fix only")
    
    print("\nOPTION 3: Complete migration")
    print("  • Run: supabase/migrations/202602131209_fix_financial_tables_quick.sql")
    print("  • Most comprehensive fix")
    
    print("\n⚠️  IMPORTANT: After running SQL, wait 60 seconds")
    print("   Then refresh the financial dashboard page")

if __name__ == "__main__":
    main()