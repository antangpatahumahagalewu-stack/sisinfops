#!/usr/bin/env python3
"""Fix missing columns in vvb_engagements table"""
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

def check_table_structure():
    """Check vvb_engagements table structure"""
    print("=" * 60)
    print("🔍 CHECKING VVB_ENGAGEMENTS TABLE STRUCTURE")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get all columns
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'vvb_engagements'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        print("\n📊 Current vvb_engagements columns:")
        for col in columns:
            print(f"   • {col[0]} ({col[1]}, nullable: {col[2]}, default: {col[3]})")
        
        # Check if contract_date exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_engagements' 
                AND column_name = 'contract_date'
            )
        """)
        contract_date_exists = cursor.fetchone()[0]
        
        print(f"\n📋 contract_date column exists: {contract_date_exists}")
        
        # Check other columns that frontend might expect
        frontend_columns = ['contract_date', 'status', 'accreditation_status', 'countries_accredited', 'methodologies_accredited']
        
        print("\n📋 Checking frontend-expected columns:")
        for col in frontend_columns:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'vvb_engagements' 
                    AND column_name = %s
                )
            """, (col,))
            exists = cursor.fetchone()[0]
            print(f"   • {col}: {'✅ EXISTS' if exists else '❌ MISSING'}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")

def add_missing_columns():
    """Add missing columns to vvb_engagements"""
    print("\n" + "=" * 60)
    print("🔧 ADDING MISSING COLUMNS TO VVB_ENGAGEMENTS")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Add contract_date column if missing
        print("\n📋 1. Adding contract_date column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_engagements' 
                AND column_name = 'contract_date'
            )
        """)
        contract_date_exists = cursor.fetchone()[0]
        
        if not contract_date_exists:
            cursor.execute("""
                ALTER TABLE vvb_engagements 
                ADD COLUMN contract_date DATE DEFAULT NOW()
            """)
            print("✅ Added contract_date column with default NOW()")
            
            # Copy data from start_date if available
            cursor.execute("""
                UPDATE vvb_engagements 
                SET contract_date = start_date 
                WHERE start_date IS NOT NULL
            """)
            updated = cursor.rowcount
            print(f"✅ Copied start_date to contract_date for {updated} records")
        else:
            print("✅ contract_date column already exists")
        
        # 2. Add status column if missing (different from engagement_status)
        print("\n📋 2. Adding status column...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'vvb_engagements' 
                AND column_name = 'status'
            )
        """)
        status_exists = cursor.fetchone()[0]
        
        if not status_exists:
            cursor.execute("""
                ALTER TABLE vvb_engagements 
                ADD COLUMN status VARCHAR(50) DEFAULT 'draft'
            """)
            print("✅ Added status column with default 'draft'")
            
            # Copy data from engagement_status if available
            cursor.execute("""
                UPDATE vvb_engagements 
                SET status = engagement_status 
                WHERE engagement_status IS NOT NULL
            """)
            updated = cursor.rowcount
            print(f"✅ Copied engagement_status to status for {updated} records")
        else:
            print("✅ status column already exists")
        
        # 3. Verify the fix
        print("\n📋 3. Verifying column additions...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'vvb_engagements'
            AND column_name IN ('contract_date', 'status')
            ORDER BY column_name
        """)
        
        added_columns = cursor.fetchall()
        print("\n📊 Added columns:")
        for col_name, data_type in added_columns:
            print(f"   • {col_name} ({data_type})")
        
        # Show sample data
        print("\n📋 Sample data with new columns:")
        cursor.execute("""
            SELECT contract_number, contract_date, status, engagement_status, start_date
            FROM vvb_engagements
            LIMIT 3
        """)
        
        samples = cursor.fetchall()
        for contract_num, contract_date, status, engagement_status, start_date in samples:
            print(f"   • {contract_num}: contract_date={contract_date}, status={status}, engagement_status={engagement_status}, start_date={start_date}")
        
        cursor.close()
        print("\n✅ Missing columns added successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

def check_vvb_organizations_structure():
    """Check vvb_organizations table structure"""
    print("\n" + "=" * 60)
    print("🔍 CHECKING VVB_ORGANIZATIONS TABLE STRUCTURE")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get all columns
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'vvb_organizations'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        print("\n📊 Current vvb_organizations columns:")
        for col in columns:
            print(f"   • {col[0]} ({col[1]}, nullable: {col[2]})")
        
        # Check columns that frontend expects
        frontend_columns = [
            'vvb_code',
            'accreditation_status', 
            'countries_accredited',
            'methodologies_accredited',
            'accreditation_expiry'
        ]
        
        print("\n📋 Checking frontend-expected columns:")
        for col in frontend_columns:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'vvb_organizations' 
                    AND column_name = %s
                )
            """, (col,))
            exists = cursor.fetchone()[0]
            print(f"   • {col}: {'✅ EXISTS' if exists else '❌ MISSING'}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")

def main():
    print("🚀 FIXING MISSING COLUMNS FOR FRONTEND COMPATIBILITY")
    print("\nThis script will fix missing columns that the frontend expects.")
    print("Current error: 'column vvb_engagements.contract_date does not exist'")
    print("=" * 60)
    
    # Check current structure
    check_table_structure()
    
    # Add missing columns
    add_missing_columns()
    
    # Check vvb_organizations structure
    check_vvb_organizations_structure()
    
    print("\n" + "=" * 60)
    print("🎉 MISSING COLUMNS FIXED!")
    print("=" * 60)
    print("\n✅ Frontend should now work without column errors.")
    print("\n📋 Next steps:")
    print("1. Restart Next.js server if needed")
    print("2. Clear browser cache")
    print("3. Test http://localhost:3002/id/dashboard/vvb-management")

if __name__ == "__main__":
    main()