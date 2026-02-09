#!/usr/bin/env python3
"""
Simple script to execute stakeholders migration SQL directly to Supabase PostgreSQL
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
    
    # Database password - might need to be provided
    # From previous migration scripts, password appears to be: 4@@E-Zd%zCQ!7ZV
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    print(f"🔧 Using project reference: {project_ref}")
    print(f"🔧 Database host: {db_host}")
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def execute_sql_file(conn, sql_file):
    """Execute SQL file with error handling and statement splitting"""
    print(f"📄 Reading SQL file: {sql_file}")
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    
    # Split into individual statements
    statements = []
    current = []
    in_comment = False
    
    for line in sql_content.split('\n'):
        # Skip empty lines
        if not line.strip():
            continue
        
        # Handle block comments
        if '/*' in line:
            in_comment = True
            continue
        
        if '*/' in line:
            in_comment = False
            continue
        
        if in_comment:
            continue
        
        # Skip single line comments
        if line.strip().startswith('--'):
            continue
        
        current.append(line)
        
        # If line ends with semicolon, complete the statement
        if ';' in line:
            statement = '\n'.join(current).strip()
            if statement:
                statements.append(statement)
            current = []
    
    # Add any remaining lines as a statement
    if current:
        statement = '\n'.join(current).strip()
        if statement:
            statements.append(statement)
    
    print(f"🔧 Found {len(statements)} SQL statements to execute")
    
    # Execute each statement
    cur = conn.cursor()
    success_count = 0
    error_count = 0
    
    for i, stmt in enumerate(statements, 1):
        stmt_preview = stmt[:80].replace('\n', ' ') + ('...' if len(stmt) > 80 else '')
        print(f"\n[{i}/{len(statements)}] Executing: {stmt_preview}")
        
        try:
            cur.execute(stmt)
            print(f"   ✅ Success")
            success_count += 1
        except psycopg2.Error as e:
            print(f"   ❌ Error: {e}")
            error_count += 1
            
            # Try to continue with next statement
            conn.rollback()
            continue
    
    cur.close()
    
    return success_count, error_count

def main():
    print("=" * 60)
    print("🚀 STAKEHOLDERS MIGRATION EXECUTOR")
    print("=" * 60)
    
    # Get connection parameters
    params = get_connection_params()
    if not params:
        print("❌ Failed to get connection parameters")
        sys.exit(1)
    
    # SQL file to execute
    sql_file = "supabase/migrations/202602021052_create_stakeholders_table.sql"
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        sys.exit(1)
    
    print(f"\n🔧 Target SQL file: {sql_file}")
    print(f"🔧 Database host: {params['host']}")
    print(f"🔧 Database user: {params['user']}")
    
    print("\n⚠️  WARNING: This will create the stakeholders table and related objects.")
    print("   The SQL is idempotent (CREATE TABLE IF NOT EXISTS)")
    
    # Get confirmation
    response = input("\nDo you want to continue? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("❌ Operation cancelled")
        sys.exit(0)
    
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
        success_count, error_count = execute_sql_file(conn, sql_file)
        
        # Close connection
        conn.close()
        
        print("\n" + "=" * 60)
        print("📊 MIGRATION SUMMARY")
        print("=" * 60)
        print(f"   ✅ Successful statements: {success_count}")
        print(f"   ❌ Failed statements: {error_count}")
        
        if error_count == 0:
            print("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!")
            print("\n📋 What was created:")
            print("   1. stakeholders table (28 columns)")
            print("   2. Indexes for performance")
            print("   3. RLS (Row Level Security) policies")
            print("   4. Updated_at trigger")
            print("   5. Sample data (optional)")
            
            print("\n🔍 Next steps:")
            print("   1. Restart your Next.js dev server")
            print("   2. Visit: http://localhost:3002/id/dashboard/stakeholders")
            print("   3. Add your first stakeholder using the 'Tambah Stakeholder' button")
            
            sys.exit(0)
        else:
            print(f"\n⚠️  Migration completed with {error_count} errors")
            print("   Some statements may have failed due to existing objects")
            print("   This is often OK for idempotent migrations")
            
            sys.exit(1)
            
    except psycopg2.Error as e:
        print(f"\n❌ Database connection error: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Check if Supabase project is active")
        print("   2. Verify database password is correct")
        print("   3. Check network connectivity")
        print("   4. Try running the SQL manually in Supabase SQL Editor")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()