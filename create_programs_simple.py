#!/usr/bin/env python3
"""
Script sederhana untuk membuat program yang terhubung dengan carbon projects.
Menggunakan struktur tabel yang paling dasar.
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv('.env.local')

# Template program
PROGRAM_TEMPLATES = [
    {
        "name": "Perlindungan Hutan dan Pencegahan Deforestasi",
        "type": "carbon",
        "description": "Program untuk mencegah deforestasi dan degradasi hutan"
    },
    {
        "name": "Peningkatan Serapan Karbon melalui Rehabilitasi Hutan",
        "type": "carbon",
        "description": "Program rehabilitasi hutan untuk meningkatkan serapan karbon"
    },
    {
        "name": "Pengembangan Mata Pencaharian Berbasis Hasil Hutan Bukan Kayu",
        "type": "livelihood",
        "description": "Program pemberdayaan ekonomi masyarakat berbasis hasil hutan bukan kayu"
    },
    {
        "name": "Pengembangan Pemasaran Produk Hutan Berkelanjutan",
        "type": "livelihood",
        "description": "Program pengembangan pemasaran produk hasil hutan berkelanjutan"
    },
    {
        "name": "Peningkatan Kapasitas Masyarakat dalam Pengelolaan Hutan",
        "type": "capacity_building",
        "description": "Program peningkatan kapasitas masyarakat dalam pengelolaan hutan berkelanjutan"
    },
    {
        "name": "Program Pendukung Keberlanjutan Proyek Karbon",
        "type": "conservation",
        "description": "Program pendukung untuk memastikan keberlanjutan proyek karbon"
    }
]

def main():
    print("🚀 CREATING PROGRAMS FOR CARBON PROJECTS (SIMPLE VERSION)")
    print("=" * 70)
    
    # Initialize Supabase client
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        sys.exit(1)
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        sys.exit(1)
    
    # Get carbon projects
    try:
        cp_response = supabase.table("carbon_projects").select("id, kode_project, nama_project, kabupaten").execute()
        carbon_projects = cp_response.data
        print(f"📊 Found {len(carbon_projects)} carbon projects")
    except Exception as e:
        print(f"❌ Error fetching carbon projects: {e}")
        sys.exit(1)
    
    # Get one perhutanan sosial
    try:
        ps_response = supabase.table("perhutanan_sosial").select("id, pemegang_izin, desa").limit(1).execute()
        if ps_response.data:
            ps_data = ps_response.data[0]
            print(f"📋 Using perhutanan sosial: {ps_data['pemegang_izin']} - {ps_data['desa']}")
        else:
            print("❌ No perhutanan sosial found")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error fetching perhutanan sosial: {e}")
        sys.exit(1)
    
    print("\n📋 CREATING PROGRAMS:")
    print("-" * 70)
    
    created_count = 0
    failed_count = 0
    
    for cp_idx, carbon_project in enumerate(carbon_projects):
        print(f"\n🌳 CARBON PROJECT: {carbon_project['kode_project']}")
        print(f"   {carbon_project['nama_project']}")
        
        for prog_idx, template in enumerate(PROGRAM_TEMPLATES):
            program_num = cp_idx * 6 + prog_idx + 1
            program_code = f"PRG-{carbon_project['kode_project'].split('-')[1]}-{prog_idx+1:03d}"
            
            print(f"   {prog_idx+1}. {program_code}: {template['name']}")
            
            # Prepare program data - minimal version based on schema
            program_data = {
                "program_code": program_code,
                "program_name": f"{template['name']} - {carbon_project['kode_project']}",
                "program_type": template["type"],
                "description": template["description"],
                "status": "planning",
                "budget": 500000000 if template["type"] == "carbon" else 250000000
            }
            
            # Try to add additional fields if they exist
            try:
                # Try inserting with minimal data first
                response = supabase.table("programs").insert(program_data).execute()
                
                if response.data:
                    created_count += 1
                    print(f"      ✅ Created successfully!")
                    
                    # Try to update with carbon_project_id if the column exists
                    try:
                        update_data = {
                            "carbon_project_id": carbon_project["id"],
                            "perhutanan_sosial_id": ps_data["id"]
                        }
                        supabase.table("programs").update(update_data).eq("id", response.data[0]["id"]).execute()
                        print(f"      ✅ Linked to carbon project and PS")
                    except Exception as update_error:
                        print(f"      ⚠️  Created but could not link: {str(update_error)[:100]}")
                else:
                    failed_count += 1
                    print(f"      ❌ Failed: No data returned")
                    
            except Exception as e:
                failed_count += 1
                error_msg = str(e)
                if "duplicate key" in error_msg.lower():
                    print(f"      ⚠️  Already exists")
                else:
                    print(f"      ❌ Failed: {error_msg[:100]}...")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 CREATION SUMMARY:")
    print(f"   ✅ Successfully created: {created_count} programs")
    print(f"   ❌ Failed: {failed_count} programs")
    
    if created_count > 0:
        print("\n🎉 PROGRAMS CREATED SUCCESSFULLY!")
        print("\n📋 VERIFICATION:")
        print("Run: python3 -c \"")
        print("import os")
        print("from supabase import create_client")
        print("from dotenv import load_dotenv")
        print("load_dotenv('.env.local')")
        print("supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))")
        print("resp = supabase.table('programs').select('program_code, program_name, carbon_project_id').execute()")
        print("print(f'Total programs: {len(resp.data)}')")
        print("print('Programs with carbon_project_id:', len([p for p in resp.data if p.get('carbon_project_id')]))")
        print("\"")
    else:
        print("\n❌ FAILED TO CREATE PROGRAMS")

if __name__ == "__main__":
    main()