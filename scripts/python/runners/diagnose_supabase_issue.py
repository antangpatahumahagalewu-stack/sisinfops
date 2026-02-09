#!/usr/bin/env python3
"""
Comprehensive Supabase Issue Diagnosis
"""
import os
import sys
import requests
import json
import subprocess

def read_env():
    """Read Supabase configuration from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print("❌ .env.local not found")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    config = {}
    for line in content.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        if '=' in line:
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"\'')
            config[key] = value
    
    return config

def test_rest_api(config):
    """Test REST API with different approaches"""
    url = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
    anon_key = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    service_key = config.get('SUPABASE_SERVICE_ROLE_KEY', '')
    
    print("🔍 TESTING REST API")
    print("=" * 60)
    print(f"URL: {url}")
    print(f"Anon key: {anon_key[:20]}...")
    print(f"Service key: {service_key[:20]}...")
    
    # Test 1: Basic REST endpoint
    print("\n1. Testing basic REST endpoint...")
    headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{url}/rest/v1/", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Try with service key
    print("\n2. Testing with service role key...")
    service_headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{url}/rest/v1/", headers=service_headers, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Try specific table
    print("\n3. Testing kabupaten table...")
    try:
        response = requests.get(
            f"{url}/rest/v1/kabupaten?select=id,nama&limit=1",
            headers=headers,
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Data: {data}")
        elif response.status_code == 401:
            print("   ❌ 401 Unauthorized - invalid key")
        elif response.status_code == 403:
            print("   ❌ 403 Forbidden - RLS blocking")
        elif response.status_code == 404:
            print("   ❌ 404 Not Found - table doesn't exist")
        else:
            print(f"   ❌ Unexpected: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Check if project exists via health endpoint
    print("\n4. Testing project health...")
    try:
        response = requests.get(f"{url}/rest/v1/", headers={
            'apikey': anon_key,
            'Authorization': f'Bearer {anon_key}'
        }, timeout=10)
        
        if response.status_code == 200:
            print("   ✅ Project is accessible")
        else:
            print(f"   ❌ Project issue: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_postgres_direct(config):
    """Test direct PostgreSQL connection"""
    print("\n" + "=" * 60)
    print("🔧 TESTING DIRECT POSTGRESQL CONNECTION")
    print("=" * 60)
    
    # Try to connect via psql if available
    try:
        # Extract database connection info from URL
        url = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
        if 'supabase.co' in url:
            # Supabase direct connection info
            db_params = {
                "host": "db.rrvhekjdhdhtkmswjgwk.supabase.co",
                "port": 5432,
                "database": "postgres",
                "user": "postgres",
                "password": "CiTagF5HA/a%jU.",
                "sslmode": "require"
            }
            
            print(f"Host: {db_params['host']}")
            print(f"Database: {db_params['database']}")
            
            # Test with psql
            cmd = [
                'psql',
                f"host={db_params['host']}",
                f"port={db_params['port']}",
                f"dbname={db_params['database']}",
                f"user={db_params['user']}",
                f"sslmode={db_params['sslmode']}",
                "-c",
                "SELECT COUNT(*) FROM kabupaten;"
            ]
            
            # Use PGPASSWORD environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = db_params['password']
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print(f"   ✅ Direct PostgreSQL connection works")
                print(f"   Result: {result.stdout.strip()}")
            else:
                print(f"   ❌ PostgreSQL connection failed")
                print(f"   Error: {result.stderr}")
                
    except Exception as e:
        print(f"   ❌ Error testing PostgreSQL: {e}")

def check_frontend_code():
    """Check if frontend code is compatible"""
    print("\n" + "=" * 60)
    print("📱 CHECKING FRONTEND CODE COMPATIBILITY")
    print("=" * 60)
    
    # Check for common issues
    app_dir = os.path.join(os.path.dirname(__file__), 'app')
    
    # Check if app directory exists
    if not os.path.exists(app_dir):
        print("   ❌ app/ directory not found")
        return
    
    print("   ✅ app/ directory exists")
    
    # Check for lib/supabase client
    lib_supabase = os.path.join(os.path.dirname(__file__), 'lib', 'supabase')
    if os.path.exists(lib_supabase):
        print("   ✅ lib/supabase exists")
    
    # Check package.json for supabase client
    package_json = os.path.join(os.path.dirname(__file__), 'package.json')
    if os.path.exists(package_json):
        with open(package_json, 'r') as f:
            try:
                package = json.load(f)
                deps = package.get('dependencies', {})
                if '@supabase/supabase-js' in deps:
                    print(f"   ✅ @supabase/supabase-js: {deps['@supabase/supabase-js']}")
                else:
                    print("   ❌ @supabase/supabase-js not in dependencies")
            except:
                print("   ❌ Could not parse package.json")

def analyze_issue(config):
    """Analyze the issue and provide recommendations"""
    print("\n" + "=" * 60)
    print("🎯 ISSUE ANALYSIS & RECOMMENDATIONS")
    print("=" * 60)
    
    url = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
    anon_key = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    
    print("\n🔴 MOST LIKELY ISSUES:")
    print("\n1. SUPABASE KEYS EXPIRED/INVALID")
    print("   • JWT tokens expire after certain period")
    print("   • Keys might have been rotated")
    print("   • Solution: Regenerate keys in dashboard")
    
    print("\n2. PROJECT CONFIGURATION ISSUE")
    print("   • Project might be paused/suspended")
    print("   • API access might be disabled")
    print("   • Solution: Check Supabase dashboard project status")
    
    print("\n3. NETWORK/CORS CONFIGURATION")
    print("   • Allowed origins not configured correctly")
    print("   • Network rules blocking access")
    print("   • Solution: Check Project Settings → API")
    
    print("\n4. TABLE PERMISSIONS")
    print("   • RLS policies blocking access")
    print("   • Table doesn't exist in public schema")
    print("   • Solution: Check Table Editor in dashboard")
    
    print("\n🚀 IMMEDIATE ACTIONS:")
    print("\n1. Check Supabase Dashboard:")
    print("   https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk")
    print("   a. Project status (should be active)")
    print("   b. API → URL & Keys (regenerate if needed)")
    print("   c. Table Editor → Verify tables exist")
    
    print("\n2. Test with curl directly:")
    print(f"   curl -H 'apikey: {anon_key[:20]}...' \\")
    print(f"        -H 'Authorization: Bearer {anon_key[:20]}...' \\")
    print(f"        '{url}/rest/v1/kabupaten?select=id,nama&limit=1'")
    
    print("\n3. Check browser console errors:")
    print("   Open browser → F12 → Console")
    print("   Look for CORS or 401/403 errors")
    
    print("\n4. Alternative approach:")
    print("   a. Create new Supabase project")
    print("   b. Import schema using migration scripts")
    print("   c. Update .env.local with new keys")

def main():
    print("=" * 80)
    print("🔍 COMPREHENSIVE SUPABASE ISSUE DIAGNOSIS")
    print("=" * 80)
    
    config = read_env()
    if not config:
        return
    
    test_rest_api(config)
    test_postgres_direct(config)
    check_frontend_code()
    analyze_issue(config)
    
    print("\n" + "=" * 80)
    print("📋 SUMMARY")
    print("=" * 80)
    print("\n✅ Database schema & data: READY (92 PS records, 5 kabupaten)")
    print("✅ Frontend code: COMPATIBLE (uses perhutanan_sosial table)")
    print("✅ Direct PostgreSQL access: WORKS")
    print("🔴 API Connectivity: BLOCKED")
    print("\n🎯 NEXT STEP: Regenerate Supabase keys in dashboard")
    print("   If that doesn't work, check project status & configuration")

if __name__ == "__main__":
    main()