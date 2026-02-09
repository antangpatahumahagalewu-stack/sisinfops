#!/usr/bin/env python3
"""Run fix_missing_phase2_tables.sql migration"""
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
    """Execute the missing tables fix migration"""
    migration_file = 'fix_missing_phase2_tables.sql'
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    print("\n⚠️  This will fix Phase 2 relationship errors:")
    print("   • Creates verra_project_registrations table")
    print("   • Adds verra_registration_id to carbon_credits")
    print("   • Creates price_list and financial_reports")
    print("   • Adds sample data for testing")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        conn.autocommit = True  # Use autocommit for DDL statements
        cursor = conn.cursor()
        
        print("\n🚀 Executing missing tables fix...")
        
        # Execute the SQL
        cursor.execute(sql_content)
        print("✅ Missing tables fix SQL executed successfully!")
        
        # Verify the tables were created
        print("\n🔍 Verifying table creation...")
        tables_to_check = [
            'verra_project_registrations',
            'price_list', 
            'financial_reports'
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
        
        # Check carbon_credits has verra_registration_id column
        print("\n🔍 Checking carbon_credits relationships...")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'carbon_credits' 
            AND column_name = 'verra_registration_id'
        """)
        verra_column = cursor.fetchone()
        if verra_column:
            print(f"✅ carbon_credits has verra_registration_id column")
            
            # Count credits with verra registration
            cursor.execute("""
                SELECT COUNT(*) FROM carbon_credits 
                WHERE verra_registration_id IS NOT NULL
            """)
            count_with_verra = cursor.fetchone()[0]
            print(f"   • {count_with_verra} credits linked to verra registrations")
        else:
            print(f"❌ carbon_credits missing verra_registration_id column")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 MISSING TABLES FIX SUCCESSFUL!")
        print("\n📋 Next steps:")
        print("   1. Carbon Credits page should now show Verra relationship")
        print("   2. Verra Registration page should show data")
        print("   3. Price List and Financial Reports pages should work")
        print("   4. Restart Next.js dev server if needed: npm run dev")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 FIX MISSING PHASE 2 TABLES & RELATIONSHIPS")
    print("=" * 60)
    print("\n⚠️  This will fix console errors:")
    print("   • 'Could not find a relationship between carbon_credits and verra_project_registrations'")
    print("   • 'Error fetching financial data: {}'")
    print("\nStarting migration...")
    
    success = run_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ MISSING TABLES FIX COMPLETE!")
        print("=" * 60)
        print("\n💡 Phase 2 relationship errors should be resolved.")
        print("   Frontend carbon and financial pages should work.")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ MISSING TABLES FIX FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check if tables already exist")
        print("   2. Verify database credentials")
        print("   3. Try running the SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()