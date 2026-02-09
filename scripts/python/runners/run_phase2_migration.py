#!/usr/bin/env python3
"""Run Phase 2 migration for carbon, finance, and program tables"""
import psycopg2
import os
import sys
import re

def get_db_connection():
    """Create database connection from .env.local"""
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

def run_migration():
    """Execute the Phase 2 migration"""
    migration_file = 'create_phase2_tables_minimal.sql'
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    print("\n⚠️  This will create Phase 2 tables:")
    print("   • carbon_projects, carbon_credits")
    print("   • financial_accounts, budgets, financial_transactions")
    print("   • programs")
    print("   • Plus sample data for testing")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        conn.autocommit = True  # Use autocommit for DDL statements
        cursor = conn.cursor()
        
        print("\n🚀 Executing Phase 2 migration...")
        
        # Execute the SQL
        cursor.execute(sql_content)
        print("✅ Phase 2 migration SQL executed successfully!")
        
        # Verify the tables were created
        print("\n🔍 Verifying table creation...")
        tables_to_check = [
            'carbon_projects',
            'carbon_credits', 
            'financial_accounts',
            'budgets',
            'financial_transactions',
            'programs'
        ]
        
        for table in tables_to_check:
            cursor.execute(f"""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table}'
            """)
            table_exists = cursor.fetchone()
            
            if table_exists:
                # Count rows
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"✅ Table '{table}' exists ({count} rows)")
            else:
                print(f"❌ Table '{table}' not found")
        
        # Check RLS status
        print("\n🔍 Checking RLS status...")
        cursor.execute("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('carbon_projects', 'carbon_credits', 'financial_accounts', 'budgets', 'financial_transactions', 'programs')
        """)
        rls_status = cursor.fetchall()
        for table, rowsecurity in rls_status:
            print(f"   • {table}: RLS {'ENABLED' if rowsecurity else 'DISABLED'}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 PHASE 2 MIGRATION SUCCESSFUL!")
        print("\n📋 Next steps:")
        print("   1. Frontend carbon projects page should now work")
        print("   2. Financial dashboard should have sample data")
        print("   3. Programs page should show sample program")
        print("   4. Restart Next.js dev server if needed: npm run dev")
        print("   5. Clear browser cache")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 PHASE 2 DATABASE MIGRATION")
    print("=" * 60)
    print("\n⚠️  This will create missing Phase 2 tables:")
    print("   • Carbon project management tables")
    print("   • Financial management tables")
    print("   • Program management tables")
    print("\nStarting migration...")
    
    success = run_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ PHASE 2 MIGRATION COMPLETE!")
        print("=" * 60)
        print("\n💡 Phase 2 tables are now available in Supabase.")
        print("   Many frontend errors should be resolved.")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ PHASE 2 MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check if tables already exist")
        print("   2. Verify database credentials")
        print("   3. Try running the SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()