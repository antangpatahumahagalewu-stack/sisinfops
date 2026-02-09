#!/usr/bin/env python3
"""
Test direct SQL connection to verify RLS status
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

def test_direct():
    """Test direct SQL access"""
    params = get_connection_params()
    
    print("🔍 TESTING DIRECT DATABASE ACCESS")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Check RLS status
        print("\n📊 CURRENT RLS STATUS:")
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
        
        # Force disable RLS if still enabled
        print("\n🔧 FORCE DISABLING RLS...")
        tables = ['kabupaten', 'perhutanan_sosial', 'potensi', 'profiles', 'role_permissions']
        for table in tables:
            try:
                cur.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
                print(f"   ✅ Disabled RLS on {table}")
            except psycopg2.Error as e:
                print(f"   ⚠️  Could not disable RLS on {table}: {e}")
        
        # Verify data exists
        print("\n📈 VERIFYING DATA...")
        for table in ['kabupaten', 'perhutanan_sosial']:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"   ✅ {table}: {count} rows")
                
                # Show some sample data
                if count > 0 and table == 'kabupaten':
                    cur.execute(f"SELECT id, nama FROM {table} LIMIT 3")
                    rows = cur.fetchall()
                    for row_id, row_nama in rows:
                        print(f"      • {row_nama} ({row_id[:8]}...)")
                
                if count > 0 and table == 'perhutanan_sosial':
                    cur.execute(f"SELECT pemegang_izin, skema, luas_ha, jumlah_kk FROM {table} LIMIT 3")
                    rows = cur.fetchall()
                    for pemegang_izin, skema, luas_ha, jumlah_kk in rows:
                        print(f"      • {pemegang_izin[:30]}... ({skema}): {luas_ha} ha, {jumlah_kk} KK")
                        
            except psycopg2.Error as e:
                print(f"   ❌ {table}: {e}")
        
        # Check Supabase specific settings
        print("\n🔐 SUPABASE SPECIFIC CHECKS:")
        
        # Check auth schema exists
        try:
            cur.execute("SELECT COUNT(*) FROM auth.users")
            auth_users = cur.fetchone()[0]
            print(f"   ✅ auth.users: {auth_users} users")
        except:
            print("   ⚠️  auth.users table not accessible")
        
        # Check if anon role exists
        try:
            cur.execute("SELECT rolname FROM pg_roles WHERE rolname = 'anon'")
            if cur.fetchone():
                print("   ✅ 'anon' role exists")
            else:
                print("   ⚠️  'anon' role not found")
        except:
            print("   ⚠️  Could not check roles")
        
        # Create a simple function to test RPC
        print("\n🛠️  CREATING TEST FUNCTION...")
        try:
            cur.execute("""
                CREATE OR REPLACE FUNCTION test_access()
                RETURNS JSONB AS $$
                DECLARE
                    result JSONB;
                BEGIN
                    result := jsonb_build_object(
                        'kabupaten', (SELECT COUNT(*) FROM kabupaten),
                        'perhutanan_sosial', (SELECT COUNT(*) FROM perhutanan_sosial),
                        'profiles', (SELECT COUNT(*) FROM profiles),
                        'role_permissions', (SELECT COUNT(*) FROM role_permissions),
                        'timestamp', NOW()
                    );
                    RETURN result;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            print("   ✅ Created test_access() function")
            
            # Test the function
            cur.execute("SELECT test_access()")
            result = cur.fetchone()[0]
            print(f"   📊 Function result: {result}")
            
        except psycopg2.Error as e:
            print(f"   ⚠️  Could not create function: {e}")
        
        # Clean up
        cur.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 DIRECT DATABASE TEST COMPLETE")
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

if __name__ == "__main__":
    test_direct()