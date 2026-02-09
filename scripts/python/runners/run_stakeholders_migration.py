#!/usr/bin/env python3
"""
Simple script to run stakeholders migration SQL using Supabase REST API
"""
import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def get_supabase_config():
    """Get Supabase configuration from environment variables"""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url:
        raise ValueError("NEXT_PUBLIC_SUPABASE_URL not found in .env.local")
    if not service_role_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found in .env.local")
    
    return {
        'url': supabase_url,
        'key': service_role_key
    }

def execute_sql_via_rest(sql_statements):
    """Execute SQL statements using Supabase REST API"""
    config = get_supabase_config()
    
    # Supabase REST API endpoint for SQL execution
    url = f"{config['url']}/rest/v1/"
    
    headers = {
        'Authorization': f'Bearer {config["key"]}',
        'apikey': config['key'],
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Split SQL into individual statements
    statements = []
    current_statement = ""
    
    for line in sql_statements.split('\n'):
        line = line.strip()
        if not line or line.startswith('--'):
            continue
        
        current_statement += line + ' '
        
        # Check if statement ends with semicolon
        if ';' in line:
            # Clean up the statement
            stmt = current_statement.strip()
            if stmt:
                statements.append(stmt)
            current_statement = ""
    
    if current_statement.strip():
        statements.append(current_statement.strip())
    
    print(f"Found {len(statements)} SQL statements to execute")
    
    # Execute each statement
    for i, stmt in enumerate(statements, 1):
        print(f"\n[{i}/{len(statements)}] Executing: {stmt[:100]}...")
        
        # For Supabase REST API, we need to use the /rpc endpoint for arbitrary SQL
        rpc_url = f"{config['url']}/rest/v1/rpc/execute_sql"
        payload = {
            'query': stmt
        }
        
        try:
            response = requests.post(rpc_url, headers=headers, json=payload)
            
            if response.status_code in [200, 201, 204]:
                print(f"  ✅ Success")
                if response.text:
                    print(f"  Response: {response.text}")
            else:
                print(f"  ❌ Failed with status {response.status_code}")
                print(f"  Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            return False
    
    return True

def main():
    print("🚀 Running Stakeholders Migration Script")
    print("=" * 50)
    
    # Read the migration SQL file
    migration_file = 'supabase/migrations/202602021052_create_stakeholders_table.sql'
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)
    
    try:
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        print(f"📄 Reading migration file: {migration_file}")
        print(f"📏 File size: {len(sql_content)} characters")
        
        # Extract just the core table creation (skip sample data for now)
        # Find the start of table creation
        lines = sql_content.split('\n')
        core_sql = []
        in_core_section = False
        
        for line in lines:
            # Skip sample data section
            if '-- 4. Insert sample data' in line:
                print("  ⏭️  Skipping sample data insertion")
                break
            
            # Start collecting from table creation
            if 'CREATE TABLE IF NOT EXISTS stakeholders' in line:
                in_core_section = True
            
            if in_core_section:
                core_sql.append(line)
        
        if not core_sql:
            print("⚠️  Could not find CREATE TABLE statement, using entire file")
            core_sql = lines
        
        sql_to_execute = '\n'.join(core_sql)
        
        print(f"\n🔧 Executing core migration statements...")
        
        # Try to execute via REST API
        success = execute_sql_via_rest(sql_to_execute)
        
        if success:
            print("\n" + "=" * 50)
            print("✅ Migration completed successfully!")
            print("\n📋 What was created:")
            print("1. stakeholders table with 28 columns")
            print("2. Indexes for performance")
            print("3. RLS (Row Level Security) policies")
            print("4. Updated_at trigger")
            
            # Alternative: Use simpler approach - just create basic table
            print("\n💡 If REST API method fails, you can also:")
            print("1. Go to Supabase Dashboard")
            print("2. Navigate to SQL Editor")
            print("3. Copy and paste the SQL content")
            print("4. Click 'Run'")
            
        else:
            print("\n" + "=" * 50)
            print("❌ Migration failed via REST API")
            print("\n💡 Alternative approach:")
            print("1. Login to Supabase Dashboard:")
            print(f"   {os.getenv('NEXT_PUBLIC_SUPABASE_URL')}")
            print("2. Go to SQL Editor")
            print("3. Copy the SQL from the migration file")
            print("4. Paste and execute manually")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()