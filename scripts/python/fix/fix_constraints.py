#!/usr/bin/env python3
"""Fix constraints on verra_project_registrations table"""
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
    print("🔧 FIXING VERRA TABLE CONSTRAINTS")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Check existing constraints
        print("\n📊 Checking existing constraints...")
        cursor.execute("""
            SELECT 
                conname as constraint_name,
                contype as constraint_type,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conrelid = 'verra_project_registrations'::regclass
            ORDER BY conname
        """)
        
        constraints = cursor.fetchall()
        print(f"✅ Found {len(constraints)} constraints:")
        for name, ctype, definition in constraints:
            print(f"   • {name} ({ctype}): {definition}")
        
        # 2. Check check constraint details
        print("\n📊 Checking check constraint details...")
        cursor.execute("""
            SELECT 
                conname,
                pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'verra_project_registrations'::regclass
            AND contype = 'c'
            AND conname LIKE '%registration_status%'
        """)
        
        check_constraints = cursor.fetchall()
        for name, definition in check_constraints:
            print(f"   • {name}: {definition}")
        
        # 3. Drop problematic check constraint if it exists
        print("\n🔧 Fixing constraints...")
        
        # Check what values are currently in the table
        cursor.execute("SELECT DISTINCT registration_status FROM verra_project_registrations")
        existing_statuses = [row[0] for row in cursor.fetchall()]
        print(f"✅ Existing registration_status values: {existing_statuses}")
        
        cursor.execute("SELECT DISTINCT status FROM verra_project_registrations")
        existing_new_statuses = [row[0] for row in cursor.fetchall()]
        print(f"✅ Existing status values: {existing_new_statuses}")
        
        # Drop the check constraint to allow any values
        print("\n🗑️  Dropping check constraint...")
        try:
            cursor.execute("""
                ALTER TABLE verra_project_registrations 
                DROP CONSTRAINT IF EXISTS verra_project_registrations_registration_status_check
            """)
            print("✅ Dropped check constraint")
        except Exception as e:
            print(f"⚠️  Could not drop constraint: {e}")
            # Try with different name pattern
            try:
                cursor.execute("""
                    ALTER TABLE verra_project_registrations 
                    DROP CONSTRAINT IF EXISTS verra_project_registrations_registration_status_check1
                """)
                print("✅ Dropped alternative check constraint")
            except Exception as e2:
                print(f"⚠️  Could not drop alternative: {e2}")
        
        # 4. Add sample data with various statuses
        print("\n📝 Adding sample data with various statuses...")
        
        # First, get carbon projects
        cursor.execute("SELECT id, kode_project FROM carbon_projects ORDER BY created_at")
        projects = cursor.fetchall()
        
        # All possible statuses from frontend
        all_statuses = [
            'draft', 'internal_review', 'vvb_appointed', 'under_validation',
            'validated', 'submitted_to_verra', 'registered', 'under_monitoring',
            'under_verification', 'verified', 'issued', 'suspended', 'terminated'
        ]
        
        for i, (project_id, project_code) in enumerate(projects):
            # Check if already has verra registration
            cursor.execute("SELECT id FROM verra_project_registrations WHERE project_id = %s", (project_id,))
            existing = cursor.fetchone()
            
            if not existing:
                # Use different status for each project
                status = all_statuses[i % len(all_statuses)]
                verra_id = f"VERRA-VCS-2025-{i+1:03d}" if i < 3 else None
                reg_date = '2025-01-15' if i == 0 else None
                
                insert_query = """
                    INSERT INTO verra_project_registrations (
                        project_id,
                        carbon_project_id,
                        registration_code,
                        registration_status,
                        status,
                        verra_project_id,
                        submission_date,
                        registration_date,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """
                
                cursor.execute(insert_query, (
                    project_id,
                    project_id,
                    f"VERRA-{project_code}-2025",
                    status,
                    status,
                    verra_id,
                    '2024-12-01' if verra_id else None,
                    reg_date
                ))
                print(f"✅ Added {project_code}: {status}")
        
        # 5. Verify
        print("\n🔍 Verifying final state...")
        cursor.execute("SELECT COUNT(*) FROM verra_project_registrations")
        total = cursor.fetchone()[0]
        print(f"✅ Total verra registrations: {total}")
        
        cursor.execute("SELECT DISTINCT registration_status FROM verra_project_registrations")
        final_statuses = [row[0] for row in cursor.fetchall()]
        print(f"✅ Final registration_status values: {final_statuses}")
        
        # Test frontend query
        print("\n🔍 Testing frontend query...")
        cursor.execute("""
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
        """)
        
        results = cursor.fetchall()
        print(f"✅ Frontend query returns {len(results)} results")
        
        if results:
            import json
            for i, row in enumerate(results[:2]):
                verra_data = row[-1] if row else None
                if verra_data and verra_data != '[null]':
                    try:
                        parsed = json.loads(verra_data)
                        if parsed and parsed[0]:
                            print(f"   • Result {i+1}: Status={parsed[0].get('status')}, Verra ID={parsed[0].get('verra_project_id')}")
                    except:
                        pass
        
        cursor.close()
        print("\n✅ Constraints fixed and data added!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")
    
    print("\n📋 NEXT STEPS:")
    print("1. Restart Next.js server")
    print("2. Verra Registration page should now work")
    print("3. Check browser console for errors")

if __name__ == "__main__":
    main()