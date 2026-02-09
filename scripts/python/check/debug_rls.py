#!/usr/bin/env python3
"""
Debug RLS Policies - Check current policies and table access
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local"""
    return {
        "host": "db.rrvhekjdhdhtkmswjgwk.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "CiTagF5HA/a%jU.",
        "sslmode": "require"
    }

def debug_rls():
    """Debug RLS policies"""
    params = get_connection_params()
    
    print("🔍 DEBUGGING RLS POLICIES")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # 1. Check if RLS is enabled for each table
        print("\n📊 RLS STATUS FOR TABLES:")
        cur.execute("""
            SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions')
            ORDER BY tablename;
        """)
        
        for schema, table, rls_enabled in cur.fetchall():
            status = "✅ ENABLED" if rls_enabled else "❌ DISABLED"
            print(f"   {table}: {status}")
        
        # 2. List all policies
        print("\n📋 EXISTING POLICIES:")
        cur.execute("""
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE schemaname = 'public'
            AND tablename IN ('kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions')
            ORDER BY tablename, policyname;
        """)
        
        policies = cur.fetchall()
        if not policies:
            print("   No policies found!")
        else:
            for schema, table, policy, permissive, roles, cmd, qual, with_check in policies:
                print(f"   {table}.{policy}: {cmd} - {qual[:100] if qual else 'no qualifier'}")
        
        # 3. Test access as service role (should work)
        print("\n🔧 TEST ACCESS AS SERVICE ROLE:")
        test_tables = ['kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions']
        for table in test_tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"   ✅ {table}: {count} rows accessible")
            except psycopg2.Error as e:
                print(f"   ❌ {table}: {e}")
        
        # 4. Test access as anon user (simulate by setting role)
        print("\n👤 TEST ACCESS AS ANON USER (simulated):")
        
        # First get the anon key from .env.local
        env_path = os.path.join(os.path.dirname(__file__), '.env.local')
        anon_key = None
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                        anon_key = line.split('=', 1)[1].strip().strip('"\'')
                        break
        
        if anon_key:
            print(f"   Found anon key: {anon_key[:20]}...")
            
            # Try to set role to anon (this is a simulation)
            # In reality, anon access is determined by RLS policies
            for table in test_tables:
                try:
                    # Try without any role context (should use default)
                    cur.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cur.fetchone()[0]
                    print(f"   ✅ {table}: {count} rows accessible (no role context)")
                except psycopg2.Error as e:
                    print(f"   ❌ {table}: {e}")
        
        # 5. Check if there are any DENY policies or restrictive policies
        print("\n⚠️  POTENTIAL ISSUES:")
        
        # Check for policies that might block anon access
        for schema, table, policy, permissive, roles, cmd, qual, with_check in policies:
            if qual and ('auth.uid()' in qual or 'auth.role()' in qual):
                print(f"   • {table}.{policy}: Requires authentication ({qual[:50]}...)")
        
        # 6. Simple fix suggestion
        print("\n🔧 SUGGESTED FIX:")
        print("   1. Ensure PUBLIC read policies exist for kabupaten, perhutanan_sosial, role_permissions")
        print("   2. Profiles table should have at least 'Users can view own profile'")
        print("   3. For testing, you can temporarily disable RLS:")
        print("      ALTER TABLE kabupaten DISABLE ROW LEVEL SECURITY;")
        print("   4. Or create simple public read policies:")
        print("      CREATE POLICY \"public_read\" ON kabupaten FOR SELECT USING (true);")
        
        # 7. Apply a quick fix if needed
        print("\n🚀 APPLYING QUICK FIX...")
        
        fix_applied = False
        for table in ['kabupaten', 'perhutanan_sosial', 'role_permissions']:
            # Check if public read policy exists
            cur.execute("""
                SELECT 1 FROM pg_policies 
                WHERE tablename = %s 
                AND policyname LIKE '%%public%%read%%'
                AND cmd = 'SELECT'
            """, (table,))
            
            if not cur.fetchone():
                print(f"   Creating public read policy for {table}...")
                try:
                    cur.execute(f"""
                        CREATE POLICY "public_read_{table}" ON {table}
                        FOR SELECT USING (true);
                    """)
                    fix_applied = True
                    print(f"   ✅ Created public read policy for {table}")
                except psycopg2.Error as e:
                    print(f"   ❌ Failed to create policy for {table}: {e}")
        
        if fix_applied:
            print("\n✅ Quick fix applied! Testing again...")
            for table in test_tables:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cur.fetchone()[0]
                    print(f"   ✅ {table}: {count} rows accessible")
                except psycopg2.Error as e:
                    print(f"   ❌ {table}: {e}")
        
        # Clean up
        cur.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 DEBUG COMPLETE")
        print("=" * 60)
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🔧 RLS POLICY DEBUGGER FOR SUPABASE")
    print("=" * 60)
    
    success = debug_rls()
    
    if success:
        print("\n📋 Next steps:")
        print("   1. Run: node scripts/javascript/checks/check-ps-data.js (should work if policies fixed)")
        print("   2. If still failing, consider disabling RLS temporarily")
        print("   3. Check frontend is using correct anon key")
        sys.exit(0)
    else:
        print("\n❌ DEBUG FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()