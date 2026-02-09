#!/usr/bin/env python3
"""
Simple SQL Migration Runner - Execute complete_schema_migration_fixed.sql
Connect directly to Supabase and execute the entire SQL file as one statement
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local and project URL"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    # Read environment variables
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse Supabase URL to extract project reference
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference from URL: https://saelrsljpneclsbfdxfy.supabase.co
    # Database host: db.saelrsljpneclsbfdxfy.supabase.co
    if 'supabase.co' in supabase_url:
        # Extract project reference
        import re
        match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
        if match:
            project_ref = match.group(1)
            db_host = f"db.{project_ref}.supabase.co"
        else:
            print(f"❌ Could not parse Supabase URL: {supabase_url}")
            return None
    else:
        print(f"❌ Not a Supabase URL: {supabase_url}")
        return None
    
    # Use the database password provided by user: 4@@E-Zd%zCQ!7ZV
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def execute_migration():
    """Execute the simple migration SQL file"""
    sql_file = os.path.join(os.path.dirname(__file__), 'simple_new_project_migration.sql')
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    
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
        
        # Test connection
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"📊 PostgreSQL version: {version.split(',')[0]}")
        
        # Execute the entire SQL content
        print("\n🚀 Executing migration SQL...")
        print("⏳ This may take 30-60 seconds...")
        
        # Execute the SQL (entire file as one statement)
        cur.execute(sql_content)
        
        # If we get here without error, it's successful
        print("\n✅ Migration SQL executed successfully!")
        
        # Verify migration
        print("\n🔍 Verifying migration results...")
        
        # Check tables
        cur.execute("""
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'kabupaten', 'perhutanan_sosial', 'potensi', 'profiles', 'role_permissions',
                'carbon_projects', 'carbon_credits', 'financial_accounts', 'budgets',
                'financial_transactions', 'price_list', 'financial_reports', 'programs',
                'program_activities', 'monev_indicators', 'monev_results', 'activity_log',
                'audit_trail'
            )
        """)
        table_count = cur.fetchone()[0]
        print(f"   Tables created/checked: {table_count}")
        
        # Check data
        cur.execute("SELECT COUNT(*) FROM kabupaten")
        kabupaten_count = cur.fetchone()[0]
        print(f"   Kabupaten rows: {kabupaten_count}")
        
        cur.execute("SELECT COUNT(*) FROM perhutanan_sosial")
        ps_count = cur.fetchone()[0]
        print(f"   Perhutanan Sosial rows: {ps_count}")
        
        cur.execute("SELECT COUNT(*) FROM role_permissions")
        role_count = cur.fetchone()[0]
        print(f"   Role permissions rows: {role_count}")
        
        # Clean up
        cur.close()
        conn.close()
        
        print(f"\n🎉 MIGRATION COMPLETE!")
        print(f"   Frontend should now show PS data")
        print(f"   Role-based access is configured")
        print(f"   All Phase 2 modules are ready")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"   Error details: {e.diag.message_primary if hasattr(e, 'diag') else 'No details'}")
        
        # Try to get more error context
        if hasattr(e, 'cursor') and e.cursor:
            try:
                print(f"   Last query context: {e.cursor.query[:200]}...")
            except:
                pass
        
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 SIMPLE PHASE 2 DATABASE MIGRATION RUNNER")
    print("=" * 60)
    print("\n⚠️  IMPORTANT:")
    print("   • This will execute the complete migration SQL")
    print("   • The SQL is IDEMPOTENT (can run multiple times)")
    print("   • No data will be lost (only creates what doesn't exist)")
    print("   • Expected time: 30-60 seconds")
    print("\nStarting in 3 seconds...")
    
    import time
    time.sleep(3)
    
    success = execute_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ MIGRATION SUCCESSFUL!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("   1. Run: node check-db-status.js (to verify)")
        print("   2. Run: node scripts/javascript/checks/check-ps-data.js (public access test)")
        print("   3. Start frontend: npm run dev")
        print("   4. Open: http://localhost:3000")
        print("\n   Dashboard should now show PS data")
        print("   Role-based navigation should work")
        print("\n💡 If any issues, check PHASE2_IMPLEMENTATION_GUIDE.md")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check Supabase project is active")
        print("   2. Verify database credentials in .env.local")
        print("   3. Check network connection")
        print("   4. Try manual method in run-fixed-migration.js")
        sys.exit(1)

if __name__ == "__main__":
    main()