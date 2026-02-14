#!/usr/bin/env python3
"""
Check carbon_projects table structure
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env.local')

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
    
    # Extract project reference
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    # Use the database password (from existing script)
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def check_table_structure():
    """Check carbon_projects table structure"""
    params = get_connection_params()
    if not params:
        return
    
    print("🔍 Checking carbon_projects table structure...")
    
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        
        # Get column information
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'carbon_projects'
            ORDER BY ordinal_position
        """)
        
        columns = cur.fetchall()
        print(f"\n📊 carbon_projects has {len(columns)} columns:")
        print("-" * 80)
        for col_name, data_type, is_nullable, column_default in columns:
            default_str = f" (default: {column_default})" if column_default else ""
            print(f"  • {col_name:30} {data_type:20} {'NULL' if is_nullable == 'YES' else 'NOT NULL'}{default_str}")
        
        # Check sample data
        print(f"\n📊 Sample data from carbon_projects:")
        cur.execute("SELECT * FROM carbon_projects LIMIT 1")
        colnames = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        
        print(f"  Columns: {', '.join(colnames)}")
        if row:
            print(f"  Sample row has {len(row)} values")
            for i, (col, val) in enumerate(zip(colnames, row)):
                print(f"    {i+1:2}. {col:30}: {val}")
        
        # Check if certain columns exist
        check_columns = ['standar_karbon', 'metodologi', 'kabupaten', 'luas_total_ha', 'investment_amount']
        for col in check_columns:
            cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'carbon_projects' AND column_name = %s
                )
            """, (col,))
            exists = cur.fetchone()[0]
            print(f"\n  Column '{col}': {'✅ EXISTS' if exists else '❌ DOES NOT EXIST'}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_table_structure()