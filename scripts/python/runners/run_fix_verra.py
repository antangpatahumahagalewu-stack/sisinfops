#!/usr/bin/env python3
"""Run fix for verra_project_registrations columns"""
import psycopg2
import os
import sys

def get_db_connection():
    """Create database connection"""
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
    import re
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

def run_fix():
    """Run the verra column fix"""
    print("=" * 60)
    print("🔧 FIXING VERRA TABLE COLUMNS")
    print("=" * 60)
    print("\nProblem: Frontend expects 'status' column but table has 'registration_status'")
    print("Solution: Add 'status' column and copy data from 'registration_status'")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Read the fix SQL file
        fix_file = 'fix_verra_column.sql'
        if not os.path.exists(fix_file):
            print(f"❌ Fix SQL file not found: {fix_file}")
            return False
        
        print(f"📄 Reading fix SQL: {fix_file}")
        with open(fix_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Split into statements
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
                    statement = '\n'.join(current)
                    statements.append(statement)
                    current = []
        
        if current:
            statements.append('\n'.join(current))
        
        print(f"   Found {len(statements)} SQL statements")
        
        # Execute each statement
        success_count = 0
        error_count = 0
        
        for i, stmt in enumerate(statements, 1):
            try:
                if stmt.strip():
                    # Skip empty statements
                    cursor.execute(stmt)
                    print(f"   ✅ Statement {i} executed")
                    success_count += 1
            except Exception as e:
                error_msg = str(e).split('\n')[0]
                print(f"   ❌ Statement {i} failed: {error_msg}")
                error_count += 1
                conn.rollback()
                continue
        
        conn.commit()
        cursor.close()
        
        print(f"\n📊 Results: {success_count} successful, {error_count} failed")
        
        # Verify the fix
        print("\n🔍 Verifying fix...")
        cursor = conn.cursor()
        
        # Check columns
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'verra_project_registrations'
            AND column_name IN ('status', 'carbon_project_id', 'registration_status')
            ORDER BY column_name
        """)
        columns = cursor.fetchall()
        
        print("✅ Columns in verra_project_registrations:")
        for col_name, data_type in columns:
            print(f"   • {col_name} ({data_type})")
        
        # Check data
        cursor.execute("SELECT COUNT(*) FROM verra_project_registrations")
        count = cursor.fetchone()[0]
        print(f"✅ Total records: {count}")
        
        cursor.execute("SELECT status FROM verra_project_registrations LIMIT 3")
        statuses = cursor.fetchall()
        if statuses:
            print(f"✅ Sample status values: {[s[0] for s in statuses]}")
        
        cursor.close()
        
        if error_count == 0:
            print("\n✅ Fix applied successfully!")
            return True
        else:
            print("\n⚠️ Fix had some errors (but may still work)")
            return False
            
    except Exception as e:
        print(f"❌ Error during fix: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

def test_frontend_query():
    """Test if frontend query now works"""
    print("\n" + "=" * 60)
    print("🔍 TESTING FRONTEND QUERY AFTER FIX")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Test the exact frontend query
        query = """
            SELECT 
                cp.*,
                json_agg(
                    json_build_object(
                        'status', vpr.status,
                        'verra_project_id', vpr.verra_project_id,
                        'registration_date', vpr.registration_date
                    )
                ) as verra_project_registrations
            FROM carbon_projects cp
            LEFT JOIN verra_project_registrations vpr ON cp.id = vpr.project_id
            GROUP BY cp.id
            ORDER BY cp.created_at DESC
        """
        
        try:
            cursor.execute(query)
            results = cursor.fetchall()
            print(f"✅ Frontend query successful! Found {len(results)} results")
            
            if results:
                print("\n📋 Sample result:")
                # Show first result structure
                import json
                first_row = results[0]
                print(f"   • Project ID: {first_row[0]}")
                print(f"   • Project code: {first_row[5] if len(first_row) > 5 else 'N/A'}")
                
                # Check the JSON aggregation
                verra_data = first_row[-1] if first_row else None
                if verra_data:
                    try:
                        parsed = json.loads(verra_data)
                        print(f"   • Verra registrations: {len(parsed)}")
                        if parsed and parsed[0]:
                            print(f"   • Status: {parsed[0].get('status')}")
                            print(f"   • Verra ID: {parsed[0].get('verra_project_id')}")
                    except:
                        print(f"   • Verra data: {verra_data}")
                else:
                    print(f"   • Verra registrations: None")
            
            return True
            
        except Exception as e:
            print(f"❌ Frontend query still failing: {e}")
            print("\n🔧 Trying to understand the issue...")
            
            # Check individual tables
            cursor.execute("SELECT COUNT(*) FROM carbon_projects")
            cp_count = cursor.fetchone()[0]
            print(f"   • carbon_projects: {cp_count} records")
            
            cursor.execute("SELECT COUNT(*) FROM verra_project_registrations")
            vpr_count = cursor.fetchone()[0]
            print(f"   • verra_project_registrations: {vpr_count} records")
            
            # Check column names
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'verra_project_registrations'
                ORDER BY column_name
            """)
            columns = [c[0] for c in cursor.fetchall()]
            print(f"   • verra columns: {', '.join(columns[:10])}...")
            
            return False
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False
    finally:
        if conn:
            conn.close()

def main():
    print("🚀 VERRA COLUMN FIX SCRIPT")
    print("\nThis script will fix the column mismatch in verra_project_registrations table.")
    print("Frontend error: 'Error fetching carbon projects: {}'")
    print("Cause: Frontend expects 'status' column but table has 'registration_status'")
    print("=" * 60)
    
    # Run the fix
    success = run_fix()
    
    if success:
        # Test after fix
        test_success = test_frontend_query()
        
        print("\n" + "=" * 60)
        if test_success:
            print("🎉 ALL FIXES APPLIED SUCCESSFULLY!")
            print("\n✅ Frontend Verra Registration page should now work without errors.")
        else:
            print("⚠️ Fix applied but frontend query still has issues")
            print("Check the output above for details.")
    else:
        print("\n❌ Fix failed to apply completely")
    
    print("\n📋 NEXT STEPS:")
    print("1. Restart Next.js dev server")
    print("2. Clear browser cache")
    print("3. Test http://localhost:3001/dashboard/verra-registration")
    print("4. Check browser console for any remaining errors")

if __name__ == "__main__":
    main()