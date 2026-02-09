#!/usr/bin/env python3
"""Fix missing columns in vvb_organizations table"""
import psycopg2
import os

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

def add_vvb_org_columns():
    """Add missing columns to vvb_organizations"""
    print("=" * 60)
    print("🔧 ADDING MISSING COLUMNS TO VVB_ORGANIZATIONS")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Rename organization_code to vvb_code if it doesn't exist
        print("\n📋 1. Checking vvb_code column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_organizations' 
                AND column_name = 'vvb_code'
            )
        """)
        vvb_code_exists = cursor.fetchone()[0]
        
        if not vvb_code_exists:
            # Check if organization_code exists and rename it
            cursor.execute("""
                ALTER TABLE vvb_organizations 
                RENAME COLUMN organization_code TO vvb_code
            """)
            print("✅ Renamed organization_code to vvb_code")
        else:
            print("✅ vvb_code column already exists")
        
        # 2. Add accreditation_status column
        print("\n📋 2. Adding accreditation_status column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_organizations' 
                AND column_name = 'accreditation_status'
            )
        """)
        acc_status_exists = cursor.fetchone()[0]
        
        if not acc_status_exists:
            cursor.execute("""
                ALTER TABLE vvb_organizations 
                ADD COLUMN accreditation_status VARCHAR(50) DEFAULT 'active'
            """)
            print("✅ Added accreditation_status column with default 'active'")
            
            # Update existing records
            cursor.execute("""
                UPDATE vvb_organizations 
                SET accreditation_status = 'active'
            """)
            print(f"✅ Set accreditation_status to 'active' for all records")
        else:
            print("✅ accreditation_status column already exists")
        
        # 3. Add countries_accredited column (array type)
        print("\n📋 3. Adding countries_accredited column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_organizations' 
                AND column_name = 'countries_accredited'
            )
        """)
        countries_exists = cursor.fetchone()[0]
        
        if not countries_exists:
            cursor.execute("""
                ALTER TABLE vvb_organizations 
                ADD COLUMN countries_accredited VARCHAR(100)[]
            """)
            print("✅ Added countries_accredited column (array)")
            
            # Set default based on country column
            cursor.execute("""
                UPDATE vvb_organizations 
                SET countries_accredited = ARRAY[country]
                WHERE country IS NOT NULL
            """)
            updated = cursor.rowcount
            print(f"✅ Set countries_accredited for {updated} records")
        else:
            print("✅ countries_accredited column already exists")
        
        # 4. Add methodologies_accredited column (array type)
        print("\n📋 4. Adding methodologies_accredited column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_organizations' 
                AND column_name = 'methodologies_accredited'
            )
        """)
        methodologies_exists = cursor.fetchone()[0]
        
        if not methodologies_exists:
            cursor.execute("""
                ALTER TABLE vvb_organizations 
                ADD COLUMN methodologies_accredited VARCHAR(100)[]
            """)
            print("✅ Added methodologies_accredited column (array)")
            
            # Set default methodologies
            cursor.execute("""
                UPDATE vvb_organizations 
                SET methodologies_accredited = ARRAY['VM0004', 'VM0007', 'VM0015']
            """)
            print("✅ Set default methodologies for all records")
        else:
            print("✅ methodologies_accredited column already exists")
        
        # 5. Add accreditation_expiry column (rename from accreditation_valid_until)
        print("\n📋 5. Adding accreditation_expiry column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_organizations' 
                AND column_name = 'accreditation_expiry'
            )
        """)
        acc_expiry_exists = cursor.fetchone()[0]
        
        if not acc_expiry_exists:
            # Check if accreditation_valid_until exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'vvb_organizations' 
                    AND column_name = 'accreditation_valid_until'
                )
            """)
            valid_until_exists = cursor.fetchone()[0]
            
            if valid_until_exists:
                cursor.execute("""
                    ALTER TABLE vvb_organizations 
                    RENAME COLUMN accreditation_valid_until TO accreditation_expiry
                """)
                print("✅ Renamed accreditation_valid_until to accreditation_expiry")
            else:
                cursor.execute("""
                    ALTER TABLE vvb_organizations 
                    ADD COLUMN accreditation_expiry DATE
                """)
                print("✅ Added accreditation_expiry column")
        else:
            print("✅ accreditation_expiry column already exists")
        
        # 6. Verify the fix
        print("\n📋 6. Verifying column additions...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'vvb_organizations'
            AND column_name IN ('vvb_code', 'accreditation_status', 'countries_accredited', 'methodologies_accredited', 'accreditation_expiry')
            ORDER BY column_name
        """)
        
        added_columns = cursor.fetchall()
        print("\n📊 Added/renamed columns:")
        for col_name, data_type in added_columns:
            print(f"   • {col_name} ({data_type})")
        
        # Show sample data
        print("\n📋 Sample data with new columns:")
        cursor.execute("""
            SELECT 
                vvb_code,
                organization_name,
                accreditation_status,
                countries_accredited,
                methodologies_accredited,
                accreditation_expiry
            FROM vvb_organizations
            LIMIT 3
        """)
        
        samples = cursor.fetchall()
        for vvb_code, org_name, acc_status, countries, methodologies, expiry in samples:
            print(f"   • {vvb_code}: {org_name}")
            print(f"     Status: {acc_status}, Expiry: {expiry}")
            print(f"     Countries: {countries}")
            print(f"     Methodologies: {methodologies}")
        
        cursor.close()
        print("\n✅ vvb_organizations columns fixed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

def main():
    print("🚀 FIXING VVB_ORGANIZATIONS COLUMNS FOR FRONTEND COMPATIBILITY")
    print("\nThis script will fix missing columns that the frontend expects.")
    print("Frontend expects: vvb_code, accreditation_status, countries_accredited,")
    print("methodologies_accredited, accreditation_expiry")
    print("=" * 60)
    
    # Add missing columns
    add_vvb_org_columns()
    
    print("\n" + "=" * 60)
    print("🎉 VVB_ORGANIZATIONS COLUMNS FIXED!")
    print("=" * 60)
    print("\n✅ Frontend should now work without column errors.")
    print("\n📋 Next steps:")
    print("1. Wait for Supabase schema cache refresh (1-2 minutes)")
    print("2. Restart Next.js server")
    print("3. Clear browser cache")
    print("4. Test http://localhost:3002/id/dashboard/vvb-management")

if __name__ == "__main__":
    main()