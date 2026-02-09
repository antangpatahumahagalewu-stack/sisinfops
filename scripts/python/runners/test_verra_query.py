#!/usr/bin/env python3
"""Test the exact query that frontend uses for verra registration page"""
import psycopg2
import os
import sys

def get_db_connection():
    """Create database connection"""
    env_path = '.env.local'
    if not os.path.exists(env_path):
        print(f"❌ {env_path} not found")
        return None
    
    # Parse .env.local
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
        return None
    
    # Extract project reference
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Could not parse URL: {supabase_url}")
        return None
    
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
    
    try:
        conn = psycopg2.connect(**params)
        print(f"✅ Connected to {db_host}")
        return conn
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def test_frontend_query():
    """Test the exact frontend query"""
    print("=" * 60)
    print("🔍 TESTING FRONTEND QUERY FOR VERRA REGISTRATION PAGE")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # 1. First check if tables exist
        print("\n📊 Checking table existence...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('carbon_projects', 'verra_project_registrations')
        """)
        tables = cursor.fetchall()
        print(f"✅ Tables found: {[t[0] for t in tables]}")
        
        # 2. Check RLS status
        print("\n📊 Checking RLS status...")
        cursor.execute("""
            SELECT 
                tablename,
                rowsecurity,
                CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('carbon_projects', 'verra_project_registrations')
        """)
        rls_info = cursor.fetchall()
        for table, rowsecurity, status in rls_info:
            print(f"   • {table}: RLS {status}")
        
        # 3. Check data in carbon_projects
        print("\n📊 Checking carbon_projects data...")
        cursor.execute("SELECT COUNT(*) FROM carbon_projects")
        cp_count = cursor.fetchone()[0]
        print(f"   • carbon_projects count: {cp_count}")
        
        if cp_count > 0:
            cursor.execute("SELECT id, kode_project, nama_project FROM carbon_projects LIMIT 3")
            projects = cursor.fetchall()
            for project in projects:
                print(f"   • Project: {project[1]} ({project[2]})")
        
        # 4. Check data in verra_project_registrations
        print("\n📊 Checking verra_project_registrations data...")
        cursor.execute("SELECT COUNT(*) FROM verra_project_registrations")
        vpr_count = cursor.fetchone()[0]
        print(f"   • verra_project_registrations count: {vpr_count}")
        
        if vpr_count > 0:
            cursor.execute("""
                SELECT id, project_id, verra_project_id, status 
                FROM verra_project_registrations 
                LIMIT 3
            """)
            verra_regs = cursor.fetchall()
            for reg in verra_regs:
                print(f"   • Registration: {reg[2]} ({reg[3]}) for project_id: {reg[1]}")
        
        # 5. Test the EXACT query frontend uses
        print("\n📊 Testing frontend query (with relationships)...")
        try:
            # This is the exact query from frontend
            query = """
                SELECT 
                    cp.*,
                    json_agg(
                        json_build_object(
                            'status', vpr.status,
                            'verra_project_id', vpr.verra_project_id,
                            'registration_date', vpr.registration_date
                        )
                    ) as verra_project_registrations
                FROM carbon_projects cp
                LEFT JOIN verra_project_registrations vpr ON cp.id = vpr.project_id
                GROUP BY cp.id
                ORDER BY cp.created_at DESC
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            print(f"✅ Query successful! Found {len(results)} results")
            
            if results:
                print("\n📋 Sample results:")
                for i, row in enumerate(results[:2]):
                    print(f"   Result {i+1}:")
                    print(f"     • ID: {row[0]}")
                    print(f"     • Project code: {row[5] if len(row) > 5 else 'N/A'}")
                    print(f"     • Project name: {row[6] if len(row) > 6 else 'N/A'}")
                    
                    # Check the JSON aggregation
                    import json
                    try:
                        verra_data = row[-1] if row else None
                        if verra_data:
                            parsed = json.loads(verra_data)
                            print(f"     • Verra registrations: {len(parsed)}")
                            if parsed and parsed[0]:
                                print(f"       - Status: {parsed[0].get('status')}")
                                print(f"       - Verra ID: {parsed[0].get('verra_project_id')}")
                        else:
                            print(f"     • Verra registrations: None")
                    except:
                        print(f"     • Verra registrations: {verra_data}")
                    
        except Exception as e:
            print(f"❌ Frontend query failed: {e}")
            
            # Try simpler query
            print("\n🔧 Trying simpler query...")
            try:
                cursor.execute("SELECT * FROM carbon_projects LIMIT 3")
                simple_results = cursor.fetchall()
                print(f"   Simple query worked: {len(simple_results)} rows")
                
                # Check columns
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'carbon_projects'
                    ORDER BY ordinal_position
                """)
                columns = cursor.fetchall()
                print(f"   Columns in carbon_projects: {[c[0] for c in columns[:5]]}...")
                
            except Exception as e2:
                print(f"   ❌ Even simple query failed: {e2}")
        
        # 6. Check if anonymous user can access
        print("\n📊 Checking permissions for anonymous access...")
        cursor.execute("""
            SELECT has_table_privilege('anon', 'carbon_projects', 'SELECT') as can_select_cp,
                   has_table_privilege('anon', 'verra_project_registrations', 'SELECT') as can_select_vpr
        """)
        privs = cursor.fetchone()
        print(f"   • anon can SELECT carbon_projects: {'✅' if privs[0] else '❌'}")
        print(f"   • anon can SELECT verra_project_registrations: {'✅' if privs[1] else '❌'}")
        
        cursor.close()
        conn.close()
        print("\n✅ Test completed!")
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_frontend_query()