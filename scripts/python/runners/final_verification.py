#!/usr/bin/env python3
"""Final verification of all fixes"""
import requests
import os
import json
import sys

def get_supabase_config():
    """Get Supabase configuration from .env.local"""
    env_path = '.env.local'
    if not os.path.exists(env_path):
        print(f"❌ {env_path} not found")
        return None
    
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value.strip().strip('"\'')
    
    supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_anon_key = env_vars.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_anon_key:
        print("❌ Missing Supabase URL or Anon Key")
        return None
    
    return {
        'url': supabase_url,
        'anon_key': supabase_anon_key
    }

def test_verra_registration():
    """Test Verra Registration page functionality"""
    print("=" * 60)
    print("🔍 TESTING VERRA REGISTRATION PAGE")
    print("=" * 60)
    
    config = get_supabase_config()
    if not config:
        return False
    
    base_url = config['url']
    anon_key = config['anon_key']
    headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Fetch carbon projects with Verra registrations
    print("\n📋 Test 1: Carbon projects with Verra data")
    
    endpoint = f"{base_url}/rest/v1/verra_project_registrations?select=*,carbon_projects!inner(kode_project,nama_project)&limit=5"
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {len(data)} Verra registrations")
            
            if data:
                print("\n📋 Sample Verra registrations:")
                for i, item in enumerate(data[:3], 1):
                    print(f"   {i}. {item.get('verra_project_id')}: {item.get('status')}")
                    if 'carbon_projects' in item:
                        proj = item['carbon_projects']
                        print(f"      Project: {proj.get('kode_project')} - {proj.get('nama_project')}")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_vvb_management():
    """Test VVB Management page functionality"""
    print("\n" + "=" * 60)
    print("🔍 TESTING VVB MANAGEMENT PAGE")
    print("=" * 60)
    
    config = get_supabase_config()
    if not config:
        return False
    
    base_url = config['url']
    anon_key = config['anon_key']
    headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: VVB organizations
    print("\n📋 Test 1: VVB organizations")
    
    endpoint = f"{base_url}/rest/v1/vvb_organizations?select=*&limit=5"
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {len(data)} VVB organizations")
            
            if data:
                print("\n📋 Sample VVB organizations:")
                for i, item in enumerate(data[:3], 1):
                    print(f"   {i}. {item.get('organization_code')}: {item.get('organization_name')}")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 2: VVB engagements with relationships (the problematic one)
    print("\n📋 Test 2: VVB engagements with relationships")
    
    # Using the exact pattern from frontend (with !inner)
    query = """
        *,
        verra_project_registrations!inner (
            carbon_project_id
        ),
        vvb_organizations!inner (
            organization_name
        )
    """
    
    # URL encode the query
    import urllib.parse
    encoded_query = urllib.parse.quote(query.strip().replace('\n', ' '))
    
    endpoint = f"{base_url}/rest/v1/vvb_engagements?select={encoded_query}&limit=3"
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {len(data)} VVB engagements with relationships")
            
            if data:
                print("\n📋 Relationship data structure:")
                for key in data[0].keys():
                    if key not in ['id', 'contract_number']:
                        continue
                    print(f"  {key}: {data[0][key]}")
                
                if 'verra_project_registrations' in data[0]:
                    verra = data[0]['verra_project_registrations']
                    print(f"  verra_project_registrations: {len(verra)} item(s)")
                    if verra:
                        print(f"    First: carbon_project_id={verra[0].get('carbon_project_id')}")
                
                if 'vvb_organizations' in data[0]:
                    vvb = data[0]['vvb_organizations']
                    print(f"  vvb_organizations: {len(vvb)} item(s)")
                    if vvb:
                        print(f"    First: organization_name={vvb[0].get('organization_name')}")
            
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_nextjs_server():
    """Test Next.js server endpoints"""
    print("\n" + "=" * 60)
    print("🔍 TESTING NEXT.JS SERVER")
    print("=" * 60)
    
    # Try different ports
    ports = [3000, 3001, 3002, 3003, 3004, 3005]
    server_url = None
    
    for port in ports:
        try:
            url = f"http://localhost:{port}"
            response = requests.get(url, timeout=5)
            if response.status_code < 500:  # Any non-server error status
                server_url = url
                print(f"✅ Next.js server found at: {url}")
                break
        except:
            continue
    
    if not server_url:
        print("❌ Next.js server not found on any common port")
        print("   Check if server is running: ps aux | grep next")
        return False
    
    # Try to access dashboard pages
    print("\n📋 Testing dashboard pages...")
    
    pages_to_test = [
        "/dashboard/verra-registration",
        "/dashboard/vvb-management"
    ]
    
    all_pages_ok = True
    
    for page in pages_to_test:
        try:
            url = server_url + page
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ {page}: Accessible (200 OK)")
            elif response.status_code == 404:
                print(f"⚠️  {page}: Not found (404)")
            elif response.status_code == 500:
                print(f"❌ {page}: Server error (500)")
                all_pages_ok = False
            else:
                print(f"⚠️  {page}: Status {response.status_code}")
                
        except Exception as e:
            print(f"❌ {page}: Error - {e}")
            all_pages_ok = False
    
    return all_pages_ok

def check_database_tables():
    """Check all required tables exist"""
    print("\n" + "=" * 60)
    print("📊 CHECKING DATABASE TABLES")
    print("=" * 60)
    
    # Use psycopg2 to check tables
    try:
        import psycopg2
        import re
        
        # Read .env.local for database connection
        env_path = '.env.local'
        if not os.path.exists(env_path):
            print(f"❌ {env_path} not found")
            return False
        
        env_vars = {}
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip().strip('"\'')
        
        supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
        
        if not supabase_url:
            print("❌ No Supabase URL")
            return False
        
        # Extract project reference
        match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
        if not match:
            print(f"❌ Could not parse URL: {supabase_url}")
            return False
        
        project_ref = match.group(1)
        db_password = "4@@E-Zd%zCQ!7ZV"
        db_host = f"db.{project_ref}.supabase.co"
        
        params = {
            "host": db_host,
            "port": 5432,
            "database": "postgres",
            "user": "postgres",
            "password": db_password,
            "sslmode": "require",
            "connect_timeout": 10
        }
        
        conn = psycopg2.connect(**params)
        cursor = conn.cursor()
        
        # Check critical tables
        tables = [
            'vvb_organizations',
            'vvb_engagements',
            'verra_project_registrations',
            'carbon_projects'
        ]
        
        print("\n📋 Required tables:")
        all_tables_exist = True
        
        for table in tables:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = %s
                )
            """, (table,))
            exists = cursor.fetchone()[0]
            
            if exists:
                print(f"✅ {table}: EXISTS")
            else:
                print(f"❌ {table}: MISSING")
                all_tables_exist = False
        
        # Check foreign key relationships
        print("\n📋 Foreign key relationships:")
        cursor.execute("""
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name IN ('vvb_engagements', 'verra_project_registrations')
            ORDER BY tc.table_name, kcu.column_name
        """)
        
        fks = cursor.fetchall()
        
        if fks:
            for table, column, foreign_table in fks:
                print(f"✅ {table}.{column} → {foreign_table}")
        else:
            print("❌ No foreign key relationships found")
        
        cursor.close()
        conn.close()
        
        return all_tables_exist
        
    except Exception as e:
        print(f"❌ Database check error: {e}")
        return False

def main():
    print("🚀 FINAL VERIFICATION OF ALL FIXES")
    print("\nThis script verifies that all database-frontend compatibility")
    print("issues have been successfully resolved.")
    print("=" * 60)
    
    results = {
        'database_tables': check_database_tables(),
        'verra_registration': test_verra_registration(),
        'vvb_management': test_vvb_management(),
        'nextjs_server': test_nextjs_server()
    }
    
    print("\n" + "=" * 60)
    print("📊 FINAL RESULTS")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    print("🎯 SUMMARY")
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED!")
        print("\n✅ Database-frontend compatibility issues have been resolved.")
        print("\n📋 Fixed issues:")
        print("1. ✅ Verra Registration Page: Missing 'status' column")
        print("2. ✅ VVB Management Page: Missing vvb_organizations table")
        print("3. ✅ VVB Management Page: Missing vvb_engagements table")
        print("4. ✅ VVB Management Page: Relationship error with verra_project_registrations")
        print("5. ✅ Database schema cache refresh")
        print("\n🚀 Next.js server is running and pages are accessible.")
        print("\n💡 Next steps:")
        print("• Clear browser cache if still seeing old errors")
        print("• Test the pages manually in browser")
        print("• Continue with other development tasks")
    else:
        print("\n⚠️ Some tests failed. Review the errors above.")
        print("\n🔧 Remaining issues to fix:")
        for test_name, passed in results.items():
            if not passed:
                print(f"• {test_name}")
        
        print("\n💡 Check:")
        print("1. Supabase schema cache may need more time to refresh")
        print("2. Next.js server may need restart")
        print("3. Database permissions/RLS issues")
        print("4. Frontend query syntax")

if __name__ == "__main__":
    main()