#!/usr/bin/env python3
"""Run migration to create ps_dokumen table"""
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
    """Execute the ps_dokumen migration"""
    migration_file = 'supabase/migrations/202602040907_create_ps_dokumen_table.sql'
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        conn.autocommit = True  # Use autocommit for DDL statements
        cursor = conn.cursor()
        
        print("\n🚀 Executing migration...")
        
        # Execute the SQL
        cursor.execute(sql_content)
        print("✅ Migration SQL executed successfully!")
        
        # Verify the table was created
        print("\n🔍 Verifying table creation...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ps_dokumen'
        """)
        table_exists = cursor.fetchone()
        
        if table_exists:
            print(f"✅ Table 'ps_dokumen' exists in database")
            
            # Check columns
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'ps_dokumen'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            print(f"✅ Table has {len(columns)} columns:")
            for col_name, data_type in columns:
                print(f"   • {col_name} ({data_type})")
            
            # Check RLS
            cursor.execute("""
                SELECT schemaname, tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = 'ps_dokumen'
            """)
            table_info = cursor.fetchone()
            if table_info:
                row_security = table_info[2]
                print(f"✅ Row Level Security: {'ENABLED' if row_security else 'DISABLED'}")
            
            # Check constraint
            cursor.execute("""
                SELECT conname, consrc 
                FROM pg_constraint 
                WHERE conname LIKE '%ps_dokumen_jenis_check%'
                AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            """)
            check_constraint = cursor.fetchone()
            if check_constraint:
                print(f"✅ Check constraint exists: {check_constraint[0]}")
        
        # Test a simple query
        print("\n🔍 Testing simple query...")
        try:
            cursor.execute("SELECT COUNT(*) FROM ps_dokumen")
            count = cursor.fetchone()[0]
            print(f"✅ Table contains {count} rows")
            
            # Verify foreign key constraint
            print("\n🔍 Verifying foreign key constraint...")
            cursor.execute("""
                SELECT 
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.table_name = 'ps_dokumen' 
                AND tc.constraint_type = 'FOREIGN KEY'
            """)
            fks = cursor.fetchall()
            if fks:
                print(f"✅ Foreign key constraints found:")
                for fk in fks:
                    print(f"   • {fk[1]} → {fk[2]}({fk[3]})")
            else:
                print("⚠️  No foreign key constraints found")
                
        except Exception as e:
            print(f"⚠️  Test query issue: {e}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 MIGRATION SUCCESSFUL!")
        print("\n📋 Next steps:")
        print("   1. The frontend should now be able to query ps_dokumen table")
        print("   2. Create storage bucket 'ps-dokumen' in Supabase Storage")
        print("   3. Restart Next.js server if needed: npm run dev")
        print("   4. Clear browser cache")
        print("   5. Visit a PS detail page to verify the error is gone")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 PS_DOKUMEN TABLE MIGRATION")
    print("=" * 60)
    print("\n⚠️  This will create the missing ps_dokumen table")
    print("   that is causing the frontend error:")
    print("   'Error fetching dokumen: {}'")
    print("\nStarting migration...")
    
    success = run_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETE!")
        print("=" * 60)
        print("\n💡 The table is now available in Supabase schema cache.")
        print("   The frontend error should be resolved.")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check database credentials")
        print("   2. Verify Supabase project is active")
        print("   3. Try running the SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()