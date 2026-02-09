#!/usr/bin/env python3
"""Check which tables exist in the database"""
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
    print("🔍 CHECKING DATABASE TABLES")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        print(f"📊 Found {len(tables)} tables:")
        for table in tables:
            print(f"   • {table}")
        
        # Check specific VVB tables
        print("\n🔍 Checking VVB tables:")
        vvb_tables = ['vvb_organizations', 'vvb_engagements']
        for table in vvb_tables:
            cursor.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s)", (table,))
            exists = cursor.fetchone()[0]
            print(f"   • {table}: {'✅ EXISTS' if exists else '❌ MISSING'}")
        
        # If missing, show creation SQL
        if not all(cursor.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s)", (table,))[0] for table in vvb_tables):
            print("\n📋 Creation SQL needed:")
            print("""
-- vvb_organizations table
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
);

-- vvb_engagements table
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
);
            """)
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()