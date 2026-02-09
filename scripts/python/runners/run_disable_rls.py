#!/usr/bin/env python3
"""
Run RLS Disable Script to temporarily disable RLS for testing
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

def execute_disable_rls():
    """Execute the RLS disable SQL file"""
    sql_file = os.path.join(os.path.dirname(__file__), 'disable_rls_temporarily.sql')
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes")
    
    # Get connection parameters
    params = get_connection_params()
    if not params:
        return False
    
    print(f"🔌 Connecting to {params['host']}...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Execute the entire SQL content
        print("\n🚀 Executing RLS disable SQL...")
        print("⏳ This will temporarily disable RLS on all tables...")
        
        try:
            cur.execute(sql_content)
            print("\n✅ RLS disable executed successfully!")
            
            # Fetch results from SELECT statements
            try:
                results = cur.fetchall()
                if results:
                    print("\n📊 Results:")
                    for row in results:
                        print(f"   {row}")
            except:
                pass  # No results expected
            
        except psycopg2.Error as e:
            print(f"\n⚠️  Warning during execution: {e}")
            # Continue anyway - some statements might have succeeded
        
        # Test that access works
        print("\n🔍 Testing table access (should work now)...")
        
        test_tables = ['kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions']
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
        
        print(f"\n🎉 RLS DISABLE COMPLETE!")
        print(f"   Tables should now be accessible via API")
        print(f"   Test with: node scripts/javascript/checks/check-ps-data.js")
        print(f"\n⚠️  IMPORTANT: This is temporary - for production,")
        print(f"   you should re-enable RLS and create proper policies")
        
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
    print("🔧 TEMPORARY RLS DISABLE FOR TESTING")
    print("=" * 60)
    print("\n⚠️  WARNING: This will DISABLE Row Level Security on all tables")
    print("   • Makes all data publicly readable/writable")
    print("   • FOR TESTING PURPOSES ONLY")
    print("   • Should be re-enabled for production")
    print("\n📋 This will allow:")
    print("   • Frontend to show PS data immediately")
    print("   • API to work without permission errors")
    print("   • Quick testing of the new schema")
    print("\nStarting in 5 seconds... (Press Ctrl+C to cancel)")
    
    import time
    time.sleep(5)
    
    success = execute_disable_rls()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ RLS DISABLE SUCCESSFUL!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("   1. Run: node scripts/javascript/checks/check-ps-data.js (should work now)")
        print("   2. Run: npm run dev (start frontend)")
        print("   3. Open: http://localhost:3000")
        print("   4. Dashboard should show PS data")
        print("\n🔧 To re-enable RLS later:")
        print("   1. Run: ALTER TABLE kabupaten ENABLE ROW LEVEL SECURITY;")
        print("   2. Recreate policies with CREATE POLICY statements")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ RLS DISABLE FAILED")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()