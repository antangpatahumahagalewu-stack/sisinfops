#!/usr/bin/env python3
"""
Test script untuk memverifikasi fungsi terkait carbon projects masih bekerja.
Run setelah menjalankan fix foreign key migration.
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def test_carbon_functions():
    print("🧪 TESTING CARBON PROJECTS FUNCTIONS")
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
    
    all_tests_passed = True
    
    print("\n🔍 TEST 1: BASIC TABLE ACCESS")
    print("-" * 40)
    
    # Test 1.1: Access carbon_projects table
    try:
        result = supabase.table("carbon_projects").select("id, nama_project, status").limit(2).execute()
        if result.data:
            print("✅ carbon_projects table accessible")
            for project in result.data:
                print(f"   - {project['nama_project']} ({project['status']})")
        else:
            print("⚠️  carbon_projects table accessible but no data returned")
    except Exception as e:
        print(f"❌ Failed to access carbon_projects: {e}")
        all_tests_passed = False
    
    # Test 1.2: Access projects view (after fix)
    try:
        result = supabase.table("projects").select("id, project_name, status").limit(2).execute()
        if result.data:
            print("✅ projects view accessible (after fix)")
            for project in result.data:
                print(f"   - {project['project_name']} ({project['status']})")
        else:
            print("⚠️  projects view accessible but no data returned")
    except Exception as e:
        print(f"❌ Failed to access projects view: {e}")
        print("   ℹ️  Run fix_foreign_key_simple.sql in Supabase SQL Editor first")
        all_tests_passed = False
    
    print("\n🔗 TEST 2: FOREIGN KEY RELATIONSHIPS")
    print("-" * 40)
    
    # Test 2.1: programs -> carbon_projects relationship
    try:
        result = supabase.table("programs").select("id, program_name, carbon_project_id").limit(3).execute()
        if result.data:
            print("✅ programs table accessible")
            programs_with_cp = 0
            for program in result.data:
                cp_id = program.get('carbon_project_id')
                if cp_id:
                    programs_with_cp += 1
                    print(f"   - {program['program_name']} → carbon_project_id: {cp_id[:8]}...")
                else:
                    print(f"   - {program['program_name']} → No carbon_project_id")
            
            # Try to join programs with carbon_projects
            if programs_with_cp > 0:
                print("   Testing JOIN programs ↔ carbon_projects...")
                # Simple test: check if carbon_project_id exists in carbon_projects
                for program in result.data:
                    if program.get('carbon_project_id'):
                        cp_check = supabase.table("carbon_projects").select("id").eq("id", program['carbon_project_id']).execute()
                        if cp_check.data:
                            print(f"     ✅ carbon_project_id {program['carbon_project_id'][:8]}... exists")
                        else:
                            print(f"     ❌ carbon_project_id {program['carbon_project_id'][:8]}... NOT FOUND")
                            all_tests_passed = False
        else:
            print("⚠️  programs table accessible but no data returned")
    except Exception as e:
        print(f"❌ Failed to test programs relationship: {e}")
        all_tests_passed = False
    
    # Test 2.2: programs -> projects view relationship (after fix)
    try:
        result = supabase.table("programs").select("id, program_name, carbon_project_id").limit(2).execute()
        if result.data:
            print("\n   Testing JOIN programs ↔ projects view...")
            for program in result.data:
                if program.get('carbon_project_id'):
                    # Try to find in projects view
                    p_check = supabase.table("projects").select("id").eq("id", program['carbon_project_id']).execute()
                    if p_check.data:
                        print(f"     ✅ carbon_project_id exists in projects view")
                    else:
                        print(f"     ⚠️  carbon_project_id not in projects view (view might need refresh)")
    except Exception as e:
        print(f"   ⚠️  Failed to test projects view relationship: {e}")
    
    print("\n📊 TEST 3: DATA CONSISTENCY")
    print("-" * 40)
    
    # Test 3.1: Compare carbon_projects vs projects row counts
    try:
        cp_result = supabase.table("carbon_projects").select("id", count="exact").execute()
        p_result = supabase.table("projects").select("id", count="exact").execute()
        
        cp_count = len(cp_result.data) if cp_result.data else 0
        p_count = len(p_result.data) if p_result.data else 0
        
        if cp_count == p_count:
            print(f"✅ Row counts match: carbon_projects={cp_count}, projects={p_count}")
        else:
            print(f"❌ Row counts mismatch: carbon_projects={cp_count}, projects={p_count}")
            all_tests_passed = False
            
        # If mismatch, show differences
        if cp_count != p_count and cp_count > 0 and p_count > 0:
            print("   Checking for missing rows...")
            # Get IDs from both
            cp_ids = [row['id'] for row in cp_result.data]
            p_ids = [row['id'] for row in p_result.data]
            
            missing_in_projects = [id for id in cp_ids if id not in p_ids]
            if missing_in_projects:
                print(f"   Missing in projects view: {len(missing_in_projects)} rows")
            
    except Exception as e:
        print(f"❌ Failed to compare row counts: {e}")
        all_tests_passed = False
    
    # Test 3.2: Check sample data consistency
    try:
        print("\n   Sample data comparison:")
        cp_sample = supabase.table("carbon_projects").select("id, nama_project, kabupaten").limit(2).execute()
        p_sample = supabase.table("projects").select("id, project_name, kabupaten").limit(2).execute()
        
        if cp_sample.data and p_sample.data:
            for i in range(min(len(cp_sample.data), len(p_sample.data))):
                cp = cp_sample.data[i]
                p = p_sample.data[i]
                
                if cp['id'] == p['id'] and cp['nama_project'] == p['project_name']:
                    print(f"     ✅ Row {i+1}: IDs and names match")
                else:
                    print(f"     ❌ Row {i+1}: Mismatch found")
                    print(f"        carbon_projects: {cp['nama_project']} ({cp['id'][:8]}...)")
                    print(f"        projects: {p['project_name']} ({p['id'][:8]}...)")
                    all_tests_passed = False
    except Exception as e:
        print(f"   ⚠️  Failed to compare sample data: {e}")
    
    print("\n🚀 TEST 4: API-RELATED FUNCTIONALITY")
    print("-" * 40)
    
    # Test 4.1: Check if common queries work
    test_queries = [
        ("Get active carbon projects", 
         supabase.table("carbon_projects").select("id, nama_project").eq("status", "active").limit(3)),
        ("Get projects by kabupaten",
         supabase.table("projects").select("id, project_name, kabupaten").limit(3)),
        ("Get programs with project info",
         supabase.table("programs").select("id, program_name, carbon_project_id").limit(3))
    ]
    
    for query_name, query in test_queries:
        try:
            result = query.execute()
            if result.data is not None:
                print(f"✅ {query_name}: {len(result.data)} rows returned")
            else:
                print(f"⚠️  {query_name}: No data returned")
        except Exception as e:
            print(f"❌ {query_name} failed: {e}")
            all_tests_passed = False
    
    print("\n" + "=" * 60)
    print("🎯 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    if all_tests_passed:
        print("✅ ALL TESTS PASSED")
        print("\nSystem is ready after foreign key fix:")
        print("1. ✅ carbon_projects table accessible")
        print("2. ✅ projects view created and accessible")
        print("3. ✅ Foreign key relationships valid")
        print("4. ✅ Data consistency maintained")
        print("5. ✅ API functionality working")
    else:
        print("❌ SOME TESTS FAILED")
        print("\nIssues detected:")
        print("1. Check if projects view was created")
        print("2. Verify database permissions")
        print("3. Run fix_foreign_key_simple.sql in Supabase SQL Editor")
        print("4. Test individual failing components")
    
    print("\n🔧 NEXT STEPS:")
    print("1. Run MCP health check to verify issue is resolved")
    print("2. Test frontend pages that use carbon/projects data")
    print("3. Monitor for any runtime errors")
    
    return all_tests_passed

if __name__ == "__main__":
    success = test_carbon_functions()
    sys.exit(0 if success else 1)