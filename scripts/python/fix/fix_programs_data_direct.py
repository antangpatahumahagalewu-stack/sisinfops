#!/usr/bin/env python3
"""
Script untuk memperbaiki data program secara langsung melalui Supabase API.
Menambahkan perhutanan_sosial_id dan mengisi carbon_project_id yang kosong.
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

def main():
    print("🚀 FIXING PROGRAMS DATA (DIRECT API APPROACH)")
    print("=" * 70)
    
    # Load environment variables
    load_dotenv('.env.local')
    
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
    
    print("\n📋 STEP 1: GET ALL PROGRAMS")
    print("-" * 70)
    
    try:
        programs_resp = supabase.table("programs").select("id, program_code, program_name, carbon_project_id, perhutanan_sosial_id, status").execute()
        programs = programs_resp.data
        print(f"✅ Found {len(programs)} programs")
    except Exception as e:
        print(f"❌ Error fetching programs: {e}")
        sys.exit(1)
    
    print("\n📋 STEP 2: GET CARBON PROJECTS MAPPING")
    print("-" * 70)
    
    try:
        cp_resp = supabase.table("carbon_projects").select("id, kode_project, nama_project, kabupaten").execute()
        carbon_projects = cp_resp.data
        print(f"✅ Found {len(carbon_projects)} carbon projects")
        
        # Create mapping by code
        cp_by_code = {}
        for cp in carbon_projects:
            code = cp["kode_project"]
            # Extract middle part for matching (e.g., "GMS" from "PRJ-GMS-2026")
            if code and '-' in code:
                parts = code.split('-')
                if len(parts) >= 2:
                    short_code = parts[1]  # "GMS"
                    cp_by_code[short_code] = cp
                    cp_by_code[short_code.lower()] = cp
                    cp_by_code[short_code.upper()] = cp
    except Exception as e:
        print(f"❌ Error fetching carbon projects: {e}")
        sys.exit(1)
    
    print("\n📋 STEP 3: GET PERHUTANAN SOSIAL MAPPING BY KABUPATEN")
    print("-" * 70)
    
    try:
        ps_resp = supabase.table("perhutanan_sosial").select("id, pemegang_izin, desa, kabupaten_id").execute()
        perhutanan_sosial = ps_resp.data
        print(f"✅ Found {len(perhutanan_sosial)} perhutanan sosial records")
        
        # Get kabupaten mapping
        kabupaten_resp = supabase.table("kabupaten").select("id, nama").execute()
        kabupaten_map = {k["id"]: k["nama"] for k in kabupaten_resp.data}
        
        # Map PS by kabupaten
        ps_by_kabupaten = {}
        for ps in perhutanan_sosial:
            kabupaten_id = ps.get("kabupaten_id")
            if kabupaten_id and kabupaten_id in kabupaten_map:
                kabupaten_name = kabupaten_map[kabupaten_id]
                if kabupaten_name not in ps_by_kabupaten:
                    ps_by_kabupaten[kabupaten_name] = []
                ps_by_kabupaten[kabupaten_name].append(ps)
    except Exception as e:
        print(f"❌ Error fetching perhutanan sosial: {e}")
        sys.exit(1)
    
    print("\n📋 STEP 4: FIX PROGRAMS DATA")
    print("-" * 70)
    
    updated_count = 0
    failed_count = 0
    
    for program in programs:
        program_id = program["id"]
        program_code = program["program_code"]
        
        print(f"\n🔧 Program: {program_code}")
        
        updates_needed = {}
        
        # 1. Fill kode_program and nama_program if empty
        if program.get("kode_program") is None and program_code:
            updates_needed["kode_program"] = program_code
        
        if program.get("nama_program") is None and program.get("program_name"):
            updates_needed["nama_program"] = program["program_name"]
        
        # 2. Find carbon_project_id based on program_code pattern
        if not program.get("carbon_project_id") and program_code:
            # Extract carbon project code from program_code (format: PRG-XXX-001)
            if program_code.startswith("PRG-") and '-' in program_code[4:]:
                try:
                    # Get middle part: PRG-GMS-001 -> GMS
                    middle_part = program_code.split('-')[1]
                    
                    # Find matching carbon project
                    matching_cp = None
                    for short_code, cp in cp_by_code.items():
                        if middle_part.upper() == short_code.upper():
                            matching_cp = cp
                            break
                    
                    if matching_cp:
                        updates_needed["carbon_project_id"] = matching_cp["id"]
                        print(f"   ✅ Matched carbon project: {matching_cp['kode_project']}")
                        
                        # 3. Find perhutanan sosial based on kabupaten
                        if not program.get("perhutanan_sosial_id") and matching_cp.get("kabupaten"):
                            kabupaten = matching_cp["kabupaten"]
                            if kabupaten in ps_by_kabupaten and ps_by_kabupaten[kabupaten]:
                                # Use first PS in this kabupaten
                                ps = ps_by_kabupaten[kabupaten][0]
                                updates_needed["perhutanan_sosial_id"] = ps["id"]
                                print(f"   ✅ Matched perhutanan sosial: {ps['pemegang_izin']}")
                    else:
                        print(f"   ⚠️  No carbon project match for code: {middle_part}")
                except Exception as e:
                    print(f"   ⚠️  Error parsing program_code: {e}")
        
        # 4. Update program if we have changes
        if updates_needed:
            try:
                response = supabase.table("programs").update(updates_needed).eq("id", program_id).execute()
                if response.data:
                    updated_count += 1
                    print(f"   ✅ Updated: {', '.join(updates_needed.keys())}")
                else:
                    failed_count += 1
                    print(f"   ❌ Update failed: no data returned")
            except Exception as e:
                failed_count += 1
                error_msg = str(e)
                if "column.*does not exist" in error_msg.lower():
                    print(f"   ⚠️  Column doesn't exist: {error_msg[:100]}")
                else:
                    print(f"   ❌ Update error: {error_msg[:100]}")
        else:
            print(f"   ℹ️  No updates needed")
    
    print("\n" + "=" * 70)
    print("📊 FIX SUMMARY:")
    print(f"   ✅ Successfully updated: {updated_count} programs")
    print(f"   ❌ Failed: {failed_count} programs")
    
    print("\n📋 STEP 5: VERIFICATION")
    print("-" * 70)
    
    try:
        # Get updated counts
        final_resp = supabase.table("programs").select("program_code, carbon_project_id, perhutanan_sosial_id, status").execute()
        total = len(final_resp.data)
        with_carbon = len([p for p in final_resp.data if p.get("carbon_project_id")])
        with_ps = len([p for p in final_resp.data if p.get("perhutanan_sosial_id")])
        
        print(f"📊 FINAL STATISTICS:")
        print(f"   Total programs: {total}")
        print(f"   With carbon_project_id: {with_carbon} ({with_carbon/total*100:.1f}%)")
        print(f"   With perhutanan_sosial_id: {with_ps} ({with_ps/total*100:.1f}%)")
        
        print("\n📋 SAMPLE PROGRAMS (FIRST 10):")
        print("-" * 70)
        
        # Get detailed sample
        sample_resp = supabase.table("programs").select(
            "program_code, program_name, program_type, status, carbon_project_id, perhutanan_sosial_id"
        ).order("program_code").limit(10).execute()
        
        for i, p in enumerate(sample_resp.data, 1):
            cp_status = "✅" if p.get("carbon_project_id") else "❌"
            ps_status = "✅" if p.get("perhutanan_sosial_id") else "❌"
            print(f"{i:2d}. {p['program_code']}: {p['program_name'][:40]}...")
            print(f"     Type: {p.get('program_type', 'N/A')}, Status: {p.get('status', 'N/A')}")
            print(f"     Carbon Project: {cp_status}, Perhutanan Sosial: {ps_status}")
            
    except Exception as e:
        print(f"❌ Verification error: {e}")
    
    print("\n" + "=" * 70)
    print("🎉 FIX COMPLETED!")
    print("\n📋 NEXT STEPS:")
    print("1. Check frontend at: http://localhost:3000/id/dashboard/programs")
    print("2. Verify program listing shows all columns correctly")
    print("3. Check carbon project detail pages for program listings")

if __name__ == "__main__":
    main()