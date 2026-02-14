#!/usr/bin/env python3
"""
Test financial API endpoints after migration.
"""

import os
import sys
import requests
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def test_api_endpoint(endpoint, name, port=3002):
    """Test a single API endpoint."""
    base_url = f"http://localhost:{port}"
    url = base_url + endpoint
    
    print(f"\n🔍 Testing {name}:")
    print(f"   URL: {endpoint}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'data' in data:
                    count = len(data.get('data', []))
                    print(f"   ✅ Success: {count} records")
                    return True
                elif 'error' in data:
                    print(f"   ⚠️  API returned error: {data.get('error')}")
                    return False
                else:
                    print(f"   ⚠️  Unexpected response format: {list(data.keys())[:3]}...")
                    return False
            except:
                print(f"   ⚠️  Could not parse JSON response")
                return False
        elif response.status_code == 500:
            print(f"   ❌ Server error (500) - Migration might not be applied")
            print(f"   Response: {response.text[:200]}")
            return False
        elif response.status_code == 401:
            print(f"   🔒 Unauthorized - Need authentication")
            return False
        elif response.status_code == 404:
            print(f"   ❌ Not found (404) - Endpoint might not exist")
            return False
        else:
            print(f"   ❓ Unexpected status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Cannot connect - Is Next.js dev server running on port {port}?")
        return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")
        return False

def main():
    print("🧪 TESTING FINANCIAL API ENDPOINTS")
    print("=" * 60)
    
    print("\n📋 INSTRUCTIONS:")
    print("-" * 60)
    print("Before running this test:")
    print("1. Run the SQL migration in Supabase Dashboard:")
    print("   File: supabase/migrations/202602131209_fix_financial_tables_quick.sql")
    print("2. Wait 1-2 minutes for schema cache refresh")
    print("3. Ensure Next.js dev server is running")
    
    response = input("\nHave you run the migration in Supabase Dashboard? (yes/NO): ").strip().lower()
    
    if response != 'yes':
        print("\n❌ Please run the migration first.")
        print("\n📋 MIGRATION STEPS:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project: saelrsljpneclsbfdxfy")
        print("3. Open SQL Editor → New query")
        print("4. Copy-paste SQL from: supabase/migrations/202602131209_fix_financial_tables_quick.sql")
        print("5. Click 'Run'")
        print("6. Wait 1-2 minutes")
        return
    
    # Test different ports
    ports_to_try = [3002, 3000]
    
    for port in ports_to_try:
        print(f"\n" + "=" * 60)
        print(f"🔌 Testing on port {port}")
        print("=" * 60)
        
        # Test if server is running on this port
        try:
            test_response = requests.get(f"http://localhost:{port}", timeout=2)
            print(f"✅ Next.js server detected on port {port}")
        except:
            print(f"❌ No server detected on port {port}")
            continue
        
        # Test endpoints
        endpoints = [
            ("/api/finance/budgets?status=active&limit=10", "Budgets API"),
            ("/api/finance/ledgers/balances", "Ledger Balances API"),
            ("/api/finance/transactions?limit=10", "Transactions API")
        ]
        
        results = []
        for endpoint, name in endpoints:
            success = test_api_endpoint(endpoint, name, port)
            results.append((name, success))
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS:")
        print("=" * 60)
        
        all_success = True
        for name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"  {status} {name}")
            if not success:
                all_success = False
        
        if all_success:
            print("\n🎉 ALL TESTS PASSED!")
            print("\n📋 NEXT STEPS:")
            print("1. Check the financial dashboard page")
            print("2. Verify no more 500 errors in console")
            print("3. Test dashboard functionality")
        else:
            print("\n⚠️  SOME TESTS FAILED")
            print("\n📋 TROUBLESHOOTING:")
            print("1. Check if migration was applied correctly")
            print("2. Check schema cache (wait 2-3 minutes)")
            print("3. Restart Next.js dev server")
            print("4. Check browser console for errors")
        
        # Only test first working port
        break
    
    print("\n" + "=" * 60)
    print("🔧 DEBUGGING INFORMATION:")
    print("=" * 60)
    
    # Check current tables status
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if supabase_url and anon_key:
        headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type": "application/json"
        }
        
        tables = ["budgets", "accounting_ledgers", "financial_transactions"]
        for table in tables:
            try:
                url = f"{supabase_url}/rest/v1/{table}?select=id&limit=1"
                response = requests.get(url, headers=headers, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ {table}: {len(data)} row(s)")
                elif response.status_code == 404:
                    print(f"❌ {table}: table not found")
                else:
                    print(f"❓ {table}: HTTP {response.status_code}")
            except:
                print(f"❌ {table}: Error checking")

if __name__ == "__main__":
    main()