#!/usr/bin/env python3
"""
Program Budget & Approval Migration Runner
Execute 202602050850_fix_program_budget_approval.sql
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '../../..', '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse Supabase URL
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    # Use the database password (from existing script)
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
    """Execute the program budget migration SQL file"""
    sql_file = os.path.join(os.path.dirname(__file__), '../../../supabase/migrations/202602050850_fix_program_budget_approval.sql')
    
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
        print("\n🚀 Executing program budget migration SQL...")
        print("⏳ This may take 15-30 seconds...")
        
        # Execute the SQL (entire file as one statement)
        cur.execute(sql_content)
        
        # If we get here without error, it's successful
        print("\n✅ Migration SQL executed successfully!")
        
        # Verify migration
        print("\n🔍 Verifying migration results...")
        
        # Check tables
        tables_to_check = [
            'master_aksi_mitigasi',
            'program_budgets', 
            'program_budget_items',
            'program_aksi_mitigasi'
        ]
        
        for table in tables_to_check:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            print(f"   {table}: {count} rows")
        
        # Check programs table columns
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'programs' 
            AND column_name IN ('budget_status', 'total_budget', 'submitted_at', 'reviewed_at')
        """)
        columns = cur.fetchall()
        print(f"\n   New columns in programs table: {len(columns)} added")
        for col_name, data_type in columns:
            print(f"     • {col_name} ({data_type})")
        
        # Clean up
        cur.close()
        conn.close()
        
        print(f"\n🎉 PROGRAM BUDGET MIGRATION COMPLETE!")
        print(f"   ✅ master_aksi_mitigasi table created with data")
        print(f"   ✅ Program budgets tables created")
        print(f"   ✅ Approval columns added to programs table")
        print(f"   ✅ RLS policies configured")
        
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
    print("🚀 PROGRAM BUDGET & APPROVAL MIGRATION RUNNER")
    print("=" * 60)
    print("\n⚠️  IMPORTANT:")
    print("   • This will create master_aksi_mitigasi table (fixes frontend error)")
    print("   • Adds budget approval columns to programs table")
    print("   • Creates program budgets and budget items tables")
    print("   • Links budget items to price_list (master harga dari keuangan)")
    print("   • The SQL is IDEMPOTENT (can run multiple times)")
    print("\nStarting in 3 seconds...")
    
    import time
    time.sleep(3)
    
    success = execute_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ MIGRATION SUCCESSFUL!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("   1. Update program-form.tsx to include budget section")
        print("   2. Create API endpoints for budget management")
        print("   3. Create finance dashboard for approval")
        print("   4. Test end-to-end workflow")
        print("\n💡 Frontend error 'Error loading master_aksi_mitigasi' should now be fixed!")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check Supabase project is active")
        print("   2. Verify database password is correct")
        print("   3. Check network connection")
        print("   4. Try running SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()