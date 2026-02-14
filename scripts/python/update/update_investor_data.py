#!/usr/bin/env python3
"""
Script untuk update data investor setelah migration dijalankan.
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def calculate_investor_data(luas_ha):
    investment = luas_ha * 5000000  # Rp 5 juta per hektar
    roi = 18.0  # 18% ROI
    carbon_seq = luas_ha * 100 * 10  # 100 ton/ha/year × 10 years
    
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

def main():
    print("🔄 UPDATING INVESTOR DATA FOR CARBON PROJECTS")
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
        response = supabase.table("carbon_projects").select("*").execute()
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
    for project in projects:
        print(f"\n🔹 {project.get('nama_project', 'Unknown')}")
        print(f"   ID: {project.get('id')}")
        print(f"   Luas: {project.get('luas_total_ha', 0):,.2f} Ha")
        
        luas = project.get('luas_total_ha', 0)
        if not luas:
            print("   ⚠️  Skipping: No luas data")
            continue
        
        investor_data = calculate_investor_data(luas)
        
        try:
            response = supabase.table("carbon_projects").update(investor_data).eq("id", project["id"]).execute()
            if response.data:
                updated += 1
                print(f"   ✅ Updated investor data")
                print(f"   💰 Investment: Rp {investor_data['investment_amount']:,.0f}")
                print(f"   📈 ROI: {investor_data['roi_percentage']}%")
                print(f"   🌳 Carbon: {investor_data['carbon_sequestration_estimated']:,.0f} tons")
            else:
                print(f"   ❌ Failed to update")
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:100]}")
    
    print(f"\n📊 Updated {updated} out of {len(projects)} projects")
    print("\n✅ INVESTOR DATA UPDATE COMPLETE!")
    print("\n📋 NEXT STEPS:")
    print("1. Check investor dashboard: http://localhost:3000/id/dashboard/investor")
    print("2. Verify data source shows 'database_views' or 'database_direct'")

if __name__ == "__main__":
    main()
