#!/usr/bin/env python3
"""Run land analysis tables migration"""
import psycopg2
import os
import sys
import re

def get_db_connection():
    """Create database connection from .env.local"""
    env_path = '.env.local'
    if not os.path.exists(env_path):
        print(f"❌ {env_path} not found")
        return None
    
    # Parse .env.local
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value.strip().strip('"\'')
    
    supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
    
    if not supabase_url:
        print("❌ No Supabase URL")
        return None
    
    # Extract project reference
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Could not parse URL: {supabase_url}")
        return None
    
    project_ref = match.group(1)
    db_password = "4@@E-Zd%zCQ!7ZV"
    db_host = f"db.{project_ref}.supabase.co"
    
    params = {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require",
        "connect_timeout": 10
    }
    
    try:
        conn = psycopg2.connect(**params)
        print(f"✅ Connected to {db_host}")
        return conn
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def run_migration():
    """Execute the land analysis tables migration"""
    migration_file = 'supabase/migrations/202602040949_create_land_analysis_tables.sql'
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    print("\n⚠️  This will create land analysis tables for tab-lahan.tsx:")
    print("   • land_tenure - Data kepemilikan lahan")
    print("   • forest_status_history - Riwayat status hutan 10 tahun")
    print("   • deforestation_drivers - Analisis penyebab deforestasi")
    print("   • Sample data untuk testing")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        conn.autocommit = True  # Use autocommit for DDL statements
        cursor = conn.cursor()
        
        print("\n🚀 Executing land analysis migration...")
        
        # Execute the SQL
        cursor.execute(sql_content)
        print("✅ Land analysis migration SQL executed successfully!")
        
        # Verify the tables were created
        print("\n🔍 Verifying table creation...")
        tables_to_check = [
            'land_tenure',
            'forest_status_history', 
            'deforestation_drivers'
        ]
        
        for table in tables_to_check:
            cursor.execute(f"""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table}'
            """)
            table_exists = cursor.fetchone()
            
            if table_exists:
                # Count rows
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"✅ Table '{table}' exists ({count} rows)")
            else:
                print(f"❌ Table '{table}' not found")
        
        # Show sample data
        print("\n📋 Sample data summary:")
        cursor.execute("SELECT COUNT(*), 'land_tenure' FROM land_tenure UNION ALL SELECT COUNT(*), 'forest_status_history' FROM forest_status_history UNION ALL SELECT COUNT(*), 'deforestation_drivers' FROM deforestation_drivers")
        counts = cursor.fetchall()
        for count, table in counts:
            print(f"   • {table}: {count} records")
        
        # Show some sample details
        print("\n🔍 Sample details:")
        
        # Land tenure sample
        cursor.execute("SELECT ownership_status, area_ha, resolution_status FROM land_tenure LIMIT 1")
        tenure = cursor.fetchone()
        if tenure:
            print(f"   • Land tenure: {tenure[0]} - {tenure[1]} ha - Status: {tenure[2]}")
        
        # Forest history sample
        cursor.execute("SELECT year, forest_status, area_ha FROM forest_status_history ORDER BY year DESC LIMIT 1")
        forest = cursor.fetchone()
        if forest:
            print(f"   • Latest forest status: {forest[0]} - {forest[1]} - {forest[2]} ha")
        
        # Drivers sample
        cursor.execute("SELECT driver_type, historical_trend FROM deforestation_drivers LIMIT 1")
        driver = cursor.fetchone()
        if driver:
            print(f"   • Driver: {driver[0]} - Trend: {driver[1]}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 LAND ANALYSIS MIGRATION SUCCESSFUL!")
        print("\n📋 Frontend impact:")
        print("   1. PS detail page → Lahan tab will now work")
        print("   2. No more 'Error fetching land data:' console error")
        print("   3. 3 sub-tabs: Kepemilikan, Riwayat, Analisis")
        print("   4. Sample data untuk semua fitur")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 LAND ANALYSIS TABLES MIGRATION")
    print("=" * 60)
    print("\n⚠️  This will fix console error:")
    print("   • 'Error fetching land data:' in tab-lahan.tsx")
    print("   • Note: Different from ps_lahan table (simple land data)")
    print("\nStarting migration...")
    
    success = run_migration()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ LAND ANALYSIS MIGRATION COMPLETE!")
        print("=" * 60)
        print("\n💡 Tab Lahan sekarang akan bekerja dengan 3 sub-tab:")
        print("   • Kepemilikan & Tenure Lahan")
        print("   • Riwayat Status Hutan (10 tahun)")
        print("   • Analisis Penyebab Perubahan Lahan")
        print("\n📋 Final step: Restart Next.js dev server: npm run dev")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ LAND ANALYSIS MIGRATION FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check if tables already exist")
        print("   2. Verify database credentials")
        print("   3. Try running the SQL manually in Supabase SQL Editor")
        sys.exit(1)

if __name__ == "__main__":
    main()