#!/usr/bin/env python3
"""Run ps_kegiatan table migration"""
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
    """Execute the ps_kegiatan migration"""
    migration_file = 'supabase/migrations/202602040930_create_ps_kegiatan_table.sql'
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    print("\n⚠️  This will create ps_kegiatan table for kegiatan tab:")
    print("   • Table for storing PS activities/kegiatan")
    print("   • Foreign key to perhutanan_sosial")
    print("   • Sample data for testing")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        conn.autocommit = True  # Use autocommit for DDL statements
        cursor = conn.cursor()
        
        print("\n🚀 Executing ps_kegiatan migration...")
        
        # Execute the SQL
        cursor.execute(sql_content)
        print("✅ ps_kegiatan migration SQL executed successfully!")
        
        # Verify the table was created
        print("\n🔍 Verifying table creation...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ps_kegiatan'
        """)
        table_exists = cursor.fetchone()
        
        if table_exists:
            # Count rows
            cursor.execute("SELECT COUNT(*) FROM ps_kegiatan")
            count = cursor.fetchone()[0]
            print(f"✅ Table 'ps_kegiatan' exists ({count} rows)")
            
            # Show sample data
            cursor.execute("SELECT nama_kegiatan, status, tanggal_mulai FROM ps_kegiatan LIMIT 3")
            samples = cursor.fetchall()
            print(f"📋 Sample kegiatan:")
            for i, (nama, status, tanggal) in enumerate(samples, 1):
                print(f"   {i}. {nama} - {status} - {tanggal}")
        else:
            print(f"❌ Table 'ps_kegiatan' not found")
        
        # Check RLS status
        print("\n🔍 Checking RLS status...")
        cursor.execute("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'ps_kegiatan'
        """)
        rls_status = cursor.fetchone()
        if rls_status:
            table, rowsecurity = rls_status
            print(f"   • {table}: RLS {'ENABLED' if rowsecurity else 'DISABLED'}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 PS_KEGIATAN MIGRATION SUCCESSFUL!")
        print("\n📋 Frontend impact:")
        print("   1. PS detail page → Kegiatan tab will now work")
        print("   2. No more 'Error fetching kegiatan: {}' console error")
        print("   3. Sample data available for testing")
        print("   4. CRUD operations supported")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 PS_KEGIATAN TABLE MIGRATION")
    print("=" * 60)
    print("\n⚠️  This will fix console error:")
    print("   • 'Error fetching kegiatan: {}' in tab-kegiatan.tsx")
    print("\nStarting migration...")
    
    success = run_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ PS_KEGIATAN MIGRATION COMPLETE!")
        print("=" * 60)
        print("\n💡 Kegiatan tab should now work without console errors.")
        print("   Restart Next.js dev server if needed: npm run dev")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ PS_KEGIATAN MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check if table already exists")
        print("   2. Verify database credentials")
        print("   3. Try running the SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()