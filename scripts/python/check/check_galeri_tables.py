#!/usr/bin/env python3
"""Check galeri and ps_galeri tables existence"""

import os
import sys
import psycopg2
import re
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local"""
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
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference from URL
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
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

def check_tables():
    """Check existence of galeri and ps_galeri tables"""
    params = get_connection_params()
    if not params:
        return False
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("🔍 Checking table existence...")
        
        # Check ps_galeri (table referenced in frontend)
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ps_galeri'
            )
        """)
        ps_galeri_exists = cur.fetchone()[0]
        
        # Check galeri (simple table we created)
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'galeri'
            )
        """)
        galeri_exists = cur.fetchone()[0]
        
        # Check ps-galeri (with dash)
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ps-galeri'
            )
        """)
        ps_dash_galeri_exists = cur.fetchone()[0]
        
        print(f"📊 Table Status:")
        print(f"   • ps_galeri (frontend expects): {'✅' if ps_galeri_exists else '❌'}")
        print(f"   • galeri (simple table): {'✅' if galeri_exists else '❌'}")
        print(f"   • ps-galeri (with dash): {'✅' if ps_dash_galeri_exists else '❌'}")
        
        # Check columns if ps_galeri exists
        if ps_galeri_exists:
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'ps_galeri'
                ORDER BY ordinal_position
            """)
            columns = cur.fetchall()
            print(f"\n📋 ps_galeri columns ({len(columns)}):")
            for col_name, data_type in columns:
                print(f"   • {col_name} ({data_type})")
        
        # Check columns if galeri exists
        if galeri_exists:
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'galeri'
                ORDER BY ordinal_position
            """)
            columns = cur.fetchall()
            print(f"\n📋 galeri columns ({len(columns)}):")
            for col_name, data_type in columns:
                print(f"   • {col_name} ({data_type})")
        
        # Check RLS policies
        if ps_galeri_exists:
            cur.execute("""
                SELECT schemaname, tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = 'ps_galeri'
            """)
            table_info = cur.fetchone()
            if table_info:
                row_security = table_info[2]
                print(f"\n🔒 ps_galeri RLS: {'ENABLED' if row_security else 'DISABLED'}")
        
        # Count rows
        if ps_galeri_exists:
            cur.execute("SELECT COUNT(*) FROM ps_galeri")
            count = cur.fetchone()[0]
            print(f"📊 ps_galeri row count: {count}")
        
        if galeri_exists:
            cur.execute("SELECT COUNT(*) FROM galeri")
            count = cur.fetchone()[0]
            print(f"📊 galeri row count: {count}")
        
        cur.close()
        conn.close()
        
        return ps_galeri_exists
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_ps_galeri_table():
    """Create ps_galeri table if it doesn't exist"""
    params = get_connection_params()
    if not params:
        return False
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("\n🚀 Creating ps_galeri table...")
        
        # Create table matching frontend expectations
        sql = """
        CREATE TABLE IF NOT EXISTS ps_galeri (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            perhutanan_sosial_id UUID,
            judul VARCHAR(255),
            deskripsi TEXT,
            foto_url TEXT,
            foto_thumbnail_url TEXT,
            tanggal_foto DATE,
            lokasi VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_ps_galeri_perhutanan_sosial_id 
        ON ps_galeri(perhutanan_sosial_id);
        
        -- Grant permissions
        GRANT ALL ON ps_galeri TO anon, authenticated;
        """
        
        cur.execute(sql)
        print("✅ ps_galeri table created")
        
        # Verify creation
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ps_galeri'
            )
        """)
        created = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return created
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🔧 CHECKING GALERI TABLES")
    print("=" * 60)
    
    # Check current status
    ps_galeri_exists = check_tables()
    
    if not ps_galeri_exists:
        print("\n⚠️  ps_galeri table missing. Creating...")
        success = create_ps_galeri_table()
        
        if success:
            print("\n✅ Table created successfully!")
            print("💡 Next steps:")
            print("   1. Restart Next.js dev server")
            print("   2. Clear browser cache")
            print("   3. Test PS detail page galeri tab")
        else:
            print("\n❌ Failed to create table")
    else:
        print("\n✅ ps_galeri table exists!")
        print("\n🔧 If frontend still shows error:")
        print("   1. Refresh schema cache: SELECT pg_notify('pgrst', 'reload schema');")
        print("   2. Restart Next.js dev server")
        print("   3. Clear browser cache")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()