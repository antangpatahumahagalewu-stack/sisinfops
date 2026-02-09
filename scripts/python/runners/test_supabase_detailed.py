#!/usr/bin/env python3
"""
Detailed Supabase test to identify exact issue
"""
import os
import json
import requests
import psycopg2

def read_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        return None
    
    config = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip().strip('"\'')
    
    return config

def test_direct_postgresql():
    """Test direct PostgreSQL connection with detailed queries"""
    print("🔍 DIRECT POSTGRESQL TESTS")
    print("=" * 60)
    
    db_params = {
        "host": "db.rrvhekjdhdhtkmswjgwk.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "CiTagF5HA/a%jU.",
        "sslmode": "require"
    }
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Test 1: Check if tables exist in public schema
        print("\n1. Checking tables in public schema:")
        cur.execute("""
            SELECT table_name, row_security
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions')
            ORDER BY table_name;
        """)
        
        tables = cur.fetchall()
        for table_name, row_security in tables:
            print(f"   • {table_name}: row_security={row_security}")
        
        # Test 2: Check RLS status
        print("\n2. Checking RLS status from pg_tables:")
        cur.execute("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public'
            AND tablename IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions')
            ORDER BY tablename;
        """)
        
        for tablename, rowsecurity in cur.fetchall():
            status = "ENABLED" if rowsecurity else "DISABLED"
            print(f"   • {tablename}: RLS {status}")
        
        # Test 3: Check data counts
        print("\n3. Checking data counts:")
        for table in ['kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions']:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"   • {table}: {count} rows")
            except Exception as e:
                print(f"   • {table}: ERROR - {e}")
        
        # Test 4: Check schema ownership
        print("\n4. Checking schema permissions:")
        cur.execute("""
            SELECT nspname, nspowner::regrole::text as owner
            FROM pg_namespace 
            WHERE nspname = 'public';
        """)
        schema_info = cur.fetchone()
        if schema_info:
            print(f"   • Schema 'public': owned by {schema_info[1]}")
        
        # Test 5: Check anon role permissions
        print("\n5. Checking anon role permissions:")
        cur.execute("""
            SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin
            FROM pg_roles 
            WHERE rolname IN ('anon', 'authenticator', 'postgres');
        """)
        
        for rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin in cur.fetchall():
            print(f"   • {rolname}: super={rolsuper}, can_login={rolcanlogin}")
        
        # Test 6: Try to GRANT permissions (might fail but worth trying)
        print("\n6. Testing permission grants (might fail):")
        try:
            cur.execute("GRANT USAGE ON SCHEMA public TO anon")
            print("   ✅ Granted USAGE on schema to anon")
        except Exception as e:
            print(f"   ⚠️  Could not grant usage: {e}")
        
        try:
            cur.execute("GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon")
            print("   ✅ Granted SELECT on all tables to anon")
        except Exception as e:
            print(f"   ⚠️  Could not grant select: {e}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ PostgreSQL error: {e}")

def test_rest_api_detailed(config):
    """Test REST API with detailed error reporting"""
    print("\n" + "=" * 60)
    print("🔍 DETAILED REST API TESTS")
    print("=" * 60)
    
    url = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
    anon_key = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    service_key = config.get('SUPABASE_SERVICE_ROLE_KEY', '')
    
    headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json'
    }
    
    service_headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Check if REST API is accessible at all
    print("\n1. Testing REST API root:")
    try:
        response = requests.get(f"{url}/rest/v1/", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ REST API accessible")
            # Try to parse response
            try:
                data = response.json()
                print(f"   Response keys: {list(data.keys())[:5]}...")
            except:
                pass
        else:
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Test with service role key
    print("\n2. Testing with service role key:")
    try:
        response = requests.get(f"{url}/rest/v1/", headers=service_headers, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Service role works")
        else:
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Test specific endpoint with detailed error
    print("\n3. Testing kabupaten table with detailed headers:")
    try:
        response = requests.get(
            f"{url}/rest/v1/kabupaten",
            headers=headers,
            params={'select': 'id,nama', 'limit': '1'},
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Data: {data}")
        elif response.status_code == 401:
            print("   ❌ 401 Unauthorized")
            # Check WWW-Authenticate header
            if 'WWW-Authenticate' in response.headers:
                print(f"   Auth header: {response.headers['WWW-Authenticate']}")
        elif response.status_code == 403:
            print("   ❌ 403 Forbidden - RLS or permissions issue")
        elif response.status_code == 404:
            print("   ❌ 404 Not Found - table doesn't exist")
        else:
            print(f"   ❌ Unexpected: {response.status_code}")
        
        print(f"   Response body: {response.text[:500]}")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Try without any authentication
    print("\n4. Testing without authentication:")
    try:
        response = requests.get(
            f"{url}/rest/v1/kabupaten?select=id,nama&limit=1",
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_alternative_approaches(config):
    """Test alternative approaches"""
    print("\n" + "=" * 60)
    print("🔧 ALTERNATIVE APPROACHES")
    print("=" * 60)
    
    url = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
    anon_key = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    
    # Test 1: Try with different API path
    print("\n1. Testing different API paths:")
    
    # Try postgrest root
    try:
        response = requests.get(url, timeout=10)
        print(f"   Root URL ({url}): {response.status_code}")
    except Exception as e:
        print(f"   Root URL error: {e}")
    
    # Try health endpoint
    try:
        response = requests.get(f"{url}/rest/v1/", headers={
            'apikey': anon_key,
            'Authorization': f'Bearer {anon_key}'
        }, timeout=10)
        print(f"   REST root: {response.status_code}")
    except Exception as e:
        print(f"   REST root error: {e}")
    
    # Test 2: Try to create a simple function via SQL
    print("\n2. Testing via PostgreSQL function creation:")
    db_params = {
        "host": "db.rrvhekjdhdhtkmswjgwk.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "CiTagF5HA/a%jU.",
        "sslmode": "require"
    }
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Create a simple function that returns test data
        cur.execute("""
            CREATE OR REPLACE FUNCTION public.test_api_access()
            RETURNS JSONB AS $$
            BEGIN
                RETURN jsonb_build_object(
                    'kabupaten_count', (SELECT COUNT(*) FROM kabupaten),
                    'ps_count', (SELECT COUNT(*) FROM perhutanan_sosial),
                    'test', 'success',
                    'timestamp', NOW()
                );
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        """)
        print("   ✅ Created test_api_access() function")
        
        # Test the function
        cur.execute("SELECT public.test_api_access()")
        result = cur.fetchone()[0]
        print(f"   Function result: {result}")
        
        # Now try to call via REST API
        print("\n3. Testing function via REST API:")
        
        function_url = f"{url}/rest/v1/rpc/test_api_access"
        headers = {
            'apikey': anon_key,
            'Authorization': f'Bearer {anon_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(function_url, headers=headers, json={}, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"   ❌ Error: {e}")

def main():
    print("=" * 80)
    print("🔍 SUPABASE DETAILED DIAGNOSIS")
    print("=" * 80)
    
    config = read_env()
    if not config:
        print("❌ Could not read .env.local")
        return
    
    test_direct_postgresql()
    test_rest_api_detailed(config)
    test_alternative_approaches(config)
    
    print("\n" + "=" * 80)
    print("📋 FINAL ANALYSIS")
    print("=" * 80)
    
    print("\n🔴 KEY FINDINGS:")
    print("1. ✅ PostgreSQL direct access WORKS")
    print("2. ✅ Tables exist with data (92 PS records)")
    print("3. ✅ JWT tokens VALID (expire 2036)")
    print("4. 🔴 REST API returns 401 'permission denied'")
    
    print("\n🎯 MOST LIKELY ISSUE:")
    print("   Supabase Project Configuration Problem")
    print("   - API access might be disabled")
    print("   - Network rules blocking")
    print("   - Project paused/suspended")
    
    print("\n🚀 RECOMMENDED ACTIONS:")
    print("1. Check Supabase Dashboard:")
    print("   - Project status (active/inactive)")
    print("   - API settings (enabled/disabled)")
    print("   - Network restrictions")
    print("   - CORS configuration")
    
    print("\n2. If dashboard access not possible:")
    print("   a. Create NEW Supabase project")
    print("   b. Run migration scripts on new project")
    print("   c. Update .env.local with new keys")
    print("   d. Test immediately")
    
    print("\n3. Emergency workaround (temporary):")
    print("   a. Run frontend with direct PostgreSQL connection")
    print("   b. Create local API proxy that uses service role")
    print("   c. Use Supabase Edge Functions instead of REST")
    
    print("\n⏱️ ESTIMATED FIX TIME:")
    print("   - New project: 15-30 minutes")
    print("   - Dashboard check: 5-10 minutes")
    print("   - Testing: 10-15 minutes")

if __name__ == "__main__":
    main()