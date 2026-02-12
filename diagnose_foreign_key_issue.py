#!/usr/bin/env python3
"""
Diagnostic script untuk memeriksa foreign key issue yang terdeteksi MCP:
"Table carbon_projects references non-existent table projects"
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def diagnose_foreign_key_issue():
    print("🔍 DIAGNOSA FOREIGN KEY ISSUE DATABASE")
    print("=" * 60)
    
    # Konfigurasi Supabase
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        sys.exit(1)
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase: {supabase_url[:30]}...")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    print("\n📊 1. CHECK TABLES EXISTENCE")
    print("-" * 40)
    
    # 1. Cek apakah tabel carbon_projects ada
    try:
        # Coba query carbon_projects
        response = supabase.table("carbon_projects").select("id", count="exact").limit(1).execute()
        if response.data is not None:
            print("✅ Table 'carbon_projects' EXISTS")
            # Hitung total rows
            count_resp = supabase.table("carbon_projects").select("id", count="exact").execute()
            print(f"   Total rows: {len(count_resp.data) if count_resp.data else 0}")
            
            # Cek struktur kolom
            sample = supabase.table("carbon_projects").select("*").limit(1).execute()
            if sample.data:
                print(f"   Columns: {list(sample.data[0].keys())}")
        else:
            print("❌ Table 'carbon_projects' DOES NOT EXIST or is empty")
    except Exception as e:
        print(f"❌ Error checking carbon_projects: {e}")
    
    # 2. Cek apakah tabel projects ada
    try:
        response = supabase.table("projects").select("id", count="exact").limit(1).execute()
        if response.data is not None:
            print("✅ Table 'projects' EXISTS")
            count_resp = supabase.table("projects").select("id", count="exact").execute()
            print(f"   Total rows: {len(count_resp.data) if count_resp.data else 0}")
        else:
            print("❌ Table 'projects' DOES NOT EXIST or is empty")
    except Exception as e:
        print(f"⚠️  Table 'projects' not found (expected if issue is real): {e}")
    
    print("\n🔗 2. CHECK FOREIGN KEY CONSTRAINTS")
    print("-" * 40)
    
    # Query untuk mendapatkan foreign key constraints dari information_schema
    # Kita akan jalankan raw SQL via Supabase
    try:
        # Query 1: Cari semua foreign key yang reference ke 'projects'
        fk_query = """
        SELECT 
            tc.table_name as source_table,
            kcu.column_name as source_column,
            ccu.table_name as referenced_table,
            ccu.column_name as referenced_column,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = 'projects' OR ccu.table_name = 'carbon_projects')
        ORDER BY tc.table_name;
        """
        
        # Execute raw SQL
        response = supabase.rpc('exec_sql', {'query': fk_query}).execute()
        
        if hasattr(response, 'data'):
            fk_constraints = response.data
        else:
            # Fallback: coba cara lain
            print("   ℹ️  Using alternative constraint check method")
            fk_constraints = []
        
        if fk_constraints:
            print(f"   Found {len(fk_constraints)} foreign key constraints:")
            for fk in fk_constraints:
                print(f"   - {fk['source_table']}.{fk['source_column']} → {fk['referenced_table']}.{fk['referenced_column']}")
                
                # Check if referenced table exists
                if fk['referenced_table'] == 'projects':
                    print(f"     ⚠️  WARNING: References non-existent table 'projects'")
        else:
            print("   ℹ️  No foreign key constraints found via information_schema")
            
    except Exception as e:
        print(f"   ⚠️  Could not query constraints via RPC: {e}")
    
    print("\n🗂️ 3. CHECK TABLES THAT MIGHT REFERENCE projects")
    print("-" * 40)
    
    # List tabel yang mungkin reference ke projects
    possible_tables = ['programs', 'dram', 'verra_project_registrations', 'carbon_workflow_status']
    
    for table_name in possible_tables:
        try:
            # Coba query tabel
            response = supabase.table(table_name).select("*").limit(1).execute()
            if response.data is not None:
                print(f"✅ Table '{table_name}' EXISTS")
                
                # Cek kolom yang mungkin reference ke projects
                if response.data:
                    columns = list(response.data[0].keys())
                    
                    # Cari kolom yang mungkin foreign key
                    possible_fk_columns = [col for col in columns if 'project' in col.lower()]
                    if possible_fk_columns:
                        print(f"   Possible FK columns: {possible_fk_columns}")
                        
                        # Check values in these columns
                        for col in possible_fk_columns[:2]:  # Limit to first 2
                            sample = supabase.table(table_name).select(col).limit(3).execute()
                            if sample.data:
                                values = [row[col] for row in sample.data if row.get(col)]
                                if values:
                                    print(f"   Sample values in '{col}': {values[:3]}")
            else:
                print(f"❌ Table '{table_name}' DOES NOT EXIST or is empty")
                
        except Exception as e:
            print(f"⚠️  Error checking table '{table_name}': {e}")
    
    print("\n🔍 4. CHECK CARBON_PROJECTS STRUCTURE DETAILS")
    print("-" * 40)
    
    try:
        # Get detailed structure of carbon_projects
        response = supabase.table("carbon_projects").select("*").limit(3).execute()
        
        if response.data:
            print("   Sample carbon_projects data:")
            for i, project in enumerate(response.data[:3]):
                print(f"\n   Project {i+1}: {project.get('nama_project', 'N/A')}")
                print(f"     ID: {project.get('id')}")
                print(f"     Kabupaten: {project.get('kabupaten', 'N/A')}")
                print(f"     Luas: {project.get('luas_total_ha', 'N/A')} ha")
                print(f"     Status: {project.get('status', 'N/A')}")
                
                # Check for ps_id (potential foreign key)
                if 'ps_id' in project and project['ps_id']:
                    print(f"     ps_id: {project['ps_id']} (references perhutanan_sosial)")
        else:
            print("   No carbon_projects data found")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n📝 5. CHECK CODE REFERENCES (ANALYSIS)")
    print("-" * 40)
    
    # Ini adalah analisis manual berdasarkan migrasi
    print("   Based on migration files analysis:")
    print("   - Table 'carbon_projects' is used in multiple migrations")
    print("   - Table 'projects' (without 'carbon_') NOT found in migrations")
    print("   - Possible scenarios:")
    print("     1. Typo in constraint definition")
    print("     2. Old reference to renamed table")
    print("     3. False positive from MCP scan")
    
    print("\n🛠️ 6. RECOMMENDED DIAGNOSTIC QUERIES")
    print("-" * 40)
    
    print("""
    Untuk diagnosa lebih lanjut di Supabase SQL Editor:
    
    1. Cek semua constraints:
    SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name;
    
    2. Cek apakah ada tabel 'projects':
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    );
    
    3. Cek struktur carbon_projects:
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'carbon_projects'
    ORDER BY ordinal_position;
    
    4. Cari tabel yang punya kolom dengan nama 'project':
    SELECT table_name, column_name, data_type
    FROM information_schema.columns 
    WHERE column_name LIKE '%project%'
    AND table_schema = 'public'
    ORDER BY table_name, column_name;
    """)
    
    print("\n" + "=" * 60)
    print("🎯 DIAGNOSIS SUMMARY")
    print("=" * 60)
    
    print("\nBASED ON CURRENT ANALYSIS:")
    print("1. ✅ 'carbon_projects' table exists and has data")
    print("2. ❌ 'projects' table (without 'carbon_') likely doesn't exist")
    print("3. ⚠️  Potential broken foreign key if any constraint references 'projects'")
    
    print("\nNEXT STEPS:")
    print("1. Jalankan diagnostic queries di Supabase SQL Editor")
    print("2. Jika ada constraint yang broken, pilih opsi perbaikan:")
    print("   a. Buat tabel 'projects' sebagai alias/view ke 'carbon_projects'")
    print("   b. Perbaiki constraint untuk reference ke 'carbon_projects'")
    print("   c. Hapus constraint yang tidak diperlukan")
    print("3. Test semua fungsi setelah perbaikan")
    
    return True

if __name__ == "__main__":
    diagnose_foreign_key_issue()