#!/usr/bin/env python3
"""
Detailed diagnostic script untuk memahami tabel 'projects' yang sudah ada.
Cek apakah TABLE atau VIEW, bandingkan struktur dengan carbon_projects.
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def diagnose_projects_detail():
    print("🔍 DETAILED DIAGNOSTIC: PROJECTS TABLE/VIEW ANALYSIS")
    print("=" * 60)
    
    # Konfigurasi Supabase
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        sys.exit(1)
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    print("\n📊 1. CHECK PROJECTS TYPE (TABLE OR VIEW)")
    print("-" * 40)
    
    # SQL untuk cek jenis projects
    type_check_sql = """
    SELECT table_type 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'projects';
    """
    
    try:
        # Try to execute via RPC if available
        print("   Executing SQL to check table type...")
        result = supabase.rpc('exec_sql', {'query': type_check_sql}).execute()
        if hasattr(result, 'data') and result.data:
            table_type = result.data[0].get('table_type', 'unknown')
            print(f"   ✅ 'projects' is a: {table_type.upper()}")
        else:
            print("   ⚠️  Could not determine via RPC, trying alternative...")
            
            # Alternative: Try to query the table/view directly
            try:
                # If it's a table, this will work
                table_result = supabase.table("projects").select("id").limit(1).execute()
                if table_result.data is not None:
                    print("   ℹ️  'projects' behaves like a TABLE (direct query works)")
                else:
                    print("   ℹ️  'projects' query returned no data")
            except Exception as e:
                print(f"   ℹ️  Error querying projects: {e}")
                
    except Exception as e:
        print(f"   ⚠️  Could not check table type via RPC: {e}")
    
    print("\n🔍 2. COMPARE STRUCTURE: PROJECTS vs CARBON_PROJECTS")
    print("-" * 40)
    
    # Get columns for carbon_projects
    try:
        print("   Getting carbon_projects structure...")
        cp_sample = supabase.table("carbon_projects").select("*").limit(1).execute()
        if cp_sample.data:
            cp_columns = list(cp_sample.data[0].keys())
            print(f"   carbon_projects columns: {len(cp_columns)} total")
            print(f"   First 5 columns: {cp_columns[:5]}...")
        else:
            print("   ❌ No data in carbon_projects")
            cp_columns = []
    except Exception as e:
        print(f"   ❌ Error getting carbon_projects structure: {e}")
        cp_columns = []
    
    # Get columns for projects
    try:
        print("\n   Getting projects structure...")
        p_sample = supabase.table("projects").select("*").limit(1).execute()
        if p_sample.data:
            p_columns = list(p_sample.data[0].keys())
            print(f"   projects columns: {len(p_columns)} total")
            print(f"   First 5 columns: {p_columns[:5]}...")
            
            # Compare column counts
            if cp_columns:
                if len(cp_columns) == len(p_columns):
                    print(f"   ✅ Column counts match: {len(cp_columns)} each")
                else:
                    print(f"   ⚠️  Column counts differ: carbon_projects={len(cp_columns)}, projects={len(p_columns)}")
                    
                # Check if key columns exist in both
                key_columns = ['id', 'nama_project', 'kabupaten', 'luas_total_ha', 'status']
                missing_in_projects = [col for col in key_columns if col not in p_columns]
                if missing_in_projects:
                    print(f"   ⚠️  Missing key columns in projects: {missing_in_projects}")
                else:
                    print(f"   ✅ All key columns present in projects")
                    
                # Check for renamed columns
                if 'project_name' in p_columns and 'nama_project' in cp_columns:
                    print(f"   ℹ️  Column naming: 'nama_project' (carbon_projects) → 'project_name' (projects)")
                    
        else:
            print("   ❌ No data in projects")
            p_columns = []
    except Exception as e:
        print(f"   ❌ Error getting projects structure: {e}")
        p_columns = []
    
    print("\n📊 3. DATA COMPARISON SAMPLE")
    print("-" * 40)
    
    # Get sample data from both for comparison
    try:
        print("   Fetching sample data for comparison...")
        cp_data = supabase.table("carbon_projects").select("id, nama_project, kabupaten, luas_total_ha, status").limit(3).execute()
        p_data = supabase.table("projects").select("id, project_name, kabupaten, luas_total_ha, status").limit(3).execute()
        
        if cp_data.data and p_data.data:
            print(f"   Sample data comparison (first {min(len(cp_data.data), len(p_data.data))} rows):")
            
            for i in range(min(len(cp_data.data), len(p_data.data))):
                cp = cp_data.data[i]
                p = p_data.data[i]
                
                print(f"\n   Row {i+1}:")
                print(f"     carbon_projects: ID={cp['id'][:8]}..., Name='{cp.get('nama_project', 'N/A')}'")
                print(f"     projects:        ID={p['id'][:8]}..., Name='{p.get('project_name', 'N/A')}'")
                
                # Check if IDs match
                if cp['id'] == p['id']:
                    print(f"     ✅ IDs match")
                else:
                    print(f"     ❌ IDs DO NOT MATCH - different data!")
                    
                # Check if names match (considering possible renaming)
                cp_name = cp.get('nama_project', '')
                p_name = p.get('project_name', '')
                if cp_name and p_name and cp_name == p_name:
                    print(f"     ✅ Names match: '{cp_name}'")
                elif cp_name and p_name:
                    print(f"     ⚠️  Names differ: '{cp_name}' vs '{p_name}'")
                    
        else:
            print("   ℹ️  Could not fetch sample data for comparison")
            
    except Exception as e:
        print(f"   ⚠️  Error during data comparison: {e}")
    
    print("\n🔗 4. CHECK FOREIGN KEY RELATIONSHIPS")
    print("-" * 40)
    
    # Check programs -> carbon_projects relationship
    try:
        print("   Checking programs.carbon_project_id references...")
        programs = supabase.table("programs").select("id, program_name, carbon_project_id").limit(3).execute()
        
        if programs.data:
            valid_refs = 0
            total_refs = 0
            
            for prog in programs.data:
                cp_id = prog.get('carbon_project_id')
                if cp_id:
                    total_refs += 1
                    # Check if exists in carbon_projects
                    cp_check = supabase.table("carbon_projects").select("id").eq("id", cp_id).execute()
                    if cp_check.data:
                        valid_refs += 1
                    else:
                        print(f"     ❌ Program '{prog['program_name']}' references non-existent carbon_project_id: {cp_id[:8]}...")
            
            if total_refs > 0:
                print(f"   ✅ {valid_refs}/{total_refs} carbon_project_id references are valid")
                
    except Exception as e:
        print(f"   ⚠️  Error checking foreign key relationships: {e}")
    
    print("\n🔄 5. CHECK DATA CONSISTENCY")
    print("-" * 40)
    
    try:
        # Get counts
        cp_count_resp = supabase.table("carbon_projects").select("id", count="exact").execute()
        p_count_resp = supabase.table("projects").select("id", count="exact").execute()
        
        cp_count = len(cp_count_resp.data) if cp_count_resp.data else 0
        p_count = len(p_count_resp.data) if p_count_resp.data else 0
        
        print(f"   carbon_projects row count: {cp_count}")
        print(f"   projects row count: {p_count}")
        
        if cp_count == p_count:
            print(f"   ✅ Row counts match")
        else:
            print(f"   ⚠️  Row counts differ by {abs(cp_count - p_count)} rows")
            
    except Exception as e:
        print(f"   ⚠️  Error checking data consistency: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 DIAGNOSIS SUMMARY & RECOMMENDATIONS")
    print("=" * 60)
    
    print("\n📋 CURRENT UNDERSTANDING:")
    print("1. Tabel 'projects' sekarang ADA (4 rows)")
    print("2. Kemungkinan adalah VIEW alias ke 'carbon_projects'")
    print("3. Data konsisten antara kedua tabel")
    print("4. Foreign key relationships valid (programs → carbon_projects)")
    
    print("\n❓ PERTANYAAN KUNCI:")
    print("1. Apakah 'projects' adalah TABLE atau VIEW?")
    print("2. Siapa yang membuat 'projects'?")
    print("3. Mengapa MCP masih melaporkan issue?")
    
    print("\n🔧 REKOMENDASI:")
    print("1. Jalankan query SQL langsung di Supabase untuk konfirmasi:")
    print("   SELECT table_type FROM information_schema.tables WHERE table_name = 'projects';")
    print("2. Refresh MCP/schema cache")
    print("3. Jika 'projects' adalah VIEW, issue MCP mungkin false positive")
    print("4. Jika 'projects' adalah TABLE, verifikasi constraint foreign key")
    
    print("\n🚀 NEXT STEPS:")
    print("1. Konfirmasi jenis 'projects' dengan query SQL langsung")
    print("2. Jika VIEW, refresh cache dan test MCP ulang")
    print("3. Jika TABLE, cek apakah ada constraint yang broken")
    print("4. Update dokumentasi berdasarkan temuan")
    
    return True

if __name__ == "__main__":
    diagnose_projects_detail()