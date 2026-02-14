#!/usr/bin/env python3
"""
Test if we can execute SQL via Supabase REST API.
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def test_rpc():
    """Test if exec_sql RPC function exists."""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        print("❌ Missing Supabase configuration")
        return False
    
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json"
    }
    
    # Test a simple SQL query
    test_sql = "SELECT 1 as test"
    
    # Try RPC endpoint
    rpc_url = f"{supabase_url}/rest/v1/rpc/exec_sql"
    
    print(f"Testing RPC at: {rpc_url}")
    
    try:
        payload = {"sql": test_sql}
        response = requests.post(rpc_url, headers=headers, json=payload, timeout=10)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code == 200:
            print("✅ RPC exec_sql function exists!")
            return True
        elif response.status_code == 404:
            print("❌ RPC function not found (404)")
            return False
        else:
            print(f"⚠️ Unexpected status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)[:100]}")
        return False

def test_rest_api():
    """Test basic REST API access."""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not supabase_url or not anon_key:
        print("❌ Missing Supabase configuration")
        return False
    
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json"
    }
    
    # Test accessing a table
    test_url = f"{supabase_url}/rest/v1/budgets?select=id&limit=1"
    
    print(f"\nTesting REST API at: {test_url}")
    
    try:
        response = requests.get(test_url, headers=headers, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ REST API accessible, got {len(data)} record(s)")
            return True
        else:
            print(f"Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)[:100]}")
        return False

def main():
    print("🔧 TESTING SUPABASE SQL EXECUTION CAPABILITIES")
    print("=" * 60)
    
    print("\n1. Testing REST API access...")
    rest_ok = test_rest_api()
    
    print("\n2. Testing RPC SQL execution...")
    rpc_ok = test_rpc()
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS:")
    print("=" * 60)
    
    if rpc_ok:
        print("✅ RPC method available - can execute SQL programmatically")
        print("\n📋 NEXT: Run migration using Python script")
    elif rest_ok:
        print("⚠️  RPC not available, but REST API works")
        print("\n📋 NEXT: Need to run migration manually in Supabase Dashboard")
    else:
        print("❌ Cannot connect to Supabase")
        print("\n📋 Check your .env.local configuration")
    
    print("\n" + "=" * 60)
    print("🔍 CHECKING CURRENT DATABASE STATE:")
    print("=" * 60)
    
    # Check current tables
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if supabase_url and anon_key:
        headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type": "application/json"
        }
        
        tables = ["budgets", "accounting_ledgers", "financial_transactions", "profiles"]
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