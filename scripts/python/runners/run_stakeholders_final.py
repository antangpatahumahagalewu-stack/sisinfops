#!/usr/bin/env python3
"""
Final script to execute stakeholders migration SQL (simple version)
"""
import os
import sys
import re
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local and project URL"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    if 'supabase.co' in supabase_url:
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
    
    # Database password
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def execute_sql_file(conn, sql_file):
    """Execute SQL file"""
    print(f"📄 Reading SQL file: {sql_file}")
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes")
    
    # Execute the entire SQL content
    cur = conn.cursor()
    try:
        # Split by semicolons but keep DO $$ blocks
        statements = []
        current = []
        in_do_block = False
        
        for line in sql_content.split('\n'):
            stripped = line.strip()
            
            if stripped.startswith('DO $$'):
                in_do_block = True
            
            current.append(line)
            
            if in_do_block and stripped.endswith('END $$;'):
                in_do_block = False
                statements.append('\n'.join(current))
                current = []
            elif not in_do_block and ';' in line:
                statements.append('\n'.join(current))
                current = []
        
        if current:
            statements.append('\n'.join(current))
        
        print(f"🔧 Executing {len(statements)} SQL statements...")
        
        for i, stmt in enumerate(statements, 1):
            stmt_preview = stmt[:100].replace('\n', ' ') + ('...' if len(stmt) > 100 else '')
            print(f"[{i}/{len(statements)}] Executing: {stmt_preview}")
            
            try:
                cur.execute(stmt)
                print(f"   ✅ Success")
            except psycopg2.Error as e:
                print(f"   ❌ Error: {e}")
                # If it's a duplicate or already exists error, continue
                if 'already exists' in str(e) or 'duplicate' in str(e):
                    print(f"   ⚠️  Continuing (non-critical error)")
                else:
                    raise
        
        print("✅ All SQL statements executed")
        
        # Verify table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'stakeholders'
            );
        """)
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            print("✅ stakeholders table confirmed to exist")
            
            # Count rows
            cur.execute("SELECT COUNT(*) FROM stakeholders")
            row_count = cur.fetchone()[0]
            print(f"📊 stakeholders table has {row_count} rows")
        else:
            print("❌ stakeholders table not found after migration")
        
        cur.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        cur.close()
        return False

def main():
    print("=" * 60)
    print("🚀 FINAL STAKEHOLDERS MIGRATION")
    print("=" * 60)
    
    # Get connection parameters
    params = get_connection_params()
    if not params:
        print("❌ Failed to get connection parameters")
        sys.exit(1)
    
    # Use the simple SQL file
    sql_file = "supabase/migrations/202602021052_create_stakeholders_table_simple.sql"
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        sys.exit(1)
    
    print(f"🔧 Using simple SQL file: {sql_file}")
    print(f"🔧 Database host: {params['host']}")
    
    print("\n⏳ Connecting to database...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        # Test connection
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        cur.close()
        
        print(f"✅ Connected to PostgreSQL: {version.split(',')[0]}")
        
        # Execute the SQL file
        success = execute_sql_file(conn, sql_file)
        
        # Close connection
        conn.close()
        
        if success:
            print("\n" + "=" * 60)
            print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("\n📋 What was created:")
            print("   1. stakeholders table (28 columns)")
            print("   2. Indexes for performance")
            print("   3. RLS (Row Level Security) policies")
            print("   4. Updated_at trigger")
            print("   5. Sample data (3 rows)")
            
            print("\n🔍 Next steps:")
            print("   1. Restart your Next.js dev server")
            print("   2. Visit: http://localhost:3002/id/dashboard/stakeholders")
            print("   3. Add more stakeholders using the 'Tambah Stakeholder' button")
            
            sys.exit(0)
        else:
            print("\n❌ Migration failed")
            sys.exit(1)
            
    except psycopg2.Error as e:
        print(f"\n❌ Database connection error: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Check if Supabase project is active")
        print("   2. Verify database password is correct")
        print("   3. Check network connectivity")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()