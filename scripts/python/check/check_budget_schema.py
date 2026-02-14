#!/usr/bin/env python3
"""
Check the schema of budgets table to see if it matches API expectations.
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def main():
    print("🔍 CHECKING BUDGETS TABLE SCHEMA")
    print("=" * 60)
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not supabase_url or not anon_key:
        print("❌ Missing Supabase configuration")
        sys.exit(1)
    
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json"
    }
    
    # First check if budgets table exists and get sample data
    try:
        url = f"{supabase_url}/rest/v1/budgets?select=*&limit=1"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data:
                budget = data[0]
                print(f"✅ budgets table exists with {len(data)} row(s)")
                print("\n📋 COLUMNS IN BUDGETS TABLE:")
                print("-" * 60)
                for key in sorted(budget.keys()):
                    value = budget[key]
                    value_type = type(value).__name__
                    print(f"  • {key}: {value_type} = {value}")
                
                # Check for required columns from API
                required_columns = [
                    'budget_code', 'budget_name', 'budget_type', 
                    'fiscal_year', 'total_amount', 'allocated_amount',
                    'spent_amount', 'status', 'created_by'
                ]
                
                print("\n🔍 CHECKING REQUIRED COLUMNS FROM API:")
                print("-" * 60)
                missing_columns = []
                for col in required_columns:
                    if col in budget:
                        print(f"  ✅ {col}")
                    else:
                        print(f"  ❌ {col} (MISSING)")
                        missing_columns.append(col)
                
                if missing_columns:
                    print(f"\n⚠️  Missing {len(missing_columns)} required columns: {missing_columns}")
                else:
                    print("\n✅ All required columns present!")
                    
            else:
                print("ℹ️  budgets table exists but has no data")
        elif response.status_code == 400:
            # Try to get error details
            print("❌ Error querying budgets table (400)")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Response: {response.text[:200]}")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)[:100]}")
    
    # Also check accounting_ledgers
    print("\n" + "=" * 60)
    print("🔍 CHECKING ACCOUNTING_LEDGERS TABLE")
    print("=" * 60)
    
    try:
        url = f"{supabase_url}/rest/v1/accounting_ledgers?select=id&limit=1"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ accounting_ledgers table exists with {len(data)} row(s)")
        elif response.status_code == 404:
            print("❌ accounting_ledgers table not found (404)")
        elif response.status_code == 400:
            # Might be schema cache issue
            print("⚠️  accounting_ledgers: might exist but schema cache issue (400)")
        else:
            print(f"❓ accounting_ledgers: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)[:100]}")
    
    print("\n" + "=" * 60)
    print("📋 RECOMMENDED ACTIONS:")
    print("=" * 60)
    print("1. Run the financial migration SQL in Supabase Dashboard")
    print("2. Wait 1-2 minutes for schema cache refresh")
    print("3. Restart Next.js dev server if needed")
    print("4. Test API endpoints")

if __name__ == "__main__":
    main()