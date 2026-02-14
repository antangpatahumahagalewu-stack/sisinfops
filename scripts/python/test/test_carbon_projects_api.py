#!/usr/bin/env python3
"""Test the carbon projects API to see what data is being returned"""
import os
import json

def test_carbon_projects_query():
    # Read .env.local to get Supabase URL and anon key
    env_path = '/home/sangumang/Documents/sisinfops/.env.local'
    with open(env_path, 'r') as f:
        content = f.read()
    
    supabase_url = ''
    supabase_anon_key = ''
    
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'').strip()
        elif line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
            supabase_anon_key = line.split('=', 1)[1].strip().strip('"\'').strip()
    
    print(f"Supabase URL: {supabase_url}")
    print(f"Anon Key: {supabase_anon_key[:20]}...")
    
    # Try to make a direct API call to Supabase REST API
    import requests
    
    headers = {
        'apikey': supabase_anon_key,
        'Authorization': f'Bearer {supabase_anon_key}',
        'Content-Type': 'application/json'
    }
    
    # Query carbon_projects table
    url = f"{supabase_url}/rest/v1/carbon_projects?select=*"
    print(f"\n🔍 Querying: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n📊 Found {len(data)} carbon projects")
            
            if data:
                print("\n📋 Sample project data:")
                for i, project in enumerate(data[:3]):
                    print(f"\nProject {i+1}:")
                    print(f"  ID: {project.get('id')}")
                    print(f"  Kode: {project.get('kode_project')}")
                    print(f"  Nama: {project.get('nama_project')}")
                    print(f"  Luas Total Ha: {project.get('luas_total_ha')}")
                    print(f"  Kabupaten: {project.get('kabupaten')}")
                    print(f"  Status: {project.get('status')}")
                    print(f"  Validation Status: {project.get('validation_status')}")
                
                # Calculate totals
                total_luas = sum(p.get('luas_total_ha') or 0 for p in data)
                kabupatens = [p.get('kabupaten') for p in data if p.get('kabupaten')]
                distinct_kab = len(set(k for k in kabupatens if k))
                
                print(f"\n📈 Totals from API response:")
                print(f"  Total Projects: {len(data)}")
                print(f"  Total Luas (Ha): {total_luas}")
                print(f"  Distinct Kabupaten: {distinct_kab}")
                print(f"  Kabupaten List: {list(set(k for k in kabupatens if k))}")
            else:
                print("❌ No data returned from API")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
    
    # Also test the database directly to compare
    print("\n" + "="*60)
    print("🔍 Comparing with direct database query...")
    
    try:
        import psycopg2
        import re
        
        match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
        if match:
            project_ref = match.group(1)
            db_host = f"db.{project_ref}.supabase.co"
            db_password = "4@@E-Zd%zCQ!7ZV"
            
            conn = psycopg2.connect(
                host=db_host, port=5432, 
                database="postgres", user="postgres", 
                password=db_password, sslmode="require"
            )
            
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*), SUM(luas_total_ha), COUNT(DISTINCT kabupaten) FROM carbon_projects")
            db_stats = cur.fetchone()
            
            print(f"\n📊 Direct database stats:")
            print(f"  Count: {db_stats[0]}")
            print(f"  Sum luas_total_ha: {db_stats[1]}")
            print(f"  Distinct kabupaten: {db_stats[2]}")
            
            cur.execute("SELECT kode_project, nama_project, luas_total_ha, kabupaten FROM carbon_projects")
            projects = cur.fetchall()
            print(f"\n📋 Database projects:")
            for p in projects:
                print(f"  {p[0]} - {p[1]}: luas={p[2]}, kabupaten={p[3]}")
            
            cur.close()
            conn.close()
            
    except Exception as e:
        print(f"❌ Database query error: {e}")

if __name__ == "__main__":
    print("="*60)
    print("🚀 TESTING CARBON PROJECTS DATA FLOW")
    print("="*60)
    test_carbon_projects_query()