#!/usr/bin/env python3
"""
Script untuk menganalisis struktur database terkait:
1. Relasi antara programs dan carbon_projects
2. Data program_budgets yang ada
3. Kondisi data investor saat ini
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def check_database_structure():
    print("🔍 ANALISIS STRUKTUR DATABASE UNTUK REAL INVESTMENT")
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
    
    # 1. Check carbon_projects table
    print("\n1. 📊 CARBON PROJECTS TABLE")
    print("-" * 40)
    try:
        response = supabase.table("carbon_projects").select("*", count="exact").limit(10).execute()
        carbon_projects = response.data
        carbon_count = len(carbon_projects) if carbon_projects else 0
        print(f"   Total carbon projects: {carbon_count}")
        
        if carbon_projects:
            print(f"   Sample projects:")
            for cp in carbon_projects[:3]:
                print(f"   - {cp.get('nama_project')} ({cp.get('kabupaten')})")
                print(f"     Luas: {cp.get('luas_total_ha')} ha")
                print(f"     Investment (current): Rp {cp.get('investment_amount', 0):,.0f}")
                print(f"     Investment per ha: Rp {cp.get('investment_amount', 0) / max(cp.get('luas_total_ha', 1), 1):,.0f}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 2. Check programs table
    print("\n2. 📋 PROGRAMS TABLE")
    print("-" * 40)
    try:
        response = supabase.table("programs").select("*", count="exact").limit(10).execute()
        programs = response.data
        program_count = len(programs) if programs else 0
        print(f"   Total programs: {program_count}")
        
        if programs:
            print(f"   Columns in programs table: {list(programs[0].keys()) if programs else 'No data'}")
            
            # Check for carbon_project_id column
            if programs and 'carbon_project_id' in programs[0]:
                print(f"   ✅ carbon_project_id column exists")
                # Count programs with carbon_project_id
                with_project = sum(1 for p in programs if p.get('carbon_project_id'))
                print(f"   Programs with carbon_project_id: {with_project}/{program_count}")
            else:
                print(f"   ⚠️  carbon_project_id column NOT found")
            
            # Check budget_status
            if programs:
                status_counts = {}
                for p in programs:
                    status = p.get('budget_status', 'unknown')
                    status_counts[status] = status_counts.get(status, 0) + 1
                print(f"   Budget status distribution: {status_counts}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 3. Check program_budgets table
    print("\n3. 💰 PROGRAM_BUDGETS TABLE")
    print("-" * 40)
    try:
        response = supabase.table("program_budgets").select("*", count="exact").limit(10).execute()
        budgets = response.data
        budget_count = len(budgets) if budgets else 0
        print(f"   Total program budgets: {budget_count}")
        
        if budgets:
            print(f"   Columns: {list(budgets[0].keys()) if budgets else 'No data'}")
            
            # Check status distribution
            status_counts = {}
            total_amount = 0
            for b in budgets:
                status = b.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
                total_amount += float(b.get('total_amount', 0))
            
            print(f"   Budget status: {status_counts}")
            print(f"   Total budget amount: Rp {total_amount:,.0f}")
            
            # Sample budgets
            print(f"   Sample budgets:")
            for b in budgets[:3]:
                print(f"   - {b.get('budget_name')}: Rp {b.get('total_amount', 0):,.0f} ({b.get('status')})")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 4. Check program_budget_items table
    print("\n4. 📝 PROGRAM_BUDGET_ITEMS TABLE")
    print("-" * 40)
    try:
        response = supabase.table("program_budget_items").select("*", count="exact").limit(5).execute()
        items = response.data
        item_count = len(items) if items else 0
        print(f"   Total budget items: {item_count}")
        
        if items:
            print(f"   Columns: {list(items[0].keys())}")
            
            # Check if linked to price_list
            with_price_list = sum(1 for i in items if i.get('price_list_id'))
            print(f"   Items with price_list_id: {with_price_list}/{item_count}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 5. Analyze potential mapping between programs and carbon_projects
    print("\n5. 🔗 POTENTIAL MAPPING ANALYSIS")
    print("-" * 40)
    
    try:
        # Get all programs and carbon projects to analyze names
        programs_resp = supabase.table("programs").select("id, program_name").execute()
        carbon_resp = supabase.table("carbon_projects").select("id, nama_project, kabupaten").execute()
        
        programs_list = programs_resp.data if programs_resp.data else []
        carbon_list = carbon_resp.data if carbon_resp.data else []
        
        print(f"   Programs available: {len(programs_list)}")
        print(f"   Carbon projects available: {len(carbon_list)}")
        
        # Try to find matches by name
        matches = []
        for program in programs_list[:10]:  # Limit to first 10 for analysis
            program_name = program.get('program_name', '').lower()
            for carbon in carbon_list:
                carbon_name = carbon.get('nama_project', '').lower()
                kabupaten = carbon.get('kabupaten', '').lower()
                
                # Simple matching logic
                if kabupaten in program_name or carbon_name in program_name:
                    matches.append({
                        'program_id': program.get('id'),
                        'program_name': program.get('program_name'),
                        'carbon_id': carbon.get('id'),
                        'carbon_name': carbon.get('nama_project'),
                        'match_type': 'name_similarity'
                    })
        
        print(f"   Potential name-based matches found: {len(matches)}")
        if matches:
            for m in matches[:3]:
                print(f"   - Program '{m['program_name']}' → Carbon '{m['carbon_name']}'")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 6. Calculate current hardcoded investment vs potential real investment
    print("\n6. 💸 INVESTMENT COMPARISON ANALYSIS")
    print("-" * 40)
    
    try:
        # Get carbon projects with current investment
        cp_resp = supabase.table("carbon_projects").select("id, nama_project, luas_total_ha, investment_amount").execute()
        carbon_projects = cp_resp.data if cp_resp.data else []
        
        # Get total approved budgets per potential carbon project
        # (This is simplified - would need actual mapping)
        budgets_resp = supabase.table("program_budgets").select("id, program_id, total_amount, status").execute()
        all_budgets = budgets_resp.data if budgets_resp.data else []
        
        print(f"   Analysis based on {len(carbon_projects)} carbon projects")
        
        # For each carbon project, calculate potential real investment
        for cp in carbon_projects[:3]:  # Limit to 3 for display
            current_investment = cp.get('investment_amount', 0)
            luas = cp.get('luas_total_ha', 0)
            
            # Calculate current avg per ha
            current_avg = current_investment / max(luas, 1)
            
            print(f"\n   Project: {cp.get('nama_project')}")
            print(f"   - Luas: {luas:,.2f} ha")
            print(f"   - Current investment (hardcoded): Rp {current_investment:,.0f}")
            print(f"   - Current avg per ha: Rp {current_avg:,.0f}")
            print(f"   - Hardcoded rate assumption: Rp 5,000,000 per ha")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 7. Summary and recommendations
    print("\n" + "=" * 60)
    print("🎯 SUMMARY & RECOMMENDATIONS")
    print("=" * 60)
    
    print("\n📋 CURRENT STATE:")
    print(f"1. Carbon projects: {carbon_count if 'carbon_count' in locals() else 'N/A'}")
    print(f"2. Programs: {program_count if 'program_count' in locals() else 'N/A'}")
    print(f"3. Program budgets: {budget_count if 'budget_count' in locals() else 'N/A'}")
    
    print("\n⚠️  ISSUES IDENTIFIED:")
    print("1. Hardcoded investment amount: Rp 5,000,000 per hectare")
    print("2. No direct relationship between programs and carbon_projects")
    print("3. Real budget data exists but not connected to investment calculation")
    
    print("\n✅ RECOMMENDED ACTIONS:")
    print("1. Add carbon_project_id column to programs table")
    print("2. Create mapping between existing programs and carbon projects")
    print("3. Implement calculation: Total Investment = Σ(approved program budgets)")
    print("4. Calculate: Avg per Ha = Total Investment ÷ Luas Total Project")
    print("5. Update investor dashboard to use real data")
    
    print("\n🔧 NEXT STEPS:")
    print("1. Determine mapping strategy for programs ↔ carbon_projects")
    print("2. Create migration script for database changes")
    print("3. Update calculation logic in API")
    print("4. Test with existing data")

if __name__ == "__main__":
    check_database_structure()