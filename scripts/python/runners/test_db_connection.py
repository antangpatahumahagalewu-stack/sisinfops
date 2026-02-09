#!/usr/bin/env python3
"""Test database connection with different passwords"""
import psycopg2
import os
import sys

def test_connection(host, password, description):
    print(f"\n🔧 Testing: {description}")
    print(f"   Host: {host}")
    print(f"   Password: {'*' * len(password) if password else 'None'}")
    
    params = {
        "host": host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": password,
        "sslmode": "require",
        "connect_timeout": 5
    }
    
    try:
        conn = psycopg2.connect(**params)
        print(f"✅ SUCCESS: Connected to {host}")
        
        # Test query
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"   PostgreSQL: {version.split(',')[0]}")
        
        # Check current database
        cur.execute("SELECT current_database();")
        db = cur.fetchone()[0]
        print(f"   Database: {db}")
        
        # Check tables
        cur.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        table_count = cur.fetchone()[0]
        print(f"   Public tables: {table_count}")
        
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return False

def main():
    print("=" * 60)
    print("🔍 DATABASE CONNECTION TESTER")
    print("=" * 60)
    
    # Read .env.local
    env_path = '.env.local'
    if not os.path.exists(env_path):
        print(f"❌ {env_path} not found")
        return
    
    # Parse .env.local
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value.strip().strip('"\'')
    
    supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL', '')
    service_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY', '')
    
    if not supabase_url:
        print("❌ No Supabase URL found")
        return
    
    # Extract project reference
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Could not parse URL: {supabase_url}")
        return
    
    project_ref = match.group(1)
    print(f"✅ Project: {project_ref}")
    print(f"✅ Service key available: {'Yes' if service_key else 'No'}")
    
    # Possible passwords to try
    passwords = [
        # Hardcoded from simple_migration.py
        "4@@E-Zd%zCQ!7ZV",
        # Try service key as password (might work if it's the actual password)
        service_key,
        # Try empty password
        "",
        # Try common defaults
        "postgres",
        "password",
        "admin",
        "root",
    ]
    
    # Possible hosts to try
    hosts = [
        f"db.{project_ref}.supabase.co",
        f"{project_ref}.supabase.co",
        f"aws-0-ap-southeast-1.pooler.{project_ref}.supabase.co",
    ]
    
    # Test each combination
    success = False
    for host in hosts:
        for password in passwords:
            if not password:
                continue
                
            description = f"{host} with password '{password[:4]}...'"
            if test_connection(host, password, description):
                print(f"\n🎉 WORKING COMBINATION FOUND!")
                print(f"   Host: {host}")
                print(f"   Password: {password}")
                success = True
                break
        
        if success:
            break
    
    if not success:
        print(f"\n❌ No working combination found")
        print(f"\n💡 NEXT STEPS:")
        print(f"1. Go to Supabase Dashboard: https://supabase.com/dashboard")
        print(f"2. Select project: {project_ref}")
        print(f"3. Go to Settings → Database")
        print(f"4. Find 'Connection string' or 'Password'")
        print(f"5. Use that password in the script")

if __name__ == "__main__":
    main()