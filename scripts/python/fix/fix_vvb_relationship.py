#!/usr/bin/env python3
"""Fix relationship between vvb_engagements and verra_project_registrations"""
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

def check_relationships():
    """Check current table relationships"""
    print("=" * 60)
    print("🔍 CHECKING TABLE RELATIONSHIPS")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Check vvb_engagements table structure
        print("\n📊 vvb_engagements table columns:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'vvb_engagements'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        for col in columns:
            print(f"   • {col[0]} ({col[1]}, nullable: {col[2]})")
        
        # 2. Check foreign keys
        print("\n🔗 Foreign key relationships:")
        cursor.execute("""
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'vvb_engagements'
        """)
        
        fks = cursor.fetchall()
        if fks:
            for fk in fks:
                print(f"   • {fk[0]}.{fk[1]} → {fk[2]}.{fk[3]}")
        else:
            print("   • No foreign keys found")
        
        # 3. Check verra_project_registrations columns
        print("\n📊 verra_project_registrations table columns:")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'verra_project_registrations'
            AND column_name LIKE '%project%'
            ORDER BY ordinal_position
        """)
        verra_cols = cursor.fetchall()
        for col in verra_cols:
            print(f"   • {col[0]} ({col[1]})")
        
        # 4. Check carbon_projects
        print("\n📊 carbon_projects table columns:")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'carbon_projects'
            ORDER BY ordinal_position
            LIMIT 5
        """)
        carbon_cols = cursor.fetchall()
        for col in carbon_cols:
            print(f"   • {col[0]} ({col[1]})")
        
        cursor.execute("SELECT COUNT(*) FROM carbon_projects")
        carbon_count = cursor.fetchone()[0]
        print(f"✅ Carbon projects count: {carbon_count}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")

def fix_relationship():
    """Add missing relationship column"""
    print("\n" + "=" * 60)
    print("🔧 FIXING VVB-TO-VERRA RELATIONSHIP")
    print("=" * 60)
    print("\nProblem: Frontend expects relationship between vvb_engagements and verra_project_registrations")
    print("Solution: Add verra_registration_id column to vvb_engagements")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Add verra_registration_id column if it doesn't exist
        print("\n🔨 Adding verra_registration_id column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_engagements' 
                AND column_name = 'verra_registration_id'
            )
        """)
        column_exists = cursor.fetchone()[0]
        
        if not column_exists:
            cursor.execute("""
                ALTER TABLE vvb_engagements 
                ADD COLUMN verra_registration_id UUID REFERENCES verra_project_registrations(id) ON DELETE SET NULL
            """)
            print("✅ Added verra_registration_id column")
        else:
            print("✅ verra_registration_id column already exists")
        
        # 2. Add foreign key constraint if it doesn't exist
        print("\n🔗 Adding foreign key constraint...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'vvb_engagements'
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%verra_registration_id%'
            )
        """)
        fk_exists = cursor.fetchone()[0]
        
        if not fk_exists:
            # Try to add the constraint
            try:
                cursor.execute("""
                    ALTER TABLE vvb_engagements
                    ADD CONSTRAINT vvb_engagements_verra_registration_id_fkey 
                    FOREIGN KEY (verra_registration_id) 
                    REFERENCES verra_project_registrations(id) 
                    ON DELETE SET NULL
                """)
                print("✅ Added foreign key constraint")
            except Exception as e:
                print(f"⚠️  Could not add constraint: {e}")
        else:
            print("✅ Foreign key constraint already exists")
        
        # 3. Link existing engagements to verra registrations
        print("\n🔗 Linking existing data...")
        
        # Get all verra registrations
        cursor.execute("""
            SELECT id, project_id 
            FROM verra_project_registrations
        """)
        verra_registrations = cursor.fetchall()
        
        if verra_registrations:
            # Create mapping from project_id to verra_registration_id
            verra_map = {project_id: reg_id for reg_id, project_id in verra_registrations}
            
            # Update vvb_engagements that have matching project_id
            updated_count = 0
            for project_id, reg_id in verra_map.items():
                cursor.execute("""
                    UPDATE vvb_engagements
                    SET verra_registration_id = %s
                    WHERE project_id = %s 
                    AND verra_registration_id IS NULL
                """, (reg_id, project_id))
                updated_count += cursor.rowcount
            
            print(f"✅ Linked {updated_count} vvb_engagements to verra registrations")
        
        # 4. Verify the fix
        print("\n🔍 Verifying relationships...")
        
        # Count engagements with verra_registration_id
        cursor.execute("""
            SELECT 
                COUNT(*) as total_engagements,
                COUNT(verra_registration_id) as with_verra_link,
                COUNT(CASE WHEN verra_registration_id IS NULL THEN 1 END) as without_verra_link
            FROM vvb_engagements
        """)
        total, with_link, without_link = cursor.fetchone()
        print(f"✅ Total vvb_engagements: {total}")
        print(f"✅ With verra_registration_id: {with_link}")
        print(f"✅ Without verra_registration_id: {without_link}")
        
        # Show sample relationships
        cursor.execute("""
            SELECT 
                e.contract_number,
                e.engagement_type,
                vpr.verra_project_id,
                vpr.status,
                cp.kode_project
            FROM vvb_engagements e
            LEFT JOIN verra_project_registrations vpr ON e.verra_registration_id = vpr.id
            LEFT JOIN carbon_projects cp ON e.project_id = cp.id
            ORDER BY e.created_at DESC
            LIMIT 3
        """)
        
        samples = cursor.fetchall()
        print("\n📋 Sample linked data:")
        for contract_num, eng_type, verra_id, verra_status, project_code in samples:
            print(f"   • {contract_num}: {eng_type}, Project: {project_code}, Verra: {verra_id or 'None'}, Status: {verra_status or 'None'}")
        
        cursor.close()
        print("\n✅ Relationship fixed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

def test_frontend_query():
    """Test if frontend query now works"""
    print("\n" + "=" * 60)
    print("🔍 TESTING FRONTEND QUERY")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Test the exact query structure frontend expects
        print("\n📊 Testing Supabase-style relationship query...")
        
        try:
            # This is what the frontend is trying to do
            query = """
                SELECT 
                    e.*,
                    vpr.*,
                    vvb.*
                FROM vvb_engagements e
                LEFT JOIN verra_project_registrations vpr ON e.verra_registration_id = vpr.id
                LEFT JOIN vvb_organizations vvb ON e.vvb_id = vvb.id
                ORDER BY e.created_at DESC
                LIMIT 3
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            
            if results:
                print(f"✅ Relationship query successful! Found {len(results)} results")
                
                # Get column names
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'vvb_engagements'
                    ORDER BY ordinal_position
                """)
                e_cols = [c[0] for c in cursor.fetchall()]
                
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'verra_project_registrations'
                    ORDER BY ordinal_position
                """)
                vpr_cols = [c[0] for c in cursor.fetchall()]
                
                print(f"\n📋 Result structure:")
                print(f"   • vvb_engagements columns: {len(e_cols)}")
                print(f"   • verra_project_registrations columns: {len(vpr_cols)}")
                
                # Show first result summary
                if results[0]:
                    print(f"   • First result has {len(results[0])} columns total")
                
                # Show a specific joined field
                cursor.execute("""
                    SELECT e.contract_number, vpr.verra_project_id, vvb.organization_name
                    FROM vvb_engagements e
                    LEFT JOIN verra_project_registrations vpr ON e.verra_registration_id = vpr.id
                    LEFT JOIN vvb_organizations vvb ON e.vvb_id = vvb.id
                    WHERE e.verra_registration_id IS NOT NULL
                    LIMIT 1
                """)
                joined_sample = cursor.fetchone()
                if joined_sample:
                    print(f"   • Sample join: {joined_sample[0]} → Verra: {joined_sample[1]}, VVB: {joined_sample[2]}")
            else:
                print("⚠️  No results returned")
                
        except Exception as e:
            print(f"❌ Relationship query failed: {e}")
            
            # Try simpler query
            print("\n🔧 Trying simpler query...")
            try:
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM vvb_engagements e
                    JOIN verra_project_registrations vpr ON e.verra_registration_id = vpr.id
                """)
                join_count = cursor.fetchone()[0]
                print(f"✅ Simple join works: {join_count} linked records")
            except Exception as e2:
                print(f"❌ Simple join also failed: {e2}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
    finally:
        if conn:
            conn.close()

def main():
    print("🚀 FIXING VVB-TO-VERRA RELATIONSHIP")
    print("\nThis script will fix the missing relationship error:")
    print("❌ 'Could not find a relationship between 'vvb_engagements' and 'verra_project_registrations' in the schema cache'")
    print("=" * 60)
    
    # Check current relationships
    check_relationships()
    
    # Fix the relationship
    fix_relationship()
    
    # Test frontend query
    test_frontend_query()
    
    print("\n" + "=" * 60)
    print("🎉 RELATIONSHIP FIX COMPLETED!")
    print("=" * 60)
    print("\n✅ Frontend VVB Management page should now work without relationship errors.")
    print("\n📋 NEXT STEPS:")
    print("1. Supabase needs to refresh its schema cache (usually automatic)")
    print("2. Restart Next.js server if still having issues")
    print("3. Clear browser cache")
    print("4. Test http://localhost:3001/dashboard/vvb-management")

if __name__ == "__main__":
    main()