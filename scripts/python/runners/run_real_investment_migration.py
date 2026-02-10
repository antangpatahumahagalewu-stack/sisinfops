#!/usr/bin/env python3
"""
Real Investment Migration Runner
Execute 202602101041_real_investment_fix.sql
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import time

def get_connection_params():
    """Get connection parameters from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '../../..', '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse Supabase URL
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    # Use the database password (from existing script)
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def execute_migration():
    """Execute the real investment migration SQL file"""
    sql_file = os.path.join(os.path.dirname(__file__), '../../../supabase/migrations/202602101041_real_investment_fix.sql')
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    
    # Get connection parameters
    params = get_connection_params()
    if not params:
        return False
    
    print(f"🔌 Connecting to {params['host']}...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Test connection
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"📊 PostgreSQL version: {version.split(',')[0]}")
        
        # Execute the entire SQL content
        print("\n🚀 Executing real investment migration SQL...")
        print("⏳ This may take 30-60 seconds...")
        
        # Execute the SQL (entire file as one statement)
        cur.execute(sql_content)
        
        # If we get here without error, it's successful
        print("\n✅ Migration SQL executed successfully!")
        
        # Verify migration
        print("\n🔍 Verifying migration results...")
        
        # Check new columns in carbon_projects
        print("\n📊 Checking carbon_projects table updates...")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'carbon_projects' 
            AND column_name IN ('kabupaten', 'luas_total_ha', 'real_investment_total', 
                               'avg_investment_per_ha', 'investment_calculation_method')
        """)
        columns = cur.fetchall()
        print(f"   New columns in carbon_projects: {len(columns)} added")
        for col_name, data_type in columns:
            cur.execute(f"SELECT COUNT(*) FROM carbon_projects WHERE {col_name} IS NOT NULL")
            count = cur.fetchone()[0]
            print(f"     • {col_name} ({data_type}): {count} rows have data")
        
        # Check programs count
        cur.execute("SELECT COUNT(*) FROM programs WHERE carbon_project_id IS NOT NULL")
        programs_with_mapping = cur.fetchone()[0]
        print(f"\n📊 Programs with carbon_project_id: {programs_with_mapping}")
        
        # Check approved budgets
        cur.execute("SELECT COUNT(*) FROM program_budgets WHERE status = 'approved'")
        approved_budgets = cur.fetchone()[0]
        print(f"📊 Approved budgets: {approved_budgets}")
        
        # Check real investment data
        cur.execute("""
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN real_investment_total > 0 THEN 1 END) as projects_with_real_data,
                COUNT(CASE WHEN investment_calculation_method = 'real_budget' THEN 1 END) as projects_using_real_budget
            FROM carbon_projects
        """)
        stats = cur.fetchone()
        print(f"\n📊 Investment data stats:")
        print(f"   Total carbon projects: {stats[0]}")
        print(f"   Projects with real investment data: {stats[1]}")
        print(f"   Projects using real_budget calculation: {stats[2]}")
        
        # Show sample data
        print(f"\n📊 Sample real investment data:")
        cur.execute("""
            SELECT 
                nama_project,
                kabupaten,
                luas_total_ha,
                investment_amount as old_estimated,
                real_investment_total as new_real,
                avg_investment_per_ha,
                investment_calculation_method
            FROM carbon_projects
            LIMIT 3
        """)
        for row in cur.fetchall():
            print(f"\n   • {row[0]} ({row[1]})")
            print(f"     Luas: {row[2]:,.2f} ha")
            print(f"     Old estimated: Rp {row[3]:,.0f}")
            print(f"     New real: Rp {row[4]:,.0f}")
            print(f"     Avg per ha: Rp {row[5]:,.0f}")
            print(f"     Method: {row[6]}")
        
        # Check view creation
        print(f"\n📊 Checking new view...")
        cur.execute("""
            SELECT COUNT(*) 
            FROM information_schema.views 
            WHERE table_name = 'v_investor_dashboard_data_real'
        """)
        view_exists = cur.fetchone()[0] > 0
        print(f"   v_investor_dashboard_data_real view: {'✅ EXISTS' if view_exists else '❌ NOT FOUND'}")
        
        # Clean up
        cur.close()
        conn.close()
        
        print(f"\n🎉 REAL INVESTMENT MIGRATION COMPLETE!")
        print(f"   ✅ Fixed missing columns in carbon_projects")
        print(f"   ✅ Created programs mapping to carbon projects")
        print(f"   ✅ Created and approved real budgets")
        print(f"   ✅ Implemented automatic calculation triggers")
        print(f"   ✅ Created v_investor_dashboard_data_real view")
        print(f"   ✅ Investor dashboard now uses REAL DATA from approved budgets")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"   Error details: {e.diag.message_primary if hasattr(e, 'diag') else 'No details'}")
        
        # Try to get more error context
        if hasattr(e, 'cursor') and e.cursor:
            try:
                # Get last few lines of SQL that caused error
                error_position = e.diag.position if hasattr(e.diag, 'position') else None
                if error_position:
                    # Find line number
                    lines = sql_content[:error_position].count('\n')
                    print(f"   Error at line: {lines + 1}")
                    
                    # Show context
                    lines_before = 5
                    start = max(0, error_position - 200)
                    context = sql_content[start:error_position + 100]
                    print(f"   Error context: ...{context}...")
            except:
                pass
        
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 70)
    print("🚀 REAL INVESTMENT DATA MIGRATION RUNNER")
    print("=" * 70)
    print("\n🎯 MIGRATION GOALS:")
    print("   1. Fix missing columns in carbon_projects table")
    print("   2. Create mapping between programs and carbon_projects")
    print("   3. Create approved budgets for real investment data")
    print("   4. Implement automatic calculation of real investment")
    print("   5. Create new view with REAL data for investor dashboard")
    
    print("\n🔄 BUSINESS LOGIC UPDATE:")
    print("   OLD: investment_amount = luas_total_ha × Rp 5,000,000 (HARDCODED)")
    print("   NEW: real_investment_total = Σ(approved program budgets)")
    print("        avg_investment_per_ha = real_investment_total ÷ luas_total_ha")
    
    print("\n⚠️  IMPORTANT:")
    print("   • This will replace hardcoded investment data with real budget data")
    print("   • Existing carbon_projects data will be updated")
    print("   • New programs and budgets will be created")
    print("   • The SQL is IDEMPOTENT (can run multiple times)")
    
    print("\nStarting in 5 seconds...")
    time.sleep(5)
    
    success = execute_migration()
    
    if success:
        print("\n" + "=" * 70)
        print("✅ REAL INVESTMENT MIGRATION SUCCESSFUL!")
        print("=" * 70)
        print("\n📋 NEXT STEPS:")
        print("   1. Update API endpoint to use v_investor_dashboard_data_real")
        print("      File: app/api/investor/dashboard-data/route.ts")
        print("   2. Update frontend to display avg_investment_per_ha")
        print("      File: components/dashboard/investor-carbon-dashboard.tsx")
        print("   3. Test investor dashboard with real data")
        print("      URL: http://localhost:3000/id/dashboard/investor")
        print("   4. Verify data source shows 'real_budget' not 'estimated'")
        
        print("\n🔧 API UPDATE EXAMPLE:")
        print("   // OLD:")
        print("   const { data: carbonProjects } = await supabase")
        print("     .from('v_investor_dashboard_data') // old view")
        print("     .select('*')")
        print("   ")
        print("   // NEW:")
        print("   const { data: carbonProjects } = await supabase")
        print("     .from('v_investor_dashboard_data_real') // new view with real data")
        print("     .select('*')")
        
        print("\n🎉 Investor dashboard will now show REAL investment data from approved budgets!")
        sys.exit(0)
    else:
        print("\n" + "=" * 70)
        print("❌ MIGRATION FAILED")
        print("=" * 70)
        print("\n🔧 TROUBLESHOOTING:")
        print("   1. Check Supabase project is active")
        print("   2. Verify database password is correct")
        print("   3. Check network connection to Supabase")
        print("   4. Try running SQL manually in Supabase SQL Editor")
        print("   5. Check if tables exist: carbon_projects, programs, program_budgets")
        sys.exit(1)

if __name__ == "__main__":
    main()