#!/usr/bin/env python3
"""
Run the program schema fix migration
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv
import re

def get_db_params():
    """Get database connection parameters"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL")
        return None
    
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL")
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

def run_migration():
    """Execute the migration SQL"""
    db_params = get_db_params()
    if not db_params:
        print("❌ Cannot connect to database")
        return False
    
    # Read SQL file
    sql_file = "supabase/migrations/202602131234_fix_programs_schema.sql"
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = False  # Use transactions
        
        # Split SQL by semicolons, but be careful with DO $$ blocks
        # Instead, execute the whole file
        cur = conn.cursor()
        cur.execute(sql_content)
        
        conn.commit()
        cur.close()
        conn.close()
        
        print("✅ Migration executed successfully!")
        print("\n📋 Next steps:")
        print("   1. Restart Next.js dev server")
        print("   2. Test form at http://localhost:3000/id/dashboard/programs/new")
        print("   3. Verify programs at http://localhost:3000/id/dashboard/programs")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
        return False

def verify_fix():
    """Verify the fix was applied"""
    db_params = get_db_params()
    if not db_params:
        return
    
    try:
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()
        
        # Check columns exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'programs' 
            AND column_name IN ('jenis_program', 'kategori_hutan', 'perhutanan_sosial_id')
        """)
        cols = cur.fetchall()
        print(f"\n🔍 Columns added: {[c[0] for c in cols]}")
        
        # Check data
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(jenis_program) as with_jenis,
                COUNT(kategori_hutan) as with_kategori,
                COUNT(perhutanan_sosial_id) as with_ps
            FROM programs
        """)
        counts = cur.fetchone()
        print(f"\n📊 Data status:")
        print(f"   • Total programs: {counts[0]}")
        print(f"   • With jenis_program: {counts[1]}")
        print(f"   • With kategori_hutan: {counts[2]}")
        print(f"   • With perhutanan_sosial_id: {counts[3]}")
        
        # Check KARBON programs with kategori_hutan
        cur.execute("""
            SELECT COUNT(*) 
            FROM programs 
            WHERE program_type = 'KARBON' AND kategori_hutan IS NOT NULL
        """)
        karbon_with_kategori = cur.fetchone()[0]
        print(f"   • KARBON programs with kategori_hutan: {karbon_with_kategori}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Verification error: {e}")

if __name__ == "__main__":
    print("=" * 80)
    print("PROGRAM SCHEMA FIX MIGRATION")
    print("=" * 80)
    
    # Run migration
    success = run_migration()
    
    if success:
        print("\n" + "=" * 80)
        print("VERIFICATION")
        print("=" * 80)
        verify_fix()
        
        print("\n✅ Fix completed! Test the form now.")
    else:
        print("\n❌ Fix failed. Please check the error above.")