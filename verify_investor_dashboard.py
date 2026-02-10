#!/usr/bin/env python3
"""
Script untuk memverifikasi bahwa investor dashboard sudah menggunakan data real
dan tidak lagi menggunakan mock data.
"""

import os
import sys
import json
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def check_supabase_connection():
    """Check connection to Supabase and verify data"""
    print("🔍 CHECKING SUPABASE DATABASE...")
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase: {supabase_url.split('//')[1].split('.')[0]}")
        
        # Check carbon projects
        response = supabase.table("carbon_projects").select("*").execute()
        projects = response.data if response.data else []
        
        print(f"📊 Carbon projects in database: {len(projects)}")
        
        if len(projects) == 0:
            print("❌ No carbon projects found in database")
            print("   Run: python create_carbon_projects_real.py")
            return False
        
        # Check investor columns
        if projects:
            sample_project = projects[0]
            investor_columns = ['investment_amount', 'roi_percentage', 'carbon_sequestration_estimated']
            missing_columns = [col for col in investor_columns if col not in sample_project]
            
            if missing_columns:
                print(f"❌ Missing investor columns: {missing_columns}")
                print("   Run investor dashboard migration first")
                return False
            else:
                print("✅ Investor columns present in carbon_projects")
                
                # Show sample data
                print("\n📋 SAMPLE PROJECT DATA:")
                print(f"   Name: {sample_project.get('nama_project', 'N/A')}")
                print(f"   Kabupaten: {sample_project.get('kabupaten', 'N/A')}")
                print(f"   Luas: {sample_project.get('luas_total_ha', 0):,.2f} Ha")
                print(f"   Investment: Rp {sample_project.get('investment_amount', 0):,.0f}")
                print(f"   ROI: {sample_project.get('roi_percentage', 0)}%")
                print(f"   Carbon Seq: {sample_project.get('carbon_sequestration_estimated', 0):,.0f} tons")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return False

def check_api_endpoint():
    """Check the investor dashboard API endpoint"""
    print("\n🔍 CHECKING INVESTOR DASHBOARD API...")
    
    # Try to access the API endpoint
    api_url = "http://localhost:3000/api/investor/dashboard-data"
    
    try:
        # Note: API requires authentication, so we'll check if server is running
        response = requests.get("http://localhost:3000", timeout=5)
        
        if response.status_code == 200:
            print("✅ Development server is running")
            
            # Try to get a simple page to verify
            try:
                test_response = requests.get("http://localhost:3000/id/dashboard/investor", timeout=5)
                if test_response.status_code == 200:
                    print("✅ Investor dashboard page is accessible")
                    
                    # Check if page contains mock data indicators
                    page_content = test_response.text.lower()
                    
                    mock_indicators = [
                        'mock data',
                        'sample data', 
                        'dummy data',
                        'hardcoded',
                        'fallback data'
                    ]
                    
                    mock_found = any(indicator in page_content for indicator in mock_indicators)
                    
                    if mock_found:
                        print("⚠️  Page may still contain mock data indicators")
                    else:
                        print("✅ No obvious mock data indicators found")
                        
                    return True
                else:
                    print(f"⚠️  Investor dashboard page status: {test_response.status_code}")
                    return False
                    
            except requests.exceptions.RequestException as e:
                print(f"⚠️  Could not access investor dashboard page: {e}")
                return False
        else:
            print(f"⚠️  Development server status: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException:
        print("❌ Development server is not running")
        print("   Start it with: npm run dev")
        return False

def check_data_source():
    """Check what data source the investor dashboard is using"""
    print("\n🔍 CHECKING DATA SOURCE...")
    
    # Based on the investor-carbon-dashboard.tsx component, we can check:
    # The component should show data source in the header
    
    print("📋 EXPECTED DATA SOURCES (from code analysis):")
    print("   1. database_views - Migration successful, using views")
    print("   2. database_direct - Using direct table queries")
    print("   3. database_basic - Basic data with estimates")
    print("   4. fallback - Still using mock data ❌")
    
    print("\n💡 MANUAL VERIFICATION REQUIRED:")
    print("   1. Open http://localhost:3000/id/dashboard/investor")
    print("   2. Check the header for 'Data Source:' indicator")
    print("   3. It should show 'database_views' or 'database_direct'")
    print("   4. If it shows 'fallback', migration is not working")
    
    return True  # Manual verification step

def generate_verification_report():
    """Generate a comprehensive verification report"""
    print("\n" + "=" * 60)
    print("📋 VERIFICATION REPORT: INVESTOR DASHBOARD")
    print("=" * 60)
    
    # Check database
    db_ok = check_supabase_connection()
    
    # Check API
    api_ok = check_api_endpoint()
    
    # Data source check (manual)
    print("\n🔍 DATA SOURCE STATUS:")
    print("   This requires manual verification in the browser")
    
    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY:")
    print(f"   Database connection: {'✅ OK' if db_ok else '❌ FAILED'}")
    print(f"   API/Server status: {'✅ OK' if api_ok else '❌ FAILED'}")
    print(f"   Data source: {'🔍 MANUAL CHECK REQUIRED'}")
    
    if db_ok and api_ok:
        print("\n🎉 BASIC INFRASTRUCTURE IS READY!")
        print("\n📋 FINAL VERIFICATION STEPS:")
        print("   1. Open browser: http://localhost:3000/id/dashboard/investor")
        print("   2. Refresh the page")
        print("   3. Look for 'Data Source:' in the header")
        print("   4. It should NOT say 'fallback'")
        print("   5. Check that data matches 4 carbon projects")
        print("\n   Expected to see:")
        print("   - 4 project cards (Gunung Mas, Kapuas, Katingan, Pulang Pisau)")
        print("   - Real investment amounts (Rp billions)")
        print("   - ROI percentages (around 18%)")
        print("   - Carbon sequestration estimates (millions of tons)")
    else:
        print("\n❌ ISSUES DETECTED:")
        if not db_ok:
            print("   - Database connection or data issues")
            print("   - Run: python create_carbon_projects_real.py")
        if not api_ok:
            print("   - Development server not running")
            print("   - Start with: npm run dev")
        
        print("\n📋 TROUBLESHOOTING STEPS:")
        print("   1. Ensure Supabase is configured in .env.local")
        print("   2. Run carbon projects creation script")
        print("   3. Run investor dashboard migration")
        print("   4. Start development server")
        print("   5. Run this verification script again")
    
    print("\n" + "=" * 60)
    print("✅ VERIFICATION COMPLETE")

def main():
    print("🔍 VERIFYING INVESTOR DASHBOARD DATA SOURCE")
    print("=" * 60)
    
    generate_verification_report()
    
    # Additional check: Verify migration file exists
    migration_file = "supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql"
    if os.path.exists(migration_file):
        print(f"\n📄 Migration file: {migration_file} ✅")
    else:
        print(f"\n❌ Migration file missing: {migration_file}")
        print("   Please ensure the migration file exists")
    
    # Check if scripts are executable
    print("\n📋 AVAILABLE SCRIPTS:")
    scripts = [
        ("create_carbon_projects_real.py", "Create 4 carbon projects from PS data"),
        ("run_investor_migration.py", "Run investor dashboard migration"),
        ("verify_investor_dashboard.py", "Verify investor dashboard data source"),
    ]
    
    for script, description in scripts:
        if os.path.exists(script):
            print(f"   ✅ {script}: {description}")
        else:
            print(f"   ❌ {script}: Missing")
    
    print("\n📋 QUICK START COMMANDS:")
    print("   1. Create carbon projects:")
    print("      python create_carbon_projects_real.py")
    print("   2. Run migration (if not done automatically):")
    print("      python run_investor_migration.py")
    print("   3. Start development server (if not running):")
    print("      npm run dev")
    print("   4. Verify results:")
    print("      python verify_investor_dashboard.py")
    print("   5. Open investor dashboard:")
    print("      http://localhost:3000/id/dashboard/investor")

if __name__ == "__main__":
    main()