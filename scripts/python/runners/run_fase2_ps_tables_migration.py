#!/usr/bin/env python3
"""Run Fase 2 PS tables migration"""
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
    """Execute the Fase 2 PS tables migration"""
    migration_file = 'supabase/migrations/202602040942_create_ps_tables_fase2.sql'
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    print("\n⚠️  This will create 4 missing PS tables:")
    print("   • ps_catatan - Catatan lapangan")
    print("   • ps_peta - Peta PS")
    print("   • ps_galeri - Galeri gambar")
    print("   • ps_lahan - Data lahan")
    print("   • Sample data for testing")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        conn.autocommit = True  # Use autocommit for DDL statements
        cursor = conn.cursor()
        
        print("\n🚀 Executing Fase 2 PS tables migration...")
        
        # Execute the SQL
        cursor.execute(sql_content)
        print("✅ Fase 2 migration SQL executed successfully!")
        
        # Verify the tables were created
        print("\n🔍 Verifying table creation...")
        tables_to_check = [
            'ps_catatan',
            'ps_peta', 
            'ps_galeri',
            'ps_lahan'
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
        
        # Show sample data
        print("\n📋 Sample data summary:")
        cursor.execute("SELECT COUNT(*), 'ps_catatan' FROM ps_catatan UNION ALL SELECT COUNT(*), 'ps_peta' FROM ps_peta UNION ALL SELECT COUNT(*), 'ps_lahan' FROM ps_lahan")
        counts = cursor.fetchall()
        for count, table in counts:
            print(f"   • {table}: {count} records")
        
        # Check RLS status
        print("\n🔍 Checking RLS status...")
        for table in tables_to_check:
            cursor.execute(f"""
                SELECT tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = '{table}'
            """)
            rls_status = cursor.fetchone()
            if rls_status:
                table_name, rowsecurity = rls_status
                print(f"   • {table_name}: RLS {'ENABLED' if rowsecurity else 'DISABLED'}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 FASE 2 MIGRATION SUCCESSFUL!")
        print("\n📋 Frontend impact:")
        print("   1. PS detail page → Catatan tab will now work")
        print("   2. PS detail page → Peta tab will now work")
        print("   3. PS detail page → Galeri tab will now work")
        print("   4. PS detail page → Lahan tab will now work")
        print("   5. No more console errors for these tabs")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 FASE 2: PS TABLES MIGRATION")
    print("=" * 60)
    print("\n⚠️  This will fix console errors in PS detail tabs:")
    print("   • 'Error fetching catatan: {}'")
    print("   • 'Error fetching peta: {}'")
    print("   • 'Error fetching galeri: {}'")
    print("   • 'Error fetching lahan: {}'")
    print("\nStarting migration...")
    
    success = run_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ FASE 2 MIGRATION COMPLETE!")
        print("=" * 60)
        print("\n💡 All PS detail page tabs should now work.")
        print("   Combined with earlier fixes:")
        print("   • Kegiatan tab ✅ (ps_kegiatan)")
        print("   • Kelembagaan tab ✅ (lembaga_pengelola)")
        print("   • Dokumen tab ✅ (ps_dokumen)")
        print("   • Catatan tab ✅ (ps_catatan)")
        print("   • Peta tab ✅ (ps_peta)")
        print("   • Galeri tab ✅ (ps_galeri)")
        print("   • Lahan tab ✅ (ps_lahan)")
        print("\n📋 Final step: Restart Next.js dev server: npm run dev")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ FASE 2 MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check if tables already exist")
        print("   2. Verify database credentials")
        print("   3. Try running the SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()