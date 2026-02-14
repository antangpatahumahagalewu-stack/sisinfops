#!/usr/bin/env python3
"""
Check carbon_projects data
"""
import os
import sys
import psycopg2
import json

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

def check_data():
    """Check carbon_projects data"""
    params = get_connection_params()
    if not params:
        return
    
    print("🔍 Checking carbon_projects data...")
    
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        
        # Check carbon_projects table
        cur.execute("""
            SELECT 
                id, 
                kode_project,
                nama_project,
                kabupaten,
                luas_total_ha,
                real_investment_total,
                avg_investment_per_ha,
                investment_calculation_method,
                ps_id
            FROM carbon_projects
            ORDER BY created_at DESC
        """)
        
        carbon_projects = cur.fetchall()
        colnames = [desc[0] for desc in cur.description]
        
        print(f"\n📊 Found {len(carbon_projects)} carbon projects:")
        print("-" * 80)
        for row in carbon_projects:
            print(f"\n• {row[2]} ({row[1]})")
            print(f"  Kabupaten: {row[3]}")
            print(f"  Luas: {row[4]:,.2f} ha")
            print(f"  Real investment: Rp {row[5]:,.0f}" if row[5] else "  Real investment: None")
            print(f"  Avg per ha: Rp {row[6]:,.0f}" if row[6] else "  Avg per ha: None")
            print(f"  Calculation method: {row[7]}")
            print(f"  PS ID: {row[8]}")
        
        # Check perhutanan_sosial to see which kabupaten have carbon projects
        print(f"\n🔍 Checking perhutanan_sosial linked to carbon projects...")
        cur.execute("""
            SELECT 
                cp.id as carbon_project_id,
                cp.nama_project,
                ps.id as ps_id,
                ps.nama_lembaga,
                ps.kabupaten_id,
                k.nama as kabupaten_nama,
                ps.luas_ha
            FROM carbon_projects cp
            LEFT JOIN perhutanan_sosial ps ON cp.ps_id = ps.id
            LEFT JOIN kabupaten k ON ps.kabupaten_id = k.id
            ORDER BY cp.created_at DESC
        """)
        
        linked_data = cur.fetchall()
        print(f"\n📊 Found {len(linked_data)} links between carbon_projects and perhutanan_sosial:")
        for row in linked_data:
            print(f"\n  • Carbon Project: {row[1]}")
            print(f"    PS: {row[3]} (Luas: {row[6]:,.2f} ha)")
            print(f"    Kabupaten: {row[5]}")
        
        # Check API logic - find kabupaten with carbon projects based on ps_id links
        print(f"\n🔍 Checking which kabupaten have carbon projects (based on ps_id links):")
        cur.execute("""
            SELECT DISTINCT 
                k.id,
                k.nama,
                SUM(ps.luas_ha) as total_luas_ha
            FROM carbon_projects cp
            JOIN perhutanan_sosial ps ON cp.ps_id = ps.id
            JOIN kabupaten k ON ps.kabupaten_id = k.id
            GROUP BY k.id, k.nama
            ORDER BY k.nama
        """)
        
        kabupaten_with_carbon = cur.fetchall()
        print(f"\n📊 Kabupaten with carbon projects (via ps_id links): {len(kabupaten_with_carbon)}")
        for row in kabupaten_with_carbon:
            print(f"  • {row[1]}: {row[2]:,.2f} ha")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_data()