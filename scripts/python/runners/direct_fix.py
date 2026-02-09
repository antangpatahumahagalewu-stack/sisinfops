#!/usr/bin/env python3
"""Direct fix for verra table columns"""
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
    print("🎯 DIRECT FIX FOR VERRA TABLE")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True  # Use autocommit to avoid transaction issues
        cursor = conn.cursor()
        
        # 1. Check current columns
        print("\n📊 Checking current table structure...")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'verra_project_registrations'
            ORDER BY column_name
        """)
        columns = cursor.fetchall()
        print(f"✅ Table has {len(columns)} columns")
        
        status_exists = any(col[0] == 'status' for col in columns)
        registration_status_exists = any(col[0] == 'registration_status' for col in columns)
        
        print(f"   • 'status' column exists: {status_exists}")
        print(f"   • 'registration_status' column exists: {registration_status_exists}")
        
        # 2. Add status column if needed
        if not status_exists:
            print("\n➕ Adding 'status' column...")
            try:
                cursor.execute("""
                    ALTER TABLE verra_project_registrations 
                    ADD COLUMN status VARCHAR(50)
                """)
                print("✅ Added 'status' column")
                status_exists = True
            except Exception as e:
                print(f"❌ Failed to add status column: {e}")
                # Try different approach
                try:
                    cursor.execute("""
                        ALTER TABLE verra_project_registrations 
                        ADD COLUMN IF NOT EXISTS status VARCHAR(50)
                    """)
                    print("✅ Added 'status' column (IF NOT EXISTS)")
                    status_exists = True
                except Exception as e2:
                    print(f"❌ Still failed: {e2}")
                    return
        else:
            print("✅ 'status' column already exists")
        
        # 3. Copy data from registration_status to status
        if status_exists and registration_status_exists:
            print("\n📋 Copying data from registration_status to status...")
            cursor.execute("""
                SELECT COUNT(*) 
                FROM verra_project_registrations 
                WHERE registration_status IS NOT NULL AND status IS NULL
            """)
            rows_to_update = cursor.fetchone()[0]
            print(f"   Found {rows_to_update} rows to update")
            
            if rows_to_update > 0:
                cursor.execute("""
                    UPDATE verra_project_registrations 
                    SET status = registration_status 
                    WHERE status IS NULL AND registration_status IS NOT NULL
                """)
                print(f"✅ Updated {cursor.rowcount} rows")
        
        # 4. Verify the fix
        print("\n🔍 Verifying fix...")
        cursor.execute("""
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as with_status,
                   COUNT(CASE WHEN registration_status IS NOT NULL THEN 1 END) as with_registration_status
            FROM verra_project_registrations
        """)
        total, with_status, with_reg_status = cursor.fetchone()
        print(f"✅ Total rows: {total}")
        print(f"✅ Rows with 'status': {with_status}")
        print(f"✅ Rows with 'registration_status': {with_reg_status}")
        
        # 5. Test frontend query
        print("\n🔍 Testing frontend query...")
        try:
            # Use the exact frontend query
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
                
                # Get project info
                cursor.execute("SELECT kode_project, nama_project FROM carbon_projects LIMIT 1")
                proj_info = cursor.fetchone()
                if proj_info:
                    print(f"   • Project code: {proj_info[0]}")
                    print(f"   • Project name: {proj_info[1]}")
                
                # Check verra data
                verra_data = first_row[-1] if first_row else None
                if verra_data and verra_data != '[null]':
                    try:
                        parsed = json.loads(verra_data)
                        print(f"   • Verra registrations: {len(parsed)}")
                        if parsed and parsed[0]:
                            print(f"   • Status: {parsed[0].get('status')}")
                            print(f"   • Verra ID: {parsed[0].get('verra_project_id')}")
                    except:
                        print(f"   • Verra data: {verra_data}")
                else:
                    print(f"   • Verra registrations: None (no relationship data)")
            
            print("\n🎉 SUCCESS! Frontend query now works!")
            
        except Exception as e:
            print(f"❌ Frontend query still failing: {e}")
            print("\n🔧 Debug info:")
            
            # Check column names again
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'verra_project_registrations'
                AND column_name LIKE '%status%'
            """)
            status_cols = cursor.fetchall()
            print(f"   Status-related columns: {[c[0] for c in status_cols]}")
            
            # Test simple join
            cursor.execute("""
                SELECT cp.id, cp.kode_project, vpr.status, vpr.verra_project_id
                FROM carbon_projects cp
                LEFT JOIN verra_project_registrations vpr ON cp.id = vpr.project_id
                LIMIT 3
            """)
            simple_results = cursor.fetchall()
            print(f"   Simple join results: {len(simple_results)} rows")
            for row in simple_results:
                print(f"      • Project: {row[1]}, Status: {row[2]}, Verra ID: {row[3]}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")
    
    print("\n📋 NEXT STEPS:")
    print("1. Restart Next.js server: npm run dev")
    print("2. Clear browser cache")
    print("3. Visit: http://localhost:3001/dashboard/verra-registration")
    print("4. Check browser console for any remaining errors")

if __name__ == "__main__":
    main()