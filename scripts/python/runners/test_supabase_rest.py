#!/usr/bin/env python3
"""
Test Supabase REST API directly (bypass RLS)
"""
import os
import sys
import requests

def test_rest_api():
    # Read anon key from .env.local
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print("❌ .env.local not found")
        return False
    
    supabase_url = ""
    anon_key = ""
    
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            elif line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                anon_key = line.split('=', 1)[1].strip().strip('"\'')
    
    if not supabase_url or not anon_key:
        print("❌ Missing Supabase configuration")
        return False
    
    print(f"📡 Testing Supabase REST API: {supabase_url}")
    print(f"🔑 Anon key: {anon_key[:20]}...")
    
    headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Test REST endpoint
    print("\n1. Testing REST endpoint...")
    try:
        # Try to get kabupaten table
        url = f"{supabase_url}/rest/v1/kabupaten?select=id,nama&limit=5"
        response = requests.get(url, headers=headers, timeout=10)
        
        print(f"   URL: {url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Found {len(data)} kabupaten")
            for item in data:
                print(f"      • {item.get('nama', 'N/A')}")
        elif response.status_code == 401:
            print("   ❌ Unauthorized - anon key invalid")
            print(f"   Response: {response.text[:200]}")
        elif response.status_code == 403:
            print("   ❌ Forbidden - RLS blocking access")
            print(f"   Response: {response.text[:200]}")
        elif response.status_code == 404:
            print("   ❌ Not found - table doesn't exist or wrong URL")
            print(f"   Response: {response.text[:200]}")
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    
    # Test 2: Test with service role (bypass RLS)
    print("\n2. Testing with service role (bypass RLS)...")
    
    service_role_key = ""
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('SUPABASE_SERVICE_ROLE_KEY=') and not line.startswith('SUPABASE_SERVICE_ROLE_KEY=#'):
                service_role_key = line.split('=', 1)[1].strip().strip('"\'')
    
    if service_role_key:
        service_headers = {
            'apikey': service_role_key,
            'Authorization': f'Bearer {service_role_key}',
            'Content-Type': 'application/json'
        }
        
        try:
            url = f"{supabase_url}/rest/v1/kabupaten?select=id,nama&limit=5"
            response = requests.get(url, headers=service_headers, timeout=10)
            
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Service role works! Found {len(data)} kabupaten")
            else:
                print(f"   ❌ Service role failed: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Request failed: {e}")
    else:
        print("   ⚠️  Service role key not found in .env.local")
    
    # Test 3: Test profiles table (should be more restricted)
    print("\n3. Testing profiles table (should require auth)...")
    try:
        url = f"{supabase_url}/rest/v1/profiles?select=id,role&limit=2"
        response = requests.get(url, headers=headers, timeout=10)
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ⚠️  Profiles accessible (RLS may be disabled): {len(data)} profiles")
        elif response.status_code in [401, 403]:
            print("   ✅ Profiles correctly blocked (expected with RLS)")
        else:
            print(f"   ❌ Unexpected: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    
    # Test 4: Try to disable RLS via SQL (if we had direct DB access)
    print("\n4. Conclusion:")
    print("   • If anon key works but RLS blocks, need to fix RLS policies")
    print("   • If anon key doesn't work, key may be invalid/expired")
    print("   • Service role should bypass RLS if configured correctly")
    
    print("\n🔧 Suggested action:")
    print("   1. Check Supabase Dashboard → Authentication → URL & Keys")
    print("   2. Verify anon key matches what's in .env.local")
    print("   3. Check RLS policies in SQL Editor")
    print("   4. Try running: ALTER TABLE kabupaten DISABLE ROW LEVEL SECURITY;")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("🔍 SUPABASE REST API DEBUGGER")
    print("=" * 60)
    
    test_rest_api()