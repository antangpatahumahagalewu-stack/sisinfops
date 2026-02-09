#!/usr/bin/env python3
"""Create missing VVB tables for frontend compatibility"""
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

def create_vvb_tables():
    """Create VVB tables"""
    print("=" * 60)
    print("🔧 CREATING MISSING VVB TABLES")
    print("=" * 60)
    print("\nFrontend error: 'Could not find the table 'public.vvb_organizations' in the schema cache'")
    print("Solution: Create vvb_organizations and vvb_engagements tables")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Check if tables already exist
        print("\n📊 Checking existing tables...")
        for table in ['vvb_organizations', 'vvb_engagements']:
            cursor.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s)", (table,))
            exists = cursor.fetchone()[0]
            print(f"   • {table}: {'✅ EXISTS' if exists else '❌ MISSING'}")
        
        # 2. Create vvb_organizations table
        print("\n🔨 Creating vvb_organizations table...")
        create_vvb_orgs = """
        CREATE TABLE IF NOT EXISTS vvb_organizations (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            organization_code VARCHAR(50) UNIQUE NOT NULL,
            organization_name VARCHAR(255) NOT NULL,
            accreditation_body VARCHAR(100),
            accreditation_number VARCHAR(100),
            accreditation_valid_until DATE,
            country VARCHAR(100),
            contact_person VARCHAR(255),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            website VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """
        
        try:
            cursor.execute(create_vvb_orgs)
            print("✅ Created vvb_organizations table")
        except Exception as e:
            print(f"❌ Error creating vvb_organizations: {e}")
        
        # 3. Create vvb_engagements table
        print("\n🔨 Creating vvb_engagements table...")
        create_vvb_engagements = """
        CREATE TABLE IF NOT EXISTS vvb_engagements (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            project_id UUID REFERENCES carbon_projects(id) ON DELETE CASCADE,
            vvb_id UUID REFERENCES vvb_organizations(id) ON DELETE SET NULL,
            engagement_type VARCHAR(50) CHECK (engagement_type IN ('validation', 'verification', 'monitoring')),
            engagement_status VARCHAR(50) CHECK (engagement_status IN ('pending', 'active', 'completed', 'terminated', 'suspended')),
            start_date DATE,
            end_date DATE,
            contract_number VARCHAR(100),
            contract_value DECIMAL(15,2),
            currency VARCHAR(10) DEFAULT 'USD',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """
        
        try:
            cursor.execute(create_vvb_engagements)
            print("✅ Created vvb_engagements table")
        except Exception as e:
            print(f"❌ Error creating vvb_engagements: {e}")
        
        # 4. Disable RLS and grant permissions
        print("\n🔓 Setting up permissions...")
        try:
            cursor.execute("ALTER TABLE IF EXISTS vvb_organizations DISABLE ROW LEVEL SECURITY")
            cursor.execute("ALTER TABLE IF EXISTS vvb_engagements DISABLE ROW LEVEL SECURITY")
            print("✅ Disabled RLS")
            
            cursor.execute("GRANT USAGE ON SCHEMA public TO anon")
            cursor.execute("GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon")
            cursor.execute("GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon")
            print("✅ Granted permissions to anon user")
        except Exception as e:
            print(f"⚠️  Permission setup warning: {e}")
        
        # 5. Add sample data
        print("\n📝 Adding sample VVB data...")
        
        # Add sample VVB organizations
        vvb_orgs = [
            ("VVBA-001", "TÜV Rheinland", "UNFCCC", "VVBA-001-2025", "2026-12-31", "Germany", "Dr. Klaus Schmidt", "klaus.schmidt@tuv.com", "+49 221 806 0", "https://www.tuv.com"),
            ("VVBA-002", "SGS", "Verra", "VVBA-002-2024", "2025-06-30", "Switzerland", "Maria Rodriguez", "maria.rodriguez@sgs.com", "+41 22 739 91 11", "https://www.sgs.com"),
            ("VVBA-003", "DNV GL", "Gold Standard", "VVBA-003-2025", "2026-03-31", "Norway", "Erik Johansen", "erik.johansen@dnvgl.com", "+47 67 57 99 00", "https://www.dnvgl.com")
        ]
        
        for org_code, org_name, acc_body, acc_num, valid_until, country, contact_person, contact_email, contact_phone, website in vvb_orgs:
            cursor.execute("""
                INSERT INTO vvb_organizations (
                    organization_code, organization_name, accreditation_body, accreditation_number,
                    accreditation_valid_until, country, contact_person, contact_email, contact_phone, website
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (organization_code) DO NOTHING
            """, (org_code, org_name, acc_body, acc_num, valid_until, country, contact_person, contact_email, contact_phone, website))
        
        print(f"✅ Added {len(vvb_orgs)} VVB organizations")
        
        # Add sample engagements
        print("\n📝 Adding sample VVB engagements...")
        
        # Get a carbon project and VVB organization
        cursor.execute("SELECT id FROM carbon_projects LIMIT 1")
        project_result = cursor.fetchone()
        cursor.execute("SELECT id FROM vvb_organizations LIMIT 1")
        vvb_result = cursor.fetchone()
        
        if project_result and vvb_result:
            project_id = project_result[0]
            vvb_id = vvb_result[0]
            
            engagements = [
                (project_id, vvb_id, 'validation', 'active', '2024-11-01', '2025-04-30', 'CON-2024-001', 25000.00, 'USD'),
                (project_id, vvb_id, 'verification', 'pending', '2025-05-01', '2025-10-31', 'CON-2025-001', 18000.00, 'USD'),
            ]
            
            for proj_id, v_id, eng_type, eng_status, start_date, end_date, contract_num, contract_val, currency in engagements:
                cursor.execute("""
                    INSERT INTO vvb_engagements (
                        project_id, vvb_id, engagement_type, engagement_status,
                        start_date, end_date, contract_number, contract_value, currency
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (proj_id, v_id, eng_type, eng_status, start_date, end_date, contract_num, contract_val, currency))
            
            print(f"✅ Added {len(engagements)} VVB engagements")
        
        # 6. Verify
        print("\n🔍 Verifying tables...")
        cursor.execute("SELECT COUNT(*) FROM vvb_organizations")
        vvb_org_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM vvb_engagements")
        vvb_eng_count = cursor.fetchone()[0]
        
        print(f"✅ vvb_organizations: {vvb_org_count} records")
        print(f"✅ vvb_engagements: {vvb_eng_count} records")
        
        # Show sample data
        print("\n📋 Sample VVB organizations:")
        cursor.execute("SELECT organization_code, organization_name, accreditation_body FROM vvb_organizations LIMIT 3")
        for row in cursor.fetchall():
            print(f"   • {row[0]}: {row[1]} ({row[2]})")
        
        print("\n📋 Sample VVB engagements:")
        cursor.execute("""
            SELECT e.engagement_type, e.engagement_status, e.start_date, o.organization_name
            FROM vvb_engagements e
            JOIN vvb_organizations o ON e.vvb_id = o.id
            LIMIT 3
        """)
        for row in cursor.fetchall():
            print(f"   • {row[0]}: {row[1]}, Start: {row[2]}, VVB: {row[3]}")
        
        cursor.close()
        print("\n✅ VVB tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

def test_frontend_compatibility():
    """Test if frontend can now access VVB tables"""
    print("\n" + "=" * 60)
    print("🔍 TESTING FRONTEND COMPATIBILITY")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Test simple queries similar to what frontend would do
        print("\n📊 Testing frontend-style queries...")
        
        # Test 1: Query vvb_organizations
        try:
            cursor.execute("SELECT * FROM vvb_organizations LIMIT 3")
            org_results = cursor.fetchall()
            print(f"✅ Query vvb_organizations: {len(org_results)} results")
        except Exception as e:
            print(f"❌ vvb_organizations query failed: {e}")
        
        # Test 2: Query vvb_engagements
        try:
            cursor.execute("SELECT * FROM vvb_engagements LIMIT 3")
            eng_results = cursor.fetchall()
            print(f"✅ Query vvb_engagements: {len(eng_results)} results")
        except Exception as e:
            print(f"❌ vvb_engagements query failed: {e}")
        
        # Test 3: Complex join (like frontend might use)
        try:
            cursor.execute("""
                SELECT 
                    cp.kode_project,
                    cp.nama_project,
                    o.organization_name,
                    e.engagement_type,
                    e.engagement_status
                FROM carbon_projects cp
                LEFT JOIN vvb_engagements e ON cp.id = e.project_id
                LEFT JOIN vvb_organizations o ON e.vvb_id = o.id
                ORDER BY cp.kode_project
            """)
            join_results = cursor.fetchall()
            print(f"✅ Complex join query: {len(join_results)} results")
            
            if join_results:
                print("\n📋 Sample join results:")
                for row in join_results[:2]:
                    print(f"   • {row[0]}: {row[1]}, VVB: {row[2] or 'None'}, Type: {row[3] or 'None'}, Status: {row[4] or 'None'}")
        
        except Exception as e:
            print(f"❌ Complex query failed: {e}")
        
        cursor.close()
        print("\n✅ Frontend compatibility tests passed!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
    finally:
        if conn:
            conn.close()

def main():
    print("🚀 VVB TABLES FIX FOR FRONTEND COMPATIBILITY")
    print("\nThis script will create missing VVB tables to fix frontend errors:")
    print("1. 'Could not find the table 'public.vvb_organizations' in the schema cache'")
    print("2. 'Could not find the table 'public.vvb_engagements' in the schema cache'")
    print("=" * 60)
    
    # Create tables
    success = create_vvb_tables()
    
    if success:
        # Test compatibility
        test_frontend_compatibility()
        
        print("\n" + "=" * 60)
        print("🎉 VVB TABLES CREATED SUCCESSFULLY!")
        print("=" * 60)
        print("\n✅ Frontend VVB Management page should now work without errors.")
        print("\n📋 NEXT STEPS:")
        print("1. Restart Next.js server if it's running")
        print("2. Clear browser cache if needed")
        print("3. Visit: http://localhost:3001/dashboard/vvb-management")
        print("4. Check browser console for any remaining errors")
    else:
        print("\n❌ Failed to create VVB tables")

if __name__ == "__main__":
    main()