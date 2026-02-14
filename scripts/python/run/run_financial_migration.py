#!/usr/bin/env python3
"""
Script untuk menjalankan migration tabel keuangan (budgets, accounting_ledgers, dll).
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def execute_sql(sql_statement):
    """Execute SQL statement using Supabase REST API."""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        print("❌ ERROR: Missing Supabase configuration in .env.local")
        sys.exit(1)
    
    # Use the REST API with service role key
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # The REST API endpoint for SQL execution
    sql_url = f"{supabase_url}/rest/v1/rpc/exec_sql"
    
    # Note: The exec_sql function needs to exist in Supabase
    # Let's try a different approach using pg_catalog or direct SQL
    print("⚠️  Using alternative approach: We'll try to execute via Supabase Dashboard manually")
    
    return False

def execute_migration_manually():
    """Provide manual instructions for migration."""
    migration_file = "supabase/migrations/202602131202_create_financial_tables_complete.sql"
    
    try:
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        print("=" * 80)
        print("📋 FINANCIAL TABLES MIGRATION INSTRUCTIONS")
        print("=" * 80)
        print("\n🚨 IMPORTANT: Supabase REST API doesn't support raw SQL execution directly.")
        print("   Please run this migration manually in Supabase Dashboard.")
        print("\n📁 Migration file:")
        print(f"   {migration_file}")
        print("\n📋 STEPS TO RUN MIGRATION:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project: saelrsljpneclsbfdxfy")
        print("3. Open SQL Editor → New query")
        print("4. Copy-paste the SQL below")
        print("5. Click 'Run'")
        print("\n" + "=" * 80)
        print("📜 SQL TO EXECUTE:")
        print("=" * 80)
        print(sql_content[:2000] + "..." if len(sql_content) > 2000 else sql_content)
        
        if len(sql_content) > 2000:
            print(f"\n📏 Full SQL is {len(sql_content):,} characters.")
            print("   You'll need to copy from the file directly.")
        
        print("\n" + "=" * 80)
        print("✅ ALTERNATIVE: Run via Supabase CLI")
        print("=" * 80)
        print("If you have Supabase CLI installed:")
        print("1. Run: supabase db push")
        print("2. Or: supabase migration up")
        print("\n" + "=" * 80)
        
    except FileNotFoundError:
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)

def check_current_tables():
    """Check current tables status."""
    print("🔍 CHECKING CURRENT TABLES STATUS...")
    print("-" * 60)
    
    # We'll use a simple REST API call to check table existence
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
    
    # Try to query each table to see if it exists
    tables_to_check = ["budgets", "accounting_ledgers", "financial_transactions"]
    
    for table in tables_to_check:
        try:
            url = f"{supabase_url}/rest/v1/{table}?select=id&limit=1"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                count = len(data)
                print(f"✅ {table}: exists with {count} row(s)")
            elif response.status_code == 404:
                print(f"❌ {table}: table not found (404)")
            elif response.status_code == 400:
                # Might be schema cache issue
                print(f"⚠️  {table}: might exist but schema cache issue")
            else:
                print(f"❓ {table}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {table}: Error - {str(e)[:100]}")

def main():
    print("🔧 FINANCIAL TABLES MIGRATION SCRIPT")
    print("=" * 60)
    
    # Check current status
    check_current_tables()
    
    print("\n" + "=" * 60)
    print("📊 MIGRATION SUMMARY:")
    print("=" * 60)
    print("This migration will:")
    print("1. Create 'budgets' table (matching API expectations)")
    print("2. Update 'accounting_ledgers' table with missing columns")
    print("3. Ensure 'financial_transactions' has required columns")
    print("4. Create indexes for performance")
    print("5. Insert sample data for testing")
    print("6. Fix 500 errors in financial dashboard")
    
    print("\n" + "=" * 60)
    response = input("Do you want to proceed with manual migration instructions? (yes/NO): ").strip().lower()
    
    if response == 'yes':
        execute_migration_manually()
        
        # After manual migration, verify
        print("\n" + "=" * 80)
        print("🔄 AFTER MIGRATION VERIFICATION")
        print("=" * 80)
        print("\nAfter running the migration in Supabase Dashboard:")
        print("1. Wait 1-2 minutes for schema cache refresh")
        print("2. Restart Next.js dev server if running")
        print("3. Test API endpoints:")
        print("   - http://localhost:3000/api/finance/budgets?status=active&limit=10")
        print("   - http://localhost:3000/api/finance/ledgers/balances")
        print("   - http://localhost:3000/api/finance/transactions?limit=10")
        print("4. Check financial dashboard for 500 errors")
        
        # Offer to run API tests
        print("\n" + "=" * 80)
        test_response = input("\nDo you want to test API endpoints now? (yes/NO): ").strip().lower()
        if test_response == 'yes':
            test_api_endpoints()
    else:
        print("❌ Migration cancelled.")
        print("\n📋 To run migration later:")
        print(f"   1. Edit file: supabase/migrations/202602131202_create_financial_tables_complete.sql")
        print("   2. Run manually in Supabase Dashboard")

def test_api_endpoints():
    """Test the API endpoints after migration."""
    print("\n🧪 TESTING API ENDPOINTS...")
    print("-" * 60)
    
    # We'll test locally using requests
    base_url = "http://localhost:3000"
    endpoints = [
        "/api/finance/budgets?status=active&limit=10",
        "/api/finance/ledgers/balances",
        "/api/finance/transactions?limit=10"
    ]
    
    for endpoint in endpoints:
        url = base_url + endpoint
        print(f"\n🔍 Testing: {endpoint}")
        
        try:
            response = requests.get(url, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if 'data' in data:
                        print(f"   ✅ Success: {len(data.get('data', []))} records")
                    else:
                        print(f"   ⚠️  Response format unexpected: {list(data.keys())[:3]}...")
                except:
                    print(f"   ⚠️  Could not parse JSON response")
            elif response.status_code == 500:
                print(f"   ❌ Server error (500) - Migration might not be applied")
            elif response.status_code == 401:
                print(f"   🔒 Unauthorized - Need authentication")
            else:
                print(f"   ❓ Unexpected status: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Cannot connect - Is Next.js dev server running?")
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:100]}")

if __name__ == "__main__":
    main()