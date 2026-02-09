#!/usr/bin/env python3
"""
Script to add missing columns to price_list table
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_db_config():
    """Extract database configuration from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
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
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    # Get database password
    db_password = None
    for line in content.split('\n'):
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY=') and not line.startswith('#'):
            db_password = line.split('=', 1)[1].strip().strip('"\'').strip()
            break
    
    if not db_password:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not found")
        return None
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def run_sql():
    """Execute SQL to add missing columns"""
    print("🚀 Adding missing columns to price_list table")
    print("=" * 60)
    
    # Read the SQL file
    sql_file = "add_missing_columns.sql"
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
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
        
        # Check current columns before
        print("\n🔍 Current price_list columns (before):")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'price_list' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        """)
        before_columns = cur.fetchall()
        for col in before_columns:
            print(f"   • {col[0]} ({col[1]})")
        
        print("\n🚀 Executing SQL to add missing columns...")
        
        # Execute the SQL
        cur.execute(sql_content)
        
        print("\n✅ SQL executed successfully!")
        
        # Check columns after
        print("\n🔍 Updated price_list columns (after):")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'price_list' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        """)
        after_columns = cur.fetchall()
        for col in after_columns:
            print(f"   • {col[0]} ({col[1]})")
        
        # Show what was added
        before_set = set([c[0] for c in before_columns])
        after_set = set([c[0] for c in after_columns])
        added = after_set - before_set
        
        if added:
            print(f"\n🎉 Added {len(added)} new column(s):")
            for col in sorted(added):
                print(f"   ✅ {col}")
        else:
            print("\nℹ️  No new columns added (they may already exist)")
        
        # Clean up
        cur.close()
        conn.close()
        
        print("\n✨ Operation completed successfully!")
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
    print("🚀 ADD MISSING COLUMNS TO PRICE_LIST TABLE")
    print("=" * 60)
    print("This script will add missing columns to price_list table:")
    print("  • updated_at (for tracking updates)")
    print("  • version (for versioning)")
    print("  • approval_status (for workflow)")
    print("  • created_by (audit trail)")
    print("  • approved_by (audit trail)")
    print("\n⚠️  IMPORTANT: This preserves existing column names")
    print("   (category, valid_from, valid_until NOT renamed)")
    
    import time
    print("\nStarting in 3 seconds...")
    time.sleep(3)
    
    success = run_sql()
    
    if success:
        print("\n✅ Success! Columns added to price_list table.")
        print("\n📋 Next steps:")
        print("   1. Update API to use new columns (optional)")
        print("   2. Test price list functionality")
        print("   3. Verify data consistency")
        sys.exit(0)
    else:
        print("\n❌ Failed to add columns!")
        sys.exit(1)

if __name__ == "__main__":
    main()
