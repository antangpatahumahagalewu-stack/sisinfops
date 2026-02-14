#!/usr/bin/env python3
"""
Script untuk membuat 4 project karbon sesuai dengan struktur tabel yang ada.
Berdasarkan data real PS per kabupaten.
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

# Carbon projects data based on real PS areas
# Adjusted to match actual table structure
CARBON_PROJECTS = [
    {
        "project_code": "PRJ-GMS-2026",
        "project_name": "Gunung Mas Forest Carbon Project",
        "project_description": "Project karbon berbasis konservasi hutan di Kabupaten Gunung Mas, mencakup 35 unit PS dengan total luas 72.800,99 Ha. Berdasarkan data real PS: 35 Unit PS • 72.800,99 Ha.",
        "project_type": "REDD+",
        "standard": "VCS",
        "methodology": "VM0007",
        "validation_status": "validated",
        "verification_status": "verified",
        "estimated_credits": 72800990,  # 72,800.99 Ha × 100 ton/Ha × 10 tahun
        "issued_credits": 0,
        "retired_credits": 0,
        "status": "active",
        "kode_project": "PRJ-GMS-2026",
        "nama_project": "Gunung Mas Forest Carbon Project"
    },
    {
        "project_code": "PRJ-KPS-2026",
        "project_name": "Kapuas Basin Carbon Initiative",
        "project_description": "Inisiatif karbon terintegrasi di DAS Kapuas, mencakup 25 unit PS dengan total luas 56.771 Ha. Berdasarkan data real PS: 25 Unit PS • 56.771 Ha.",
        "project_type": "REDD+",
        "standard": "VCS",
        "methodology": "VM0007",
        "validation_status": "validated",
        "verification_status": "verified",
        "estimated_credits": 56771000,  # 56,771 Ha × 100 ton/Ha × 10 tahun
        "issued_credits": 0,
        "retired_credits": 0,
        "status": "active",
        "kode_project": "PRJ-KPS-2026",
        "nama_project": "Kapuas Basin Carbon Initiative"
    },
    {
        "project_code": "PRJ-KTG-2026",
        "project_name": "Katingan Tropical Carbon Program",
        "project_description": "Program karbon hutan tropis di Kabupaten Katingan, mencakup 15 unit PS dengan total luas 29.239 Ha. Berdasarkan data real PS: 15 Unit PS • 29.239 Ha.",
        "project_type": "REDD+",
        "standard": "VCS",
        "methodology": "VM0007",
        "validation_status": "validated",
        "verification_status": "verified",
        "estimated_credits": 29239000,  # 29,239 Ha × 100 ton/Ha × 10 tahun
        "issued_credits": 0,
        "retired_credits": 0,
        "status": "active",
        "kode_project": "PRJ-KTG-2026",
        "nama_project": "Katingan Tropical Carbon Program"
    },
    {
        "project_code": "PRJ-PLP-2026",
        "project_name": "Pulang Pisau Peatland Carbon Project",
        "project_description": "Project karbon lahan gambut di Kabupaten Pulang Pisau, mencakup 17 unit PS dengan total luas 27.876 Ha. Berdasarkan data real PS: 16 Unit PS • 24.830 Ha + 1 Unit PS • 3.046 Ha = 27.876 Ha.",
        "project_type": "REDD+",
        "standard": "VCS",
        "methodology": "VM0007",
        "validation_status": "validated",
        "verification_status": "verified",
        "estimated_credits": 27876000,  # 27,876 Ha × 100 ton/Ha × 10 tahun
        "issued_credits": 0,
        "retired_credits": 0,
        "status": "active",
        "kode_project": "PRJ-PLP-2026",
        "nama_project": "Pulang Pisau Peatland Carbon Project"
    }
]

def main():
    print("🚀 CREATING 4 CARBON PROJECTS (CORRECT STRUCTURE)")
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
    except Exception as e:
        print(f"⚠️  Could not check existing projects: {e}")
        existing_count = 0
    
    # Check if our projects already exist
    existing_codes = set()
    if existing_count > 0:
        try:
            response = supabase.table("carbon_projects").select("project_code").execute()
            existing_codes = {p["project_code"] for p in response.data if p.get("project_code")}
        except:
            pass
    
    print("\n📋 CREATING 4 CARBON PROJECTS:")
    print("-" * 60)
    
    created = 0
    skipped = 0
    
    for project in CARBON_PROJECTS:
        project_code = project["project_code"]
        project_name = project["project_name"]
        
        print(f"\n🔹 {project_name}")
        print(f"   Kode: {project_code}")
        
        # Skip if already exists
        if project_code in existing_codes:
            print(f"   ⚠️  Skipping: Project already exists")
            skipped += 1
            continue
        
        # Extract PS data from description for reference
        desc = project["project_description"]
        if "35 unit PS" in desc:
            print(f"   📊 Data PS: 35 Unit • 72.800,99 Ha")
        elif "25 unit PS" in desc:
            print(f"   📊 Data PS: 25 Unit • 56.771 Ha")
        elif "15 unit PS" in desc:
            print(f"   📊 Data PS: 15 Unit • 29.239 Ha")
        elif "17 unit PS" in desc:
            print(f"   📊 Data PS: 17 Unit • 27.876 Ha")
        
        print(f"   🌳 Estimated Credits: {project['estimated_credits']:,.0f}")
        
        try:
            response = supabase.table("carbon_projects").insert(project).execute()
            if response.data:
                created += 1
                print(f"   ✅ Created successfully!")
            else:
                print(f"   ❌ Failed to create")
        except Exception as e:
            error_msg = str(e)
            print(f"   ❌ Error: {error_msg[:100]}")
    
    print(f"\n📊 SUMMARY:")
    print(f"   ✅ Created: {created} new projects")
    print(f"   ⚠️  Skipped: {skipped} existing projects")
    print(f"   📈 Total in database: {existing_count + created}")
    
    if created > 0:
        print("\n🎯 NEXT STEPS:")
        print("1. Run investor dashboard migration manually in Supabase Dashboard")
        print("2. Then run: python update_investor_data.py")
        print("3. Verify: python verify_investor_dashboard.py")
        print("\n📋 MIGRATION INSTRUCTIONS:")
        print("   Go to https://supabase.com/dashboard")
        print("   Select your project → SQL Editor")
        print("   Copy-paste SQL from: supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql")
        print("   Click 'Run'")
    else:
        print("\n✅ Projects already exist. Proceed to migration step.")

if __name__ == "__main__":
    main()