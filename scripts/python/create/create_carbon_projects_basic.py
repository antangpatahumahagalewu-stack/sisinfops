#!/usr/bin/env python3
"""
Script untuk membuat 4 project karbon tanpa kolom investor.
Setelah migration dijalankan manual, gunakan update_investor_data.py
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

# Carbon projects data (without investor columns)
CARBON_PROJECTS = [
    {
        "kode_project": "PRJ-GMS-2026",
        "nama_project": "Gunung Mas Forest Carbon Project",
        "kabupaten": "Gunung Mas",
        "luas_total_ha": 72800.99,
        "unit_ps": 35,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-01-01",
        "tanggal_selesai": "2034-01-01",
        "deskripsi": "Project karbon berbasis konservasi hutan di Kabupaten Gunung Mas, mencakup 35 unit PS dengan total luas 72.800,99 Ha."
    },
    {
        "kode_project": "PRJ-KPS-2026", 
        "nama_project": "Kapuas Basin Carbon Initiative",
        "kabupaten": "Kapuas",
        "luas_total_ha": 56771.0,
        "unit_ps": 25,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-02-01",
        "tanggal_selesai": "2034-02-01",
        "deskripsi": "Inisiatif karbon terintegrasi di DAS Kapuas, mencakup 25 unit PS dengan total luas 56.771 Ha."
    },
    {
        "kode_project": "PRJ-KTG-2026",
        "nama_project": "Katingan Tropical Carbon Program",
        "kabupaten": "Katingan",
        "luas_total_ha": 29239.0,
        "unit_ps": 15,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-03-01",
        "tanggal_selesai": "2034-03-01",
        "deskripsi": "Program karbon hutan tropis di Kabupaten Katingan, mencakup 15 unit PS dengan total luas 29.239 Ha."
    },
    {
        "kode_project": "PRJ-PLP-2026",
        "nama_project": "Pulang Pisau Peatland Carbon Project",
        "kabupaten": "Pulang Pisau",
        "luas_total_ha": 27876.0,
        "unit_ps": 17,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-04-01",
        "tanggal_selesai": "2034-04-01",
        "deskripsi": "Project karbon lahan gambut di Kabupaten Pulang Pisau, mencakup 17 unit PS dengan total luas 27.876 Ha."
    }
]

def main():
    print("🚀 CREATING 4 BASIC CARBON PROJECTS")
    print("=" * 60)
    
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
    
    # Check existing projects
    try:
        response = supabase.table("carbon_projects").select("id", count="exact").execute()
        existing_count = response.count if hasattr(response, 'count') else len(response.data)
        print(f"📊 Existing carbon projects: {existing_count}")
    except:
        existing_count = 0
    
    if existing_count >= 4:
        print("✅ Carbon projects already exist.")
        return
    
    print("\n📋 CREATING 4 CARBON PROJECTS:")
    print("-" * 60)
    
    created = 0
    for project in CARBON_PROJECTS:
        print(f"\n🔹 {project['nama_project']}")
        print(f"   Kabupaten: {project['kabupaten']}")
        print(f"   Luas: {project['luas_total_ha']:,.2f} Ha ({project['unit_ps']} Unit PS)")
        
        try:
            response = supabase.table("carbon_projects").insert(project).execute()
            if response.data:
                created += 1
                print(f"   ✅ Created successfully!")
            else:
                print(f"   ❌ Failed to create")
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:100]}")
    
    print(f"\n📊 Created {created} out of 4 projects")
    print("\n📋 NEXT STEPS:")
    print("1. Run migration manually in Supabase Dashboard")
    print("2. Then run: python update_investor_data.py")

if __name__ == "__main__":
    main()
