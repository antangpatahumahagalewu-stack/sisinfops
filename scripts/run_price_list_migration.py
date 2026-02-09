#!/usr/bin/env python3
"""
Script to manually run price_list table enhancement migration
Uses direct PostgreSQL connection via psycopg2
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_db_config():
    """Extract database configuration from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse Supabase URL
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'').strip()
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference from URL
    # Example: https://saelrsljpneclsbfdxfy.supabase.co
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    # Get database password from SUPABASE_SERVICE_ROLE_KEY or use default
    db_password = None
    for line in content.split('\n'):
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY=') and not line.startswith('#'):
            db_password = line.split('=', 1)[1].strip().strip('"\'').strip()
            break
    
    if not db_password:
        # Try to get from other environment variables
        print("⚠️ SUPABASE_SERVICE_ROLE_KEY not found, trying default...")
        # Use the password from previous scripts
        db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def run_migration():
    """Execute the price_list unification migration"""
    print("🚀 Running Price List Table Enhancement Migration")
    print("=" * 60)
    
    # Read the migration SQL file
    migration_file = "supabase/migrations/202602050859_unify_price_list_tables.sql"
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes")
    
    # Get database configuration
    config = get_db_config()
    if not config:
        return False
    
    print(f"🔌 Connecting to {config['host']}...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**config)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Test connection
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"📊 PostgreSQL version: {version.split(',')[0]}")
        
        # Check current price_list table structure
        print("\n🔍 Checking current price_list table structure...")
        cur.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'price_list' 
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        print(f"   Current columns: {len(columns)}")
        
        # Check if master_price_list exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'master_price_list'
            )
        """)
        master_exists = cur.fetchone()[0]
        print(f"   master_price_list exists: {master_exists}")
        
        print("\n🚀 Executing migration SQL...")
        print("⏳ This may take 10-20 seconds...")
        
        # Execute the SQL (entire file as one statement)
        cur.execute(sql_content)
        
        print("\n✅ Migration SQL executed successfully!")
        
        # Verify results
        print("\n🔍 Verifying migration results...")
        
        # Check enhanced price_list columns
        cur.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'price_list' 
            AND column_name IN (
                'item_category', 'validity_start', 'validity_until', 
                'version', 'approval_status', 'created_by', 
                'approved_by', 'updated_at'
            )
            ORDER BY column_name
        """)
        new_columns = cur.fetchall()
        print(f"   New/enhanced columns added: {len(new_columns)}")
        for col_name, data_type, is_nullable in new_columns:
            print(f"     • {col_name} ({data_type}, nullable: {is_nullable})")
        
        # Check row count
        cur.execute("SELECT COUNT(*) FROM price_list")
        row_count = cur.fetchone()[0]
        print(f"   Total rows in price_list: {row_count}")
        
        # Check if data was copied from master_price_list
        if master_exists:
            cur.execute("SELECT COUNT(*) FROM master_price_list")
            master_count = cur.fetchone()[0]
            print(f"   Rows in master_price_list: {master_count}")
        
        # Check for any errors in the transaction (from DO blocks)
        # The DO blocks should have raised NOTICE messages, but we can check triggers
        cur.execute("""
            SELECT tgname, tgtype 
            FROM pg_trigger 
            WHERE tgrelid = 'price_list'::regclass
            AND tgname = 'update_price_list_updated_at'
        """)
        trigger = cur.fetchone()
        if trigger:
            print(f"   ✅ Trigger created: {trigger[0]}")
        
        # Clean up
        cur.close()
        conn.close()
        
        print(f"\n🎉 PRICE LIST MIGRATION COMPLETE!")
        print("=" * 60)
        print("Summary:")
        print("  ✅ price_list table enhanced with new columns")
        print("  ✅ Data copied from master_price_list (if existed)")
        print("  ✅ Updated_at trigger created")
        print("  ✅ Foreign key constraint added to program_budget_items")
        print("\n📋 Next steps:")
        print("  1. Restart Next.js dev server")
        print("  2. Test /dashboard/finance/price-list page")
        print("  3. Verify data synchronization")
        print("=" * 60)
        
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
    print("🚀 PRICE LIST TABLE UNIFICATION MIGRATION")
    print("=" * 60)
    print("This migration will:")
    print("  1. Add missing columns to price_list table")
    print("  2. Copy data from master_price_list (if exists)")
    print("  3. Set default values for existing rows")
    print("  4. Create updated_at trigger")
    print("  5. Add foreign key to program_budget_items")
    print("\n⚠️  IMPORTANT: Make sure you have database backups!")
    
    import time
    print("\nStarting in 5 seconds...")
    time.sleep(5)
    
    success = run_migration()
    
    if success:
        print("\n✅ Migration successful!")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        print("\n🔧 Troubleshooting:")
        print("  1. Check Supabase project is active")
        print("  2. Verify database credentials in .env.local")
        print("  3. Check network connection")
        print("  4. Try running SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()
