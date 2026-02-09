#!/usr/bin/env python3
"""Add sample data to verra_project_registrations table"""
import psycopg2
import os
import sys
import json

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
    print("📝 ADDING SAMPLE VERRA REGISTRATION DATA")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get all carbon projects
        cursor.execute("SELECT id, kode_project, nama_project FROM carbon_projects ORDER BY created_at")
        projects = cursor.fetchall()
        
        print(f"📊 Found {len(projects)} carbon projects")
        
        # Sample verra registration data
        verra_samples = [
            {
                'status': 'registered',
                'verra_project_id': 'VERRA-VCS-2025-001',
                'registration_date': '2025-01-15',
                'registration_status': 'registered'
            },
            {
                'status': 'under_validation',
                'verra_project_id': 'VERRA-VCS-2025-002',
                'registration_date': None,
                'registration_status': 'under_validation'
            },
            {
                'status': 'draft',
                'verra_project_id': None,
                'registration_date': None,
                'registration_status': 'draft'
            }
        ]
        
        updated_count = 0
        inserted_count = 0
        
        for i, project in enumerate(projects):
            project_id, project_code, project_name = project
            print(f"\n📋 Project {i+1}: {project_code} - {project_name}")
            
            # Check if verra registration exists
            cursor.execute("SELECT id, verra_project_id, status FROM verra_project_registrations WHERE project_id = %s", (project_id,))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing record
                verra_id, existing_verra_id, existing_status = existing
                
                # Use sample data for this project
                sample = verra_samples[i % len(verra_samples)]
                
                # Only update if fields are NULL
                updates = []
                params = []
                
                if not existing_verra_id and sample['verra_project_id']:
                    updates.append("verra_project_id = %s")
                    params.append(sample['verra_project_id'])
                
                if not existing_status and sample['status']:
                    updates.append("status = %s")
                    params.append(sample['status'])
                
                if updates:
                    params.append(verra_id)
                    update_query = f"""
                        UPDATE verra_project_registrations 
                        SET {', '.join(updates)}, updated_at = NOW()
                        WHERE id = %s
                    """
                    cursor.execute(update_query, params)
                    updated_count += 1
                    print(f"✅ Updated verra registration")
                else:
                    print(f"✅ Already has data: ID={existing_verra_id}, Status={existing_status}")
            else:
                # Insert new record
                sample = verra_samples[i % len(verra_samples)]
                
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
                        registry_link,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """
                
                # Generate registration code
                reg_code = f"VERRA-{project_code}-2025-{i+1:03d}"
                
                cursor.execute(insert_query, (
                    project_id,  # project_id
                    project_id,  # carbon_project_id
                    reg_code,    # registration_code
                    sample['registration_status'],  # registration_status
                    sample['status'],  # status
                    sample['verra_project_id'],  # verra_project_id
                    '2024-12-01' if sample['verra_project_id'] else None,  # submission_date
                    sample['registration_date'],  # registration_date
                    f'https://registry.verra.org/app/projectDetail/VCS/{project_code}' if sample['verra_project_id'] else None,  # registry_link
                ))
                
                inserted_count += 1
                print(f"✅ Added verra registration: {reg_code}, Status: {sample['status']}")
        
        print(f"\n📊 Summary:")
        print(f"   • Projects processed: {len(projects)}")
        print(f"   • Records updated: {updated_count}")
        print(f"   • Records inserted: {inserted_count}")
        
        # Verify the data
        print("\n🔍 Verifying final data...")
        cursor.execute("""
            SELECT 
                cp.kode_project,
                cp.nama_project,
                vpr.verra_project_id,
                vpr.status,
                vpr.registration_date
            FROM carbon_projects cp
            LEFT JOIN verra_project_registrations vpr ON cp.id = vpr.project_id
            ORDER BY cp.kode_project
        """)
        
        results = cursor.fetchall()
        print("\n📋 Final data:")
        for row in results:
            project_code, project_name, verra_id, status, reg_date = row
            print(f"   • {project_code}: {verra_id or 'No ID'}, Status: {status or 'No status'}, Date: {reg_date or 'No date'}")
        
        # Test frontend query again
        print("\n🔍 Testing frontend query with new data...")
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
        
        frontend_results = cursor.fetchall()
        print(f"✅ Frontend query returns {len(frontend_results)} results")
        
        if frontend_results:
            import json
            first_result = frontend_results[0]
            verra_data = first_result[-1] if first_result else None
            
            if verra_data and verra_data != '[null]':
                try:
                    parsed = json.loads(verra_data)
                    if parsed and parsed[0]:
                        print(f"\n📋 Sample frontend data:")
                        print(f"   • Status: {parsed[0].get('status')}")
                        print(f"   • Verra ID: {parsed[0].get('verra_project_id')}")
                        print(f"   • Registration Date: {parsed[0].get('registration_date')}")
                except:
                    print(f"   • Verra data: {verra_data}")
        
        cursor.close()
        print("\n✅ Sample data added successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")
    
    print("\n📋 NEXT STEPS:")
    print("1. The 'Error fetching carbon projects: {}' error should be fixed")
    print("2. Restart Next.js server if it's running")
    print("3. Visit Verra Registration page to see the data")
    print("4. Check browser console for any remaining errors")

if __name__ == "__main__":
    main()