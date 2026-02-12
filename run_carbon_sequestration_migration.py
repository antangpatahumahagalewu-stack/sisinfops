#!/usr/bin/env python3
"""
Run Carbon Sequestration Actual View Migration
Connect to Supabase and execute the view creation SQL
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local"""
    # Read Supabase URL from .env.local
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse Supabase URL
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'').strip()
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference from URL: https://saelrsljpneclsbfdxfy.supabase.co
    if 'supabase.co' in supabase_url:
        import re
        match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
        if match:
            project_ref = match.group(1)
            db_host = f"db.{project_ref}.supabase.co"
        else:
            print(f"❌ Could not parse Supabase URL: {supabase_url}")
            return None
    else:
        print(f"❌ Not a Supabase URL: {supabase_url}")
        return None
    
    # Database password
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
    """Execute the carbon sequestration migration SQL file"""
    sql_file = os.path.join(os.path.dirname(__file__), 'migrations/schema/create_carbon_sequestration_actual_view.sql')
    
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
        print("\n🚀 Executing Carbon Sequestration View Migration...")
        print("⏳ This may take 10-20 seconds...")
        
        # Execute the SQL (entire file as one statement)
        cur.execute(sql_content)
        
        # If we get here without error, it's successful
        print("\n✅ Migration SQL executed successfully!")
        
        # Verify migration
        print("\n🔍 Verifying migration results...")
        
        # Check views were created
        cur.execute("""
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('v_carbon_sequestration_actual', 'v_carbon_sequestration_summary', 'v_investor_dashboard_summary')
            ORDER BY table_name
        """)
        views = cur.fetchall()
        print("   Views created:")
        for view in views:
            print(f"     • {view[0]} ({view[1]})")
        
        # Check data in the new view
        cur.execute("SELECT COUNT(*) FROM v_carbon_sequestration_actual")
        actual_count = cur.fetchone()[0]
        print(f"   Projects in actual view: {actual_count}")
        
        cur.execute("SELECT COUNT(*) FROM v_investor_dashboard_summary")
        summary_count = cur.fetchone()[0]
        print(f"   Investor dashboard summary rows: {summary_count}")
        
        # Get sample data from new view
        cur.execute("""
            SELECT 
                project_name, 
                actual_carbon_sequestration_tons,
                issued_credits_tons,
                retired_credits_tons,
                data_source
            FROM v_carbon_sequestration_actual 
            LIMIT 3
        """)
        sample_data = cur.fetchall()
        if sample_data:
            print("\n📊 Sample data from new view:")
            for row in sample_data:
                project_name = row[0] or "Unknown Project"
                actual_tons = row[1] or 0
                issued_tons = row[2] or 0
                retired_tons = row[3] or 0
                data_source = row[4] or "Unknown"
                print(f"   • {project_name[:30]}: {actual_tons:,} tons ({data_source})")
        
        # Check investor dashboard view
        cur.execute("""
            SELECT 
                total_carbon_projects,
                total_carbon_credits_tons,
                total_issued_credits_tons,
                overall_data_quality,
                investment_attractiveness
            FROM v_investor_dashboard_summary
        """)
        investor_data = cur.fetchone()
        if investor_data:
            print("\n📈 Investor dashboard summary:")
            print(f"   • Total projects: {investor_data[0] or 0}")
            if investor_data[1] is not None:
                print(f"   • Total carbon credits (tons): {investor_data[1]:,}")
            else:
                print(f"   • Total carbon credits (tons): 0")
            if investor_data[2] is not None:
                print(f"   • Total issued credits (tons): {investor_data[2]:,}")
            else:
                print(f"   • Total issued credits (tons): 0")
            print(f"   • Data quality: {investor_data[3] or 'Unknown'}")
            print(f"   • Investment attractiveness: {investor_data[4] or 'Unknown'}")
        
        # Clean up
        cur.close()
        conn.close()
        
        print(f"\n🎉 CARBON SEQUESTRATION MIGRATION COMPLETE!")
        print(f"   Investor dashboard will now show ACTUAL carbon data")
        print(f"   Card 'Carbon Sequestration' will display verified credits")
        print(f"   ROI calculations will use actual transaction data")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"   Error details: {e.diag.message_primary if hasattr(e, 'diag') else 'No details'}")
        
        # Try to get more error context
        if hasattr(e, 'cursor') and e.cursor:
            try:
                # Show problematic part of SQL
                query = e.cursor.query if hasattr(e.cursor, 'query') else str(e.cursor)
                print(f"   Last query context: {query[:200]}...")
            except:
                pass
        
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 CARBON SEQUESTRATION ACTUAL VIEW MIGRATION")
    print("=" * 60)
    print("\n📋 What this migration does:")
    print("   1. Creates v_carbon_sequestration_actual view")
    print("   2. Creates v_carbon_sequestration_summary view") 
    print("   3. Updates v_investor_dashboard_summary view")
    print("   4. Prioritizes ACTUAL carbon credits data over ESTIMATED")
    print("\n🎯 Impact:")
    print("   ✅ Investor dashboard shows ACTUAL carbon sequestration")
    print("   ✅ Card 'Carbon Sequestration' displays verified credits")
    print("   ✅ Better ROI calculations with transaction data")
    print("   ✅ Data source transparency (Actual vs Estimated)")
    print("\n⚠️  IMPORTANT:")
    print("   • Views are read-only (no data modification)")
    print("   • Migration is IDEMPOTENT (safe to run multiple times)")
    print("   • No existing data will be lost")
    print("\nStarting in 3 seconds...")
    
    import time
    time.sleep(3)
    
    success = execute_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ MIGRATION SUCCESSFUL!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("   1. Restart the frontend development server")
        print("   2. Navigate to: http://localhost:3000/id/dashboard/investor")
        print("   3. Check 'Carbon Sequestration' card - should show ACTUAL data")
        print("   4. Verify data source shows 'Actual Data from Carbon Credits'")
        print("\n🔧 Testing:")
        print("   • Refresh the investor dashboard page")
        print("   • Check browser console for any errors")
        print("   • Verify API endpoint: /api/investor/dashboard-data")
        print("\n📊 Expected improvements:")
        print("   • ROI calculations based on actual transaction values")
        print("   • Better investment attractiveness scoring")
        print("   • Transparency in data sources")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check Supabase project is active")
        print("   2. Verify database hostname: db.saelrsljpneclsbfdxfy.supabase.co")
        print("   3. Check database password is correct")
        print("   4. Ensure carbon_credits table exists (run Phase 2 migration)")
        print("   5. Try running the SQL manually in Supabase SQL Editor")
        print("\n💡 Manual method:")
        print("   1. Go to https://supabase.com/dashboard/project/saelrsljpneclsbfdxfy/sql-editor")
        print("   2. Copy content from: migrations/schema/create_carbon_sequestration_actual_view.sql")
        print("   3. Paste and click 'Run'")
        sys.exit(1)

if __name__ == "__main__":
    main()