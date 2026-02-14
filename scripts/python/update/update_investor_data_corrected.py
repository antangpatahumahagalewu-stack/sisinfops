#!/usr/bin/env python3
"""
Script untuk update data investor setelah migration dijalankan.
VERSI DIPERBAIKI: Menggunakan struktur tabel yang sebenarnya.
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def calculate_investor_data(estimated_credits, status="active"):
    """
    Calculate investor data based on estimated credits
    Assumptions:
    - 1000 credits = 1 hectare
    - Rp 5 million per hectare investment
    - ROI depends on project status
    - Carbon sequestration = credits × 10 (for 10-year project)
    """
    # Convert credits to estimated hectares
    estimated_hectares = estimated_credits / 1000 if estimated_credits > 0 else 0
    
    # Calculate investment (Rp 5 million per hectare)
    investment = estimated_hectares * 5000000
    
    # ROI based on project status
    if status == 'active':
        roi = 18.0  # 18% for active projects
    elif status == 'approved':
        roi = 15.0  # 15% for approved
    elif status == 'validated':
        roi = 12.0  # 12% for validated
    else:
        roi = 10.0  # 10% for others
    
    # Carbon sequestration (credits × 10 years)
    carbon_seq = estimated_credits * 10
    
    # Performance rating based on ROI
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
        "investor_notes": f"Project based on {estimated_hectares:,.1f} estimated hectares ({estimated_credits:,.0f} credits). Estimated ROI: {roi}%."
    }

def main():
    print("🔄 UPDATING INVESTOR DATA FOR CARBON PROJECTS (CORRECTED VERSION)")
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
    
    # Get all carbon projects
    try:
        response = supabase.table("carbon_projects").select(
            "id, project_code, project_name, estimated_credits, status"
        ).execute()
        projects = response.data
        print(f"📊 Found {len(projects)} carbon projects")
    except Exception as e:
        print(f"❌ Failed to get projects: {e}")
        sys.exit(1)
    
    if not projects:
        print("❌ No carbon projects found")
        return
    
    print("\n📋 UPDATING PROJECTS:")
    print("-" * 60)
    
    updated = 0
    skipped = 0
    
    for project in projects:
        project_code = project.get("project_code", "Unknown")
        project_name = project.get("project_name", "Unknown")
        estimated_credits = project.get("estimated_credits", 0)
        status = project.get("status", "draft")
        
        print(f"\n🔹 {project_name}")
        print(f"   Kode: {project_code}")
        print(f"   Status: {status}")
        print(f"   Estimated Credits: {estimated_credits:,.0f}")
        
        if not estimated_credits or estimated_credits <= 0:
            print("   ⚠️  Skipping: No estimated credits data")
            skipped += 1
            continue
        
        investor_data = calculate_investor_data(estimated_credits, status)
        
        # Convert to Rupiah format for display
        investment_rp = investor_data["investment_amount"]
        
        print(f"   💰 Investment: Rp {investment_rp:,.0f}")
        print(f"   📈 ROI: {investor_data['roi_percentage']}%")
        print(f"   🌳 Carbon: {investor_data['carbon_sequestration_estimated']:,.0f} tons")
        print(f"   ⭐ Performance: {investor_data['performance_rating']}")
        
        try:
            response = supabase.table("carbon_projects").update(investor_data).eq("id", project["id"]).execute()
            if response.data:
                updated += 1
                print(f"   ✅ Updated investor data")
            else:
                print(f"   ❌ Failed to update")
                skipped += 1
        except Exception as e:
            error_msg = str(e)
            if "column" in error_msg and "does not exist" in error_msg:
                print(f"   ❌ ERROR: Investor columns not found. Have you run the migration?")
                print(f"   💡 Run migration first: See MIGRATION_INSTRUCTIONS.md")
            else:
                print(f"   ❌ Error: {error_msg[:100]}")
            skipped += 1
    
    print(f"\n📊 SUMMARY:")
    print(f"   ✅ Updated: {updated} projects")
    print(f"   ⚠️  Skipped: {skipped} projects")
    print(f"   📈 Total processed: {len(projects)} projects")
    
    if updated > 0:
        print("\n✅ INVESTOR DATA UPDATE COMPLETE!")
        print("\n📋 NEXT STEPS:")
        print("1. Run verification script:")
        print("   python3 verify_investor_dashboard_final.py")
        print("2. Check investor dashboard:")
        print("   http://localhost:3000/id/dashboard/investor")
        print("3. Verify data source shows 'database_views' or 'database_direct'")
    else:
        print("\n⚠️  NO DATA UPDATED")
        print("\n📋 POSSIBLE ISSUES:")
        print("1. Migration not run yet")
        print("2. Investor columns not added to table")
        print("3. Check error messages above")
        print("\n🔧 SOLUTION:")
        print("1. Run migration first: See MIGRATION_INSTRUCTIONS.md")
        print("2. Then run this script again")

if __name__ == "__main__":
    main()