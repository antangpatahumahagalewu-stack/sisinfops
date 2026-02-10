#!/usr/bin/env python3
"""
Script untuk menjalankan migration real investment di Supabase.
Migration ini akan:
1. Fix missing columns di carbon_projects
2. Create mapping programs ↔ carbon_projects  
3. Create approved budgets untuk real investment data
4. Implement calculation logic dan triggers
5. Update investor view dengan real data
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def run_migration():
    print("🚀 RUNNING REAL INVESTMENT MIGRATION")
    print("=" * 60)
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        sys.exit(1)
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase: {supabase_url.split('//')[1].split('.')[0]}")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # Read migration SQL
    migration_file = "supabase/migrations/202602101041_real_investment_fix.sql"
    try:
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        print(f"✅ Loaded migration file: {migration_file}")
    except Exception as e:
        print(f"❌ Failed to read migration file: {e}")
        sys.exit(1)
    
    # Split SQL into individual statements
    # Note: Supabase Python client doesn't support raw SQL execution directly
    # We need to use a different approach
    
    print("\n⚠️  DIRECT SQL EXECUTION NOT SUPPORTED VIA PYTHON CLIENT")
    print("\n📋 MANUAL EXECUTION REQUIRED:")
    print("Please run the migration manually in Supabase Dashboard:")
    print(f"1. File: {migration_file}")
    print("2. Copy entire SQL content")
    print("3. Paste in Supabase SQL Editor")
    print("4. Click 'Run'")
    
    print("\n" + "=" * 60)
    print("📋 MIGRATION SUMMARY:")
    print("=" * 60)
    
    # Analyze what the migration will do
    print("\n1. 🔧 DATABASE STRUCTURE FIXES:")
    print("   - Add missing columns to carbon_projects:")
    print("     • kabupaten, luas_total_ha")
    print("     • real_investment_total, avg_investment_per_ha")
    print("     • investment_calculation_method, last_investment_calculation")
    
    print("\n2. 🗺️  PROGRAM MAPPING:")
    print("   - Create 4 programs (1 per carbon project)")
    print("   - Map programs to carbon_projects via carbon_project_id")
    
    print("\n3. 💰 REAL BUDGET CREATION:")
    print("   - Create approved budgets for each program")
    print("   - Budget amount based on project size (Rp 2-10M per ha)")
    print("   - Status: 'approved' (immediately for real data)")
    
    print("\n4. 🧮 CALCULATION LOGIC:")
    print("   - Function: calculate_real_investment()")
    print("   - Triggers for automatic calculation")
    print("   - Updates when budgets/programs change")
    
    print("\n5. 👁️  NEW INVESTOR VIEW:")
    print("   - View: v_investor_dashboard_data_real")
    print("   - Priority: real_investment_total > investment_amount")
    print("   - Includes: avg_investment_per_ha, calculation_method")
    
    print("\n" + "=" * 60)
    print("🎯 EXPECTED OUTCOME:")
    print("=" * 60)
    
    print("\n✅ Investor Dashboard akan menampilkan:")
    print("   • Total Investment dari approved budgets (REAL DATA)")
    print("   • Average Investment per Hectare (calculated)")
    print("   • Data Source: 'real_budget' atau 'estimated'")
    
    print("\n🔄 Business Logic Baru:")
    print("   IF ada approved budgets → GUNAKAN REAL DATA")
    print("   Total = Σ(approved budgets)")
    print("   Avg per Ha = Total ÷ luas_total_ha")
    print("   ")
    print("   IF TIDAK ada approved budgets → FALLBACK ke estimated")
    print("   Total = luas_total_ha × Rp 5,000,000")
    print("   Avg per Ha = Rp 5,000,000")
    
    print("\n" + "=" * 60)
    print("🔧 NEXT STEPS AFTER MIGRATION:")
    print("=" * 60)
    
    print("\n1. Update API endpoint:")
    print("   File: app/api/investor/dashboard-data/route.ts")
    print("   Change: Use v_investor_dashboard_data_real instead of current view")
    
    print("\n2. Update frontend display:")
    print("   File: components/dashboard/investor-carbon-dashboard.tsx")
    print("   Add: Display avg_investment_per_ha and data source indicator")
    
    print("\n3. Test investor dashboard:")
    print("   URL: http://localhost:3000/id/dashboard/investor")
    print("   Verify: Real investment data appears")
    
    print("\n4. Verify data accuracy:")
    print("   Run verification query to compare old vs new data")
    
    # Offer to show the SQL for manual execution
    response = input("\nDo you want to see the first 500 chars of SQL for manual execution? (yes/NO): ").strip().lower()
    
    if response == 'yes':
        print("\n" + "=" * 60)
        print("📝 SQL FOR MANUAL EXECUTION (first 500 chars):")
        print("=" * 60)
        print(sql_content[:500] + "..." if len(sql_content) > 500 else sql_content)
        print("\n📁 Full SQL file: " + migration_file)
    
    print("\n✅ Migration plan ready. Please run the SQL manually in Supabase Dashboard.")
    print("\n💡 Tip: Backup your database before running migration!")

if __name__ == "__main__":
    run_migration()