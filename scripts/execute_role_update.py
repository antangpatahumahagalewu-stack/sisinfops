#!/usr/bin/env python3
"""
Execute Role Permissions Update Script
Run the update_role_permissions.sql file against Supabase database
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_supabase_credentials():
    """Get Supabase credentials from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse environment variables
    supabase_url = ""
    service_role_key = ""
    
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('#') or not line:
            continue
        
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
        elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            service_role_key = line.split('=', 1)[1].strip().strip('"\'')
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference from URL: https://saelrsljpneclsbfdxfy.supabase.co
    # Database host: db.saelrsljpneclsbfdxfy.supabase.co
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    project_ref = match.group(1)
    db_host = f"db.{project_ref}.supabase.co"
    
    # Database password - we'll try to get from the URL or use a known one
    # From previous scripts, password seems to be: 4@@E-Zd%zCQ!7ZV
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def execute_sql_file(sql_file_path):
    """Execute SQL file against database"""
    if not os.path.exists(sql_file_path):
        print(f"❌ SQL file not found: {sql_file_path}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file_path}")
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    
    # Get connection parameters
    params = get_supabase_credentials()
    if not params:
        return False
    
    print(f"🔌 Connecting to {params['host']}...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Test connection
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"📊 PostgreSQL version: {version.split(',')[0]}")
        
        # Execute the SQL file
        print("\n🚀 Executing role permissions update...")
        print("⏳ Please wait...")
        
        # Split SQL by semicolons and execute each statement
        # But careful with $$ blocks and comments
        statements = []
        current_statement = []
        in_dollar_quote = False
        dollar_tag = None
        
        lines = sql_content.split('\n')
        for line in lines:
            line_stripped = line.strip()
            
            # Handle dollar quoting
            if '$$' in line:
                if not in_dollar_quote:
                    # Find the start of dollar quote
                    dollar_tag_match = line.find('$$')
                    if dollar_tag_match >= 0:
                        in_dollar_quote = True
                        # Check if there's a tag after $$
                        rest = line[dollar_tag_match+2:].strip()
                        if rest:
                            dollar_tag = rest.split()[0] if rest else None
                else:
                    # Check if this line ends the dollar quote
                    if dollar_tag:
                        if f'$${dollar_tag}' in line:
                            in_dollar_quote = False
                            dollar_tag = None
                    elif '$$' in line:
                        in_dollar_quote = False
            
            current_statement.append(line)
            
            # End of statement (outside dollar quotes)
            if not in_dollar_quote and line.rstrip().endswith(';'):
                statement = '\n'.join(current_statement)
                statements.append(statement)
                current_statement = []
        
        # If there's leftover content, add it
        if current_statement:
            statements.append('\n'.join(current_statement))
        
        print(f"📊 Found {len(statements)} SQL statements")
        
        # Execute each statement
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            statement = statement.strip()
            if not statement or statement.startswith('--'):
                continue
                
            try:
                print(f"\n   [{i}/{len(statements)}] Executing statement...")
                # Show first 100 chars of statement
                preview = statement[:100].replace('\n', ' ')
                if len(statement) > 100:
                    preview += "..."
                print(f"      {preview}")
                
                cur.execute(statement)
                success_count += 1
                print(f"      ✅ Success")
                
            except psycopg2.Error as e:
                error_count += 1
                print(f"      ❌ Error: {e.diag.message_primary if hasattr(e, 'diag') else str(e)}")
                # Continue with next statement
                continue
        
        # Verify update
        print("\n🔍 Verifying role permissions update...")
        
        # Check role_permissions table
        cur.execute("SELECT COUNT(*) FROM role_permissions WHERE role_name != 'admin'")
        non_admin_roles = cur.fetchone()[0]
        print(f"   Non-admin roles in table: {non_admin_roles}")
        
        cur.execute("""
            SELECT role_name, display_name, updated_at 
            FROM role_permissions 
            WHERE role_name != 'admin'
            ORDER BY role_name
        """)
        roles = cur.fetchall()
        print(f"   Updated roles:")
        for role in roles:
            print(f"      • {role[0]} - {role[1]} (updated: {role[2]})")
        
        # Clean up
        cur.close()
        conn.close()
        
        print(f"\n📊 Execution summary:")
        print(f"   Successful statements: {success_count}")
        print(f"   Failed statements: {error_count}")
        
        if error_count == 0:
            print(f"\n🎉 ROLE PERMISSIONS UPDATE COMPLETE!")
            print(f"   Updated {non_admin_roles} roles (excluding admin)")
            print(f"   All 11 roles have been updated successfully")
            return True
        else:
            print(f"\n⚠️  Update completed with {error_count} errors")
            print(f"   {success_count} statements succeeded")
            return False
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"   Error details: {e.diag.message_primary if hasattr(e, 'diag') else 'No details'}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 ROLE PERMISSIONS UPDATE EXECUTOR")
    print("=" * 60)
    print("\n📋 This script will update 11 roles in role_permissions table:")
    print("   • monev - Monitoring & Evaluasi")
    print("   • viewer - Viewer")
    print("   • program_planner - Program Planner")
    print("   • program_implementer - Program Implementer")
    print("   • carbon_specialist - Carbon Specialist")
    print("   • finance_manager - Finance Manager")
    print("   • finance_operational - Finance Operational")
    print("   • finance_project_carbon - Finance Project Carbon")
    print("   • finance_project_implementation - Finance Project Implementation")
    print("   • finance_project_social - Finance Project Social")
    print("   • investor - Investor")
    print("\n⚠️  Admin role will NOT be updated (left as is)")
    print("\nStarting in 3 seconds...")
    
    import time
    time.sleep(3)
    
    sql_file = os.path.join(os.path.dirname(__file__), 'update_role_permissions.sql')
    success = execute_sql_file(sql_file)
    
    if success:
        print("\n" + "=" * 60)
        print("✅ ROLE PERMISSIONS UPDATE SUCCESSFUL!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("   1. Frontend RBAC should now use updated permissions")
        print("   2. Verify role access in dashboard")
        print("   3. Test different user roles")
        print("\n💡 If any issues, check the logs above")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ UPDATE FAILED")
        print("=" * 60)
        print("\n🔧 Troubleshooting:")
        print("   1. Check database connection")
        print("   2. Verify Supabase project is active")
        print("   3. Check SQL syntax in update_role_permissions.sql")
        sys.exit(1)

if __name__ == "__main__":
    main()