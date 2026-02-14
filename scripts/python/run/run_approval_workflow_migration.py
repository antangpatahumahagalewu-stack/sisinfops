#!/usr/bin/env python3
"""
Script untuk menjalankan migration approval workflow
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv
import re

def get_db_params():
    """Get database connection parameters"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL")
        return None
    
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL")
        return None
    
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def execute_migration():
    """Execute the approval workflow migration"""
    print("=" * 80)
    print("🚀 APPROVAL WORKFLOW MIGRATION SCRIPT")
    print("=" * 80)
    
    db_params = get_db_params()
    if not db_params:
        print("❌ Cannot connect to database")
        return
    
    # Read migration SQL
    migration_path = os.path.join(os.path.dirname(__file__), "migrations/schema/add_approval_workflow.sql")
    if not os.path.exists(migration_path):
        print(f"❌ Migration file not found: {migration_path}")
        return
    
    with open(migration_path, 'r') as f:
        migration_sql = f.read()
    
    print(f"📋 Migration file loaded: {os.path.basename(migration_path)}")
    print(f"📏 SQL size: {len(migration_sql):,} characters")
    
    # Split SQL into individual statements
    # Simple split by semicolon for now
    statements = []
    current_statement = []
    in_plpgsql = False
    for line in migration_sql.split('\n'):
        if '$$' in line:
            in_plpgsql = not in_plpgsql
        current_statement.append(line)
        if ';' in line and not in_plpgsql:
            statements.append('\n'.join(current_statement))
            current_statement = []
    
    if current_statement:
        statements.append('\n'.join(current_statement))
    
    print(f"\n🔍 Found {len(statements)} SQL statements")
    
    # Confirm with user
    print("\n⚠️  WARNING: This migration will:")
    print("   • Update programs status enum constraint")
    print("   • Add finance_approver role")
    print("   • Create notifications table")
    print("   • Create notification_settings table")
    print("   • Create database views")
    print("   • Update existing draft programs")
    
    response = input("\nDo you want to proceed with the migration? (yes/NO): ").strip().lower()
    
    if response != 'yes':
        print("❌ Migration cancelled by user.")
        return
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = False
        cur = conn.cursor()
        
        print("\n🔄 Executing migration...")
        
        # Execute each statement
        for i, statement in enumerate(statements, 1):
            statement = statement.strip()
            if not statement or statement.startswith('--') or statement.startswith('COMMENT'):
                continue
                
            print(f"\n📝 Statement {i}/{len(statements)}:")
            # Show first 100 chars of statement
            preview = statement[:100].replace('\n', ' ')
            if len(statement) > 100:
                preview += "..."
            print(f"   {preview}")
            
            try:
                cur.execute(statement)
                print(f"   ✅ Success")
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:200]}")
                conn.rollback()
                print("❌ Migration failed, rolled back.")
                return
        
        conn.commit()
        print(f"\n✅ Migration completed successfully!")
        
        # Verify migration
        print("\n🔍 Verifying migration...")
        
        # Check programs status constraint
        cur.execute("""
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'programs'::regclass 
            AND contype = 'c'
            AND conname = 'programs_status_check'
        """)
        constraint = cur.fetchone()
        if constraint:
            print(f"✅ Programs status constraint: {constraint[0]}")
            print(f"   Definition: {constraint[1]}")
        else:
            print("❌ Programs status constraint not found")
        
        # Check notifications table
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'notifications'
            )
        """)
        notifications_exists = cur.fetchone()[0]
        print(f"✅ Notifications table exists: {notifications_exists}")
        
        # Check profiles role enum
        cur.execute("""
            SELECT DISTINCT role FROM profiles WHERE role IS NOT NULL ORDER BY role
        """)
        roles = [row[0] for row in cur.fetchall()]
        print(f"✅ Available roles: {', '.join(roles)}")
        
        # Check views
        cur.execute("""
            SELECT table_name FROM information_schema.views 
            WHERE table_name IN ('programs_needing_review', 'approved_programs')
        """)
        views = [row[0] for row in cur.fetchall()]
        print(f"✅ Created views: {', '.join(views)}")
        
        # Count programs by status
        cur.execute("SELECT status, COUNT(*) FROM programs GROUP BY status ORDER BY status")
        status_counts = cur.fetchall()
        print(f"\n📊 Current program status distribution:")
        for status, count in status_counts:
            print(f"   • {status}: {count} program(s)")
        
        cur.close()
        conn.close()
        
        print(f"\n🎯 MIGRATION SUCCESSFULLY COMPLETED!")
        print(f"\n📋 NEXT STEPS:")
        print(f"   1. Update API endpoints untuk approval workflow")
        print(f"   2. Update halaman /dashboard/finance/proyek")
        print(f"   3. Update filter di halaman carbon-projects dan investor")
        print(f"   4. Buat notification UI")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        if 'conn' in locals():
            conn.rollback()

if __name__ == "__main__":
    execute_migration()