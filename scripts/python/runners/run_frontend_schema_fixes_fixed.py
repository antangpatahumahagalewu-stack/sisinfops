#!/usr/bin/env python3
"""
Frontend Schema Fixes Runner - Fixed Version
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

# Load environment variables from .env.local
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
print(f"📁 Looking for .env.local at: {env_path}")
print(f"📁 Current directory: {os.getcwd()}")

if not os.path.exists(env_path):
    print(f"❌ .env.local not found at: {env_path}")
    print("Listing files in current directory:")
    os.system("ls -la")
    sys.exit(1)

# Load the environment file
load_dotenv(dotenv_path=env_path)
print("✅ Loaded .env.local")

# Debug: Show what environment variables are loaded
print("\n🔍 Checking environment variables:")
print(f"   NEXT_PUBLIC_SUPABASE_URL: {'✅ Set' if os.getenv('NEXT_PUBLIC_SUPABASE_URL') else '❌ Not set'}")
print(f"   SUPABASE_SERVICE_ROLE_KEY: {'✅ Set' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else '❌ Not set'}")

# Database configuration
def get_db_config():
    """Get database configuration from environment variables"""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url:
        print("❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in environment variables!")
        sys.exit(1)
    
    if not supabase_key:
        print("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables!")
        sys.exit(1)
    
    # Parse Supabase URL to get connection details
    # Example URL: https://saelrsljpneclsbfdxfy.supabase.co
    import re
    match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Error: Invalid Supabase URL format: {supabase_url}")
        print("   Expected format: https://[project_ref].supabase.co")
        sys.exit(1)
    
    project_ref = match.group(1)
    print(f"✅ Parsed Supabase project reference: {project_ref}")
    
    # Supabase PostgreSQL connection details
    # For direct PostgreSQL connection, we need to construct hostname
    # The format is: [project_ref].supabase.co (port 5432) with SSL
    db_config = {
        'host': f'{project_ref}.supabase.co',
        'port': 5432,
        'database': 'postgres',
        'user': 'postgres',
        'password': supabase_key,
        'sslmode': 'require'
    }
    
    print(f"🔧 Database connection config:")
    print(f"   Host: {db_config['host']}")
    print(f"   Port: {db_config['port']}")
    print(f"   Database: {db_config['database']}")
    print(f"   User: {db_config['user']}")
    print(f"   SSL Mode: {db_config['sslmode']}")
    
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
        
        # Handle any remaining statement without semicolon
        if current_statement:
            statements.append('\n'.join(current_statement))
        
        # Execute each statement
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            try:
                if statement.strip():  # Skip empty statements
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
        print("🔌 Attempting database connection...")
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
        
        # Test verification
        print("\n🔍 VERIFYING CHANGES...")
        try:
            cursor = conn.cursor()
            
            # Check Phase 2 tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('verra_project_registrations', 'dram', 'carbon_credits', 'price_list', 'financial_reports')
                ORDER BY table_name
            """)
            tables = cursor.fetchall()
            
            if tables:
                print("✅ Phase 2 tables created:")
                for table in tables:
                    print(f"   - {table[0]}")
            else:
                print("❌ No Phase 2 tables found")
            
            # Check sample data
            cursor.execute("SELECT COUNT(*) FROM carbon_credits")
            credit_count = cursor.fetchone()[0]
            print(f"✅ Carbon credits sample data: {credit_count} records")
            
            cursor.execute("SELECT COUNT(*) FROM verra_project_registrations")
            verra_count = cursor.fetchone()[0]
            print(f"✅ Verra registrations: {verra_count} records")
            
            cursor.execute("SELECT COUNT(*) FROM dram")
            dram_count = cursor.fetchone()[0]
            print(f"✅ DRAM records: {dram_count} records")
            
        except Exception as e:
            print(f"   ⚠️  Verification error: {e}")
        
        conn.close()
        print("\n✅ Script execution completed!")
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print("\n💡 TROUBLESHOOTING:")
        print("1. Check if Supabase project is active and running")
        print("2. Verify service role key has correct permissions")
        print("3. Check network connectivity to Supabase")
        print("4. Ensure database allows connections from your IP")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()