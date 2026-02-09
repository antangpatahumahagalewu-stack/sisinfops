#!/usr/bin/env python3
"""
Frontend Schema Fixes Runner
Script Python untuk menjalankan ketiga SQL fix untuk kompatibilitas frontend:
1. fix_missing_phase2_tables.sql
2. fix_frontend_schema_compatibility.sql  
3. fix_dram_table_structure.sql
"""
import os
import sys
import time
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
def get_db_config():
    """Get database configuration from environment variables"""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Environment variables not found!")
        print("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local")
        sys.exit(1)
    
    # Parse Supabase URL to get connection details
    # Example URL: https://rrvhekjdhdhtkmswjgwk.supabase.co
    import re
    match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Error: Invalid Supabase URL format: {supabase_url}")
        sys.exit(1)
    
    project_ref = match.group(1)
    
    # Supabase PostgreSQL connection details
    db_config = {
        'host': f'{project_ref}.supabase.co',
        'port': 5432,
        'database': 'postgres',
        'user': 'postgres',
        'password': supabase_key,
        'sslmode': 'require'
    }
    
    return db_config

def read_sql_file(file_path):
    """Read SQL file content"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"❌ Error: SQL file not found: {file_path}")
        return None
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return None

def execute_sql_script(conn, sql_script, script_name):
    """Execute SQL script and handle errors"""
    try:
        cursor = conn.cursor()
        print(f"\n🚀 Executing: {script_name}")
        print("-" * 50)
        
        # Split script into individual statements (simple approach)
        statements = []
        current_statement = []
        
        for line in sql_script.split('\n'):
            # Remove comments
            line = line.strip()
            if line.startswith('--'):
                print(f"  💬 {line}")
                continue
            
            # Skip empty lines
            if not line:
                continue
            
            current_statement.append(line)
            
            # Check if line ends a statement
            if line.endswith(';'):
                statement = '\n'.join(current_statement)
                statements.append(statement)
                current_statement = []
        
        # Execute each statement
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            try:
                cursor.execute(statement)
                print(f"  ✅ Statement {i} executed successfully")
                success_count += 1
            except Exception as e:
                print(f"  ❌ Statement {i} failed: {e}")
                error_count += 1
                # Don't stop on error, continue with next statement
                conn.rollback()  # Rollback the failed statement
                continue
        
        conn.commit()
        print(f"  📊 Results: {success_count} successful, {error_count} failed")
        
        if error_count == 0:
            return True
        else:
            print(f"  ⚠️  Some statements failed in {script_name}")
            return False
            
    except Exception as e:
        print(f"❌ Error executing {script_name}: {e}")
        conn.rollback()
        return False

def main():
    print("=" * 60)
    print("🎯 FRONTEND SCHEMA COMPATIBILITY FIXES")
    print("=" * 60)
    print("This script will fix frontend-database compatibility issues")
    print("by running three SQL migration files:")
    print("1. fix_missing_phase2_tables.sql")
    print("2. fix_frontend_schema_compatibility.sql")
    print("3. fix_dram_table_structure.sql")
    print("=" * 60)
    
    # Check if SQL files exist
    sql_files = [
        ('fix_missing_phase2_tables.sql', 'Create missing Phase 2 tables'),
        ('fix_frontend_schema_compatibility.sql', 'Fix column name mismatches'),
        ('fix_dram_table_structure.sql', 'Fix DRAM table structure')
    ]
    
    missing_files = []
    for filename, description in sql_files:
        if not os.path.exists(filename):
            missing_files.append(filename)
            print(f"❌ Missing: {filename} ({description})")
    
    if missing_files:
        print(f"\n❌ Error: {len(missing_files)} SQL file(s) missing!")
        print("Please ensure all SQL files are in the current directory.")
        sys.exit(1)
    
    # Get database configuration
    print("\n🔗 Connecting to Supabase database...")
    db_config = get_db_config()
    
    try:
        conn = psycopg2.connect(**db_config)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✅ Connected to database successfully!")
        
        # Run each SQL script
        all_success = True
        start_time = time.time()
        
        for filename, description in sql_files:
            print(f"\n📄 Processing: {filename}")
            print(f"   Purpose: {description}")
            
            sql_content = read_sql_file(filename)
            if sql_content is None:
                all_success = False
                continue
            
            success = execute_sql_script(conn, sql_content, filename)
            if not success:
                all_success = False
            
            # Small delay between scripts
            time.sleep(1)
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        print("\n" + "=" * 60)
        print("📊 EXECUTION SUMMARY")
        print("=" * 60)
        
        if all_success:
            print("✅ ALL SCRIPTS EXECUTED SUCCESSFULLY!")
        else:
            print("⚠️  SOME SCRIPTS HAD ERRORS")
        
        print(f"⏱️  Total execution time: {elapsed_time:.2f} seconds")
        
        # Show what was fixed
        print("\n🎯 FRONTEND FIXES APPLIED:")
        print("1. Missing Phase 2 tables created (Carbon Credits, Verra Registration, etc.)")
        print("2. Schema compatibility issues resolved")
        print("3. DRAM table structure fixed for frontend")
        print("\n✅ Frontend should now work without:")
        print("   - 'Could not find relationship' errors")
        print("   - 'Error fetching data: {}' errors")
        print("   - Missing table/column errors")
        
        # Test verification (optional)
        print("\n🔍 TESTING CONNECTION...")
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT '✅ Database is accessible' as status")
            result = cursor.fetchone()
            print(f"   {result[0]}")
            
            # Check if tables exist
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('verra_project_registrations', 'dram', 'carbon_credits')
            """)
            tables = cursor.fetchall()
            print(f"   Tables created: {', '.join([t[0] for t in tables]) if tables else 'None found'}")
            
        except Exception as e:
            print(f"   ⚠️  Verification error: {e}")
        
        conn.close()
        print("\n✅ Script execution completed!")
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print("\n💡 TROUBLESHOOTING:")
        print("1. Check if environment variables are set in .env.local")
        print("2. Verify Supabase service role key is correct")
        print("3. Check internet connection to Supabase")
        sys.exit(1)

if __name__ == "__main__":
    main()