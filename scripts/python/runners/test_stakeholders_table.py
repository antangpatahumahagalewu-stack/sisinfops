#!/usr/bin/env python3
"""
Test if stakeholders table exists
"""
import os
import sys
import re
import psycopg2

def get_connection_params():
    """Get connection parameters from .env.local"""
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
    
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def main():
    print("🔍 Testing stakeholders table existence...")
    
    params = get_connection_params()
    if not params:
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        
        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'stakeholders'
            );
        """)
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            print("✅ stakeholders table EXISTS")
            
            # Get column count
            cur.execute("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'stakeholders'
            """)
            column_count = cur.fetchone()[0]
            print(f"📊 Column count: {column_count}")
            
            # Get row count
            cur.execute("SELECT COUNT(*) FROM stakeholders")
            row_count = cur.fetchone()[0]
            print(f"📊 Row count: {row_count}")
            
            # Get sample data
            cur.execute("SELECT nama_stakeholder, kategori, fpic_status FROM stakeholders LIMIT 5")
            rows = cur.fetchall()
            print(f"📋 Sample data ({len(rows)} rows):")
            for row in rows:
                print(f"   - {row[0]} ({row[1]}, FPIC: {row[2]})")
        else:
            print("❌ stakeholders table does NOT exist")
            
            # Check if uuid_generate_v4 function exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM pg_proc 
                    WHERE proname = 'uuid_generate_v4'
                );
            """)
            uuid_func_exists = cur.fetchone()[0]
            print(f"📊 uuid_generate_v4 function exists: {uuid_func_exists}")
            
            # Check if profiles table exists (for RLS)
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'profiles'
                );
            """)
            profiles_table_exists = cur.fetchone()[0]
            print(f"📊 profiles table exists: {profiles_table_exists}")
        
        cur.close()
        conn.close()
        
        print("\n📊 Database status check completed")
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()