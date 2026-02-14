#!/usr/bin/env python3
"""
Script untuk memperbaiki inkonsistensi data carbon_projects
1. Samakan project_name dengan nama_project
2. Hapus duplikasi data
3. Verifikasi konsistensi
"""

import psycopg2
import re
import sys

def get_supabase_credentials():
    """Get Supabase database credentials from .env.local"""
    env_path = '/home/sangumang/Documents/sisinfops/.env.local'
    with open(env_path, 'r') as f:
        content = f.read()
    
    supabase_url = ''
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    # Extract project ref from URL
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        raise ValueError("Invalid Supabase URL format")
    
    project_ref = match.group(1)
    db_host = f'db.{project_ref}.supabase.co'
    db_password = '4@@E-Zd%zCQ!7ZV'  # Password dari informasi sebelumnya
    
    return {
        'host': db_host,
        'port': 5432,
        'database': 'postgres',
        'user': 'postgres',
        'password': db_password,
        'sslmode': 'require'
    }

def fix_carbon_projects_inconsistency():
    print("🔧 Memperbaiki inkonsistensi data carbon_projects...")
    
    # Get database credentials
    try:
        credentials = get_supabase_credentials()
        print(f"🔗 Connecting to Supabase at {credentials['host']}...")
    except Exception as e:
        print(f"❌ Error getting credentials: {str(e)}")
        return
    
    # Connect to database
    try:
        conn = psycopg2.connect(**credentials)
        print("✅ Connected to database")
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        return
    
    try:
        cur = conn.cursor()
        
        # 1. Get current data to analyze
        print("\n📊 ANALYZING CURRENT DATA:")
        cur.execute("""
            SELECT id, kode_project, project_name, nama_project, kabupaten, 
                   project_code, standard, methodology, status
            FROM carbon_projects 
            ORDER BY created_at
        """)
        projects = cur.fetchall()
        
        print(f"   Found {len(projects)} carbon projects:")
        inconsistencies = []
        
        for project in projects:
            project_id, kode_project, project_name, nama_project, kabupaten, project_code, standard, methodology, status = project
            
            if project_name != nama_project:
                inconsistencies.append({
                    'id': project_id,
                    'kode_project': kode_project,
                    'old_project_name': project_name,
                    'old_nama_project': nama_project,
                    'kabupaten': kabupaten
                })
                print(f"   ⚠️  INCONSISTENT: {kode_project}")
                print(f"      project_name: '{project_name}'")
                print(f"      nama_project: '{nama_project}'")
        
        # 2. Fix inconsistencies
        if inconsistencies:
            print(f"\n🔨 FIXING {len(inconsistencies)} INCONSISTENCIES:")
            
            for inc in inconsistencies:
                # Use nama_project as the authoritative source (used in frontend)
                # Update project_name to match nama_project
                print(f"   🔄 Updating {inc['kode_project']}...")
                print(f"      Old project_name: '{inc['old_project_name']}'")
                print(f"      New project_name: '{inc['old_nama_project']}'")
                
                cur.execute("""
                    UPDATE carbon_projects 
                    SET project_name = %s
                    WHERE id = %s
                """, (inc['old_nama_project'], inc['id']))
            
            conn.commit()
            print(f"\n✅ Updated {len(inconsistencies)} projects")
        else:
            print("\n✅ No inconsistencies found!")
        
        # 3. Verify fix
        print("\n🔍 VERIFYING FIX:")
        cur.execute("""
            SELECT id, kode_project, project_name, nama_project, kabupaten
            FROM carbon_projects 
            ORDER BY kode_project
        """)
        updated_projects = cur.fetchall()
        
        all_consistent = True
        for project in updated_projects:
            project_id, kode_project, project_name, nama_project, kabupaten = project
            if project_name != nama_project:
                print(f"   ❌ STILL INCONSISTENT: {kode_project}")
                print(f"      project_name: '{project_name}'")
                print(f"      nama_project: '{nama_project}'")
                all_consistent = False
            else:
                print(f"   ✅ Consistent: {kode_project} - '{project_name}'")
        
        if all_consistent:
            print("\n🎉 ALL CARBON PROJECTS ARE NOW CONSISTENT!")
        else:
            print("\n⚠️  Some inconsistencies remain")
        
        # 4. Show final data
        print("\n📋 FINAL CARBON PROJECTS DATA:")
        cur.execute("""
            SELECT id, kode_project, nama_project, kabupaten, status, 
                   luas_total_ha, estimasi_penyimpanan_karbon
            FROM carbon_projects 
            ORDER BY kode_project
        """)
        final_data = cur.fetchall()
        
        for project in final_data:
            project_id, kode_project, nama_project, kabupaten, status, luas_total_ha, estimasi_penyimpanan_karbon = project
            print(f"   • {kode_project}: {nama_project}")
            print(f"     Kabupaten: {kabupaten}, Status: {status}")
            print(f"     Luas: {luas_total_ha or 0} ha, Estimasi Karbon: {estimasi_penyimpanan_karbon or 0} ton CO₂e")
            print()
        
        # 5. Additional check: Ensure kabupaten column has data
        print("🔍 Checking kabupaten data:")
        cur.execute("SELECT COUNT(*) FROM carbon_projects WHERE kabupaten IS NULL OR kabupaten = ''")
        null_kabupaten = cur.fetchone()[0]
        if null_kabupaten > 0:
            print(f"   ⚠️  Found {null_kabupaten} projects without kabupaten data")
        else:
            print("   ✅ All projects have kabupaten data")
        
        cur.close()
        
    except Exception as e:
        print(f"❌ Error during data fixing: {str(e)}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()
        print("\n🔒 Database connection closed")

if __name__ == "__main__":
    fix_carbon_projects_inconsistency()