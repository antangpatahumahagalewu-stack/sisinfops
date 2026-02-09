#!/usr/bin/env python3
"""Run simple verra fix without PL/pgSQL"""
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

def main():
    print("=" * 60)
    print("🔧 SIMPLE VERRA COLUMN FIX")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Read simple fix SQL
        fix_file = 'simple_fix_verra.sql'
        with open(fix_file, 'r') as f:
            sql_content = f.read()
        
        print("📄 Executing simple fix SQL...")
        
        # Split by semicolons
        statements = []
        current = []
        
        for line in sql_content.split('\n'):
            stripped = line.strip()
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
        
        print(f"   Found {len(statements)} statements")
        
        # Execute each statement
        for i, stmt in enumerate(statements, 1):
            try:
                cursor.execute(stmt)
                print(f"   ✅ Statement {i} executed")
                # Fetch and print results if it's a SELECT
                if stmt.strip().upper().startswith('SELECT'):
                    results = cursor.fetchall()
                    for row in results:
                        print(f"      {row}")
            except Exception as e:
                error_msg = str(e).split('\n')[0]
                print(f"   ❌ Statement {i} failed: {error_msg}")
                # Continue anyway
        
        conn.commit()
        
        # Test the frontend query
        print("\n🔍 Testing frontend query...")
        try:
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
            
            cursor.execute(query)
            results = cursor.fetchall()
            print(f"✅ Frontend query successful! Found {len(results)} results")
            
            if results:
                print("\n📋 Sample result:")
                import json
                first_row = results[0]
                print(f"   • Project ID: {first_row[0]}")
                
                # Get column names for carbon_projects
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'carbon_projects'
                    ORDER BY ordinal_position
                """)
                columns = [c[0] for c in cursor.fetchall()]
                
                # Try to find project code and name
                if len(columns) > 5:
                    # Try different column names
                    cursor.execute("SELECT kode_project, nama_project FROM carbon_projects LIMIT 1")
                    proj_info = cursor.fetchone()
                    if proj_info:
                        print(f"   • Project code: {proj_info[0]}")
                        print(f"   • Project name: {proj_info[1]}")
                
                # Check verra data
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
                
        except Exception as e:
            print(f"❌ Frontend query still failing: {e}")
            
            # Debug: show table structure
            print("\n🔧 Debug information:")
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'verra_project_registrations'
                ORDER BY column_name
            """)
            columns = cursor.fetchall()
            print(f"   Verra table columns ({len(columns)}):")
            for col in columns:
                print(f"      • {col[0]} ({col[1]})")
        
        cursor.close()
        print("\n✅ Fix execution completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

if __name__ == "__main__":
    main()