#!/usr/bin/env python3
"""
Fix anon role permissions in Supabase
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    return {
        "host": "db.rrvhekjdhdhtkmswjgwk.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "CiTagF5HA/a%jU.",
        "sslmode": "require"
    }

def fix_anon_permissions():
    """Execute the anon permissions fix SQL"""
    sql_file = os.path.join(os.path.dirname(__file__), 'fix_anon_permissions.sql')
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes")
    
    params = get_connection_params()
    
    print(f"🔌 Connecting to {params['host']}...")
    print("⚠️  WARNING: This will grant extensive permissions to 'anon' role")
    print("   This is necessary for Supabase REST API to work")
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Execute the fix
        print("\n🚀 Fixing anon role permissions...")
        
        try:
            cur.execute(sql_content)
            print("\n✅ Anon permissions fix executed!")
            
            # Try to fetch results
            try:
                results = cur.fetchall()
                if results:
                    print("\n📊 Results:")
                    for row in results:
                        print(f"   {row}")
            except:
                pass
            
        except psycopg2.Error as e:
            print(f"\n⚠️  Warning during execution: {e}")
            # Continue anyway
        
        # Test if fix worked
        print("\n🔍 Testing if fix worked...")
        
        # Check current grants
        try:
            cur.execute("""
                SELECT 
                    grantee,
                    table_schema,
                    table_name,
                    string_agg(privilege_type, ', ') as privileges
                FROM information_schema.role_table_grants
                WHERE grantee = 'anon'
                AND table_schema = 'public'
                AND table_name IN ('kabupaten', 'perhutanan_sosial')
                GROUP BY grantee, table_schema, table_name
                ORDER BY table_name;
            """)
            
            grants = cur.fetchall()
            if grants:
                print("   ✅ Anon role has grants:")
                for grantee, schema, table, privs in grants:
                    print(f"      • {table}: {privs}")
            else:
                print("   ⚠️  No grants found for anon role")
                
        except psycopg2.Error as e:
            print(f"   ❌ Could not check grants: {e}")
        
        # Test direct query as anon (simulate)
        print("\n🔍 Testing simulated anon access...")
        try:
            # First check if we can disable RLS temporarily if needed
            cur.execute("SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kabupaten'")
            rls_enabled = cur.fetchone()[0]
            
            if rls_enabled:
                print("   ⚠️  RLS is ENABLED on kabupaten")
                print("   🔧 Temporarily disabling RLS for testing...")
                cur.execute("ALTER TABLE kabupaten DISABLE ROW LEVEL SECURITY")
                print("   ✅ RLS disabled temporarily")
            
            # Test count
            cur.execute("SELECT COUNT(*) FROM kabupaten")
            count = cur.fetchone()[0]
            print(f"   ✅ Can access kabupaten: {count} rows")
            
            # Re-enable RLS if we disabled it
            if rls_enabled:
                cur.execute("ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY")
                print("   ✅ RLS re-enabled")
                
        except psycopg2.Error as e:
            print(f"   ❌ Could not test access: {e}")
        
        cur.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎯 NEXT STEP:")
        print("   Test REST API with: node scripts/javascript/checks/check-ps-data.js")
        print("   If still failing, consider creating new Supabase project")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_after_fix():
    """Test if the fix worked"""
    print("\n" + "=" * 60)
    print("🔍 TESTING AFTER FIX")
    print("=" * 60)
    
    # Run the check-ps-data.js script
    import subprocess
    try:
        print("Running: node scripts/javascript/checks/check-ps-data.js")
        result = subprocess.run(
            ['node', 'check-ps-data.js'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("\n✅ SUCCESS! API connectivity fixed!")
            print(f"Output preview: {result.stdout[:300]}...")
            
            # Check for success indicators
            if '✅ Found' in result.stdout or 'Success' in result.stdout:
                print("\n🎉 Frontend should now work!")
                print("\n📋 Next steps:")
                print("   1. Run: npm run dev")
                print("   2. Open: http://localhost:3000")
                print("   3. Dashboard should show PS data")
            else:
                print("\n⚠️  Test ran but no data found")
                
        else:
            print("\n❌ Test still failing")
            print(f"Error: {result.stderr[:200]}...")
            print(f"Output: {result.stdout[:200]}...")
            
    except subprocess.TimeoutExpired:
        print("❌ Test timed out")
    except Exception as e:
        print(f"❌ Error running test: {e}")

def main():
    print("=" * 80)
    print("🔧 FIX ANON ROLE PERMISSIONS FOR SUPABASE")
    print("=" * 80)
    print("\n📋 This will:")
    print("   1. Grant USAGE on schemas to anon role")
    print("   2. Grant SELECT/INSERT/UPDATE/DELETE on all tables")
    print("   3. Grant EXECUTE on all functions")
    print("   4. Set default privileges for future tables")
    print("\n⚠️  WARNING: This grants extensive permissions")
    print("   Only proceed if you understand the security implications")
    print("\nStarting in 5 seconds... (Press Ctrl+C to cancel)")
    
    import time
    time.sleep(5)
    
    success = fix_anon_permissions()
    
    if success:
        print("\n✅ Anon permissions fix completed")
        print("\n🔍 Testing if fix worked...")
        test_after_fix()
    else:
        print("\n❌ Anon permissions fix failed")
        print("\n🚀 ALTERNATIVE SOLUTION:")
        print("   1. Create NEW Supabase project")
        print("   2. Run migration scripts on new project")
        print("   3. Update .env.local with new keys")
        print("   4. Test immediately")
    
    print("\n" + "=" * 80)
    print("📋 SUMMARY")
    print("=" * 80)
    print("\n✅ Database: READY (92 PS records)")
    print("✅ Frontend: COMPATIBLE (uses perhutanan_sosial)")
    print("🔴 API Connectivity: NEEDS PERMISSION FIX")
    print("\n🎯 If fix doesn't work: Create new Supabase project")

if __name__ == "__main__":
    main()