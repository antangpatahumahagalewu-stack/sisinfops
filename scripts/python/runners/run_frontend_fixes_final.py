#!/usr/bin/env python3
"""
FINAL Frontend Schema Fixes Runner
Script untuk menjalankan ketiga SQL fix untuk kompatibilitas frontend
Menggunakan password database yang benar: 4@@E-Zd%zCQ!7ZV
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_db_connection():
    """Create database connection using correct password"""
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
    
    if not supabase_url:
        print("❌ Missing Supabase URL")
        return None
    
    # Extract project reference from URL
    # Format: https://saelrsljpneclsbfdxfy.supabase.co
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    project_ref = match.group(1)
    print(f"✅ Project reference: {project_ref}")
    
    # Use correct password and host from testing
    db_password = "4@@E-Zd%zCQ!7ZV"
    db_host = f"db.{project_ref}.supabase.co"
    
    print(f"✅ Using password: {'*' * len(db_password)}")
    
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
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print(f"✅ Connected to {db_host}")
        return conn
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def execute_sql_file(conn, file_path):
    """Execute SQL file"""
    if not os.path.exists(file_path):
        print(f"❌ SQL file not found: {file_path}")
        return False
    
    print(f"\n📄 Executing: {file_path}")
    print("-" * 60)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # For compatibility, handle both full SQL scripts and simple SQL
        print(f"   File size: {len(sql_content):,} bytes")
        
        # Split into individual statements
        statements = []
        current = []
        in_block_comment = False
        
        for line_num, line in enumerate(sql_content.split('\n'), 1):
            stripped = line.strip()
            
            # Handle block comments
            if '/*' in line and '*/' in line:
                # Inline block comment
                continue
            elif '/*' in line:
                in_block_comment = True
                continue
            elif '*/' in line:
                in_block_comment = False
                continue
            
            if in_block_comment:
                continue
            
            # Skip single line comments
            if stripped.startswith('--'):
                # Print important comments
                if stripped.upper().find('FIX') >= 0 or stripped.upper().find('CREATE') >= 0:
                    print(f"   💬 {stripped}")
                continue
            
            if stripped:
                current.append(line)
                if stripped.endswith(';'):
                    statement = '\n'.join(current)
                    statements.append(statement)
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
                    # Print first 100 chars of statement
                    preview = stmt[:100].replace('\n', ' ')
                    if len(stmt) > 100:
                        preview += "..."
                    print(f"   📝 Statement {i}: {preview}")
                    
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
            print(f"   ⚠️  Some statements had errors (but script continues)")
            return False
            
    except Exception as e:
        print(f"❌ Error executing {file_path}: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_fixes(conn):
    """Verify that fixes were applied successfully"""
    print("\n" + "=" * 60)
    print("🔍 VERIFICATION")
    print("=" * 60)
    
    try:
        cursor = conn.cursor()
        
        # 1. Check Phase 2 tables
        print("\n📊 Checking Phase 2 tables...")
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
                print(f"   • {table[0]}")
        else:
            print("❌ No Phase 2 tables found")
        
        # 2. Check carbon_credits columns
        print("\n📊 Checking carbon_credits compatibility...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'carbon_credits' 
            AND column_name IN ('issuance_date', 'verra_registration_id')
        """)
        columns = cursor.fetchall()
        
        if columns:
            print("✅ Compatibility columns in carbon_credits:")
            for col in columns:
                print(f"   • {col[0]}")
        else:
            print("❌ Compatibility columns not found")
        
        # 3. Check DRAM table
        print("\n📊 Checking DRAM table...")
        try:
            cursor.execute("SELECT COUNT(*) FROM dram")
            dram_count = cursor.fetchone()[0]
            print(f"✅ DRAM table has {dram_count} records")
            
            # Check columns
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'dram' 
                AND column_name IN ('versi', 'tujuan_mitigasi', 'timeline_start', 'timeline_end', 'anggaran_total')
            """)
            dram_cols = cursor.fetchall()
            if dram_cols:
                print(f"✅ DRAM has {len(dram_cols)} frontend-compatible columns")
        except Exception as e:
            print(f"❌ DRAM check failed: {e}")
        
        # 4. Check relationships
        print("\n📊 Checking relationships...")
        cursor.execute("""
            SELECT 
                tc.table_name, 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND (tc.table_name = 'carbon_credits' OR tc.table_name = 'verra_project_registrations')
            ORDER BY tc.table_name
        """)
        fks = cursor.fetchall()
        
        if fks:
            print("✅ Foreign key relationships:")
            for fk in fks:
                print(f"   • {fk[0]}.{fk[1]} → {fk[2]}.{fk[3]}")
        else:
            print("⚠️  No foreign key relationships found")
        
        cursor.close()
        return True
        
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

def main():
    print("=" * 70)
    print("🎯 FINAL FRONTEND SCHEMA FIXES")
    print("=" * 70)
    print("\nThis script will fix frontend-database compatibility issues")
    print("by running three SQL migration files:")
    print("1. fix_missing_phase2_tables.sql - Creates missing Phase 2 tables")
    print("2. fix_frontend_schema_compatibility.sql - Fixes column name mismatches")
    print("3. fix_dram_table_structure.sql - Fixes DRAM table for frontend")
    print("\nExpected results:")
    print("• Carbon Credits page: No 'relationship' errors")
    print("• Verra Registration: Shows data")
    print("• DRAM page: Loads properly")
    print("• Financial Dashboard: All tables visible")
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
        print("\n❌ Failed to connect to database")
        return
    
    try:
        # Test connection
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Database: {version.split(',')[0]}")
        
        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
        table_count = cursor.fetchone()[0]
        print(f"✅ Public tables before: {table_count}")
        cursor.close()
        
        # Run each SQL file
        all_success = True
        print("\n" + "=" * 70)
        print("🚀 EXECUTING SQL FIXES")
        print("=" * 70)
        
        for sql_file in sql_files:
            success = execute_sql_file(conn, sql_file)
            if not success:
                all_success = False
            print("\n" + "-" * 70)
        
        # Verification
        verify_fixes(conn)
        
        # Final summary
        print("\n" + "=" * 70)
        if all_success:
            print("✅ ALL FIXES APPLIED SUCCESSFULLY!")
        else:
            print("⚠️  SOME FIXES HAD ERRORS (check output above)")
        
        print("\n🎯 FRONTEND BENEFITS:")
        print("• 'Could not find relationship' errors should be fixed")
        print("• 'Error fetching data: {}' errors should be resolved")
        print("• All Phase 2 pages should work")
        print("\n📋 NEXT STEPS:")
        print("1. Restart the Next.js development server")
        print("2. Clear browser cache if needed")
        print("3. Test Carbon Credits, Verra Registration, and DRAM pages")
        print("4. Check Financial Dashboard")
        
        print("\n✅ Script execution completed!")
        
    except Exception as e:
        print(f"❌ Error during execution: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

if __name__ == "__main__":
    main()