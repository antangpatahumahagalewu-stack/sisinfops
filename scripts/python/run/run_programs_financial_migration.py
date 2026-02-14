#!/usr/bin/env python3
"""
Script to run migration for adding financial columns to programs table
and update Carbon Projects Financial Snapshot to use actual program data
"""

import os
import sys
import psycopg2
from psycopg2 import sql
import re

def get_db_connection():
    """Get database connection from environment variables"""
    env_path = '/home/sangumang/Documents/sisinfops/.env.local'
    
    try:
        with open(env_path, 'r') as f:
            content = f.read()
        
        supabase_url = ''
        for line in content.split('\n'):
            if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                supabase_url = line.split('=', 1)[1].strip().strip('"\'')
                break
        
        if not supabase_url:
            print("❌ ERROR: NEXT_PUBLIC_SUPABASE_URL not found in .env.local")
            sys.exit(1)
        
        # Extract project reference from URL
        match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
        if not match:
            print(f"❌ ERROR: Could not parse Supabase URL: {supabase_url}")
            sys.exit(1)
        
        project_ref = match.group(1)
        db_host = f'db.{project_ref}.supabase.co'
        
        # Database credentials (adjust as needed)
        db_password = '4@@E-Zd%zCQ!7ZV'  # Default Supabase password
        
        print(f"🔗 Connecting to Supabase project: {project_ref}")
        print(f"📡 Database host: {db_host}")
        
        conn = psycopg2.connect(
            host=db_host,
            port=5432,
            database='postgres',
            user='postgres',
            password=db_password,
            sslmode='require'
        )
        
        print("✅ Database connection established")
        return conn
        
    except Exception as e:
        print(f"❌ ERROR connecting to database: {e}")
        sys.exit(1)

def run_migration(conn):
    """Run the SQL migration from file"""
    migration_file = '/home/sangumang/Documents/sisinfops/migrations/schema/add_financial_columns_to_programs.sql'
    
    try:
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        print(f"📄 Reading migration file: {migration_file}")
        
        # Execute the entire SQL file as one statement
        # This handles PL/pgSQL blocks and functions properly
        cur = conn.cursor()
        
        print("🚀 Executing migration...")
        try:
            cur.execute(sql_content)
            conn.commit()
            print("✅ Migration executed successfully")
            return True
        except Exception as e:
            conn.rollback()
            print(f"❌ Error executing migration: {e}")
            # Try to execute in smaller chunks as fallback
            return run_migration_chunked(conn, sql_content)
        
    except FileNotFoundError:
        print(f"❌ ERROR: Migration file not found: {migration_file}")
        return False
    except Exception as e:
        print(f"❌ ERROR running migration: {e}")
        return False

def run_migration_chunked(conn, sql_content):
    """Fallback: Run migration in smaller chunks"""
    print("🔄 Trying chunked execution...")
    
    # Split on semicolons but be careful with PL/pgSQL blocks
    chunks = []
    current_chunk = []
    in_plpgsql = False
    dollar_quote_level = 0
    
    lines = sql_content.split('\n')
    for i, line in enumerate(lines):
        current_chunk.append(line)
        
        # Track dollar-quoted strings for PL/pgSQL
        if '$$' in line:
            # Count occurrences in line
            dollar_count = line.count('$$')
            if dollar_count % 2 == 1:  # Odd number means toggle
                in_plpgsql = not in_plpgsql
        
        # End of statement when we have a semicolon and not in PL/pgSQL block
        if line.strip().endswith(';') and not in_plpgsql:
            chunks.append('\n'.join(current_chunk))
            current_chunk = []
    
    # Add any remaining chunk
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    # Execute chunks
    cur = conn.cursor()
    success_count = 0
    error_count = 0
    
    for i, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk or chunk.startswith('--'):
            continue
            
        try:
            print(f"🚀 Executing chunk {i+1}/{len(chunks)}...")
            cur.execute(chunk)
            success_count += 1
        except Exception as e:
            print(f"❌ Error executing chunk {i+1}: {e}")
            print(f"Chunk preview: {chunk[:200]}...")
            error_count += 1
    
    conn.commit()
    cur.close()
    
    print(f"\n📊 Chunked execution results:")
    print(f"   ✅ Successfully executed: {success_count} chunks")
    print(f"   ❌ Failed: {error_count} chunks")
    
    return error_count == 0

def verify_migration(conn):
    """Verify that migration was successful"""
    try:
        cur = conn.cursor()
        
        # Check if new columns exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'programs' 
            AND column_name IN ('spent_budget', 'goal', 'implementation_plan', 'progress_percentage')
            ORDER BY column_name
        """)
        new_columns = [row[0] for row in cur.fetchall()]
        
        # Check if view exists
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.views 
                WHERE table_name = 'v_carbon_project_financials'
            )
        """)
        view_exists = cur.fetchone()[0]
        
        # Check sample data for Pulang Pisau project
        project_id = '17a97b56-a525-4c65-b627-2e1e9e3ce343'
        cur.execute("""
            SELECT 
                COUNT(*) as program_count,
                COALESCE(SUM(total_budget), 0) as total_budget,
                COALESCE(SUM(spent_budget), 0) as total_spent
            FROM programs 
            WHERE carbon_project_id = %s
        """, (project_id,))
        
        result = cur.fetchone()
        program_count = result[0]
        total_budget = result[1]
        total_spent = result[2]
        
        # Get data from view
        cur.execute("""
            SELECT 
                total_programs,
                total_budget_all_programs,
                total_spent_all_programs,
                overall_progress_percentage
            FROM v_carbon_project_financials 
            WHERE carbon_project_id = %s
        """, (project_id,))
        
        view_data = cur.fetchone()
        
        cur.close()
        
        print("\n" + "="*50)
        print("✅ VERIFICATION RESULTS")
        print("="*50)
        print(f"📋 New columns added to programs table: {', '.join(new_columns)}")
        print(f"👁️  View created: v_carbon_project_financials = {view_exists}")
        print(f"\n📊 Sample data for project {project_id}:")
        print(f"   • Programs linked: {program_count}")
        print(f"   • Total budget: Rp {total_budget:,.0f}")
        print(f"   • Total spent: Rp {total_spent:,.0f}")
        
        if total_budget > 0:
            calculated_progress = (total_spent / total_budget) * 100
            print(f"   • Calculated progress: {calculated_progress:.1f}%")
        
        if view_data:
            print(f"\n📈 Data from financial view:")
            print(f"   • Total programs: {view_data[0]}")
            print(f"   • Total budget: Rp {view_data[1]:,.0f}")
            print(f"   • Total spent: Rp {view_data[2]:,.0f}")
            print(f"   • Overall progress: {view_data[3]:.1f}%")
        
        print("\n🎯 Financial Snapshot calculation now based on:")
        print("   ∑ programs.total_budget = Total Budget")
        print("   ∑ programs.spent_budget = Total Spent")
        print("   (Total Spent / Total Budget) × 100% = Progress")
        print("="*50)
        
        return len(new_columns) == 4 and view_exists
        
    except Exception as e:
        print(f"❌ ERROR during verification: {e}")
        return False

def main():
    """Main function"""
    print("="*60)
    print("📦 PROGRAMS FINANCIAL MIGRATION SCRIPT")
    print("="*60)
    print("Purpose: Add financial columns to programs table")
    print("         Update Carbon Projects Financial Snapshot")
    print("         Financial Snapshot = Akumulasi nilai program")
    print("="*60)
    
    # Connect to database
    conn = get_db_connection()
    
    try:
        # Run migration
        print("\n🚀 Starting migration...")
        success = run_migration(conn)
        
        if not success:
            print("❌ Migration failed")
            return 1
        
        # Verify migration
        print("\n🔍 Verifying migration...")
        verification = verify_migration(conn)
        
        if not verification:
            print("⚠️  Verification shows some issues")
        
        print("\n✅ MIGRATION COMPLETE")
        print("\n📋 Next steps:")
        print("   1. Update frontend getFinancialData() function")
        print("   2. Test Carbon Project detail page")
        print("   3. Verify Financial Snapshot shows real program data")
        
        return 0
        
    except Exception as e:
        print(f"❌ ERROR in main: {e}")
        return 1
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    sys.exit(main())