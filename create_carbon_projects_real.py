#!/usr/bin/env python3
"""
Script untuk membuat 4 project karbon berdasarkan data real PS per kabupaten.
Data luasan berdasarkan informasi dari user:
- Gunung Mas: 72.800,99 Ha (35 Unit PS)
- Kapuas: 56.771 Ha (25 Unit PS)
- Katingan: 29.239 Ha (15 Unit PS)
- Pulang Pisau: 27.876 Ha (17 Unit PS)
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Carbon projects data based on real PS areas
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

def calculate_investor_data(luas_ha):
    """Calculate investor data based on area"""
    investment = luas_ha * 5000000  # Rp 5 juta per hektar
    roi = 18.0  # 18% ROI (rata-rata untuk project karbon)
    carbon_seq = luas_ha * 100 * 10  # 100 ton/ha/year × 10 years
    
    # Determine performance rating based on ROI
    if roi >= 20:
        performance_rating = "excellent"
    elif roi >= 15:
        performance_rating = "good"
    elif roi >= 10:
        performance_rating = "average"
    else:
        performance_rating = "poor"
    
    return {
        "investment_amount": investment,
        "roi_percentage": roi,
        "carbon_sequestration_estimated": carbon_seq,
        "project_period_years": 10,
        "performance_rating": performance_rating,
        "investor_notes": f"Project berbasis {luas_ha:,.0f} Ha dengan estimasi ROI {roi}%"
    }

def format_currency(amount):
    """Format currency in Indonesian format"""
    if amount >= 1_000_000_000_000:
        return f"Rp {amount/1_000_000_000_000:,.1f} T"
    elif amount >= 1_000_000_000:
        return f"Rp {amount/1_000_000_000:,.1f} M"
    elif amount >= 1_000_000:
        return f"Rp {amount/1_000_000:,.1f} juta"
    else:
        return f"Rp {amount:,.0f}"

def main():
    print("🚀 CREATING 4 CARBON PROJECTS FROM REAL PS DATA")
    print("=" * 60)
    
    # Initialize Supabase client
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration in .env.local")
        print("   Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set")
        sys.exit(1)
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase: {supabase_url.split('//')[1].split('.')[0]}")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # Check existing projects
    try:
        response = supabase.table("carbon_projects").select("id", count="exact").execute()
        existing_count = response.count if hasattr(response, 'count') else len(response.data)
        print(f"📊 Existing carbon projects in database: {existing_count}")
    except Exception as e:
        print(f"⚠️  Warning: Could not check existing projects: {e}")
        existing_count = 0
    
    if existing_count >= 4:
        print("✅ Carbon projects already exist. Skipping creation.")
        print("   To recreate, delete existing projects first.")
        return
    
    print("\n📋 CREATING 4 CARBON PROJECTS:")
    print("-" * 60)
    
    created_count = 0
    failed_count = 0
    
    for project in CARBON_PROJECTS:
        print(f"\n🔹 {project['nama_project']}")
        print(f"   Kabupaten: {project['kabupaten']}")
        print(f"   Luas: {project['luas_total_ha']:,.2f} Ha ({project['unit_ps']} Unit PS)")
        print(f"   Kode: {project['kode_project']}")
        print(f"   Periode: {project['tanggal_mulai']} to {project['tanggal_selesai']}")
        
        # Calculate investor data
        investor_data = calculate_investor_data(project['luas_total_ha'])
        
        # Combine project and investor data
        project_data = {**project, **investor_data}
        
        try:
            # Insert to database
            response = supabase.table("carbon_projects").insert(project_data).execute()
            
            if response.data:
                created_count += 1
                print(f"   ✅ Created successfully!")
                print(f"   💰 Investment: {format_currency(investor_data['investment_amount'])}")
                print(f"   📈 ROI: {investor_data['roi_percentage']}%")
                print(f"   🌳 Carbon Seq: {investor_data['carbon_sequestration_estimated']:,.0f} tons")
                print(f"   ⭐ Performance: {investor_data['performance_rating'].title()}")
            else:
                failed_count += 1
                print(f"   ❌ Failed to create: No data returned")
                
        except Exception as e:
            failed_count += 1
            print(f"   ❌ Failed to create: {str(e)}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 CREATION SUMMARY:")
    print(f"   ✅ Successfully created: {created_count} projects")
    print(f"   ❌ Failed: {failed_count} projects")
    
    if created_count > 0:
        print("\n🎉 CARBON PROJECTS CREATED SUCCESSFULLY!")
        print("\n📋 NEXT STEPS:")
        print("1. Run investor dashboard migration:")
        print("   python run_investor_migration.py")
        print("\n2. Verify the results:")
        print("   python verify_investor_dashboard.py")
        print("\n3. Check investor dashboard:")
        print("   http://localhost:3000/id/dashboard/investor")
    else:
        print("\n❌ FAILED TO CREATE CARBON PROJECTS")
        print("   Please check the error messages above.")

if __name__ == "__main__":
    main()