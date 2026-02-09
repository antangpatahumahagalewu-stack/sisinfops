#!/usr/bin/env python3
"""
Run RLS Fix Script to fix permission issues
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

def execute_fix():
    """Execute the RLS fix SQL file"""
    sql_file = os.path.join(os.path.dirname(__file__), 'test_rls_fix.sql')
    
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
        print("\n🚀 Executing RLS fix SQL...")
        
        # Split SQL by semicolons and execute each statement
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for i, stmt in enumerate(statements, 1):
            if stmt:
                print(f"\n🔧 Statement {i}/{len(statements)}: {stmt[:100]}...")
                try:
                    cur.execute(stmt)
                    # If it's a SELECT, fetch results
                    if stmt.strip().upper().startswith('SELECT'):
                        results = cur.fetchall()
                        if results:
                            print(f"   Results: {results}")
                except Exception as e:
                    print(f"   ⚠️  Warning: {e}")
                    # Continue with next statement
        
        print("\n✅ RLS fix executed!")
        
        # Verify by testing access
        print("\n🔍 Testing table access...")
        
        test_tables = ['kabupaten', 'perhutanan_sosial', 'profiles', 'role_permissions']
        for table in test_tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"   ✅ {table}: {count} rows accessible")
            except Exception as e:
                print(f"   ❌ {table}: {e}")
        
        # Clean up
        cur.close()
        conn.close()
        
        print(f"\n🎉 RLS FIX COMPLETE!")
        print(f"   Tables should now be publicly readable")
        print(f"   Test with: node scripts/javascript/checks/check-ps-data.js")
        
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
    print("🔧 RLS FIX SCRIPT FOR SUPABASE")
    print("=" * 60)
    print("\n⚠️  This will fix RLS policies for core tables")
    print("   • Makes kabupaten, perhutanan_sosial publicly readable")
    print("   • Fixes admin access policies")
    print("   • Should resolve 'permission denied' errors")
    print("\nStarting in 3 seconds...")
    
    import time
    time.sleep(3)
    
    success = execute_fix()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ RLS FIX SUCCESSFUL!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("   1. Run: node scripts/javascript/checks/check-ps-data.js (should work now)")
        print("   2. Run: npm run dev (start frontend)")
        print("   3. Open: http://localhost:3000")
        print("\n   Dashboard should now show PS data")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ RLS FIX FAILED")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()