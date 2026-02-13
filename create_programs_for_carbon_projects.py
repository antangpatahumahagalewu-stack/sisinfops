#!/usr/bin/env python3
"""
Script untuk membuat 24 program baru yang terhubung dengan 4 carbon project yang ada.
Masing-masing carbon project akan memiliki 6 program dengan jenis yang berbeda.
"""

import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv('.env.local')

# Template program untuk setiap carbon project
PROGRAM_TEMPLATES = [
    # Program 1: Karbon - Perlindungan Hutan
    {
        "jenis_program": "KARBON",
        "kategori_hutan": "MINERAL",
        "tujuan": "Mencegah deforestasi dan degradasi hutan melalui penguatan pengelolaan kawasan",
        "target": "Mempertahankan tutupan hutan seluas 1000 Ha, mengurangi emisi 50.000 ton CO2e/tahun",
        "risiko": "Kebakaran hutan, perambahan liar, perubahan kebijakan pemerintah"
    },
    # Program 2: Karbon - Peningkatan Serapan
    {
        "jenis_program": "KARBON",
        "kategori_hutan": "MINERAL", 
        "tujuan": "Meningkatkan serapan karbon melalui rehabilitasi dan penanaman pohon",
        "target": "Menanam 50.000 pohon, meningkatkan serapan karbon 20.000 ton CO2e/tahun",
        "risiko": "Kematian bibit, serangan hama, perubahan iklim ekstrem"
    },
    # Program 3: Pemberdayaan Ekonomi - Pengembangan Mata Pencaharian
    {
        "jenis_program": "PEMBERDAYAAN_EKONOMI",
        "tujuan": "Meningkatkan pendapatan masyarakat melalui pengembangan usaha berbasis hasil hutan bukan kayu",
        "target": "Membentuk 5 kelompok usaha, meningkatkan pendapatan 100 keluarga sebesar 30%",
        "risiko": "Fluktuasi harga pasar, keterbatasan akses permodalan, kompetisi produk"
    },
    # Program 4: Pemberdayaan Ekonomi - Pemasaran Produk
    {
        "jenis_program": "PEMBERDAYAAN_EKONOMI",
        "tujuan": "Mengembangkan sistem pemasaran dan distribusi produk hasil hutan berkelanjutan",
        "target": "Membuat 3 kemitraan pemasaran, meningkatkan penjualan produk 50%",
        "risiko": "Persaingan pasar, perubahan preferensi konsumen, kendala logistik"
    },
    # Program 5: Kapasitas - Pelatihan Masyarakat
    {
        "jenis_program": "KAPASITAS",
        "tujuan": "Meningkatkan kapasitas masyarakat dalam pengelolaan hutan berkelanjutan dan adaptasi perubahan iklim",
        "target": "Melatih 200 orang masyarakat, membentuk 10 fasilitator lokal",
        "risiko": "Partisipasi rendah, keterbatasan fasilitator, perubahan dinamika kelompok"
    },
    # Program 6: Lainnya - Pendukung
    {
        "jenis_program": "LAINNYA",
        "tujuan": "Program pendukung untuk memastikan keberlanjutan dan dampak sosial proyek karbon",
        "target": "Menyusun 5 dokumen perencanaan, melakukan 12 kali monitoring lapangan",
        "risiko": "Keterbatasan dana, koordinasi lintas sektor, perubahan prioritas"
    }
]

# Nama program berdasarkan template
PROGRAM_NAMES = [
    "Perlindungan Hutan dan Pencegahan Deforestasi",
    "Peningkatan Serapan Karbon melalui Rehabilitasi Hutan",
    "Pengembangan Mata Pencaharian Berbasis Hasil Hutan Bukan Kayu",
    "Pengembangan Pemasaran Produk Hutan Berkelanjutan",
    "Peningkatan Kapasitas Masyarakat dalam Pengelolaan Hutan",
    "Program Pendukung Keberlanjutan Proyek Karbon"
]

def get_auth_token():
    """Get authentication token for API requests"""
    # Try to get from environment or use service role key
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return f"Bearer {supabase_key}"

def create_program_via_api(program_data, auth_token):
    """Create program using the API endpoint"""
    api_url = "http://localhost:3000/api/programs"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": auth_token
    }
    
    try:
        # Use direct database insertion for now to avoid auth issues
        print(f"  Creating via direct database...")
        return None  # We'll use direct DB insertion instead
    except Exception as e:
        print(f"  API Error: {e}")
        return None

def get_perhutanan_sosial_by_kabupaten(supabase, kabupaten_name):
    """Get perhutanan sosial by kabupaten name"""
    try:
        # First get kabupaten_id from kabupaten table (using 'nama' column)
        kabupaten_resp = supabase.table("kabupaten").select("id, nama").ilike("nama", f"%{kabupaten_name}%").execute()
        
        if kabupaten_resp.data:
            kabupaten_id = kabupaten_resp.data[0]["id"]
            kabupaten_nama = kabupaten_resp.data[0]["nama"]
            print(f"    Found kabupaten: {kabupaten_nama} (ID: {kabupaten_id})")
            
            # Get perhutanan sosial for this kabupaten
            ps_resp = supabase.table("perhutanan_sosial").select("id, pemegang_izin, desa").eq("kabupaten_id", kabupaten_id).limit(1).execute()
            
            if ps_resp.data:
                return ps_resp.data[0]
            else:
                print(f"    No perhutanan sosial found for kabupaten_id: {kabupaten_id}")
    
    except Exception as e:
        print(f"  Error getting perhutanan sosial: {e}")
    
    # Fallback: get any perhutanan sosial
    try:
        ps_resp = supabase.table("perhutanan_sosial").select("id, pemegang_izin, desa").limit(1).execute()
        if ps_resp.data:
            print(f"  Using fallback perhutanan sosial")
            return ps_resp.data[0]
    except Exception as e:
        print(f"  Fallback error: {e}")
    
    return None

def main():
    print("🚀 CREATING 24 PROGRAMS FOR 4 CARBON PROJECTS")
    print("=" * 70)
    
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
    
    # Get carbon projects
    try:
        cp_response = supabase.table("carbon_projects").select("id, kode_project, nama_project, kabupaten").execute()
        carbon_projects = cp_response.data
        print(f"📊 Found {len(carbon_projects)} carbon projects")
    except Exception as e:
        print(f"❌ Error fetching carbon projects: {e}")
        sys.exit(1)
    
    if not carbon_projects:
        print("❌ No carbon projects found in database")
        print("   Please run create_carbon_projects_real.py first")
        sys.exit(1)
    
    # Get perhutanan sosial mapping
    print("\n🔍 Mapping perhutanan sosial to kabupaten...")
    kabupaten_ps_map = {}
    for cp in carbon_projects:
        kabupaten = cp["kabupaten"]
        if kabupaten not in kabupaten_ps_map:
            ps = get_perhutanan_sosial_by_kabupaten(supabase, kabupaten)
            if ps:
                kabupaten_ps_map[kabupaten] = ps
                print(f"  ✅ {kabupaten}: {ps['pemegang_izin']} - {ps['desa']}")
            else:
                print(f"  ❌ {kabupaten}: No perhutanan sosial found")
                # Try to get any PS as fallback
                ps_fallback = supabase.table("perhutanan_sosial").select("id, pemegang_izin, desa").limit(1).execute()
                if ps_fallback.data:
                    kabupaten_ps_map[kabupaten] = ps_fallback.data[0]
                    print(f"  ⚠️  Using fallback PS for {kabupaten}")
    
    if not kabupaten_ps_map:
        print("❌ No perhutanan sosial found in database")
        sys.exit(1)
    
    print("\n📋 CREATING PROGRAMS:")
    print("-" * 70)
    
    created_count = 0
    failed_count = 0
    
    # Create programs for each carbon project
    for cp_idx, carbon_project in enumerate(carbon_projects):
        kabupaten = carbon_project["kabupaten"]
        ps_data = kabupaten_ps_map.get(kabupaten)
        
        if not ps_data:
            print(f"❌ Skipping {carbon_project['kode_project']}: No perhutanan sosial for {kabupaten}")
            failed_count += 6  # 6 programs failed
            continue
        
        print(f"\n🌳 CARBON PROJECT: {carbon_project['kode_project']}")
        print(f"   {carbon_project['nama_project']}")
        print(f"   Kabupaten: {kabupaten}")
        print(f"   Perhutanan Sosial: {ps_data['pemegang_izin']} - {ps_data['desa']}")
        print("   " + "-" * 50)
        
        # Create 6 programs for this carbon project
        for prog_idx in range(6):
            template = PROGRAM_TEMPLATES[prog_idx]
            program_name = PROGRAM_NAMES[prog_idx]
            
            # Generate program code
            prog_num = cp_idx * 6 + prog_idx + 1
            program_code = f"PRG-{carbon_project['kode_project'].split('-')[1]}-{prog_idx+1:03d}"
            
            print(f"   {prog_idx+1}. {program_code}: {program_name}")
            print(f"      Jenis: {template['jenis_program'].replace('_', ' ').title()}")
            
            # Prepare program data
            program_data = {
                "kode_program": program_code,
                "nama_program": f"{program_name} - {carbon_project['kode_project']}",
                "jenis_program": template["jenis_program"],
                "tujuan": template["tujuan"],
                "lokasi_spesifik": f"Wilayah {carbon_project['kabupaten']}, berfokus pada kawasan PS {ps_data['desa']}",
                "target": template["target"],
                "risiko": template["risiko"],
                "carbon_project_id": carbon_project["id"],
                "perhutanan_sosial_id": ps_data["id"],
                "status": "active",
                "total_budget": 500000000 if template["jenis_program"] == "KARBON" else 250000000,
                "budget_status": "approved",
                "budget_notes": f"Anggaran untuk program {program_name} di wilayah {carbon_project['kabupaten']}",
                "logical_framework": None
            }
            
            # Add kategori_hutan for KARBON programs
            if template["jenis_program"] == "KARBON":
                program_data["kategori_hutan"] = template["kategori_hutan"]
            
            try:
                # Insert directly to database
                response = supabase.table("programs").insert(program_data).execute()
                
                if response.data:
                    created_count += 1
                    print(f"      ✅ Created successfully!")
                else:
                    failed_count += 1
                    print(f"      ❌ Failed: No data returned")
                    
            except Exception as e:
                failed_count += 1
                error_msg = str(e)
                if "duplicate key" in error_msg.lower():
                    print(f"      ⚠️  Already exists (duplicate kode_program)")
                else:
                    print(f"      ❌ Failed: {error_msg[:100]}...")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 CREATION SUMMARY:")
    print(f"   ✅ Successfully created: {created_count} programs")
    print(f"   ❌ Failed: {failed_count} programs")
    
    if created_count > 0:
        print("\n🎉 PROGRAMS CREATED SUCCESSFULLY!")
        print("\n📋 NEXT STEPS:")
        print("1. Verify programs in database:")
        print("   SELECT COUNT(*) FROM programs WHERE carbon_project_id IS NOT NULL;")
        print("\n2. Check programs page:")
        print("   http://localhost:3000/id/dashboard/programs")
        print("\n3. View programs by carbon project:")
        for cp in carbon_projects:
            print(f"   http://localhost:3000/id/dashboard/carbon-projects/{cp['id']}?tab=programs")
    else:
        print("\n❌ FAILED TO CREATE PROGRAMS")
        print("   Please check the error messages above.")

if __name__ == "__main__":
    main()