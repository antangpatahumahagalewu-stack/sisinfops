#!/usr/bin/env python3
"""
Simple Frontend Schema Fixes Runner
Script yang lebih sederhana untuk menjalankan ketiga SQL fix untuk kompatibilitas frontend
Menggunakan pendekatan langsung ke Supabase PostgreSQL
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_db_connection():
    """Create database connection using service role key"""
    # Read environment variables directly
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
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
    supabase_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing required environment variables")
        return None
    
    # Extract project reference from URL
    # Format: https://saelrsljpneclsbfdxfy.supabase.co
    # Host: db.saelrsljpneclsbfdxfy.supabase.co
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    project_ref = match.group(1)
    print(f"✅ Project reference: {project_ref}")
    
    # Connection parameters
    # Try both possible host formats
    possible_hosts = [
        f"db.{project_ref}.supabase.co",  # Pooler connection
        f"{project_ref}.supabase.co",      # Direct connection
        f"aws-0-ap-southeast-1.pooler.{project_ref}.supabase.co"  # Regional pooler
    ]
    
    for db_host in possible_hosts:
        print(f"🔧 Trying host: {db_host}")
        
        params = {
            "host": db_host,
            "port": 5432,
            "database": "postgres",
            "user": "postgres",
            "password": supabase_key,
            "sslmode": "require",
            "connect_timeout": 10
        }
        
        try:
            conn = psycopg2.connect(**params)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            print(f"✅ Connected successfully to {db_host}")
            return conn
        except Exception as e:
            print(f"   ❌ Connection failed: {e}")
            continue
    
    print("❌ All connection attempts failed")
    return None

def execute_sql_file(conn, file_path):
    """Execute SQL file"""
    if not os.path.exists(file_path):
        print(f"❌ SQL file not found: {file_path}")
        return False
    
    print(f"\n📄 Executing: {file_path}")
    print("-" * 50)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Split into individual statements
        statements = []
        current = []
        
        for line in sql_content.split('\n'):
            stripped = line.strip()
            
            # Skip comments
            if stripped.startswith('--'):
                print(f"   💬 {stripped}")
                continue
            
            if stripped:
                current.append(line)
                if stripped.endswith(';'):
                    statements.append('\n'.join(current))
                    current = []
        
        # Add any remaining statements
        if current:
            statements.append('\n'.join(current))
        
        print(f"   Found {len(statements)} SQL statements")
        
        cursor = conn.cursor()
        success_count = 0
        error_count = 0
        
        for i, stmt in enumerate(statements, 1):
            try:
                if stmt.strip():
                    cursor.execute(stmt)
                    print(f"   ✅ Statement {i} executed")
                    success_count += 1
            except Exception as e:
                error_msg = str(e).split('\n')[0]  # First line only
                print(f"   ❌ Statement {i} failed: {error_msg}")
                error_count += 1
                conn.rollback()
                continue
        
        conn.commit()
        cursor.close()
        
        print(f"\n   📊 Results: {success_count} successful, {error_count} failed")
        
        if error_count == 0:
            return True
        else:
            print(f"   ⚠️  Some statements had errors")
            return False
            
    except Exception as e:
        print(f"❌ Error executing {file_path}: {e}")
        return False

def main():
    print("=" * 70)
    print("🔧 SIMPLE FRONTEND SCHEMA FIXES RUNNER")
    print("=" * 70)
    print("\nThis script will run the following SQL fixes:")
    print("1. fix_missing_phase2_tables.sql - Creates missing Phase 2 tables")
    print("2. fix_frontend_schema_compatibility.sql - Fixes column name mismatches")
    print("3. fix_dram_table_structure.sql - Fixes DRAM table for frontend")
    print("\nThese fixes will resolve frontend errors like:")
    print("   • 'Could not find relationship between tables'")
    print("   • 'Error fetching data: {}'")
    print("   • 'table does not exist' errors")
    print("=" * 70)
    
    # Check SQL files exist
    sql_files = [
        'fix_missing_phase2_tables.sql',
        'fix_frontend_schema_compatibility.sql',
        'fix_dram_table_structure.sql'
    ]
    
    for sql_file in sql_files:
        if not os.path.exists(sql_file):
            print(f"\n❌ Error: {sql_file} not found!")
            print("Please ensure all SQL files are in the current directory.")
            return
    
    # Connect to database
    print("\n🔗 Establishing database connection...")
    conn = get_db_connection()
    if not conn:
        print("\n💡 TROUBLESHOOTING TIPS:")
        print("1. Check if Supabase project is active")
        print("2. Verify service role key has 'postgres' password permissions")
        print("3. Check network connectivity")
        print("4. Try running SQL manually in Supabase SQL Editor")
        return
    
    try:
        # Test connection
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Database: {version.split(',')[0]}")
        cursor.close()
        
        # Run each SQL file
        all_success = True
        for sql_file in sql_files:
            success = execute_sql_file(conn, sql_file)
            if not success:
                all_success = False
            print("\n" + "-" * 50)
        
        # Summary
        print("\n" + "=" * 70)
        if all_success:
            print("✅ ALL FIXES APPLIED SUCCESSFULLY!")
        else:
            print("⚠️  SOME FIXES HAD ERRORS")
        
        print("\n🔍 VERIFICATION:")
        cursor = conn.cursor()
        
        try:
            # Check Phase 2 tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('verra_project_registrations', 'dram', 'carbon_credits')
                ORDER BY table_name
            """)
            tables = cursor.fetchall()
            
            if tables:
                print("✅ Phase 2 tables created:")
                for table in tables:
                    print(f"   • {table[0]}")
            else:
                print("❌ No Phase 2 tables found")
            
            # Check column compatibility
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'carbon_credits' 
                AND column_name = 'issuance_date'
            """)
            if cursor.fetchone():
                print("✅ Column 'issuance_date' exists in carbon_credits")
            else:
                print("❌ Column 'issuance_date' not found")
            
            # Check DRAM table
            cursor.execute("SELECT COUNT(*) FROM dram")
            dram_count = cursor.fetchone()[0]
            print(f"✅ DRAM table has {dram_count} records")
            
        except Exception as e:
            print(f"⚠️  Verification error: {e}")
        
        cursor.close()
        
        print("\n🎯 FRONTEND BENEFITS:")
        print("• Carbon Credits page should work without relationship errors")
        print("• Verra Registration page should show data")
        print("• DRAM page should load properly")
        print("• Financial Dashboard should show all tables")
        
        print("\n✅ Script execution completed!")
        
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

if __name__ == "__main__":
    main()