#!/usr/bin/env python3
"""
Fixed migration script for approval workflow
Handles existing constraints gracefully
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

def execute_safe_migration():
    """Execute migration with error handling"""
    print("=" * 80)
    print("🚀 APPROVAL WORKFLOW MIGRATION SCRIPT (FIXED)")
    print("=" * 80)
    
    db_params = get_db_params()
    if not db_params:
        print("❌ Cannot connect to database")
        return
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = False
        cur = conn.cursor()
        
        print("🔄 Starting migration...")
        
        # 1. First, check existing constraint and drop it if exists
        print("\n🔍 Checking existing constraints...")
        cur.execute("""
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'programs'::regclass 
            AND contype = 'c'
            AND conname LIKE '%status%'
        """)
        constraints = cur.fetchall()
        
        for conname, conddef in constraints:
            print(f"   Found constraint: {conname}")
            print(f"   Definition: {conddef}")
            
            # Drop existing constraint
            try:
                cur.execute(f"ALTER TABLE programs DROP CONSTRAINT IF EXISTS {conname}")
                print(f"   ✅ Dropped constraint: {conname}")
            except Exception as e:
                print(f"   ❌ Error dropping {conname}: {e}")
        
        # 2. Add new constraint with all statuses
        print("\n📝 Adding new status constraint...")
        status_constraint_sql = """
        ALTER TABLE programs ADD CONSTRAINT programs_status_check 
        CHECK (status IN (
          'draft', 
          'submitted_for_review', 
          'under_review', 
          'approved', 
          'rejected', 
          'needs_revision', 
          'active', 
          'completed', 
          'cancelled'
        ))
        """
        
        try:
            cur.execute(status_constraint_sql)
            print("✅ Status constraint added")
        except Exception as e:
            print(f"❌ Error adding status constraint: {e}")
            conn.rollback()
            return
        
        # 3. Update profiles role enum
        print("\n📝 Updating profiles role enum...")
        
        # Drop existing constraint if exists
        cur.execute("""
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'profiles'::regclass 
            AND contype = 'c'
            AND conname = 'profiles_role_check'
        """)
        role_constraint = cur.fetchone()
        
        if role_constraint:
            try:
                cur.execute("ALTER TABLE profiles DROP CONSTRAINT profiles_role_check")
                print("✅ Dropped existing role constraint")
            except Exception as e:
                print(f"❌ Error dropping role constraint: {e}")
        
        # Add new constraint
        try:
            cur.execute("""
                ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
                CHECK (role IN ('admin', 'program_planner', 'finance_approver', 'finance_manager', 'viewer'))
            """)
            print("✅ Added new role constraint with finance_approver")
        except Exception as e:
            print(f"❌ Error adding role constraint: {e}")
            conn.rollback()
            return
        
        # 4. Create notifications table if not exists
        print("\n📝 Creating notifications table...")
        notifications_sql = """
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          read_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """
        
        try:
            cur.execute(notifications_sql)
            print("✅ Notifications table created/verified")
        except Exception as e:
            print(f"❌ Error creating notifications table: {e}")
            conn.rollback()
            return
        
        # 5. Create notification_settings table
        print("\n📝 Creating notification_settings table...")
        settings_sql = """
        CREATE TABLE IF NOT EXISTS notification_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          notification_type VARCHAR(50) NOT NULL,
          enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, notification_type)
        )
        """
        
        try:
            cur.execute(settings_sql)
            print("✅ Notification settings table created/verified")
        except Exception as e:
            print(f"❌ Error creating notification settings table: {e}")
            conn.rollback()
            return
        
        # 6. Add indexes
        print("\n📝 Creating indexes...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)"
        ]
        
        for idx_sql in indexes:
            try:
                cur.execute(idx_sql)
                print(f"✅ Index created: {idx_sql[:50]}...")
            except Exception as e:
                print(f"⚠️  Warning creating index: {e}")
        
        # 7. Create or replace update_updated_at function
        print("\n📝 Creating update_updated_at function...")
        function_sql = """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql'
        """
        
        try:
            cur.execute(function_sql)
            print("✅ Updated function created")
        except Exception as e:
            print(f"❌ Error creating function: {e}")
            conn.rollback()
            return
        
        # 8. Create triggers
        print("\n📝 Creating triggers...")
        triggers = [
            "DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications",
            """
            CREATE TRIGGER update_notifications_updated_at
                BEFORE UPDATE ON notifications
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
            """,
            "DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings",
            """
            CREATE TRIGGER update_notification_settings_updated_at
                BEFORE UPDATE ON notification_settings
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
            """
        ]
        
        for trigger_sql in triggers:
            try:
                cur.execute(trigger_sql)
                print(f"✅ Trigger executed: {trigger_sql[:50]}...")
            except Exception as e:
                print(f"⚠️  Warning with trigger: {e}")
        
        # 9. Insert default notification settings
        print("\n📝 Inserting default notification settings...")
        insert_sql = """
        INSERT INTO notification_settings (user_id, notification_type, enabled)
        SELECT 
          p.id,
          unnest(ARRAY['program_submitted', 'program_approved', 'program_rejected', 'revision_requested']),
          TRUE
        FROM profiles p
        ON CONFLICT (user_id, notification_type) DO NOTHING
        """
        
        try:
            cur.execute(insert_sql)
            print(f"✅ Default notification settings inserted")
        except Exception as e:
            print(f"⚠️  Warning inserting settings: {e}")
        
        # 10. Create views
        print("\n📝 Creating database views...")
        views = [
            """
            CREATE OR REPLACE VIEW programs_needing_review AS
            SELECT 
              p.*,
              ps.full_name as submitted_by_name,
              pr.full_name as reviewed_by_name
            FROM programs p
            LEFT JOIN profiles ps ON p.submitted_by = ps.id
            LEFT JOIN profiles pr ON p.reviewed_by = pr.id
            WHERE p.status IN ('submitted_for_review', 'under_review')
            ORDER BY p.submitted_at DESC NULLS LAST, p.created_at DESC
            """,
            """
            CREATE OR REPLACE VIEW approved_programs AS
            SELECT 
              p.*,
              ps.full_name as submitted_by_name,
              pr.full_name as reviewed_by_name,
              pr.role as reviewer_role
            FROM programs p
            LEFT JOIN profiles ps ON p.submitted_by = ps.id
            LEFT JOIN profiles pr ON p.reviewed_by = pr.id
            WHERE p.status = 'approved'
            ORDER BY p.reviewed_at DESC NULLS LAST, p.created_at DESC
            """
        ]
        
        for view_sql in views:
            try:
                cur.execute(view_sql)
                print(f"✅ View created")
            except Exception as e:
                print(f"❌ Error creating view: {e}")
                conn.rollback()
                return
        
        # 11. Clean up draft programs
        print("\n📝 Cleaning up draft programs...")
        cleanup_sql = """
        UPDATE programs 
        SET 
          submitted_at = NULL,
          submitted_by = NULL,
          reviewed_at = NULL,
          reviewed_by = NULL,
          review_notes = NULL
        WHERE status = 'draft'
        """
        
        try:
            cur.execute(cleanup_sql)
            print(f"✅ Draft programs cleaned up")
        except Exception as e:
            print(f"⚠️  Warning cleaning up drafts: {e}")
        
        # Commit all changes
        conn.commit()
        
        # Verification
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
        cur.execute("SELECT COUNT(*) FROM notifications")
        notif_count = cur.fetchone()[0]
        print(f"✅ Notifications table has {notif_count} rows")
        
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
        print(f"   1. API endpoints sudah diupdate untuk approval workflow")
        print(f"   2. Halaman /dashboard/finance/proyek sudah diupdate")
        print(f"   3. Filter di carbon-projects dan investor sudah diupdate")
        print(f"   4. Notification UI sudah dibuat di ProgramApprovalManager")
        print(f"   5. Test workflow dengan membuat program baru")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        if 'conn' in locals():
            conn.rollback()

if __name__ == "__main__":
    # Auto confirm
    print("🚀 Running approval workflow migration (auto-confirm)...")
    execute_safe_migration()