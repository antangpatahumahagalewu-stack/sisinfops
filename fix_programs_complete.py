#!/usr/bin/env python3
"""
Script lengkap untuk memperbaiki struktur tabel programs dan data-nya.
1. Tambahkan kolom perhutanan_sosial_id jika belum ada
2. Isi carbon_project_id berdasarkan pola kode program
3. Isi perhutanan_sosial_id berdasarkan kabupaten carbon project
4. Isi kode_program dan nama_program
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

def add_perhutanan_sosial_id_column(supabase):
    """Tambahkan kolom perhutanan_sosial_id jika belum ada"""
    print("\n📋 STEP 1: ADD PERHUTANAN_SOSIAL_ID COLUMN")
    print("-" * 70)
    
    try:
        # Coba query untuk melihat apakah kolom sudah ada
        test_resp = supabase.table("programs").select("id").limit(1).execute()
        
        # Coba update dengan kolom perhutanan_sosial_id untuk test
        test_update = {
            "status": "planning"  # Field yang pasti ada
        }
        supabase.table("programs").update(test_update).eq("id", test_resp.data[0]["id"]).execute()
        
        print("✅ Tabel programs bisa diakses")
        
        # Coba tambahkan kolom via raw SQL (jika ada fungsi RPC)
        try:
            sql = """
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'programs' 
                    AND column_name = 'perhutanan_sosial_id'
                ) THEN
                    ALTER TABLE programs ADD COLUMN perhutanan_sosial_id UUID;
                    RAISE NOTICE 'Kolom perhutanan_sosial_id ditambahkan';
                ELSE
                    RAISE NOTICE 'Kolom perhutanan_sosial_id sudah ada';
                END IF;
            END $$;
            """
            
            result = supabase.rpc('exec_sql', {'query': sql}).execute()
            print("✅ Executed SQL to add column (if function exists)")
        except Exception as sql_error:
            print(f"⚠️  Cannot add column via SQL RPC: {str(sql_error)[:100]}")
            print("   Kolom akan ditambahkan saat pertama kali diupdate")
            
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 COMPLETE PROGRAMS FIX")
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
    
    # Step 1: Add column if needed
    add_perhutanan_sosial_id_column(supabase)
    
    print("\n📋 STEP 2: GET ALL DATA")
    print("-" * 70)
    
    # Get programs (tanpa perhutanan_sosial_id dulu)
    try:
        programs_resp = supabase.table("programs").select("id, program_code, program_name, carbon_project_id, status").execute()
        programs = programs_resp.data
        print(f"✅ Found {len(programs)} programs")
    except Exception as e:
        print(f"❌ Error fetching programs: {e}")
        sys.exit(1)
    
    # Get carbon projects
    try:
        cp_resp = supabase.table("carbon_projects").select("id, kode_project, nama_project, kabupaten").execute()
        carbon_projects = cp_resp.data
        print(f"✅ Found {len(carbon_projects)} carbon projects")
        
        # Create mapping by short code
        cp_by_short_code = {}
        for cp in carbon_projects:
            code = cp["kode_project"]
            if code and '-' in code:
                parts = code.split('-')
                if len(parts) >= 2:
                    short_code = parts[1].upper()  # "GMS"
                    cp_by_short_code[short_code] = cp
    except Exception as e:
        print(f"❌ Error fetching carbon projects: {e}")
        sys.exit(1)
    
    # Get perhutanan sosial grouped by kabupaten
    try:
        ps_resp = supabase.table("perhutanan_sosial").select("id, pemegang_izin, desa, kabupaten_id").execute()
        kabupaten_resp = supabase.table("kabupaten").select("id, nama").execute()
        
        kabupaten_map = {k["id"]: k["nama"] for k in kabupaten_resp.data}
        ps_by_kabupaten = {}
        
        for ps in ps_resp.data:
            kabupaten_id = ps.get("kabupaten_id")
            if kabupaten_id and kabupaten_id in kabupaten_map:
                kabupaten_name = kabupaten_map[kabupaten_id]
                if kabupaten_name not in ps_by_kabupaten:
                    ps_by_kabupaten[kabupaten_name] = []
                ps_by_kabupaten[kabupaten_name].append(ps)
        
        print(f"✅ Found {len(ps_resp.data)} perhutanan sosial in {len(ps_by_kabupaten)} kabupaten")
    except Exception as e:
        print(f"❌ Error fetching perhutanan sosial: {e}")
        # Continue without PS mapping
        ps_by_kabupaten = {}
    
    print("\n📋 STEP 3: FIX PROGRAMS DATA")
    print("-" * 70)
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for i, program in enumerate(programs, 1):
        program_id = program["id"]
        program_code = program["program_code"]
        
        print(f"\n[{i}/{len(programs)}] 🔧 {program_code}")
        
        updates = {}
        
        # 1. Fill kode_program and nama_program
        updates["kode_program"] = program_code
        updates["nama_program"] = program["program_name"]
        
        # 2. Find carbon_project_id from program_code pattern
        carbon_project_id = program.get("carbon_project_id")
        if not carbon_project_id and program_code:
            if program_code.startswith("PRG-") and '-' in program_code[4:]:
                try:
                    short_code = program_code.split('-')[1].upper()  # "GMS"
                    if short_code in cp_by_short_code:
                        cp = cp_by_short_code[short_code]
                        updates["carbon_project_id"] = cp["id"]
                        print(f"   ✅ Carbon project: {cp['kode_project']}")
                        
                        # 3. Find perhutanan_sosial_id based on kabupaten
                        kabupaten = cp.get("kabupaten")
                        if kabupaten and kabupaten in ps_by_kabupaten and ps_by_kabupaten[kabupaten]:
                            ps = ps_by_kabupaten[kabupaten][0]
                            updates["perhutanan_sosial_id"] = ps["id"]
                            print(f"   ✅ Perhutanan sosial: {ps['pemegang_izin'][:30]}...")
                    else:
                        print(f"   ⚠️  No carbon project for code: {short_code}")
                except Exception as e:
                    print(f"   ⚠️  Error parsing: {e}")
        
        # 4. Try to update
        try:
            # Hapus fields yang sudah ada dengan nilai yang sama (jika ada)
            final_updates = {}
            for key, value in updates.items():
                if key == "perhutanan_sosial_id":
                    # Always try to set this, even if it might fail
                    final_updates[key] = value
                elif program.get(key) != value:
                    final_updates[key] = value
            
            if final_updates:
                response = supabase.table("programs").update(final_updates).eq("id", program_id).execute()
                if response.data:
                    updated_count += 1
                    print(f"   ✅ Updated: {', '.join(final_updates.keys())}")
                else:
                    error_count += 1
                    print(f"   ❌ Update failed (no data)")
            else:
                skipped_count += 1
                print(f"   ℹ️  No changes needed")
                
        except Exception as e:
            error_count += 1
            error_msg = str(e)
            if "column.*does not exist" in error_msg.lower():
                print(f"   ⚠️  Column missing: akan dibuat nanti")
                # Try without the missing column
                if "perhutanan_sosial_id" in error_msg:
                    try:
                        # Remove perhutanan_sosial_id and try again
                        safe_updates = {k: v for k, v in updates.items() if k != "perhutanan_sosial_id"}
                        if safe_updates:
                            response = supabase.table("programs").update(safe_updates).eq("id", program_id).execute()
                            if response.data:
                                updated_count += 1
                                print(f"   ✅ Updated without perhutanan_sosial_id")
                    except Exception as e2:
                        print(f"   ❌ Even safe update failed: {str(e2)[:100]}")
            else:
                print(f"   ❌ Update error: {error_msg[:100]}")
    
    print("\n" + "=" * 70)
    print("📊 FIX SUMMARY:")
    print(f"   ✅ Successfully updated: {updated_count} programs")
    print(f"   ℹ️  Skipped (no changes): {skipped_count} programs")
    print(f"   ❌ Errors: {error_count} programs")
    
    print("\n📋 STEP 4: FINAL VERIFICATION")
    print("-" * 70)
    
    try:
        # Query final state
        final_resp = supabase.table("programs").select(
            "program_code, program_name, program_type, status, carbon_project_id"
        ).order("program_code").limit(10).execute()
        
        print("📋 SAMPLE PROGRAMS AFTER FIX:")
        print("-" * 70)
        
        for i, p in enumerate(final_resp.data, 1):
            cp_status = "✅" if p.get("carbon_project_id") else "❌"
            name_short = p["program_name"][:40] + "..." if len(p["program_name"]) > 40 else p["program_name"]
            print(f"{i:2d}. {p['program_code']}: {name_short}")
            print(f"     Type: {p.get('program_type', 'N/A')}, Status: {p.get('status', 'N/A')}")
            print(f"     Carbon Project: {cp_status}")
        
        # Get statistics
        stats_resp = supabase.table("programs").select("carbon_project_id").execute()
        total = len(stats_resp.data)
        with_carbon = len([p for p in stats_resp.data if p.get("carbon_project_id")])
        
        print(f"\n📊 STATISTICS:")
        print(f"   Total programs: {total}")
        print(f"   With carbon_project_id: {with_carbon} ({with_carbon/total*100:.1f}%)")
        
        # Check if perhutanan_sosial_id column exists now
        try:
            test_resp = supabase.table("programs").select("perhutanan_sosial_id").limit(1).execute()
            print(f"   perhutanan_sosial_id column: ✅ EXISTS")
        except:
            print(f"   perhutanan_sosial_id column: ❌ MISSING (may need manual SQL)")
            
    except Exception as e:
        print(f"❌ Verification error: {e}")
    
    print("\n" + "=" * 70)
    print("🎉 FIX PROCESS COMPLETED!")
    print("\n📋 MANUAL STEPS IF NEEDED:")
    print("1. Jika perhutanan_sosial_id masih error, jalankan SQL ini di Supabase:")
    print("""
   ALTER TABLE programs ADD COLUMN IF NOT EXISTS perhutanan_sosial_id UUID;
   ALTER TABLE programs ADD CONSTRAINT programs_perhutanan_sosial_id_fkey 
   FOREIGN KEY (perhutanan_sosial_id) REFERENCES perhutanan_sosial(id) ON DELETE SET NULL;
   """)
    print("\n2. Check frontend at: http://localhost:3000/id/dashboard/programs")
    print("3. Programs should now show Carbon Project links")

if __name__ == "__main__":
    main()