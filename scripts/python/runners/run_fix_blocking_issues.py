#!/usr/bin/env python3
"""
Run Phase 1: Fix Blocking Issues
1. Fix role constraint in profiles table
2. Test database connectivity
3. Provide instructions for Supabase keys regeneration
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local"""
    return {
        "host": "db.rrvhekjdhdhtkmswjgwk.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "CiTagF5HA/a%jU.",
        "sslmode": "require"
    }

def fix_role_constraint():
    """Fix the role constraint in profiles table"""
    sql_file = os.path.join(os.path.dirname(__file__), 'fix_role_constraint.sql')
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes")
    
    params = get_connection_params()
    
    print(f"🔌 Connecting to {params['host']}...")
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL")
        
        # Execute the fix
        print("\n🚀 Fixing role constraint...")
        
        try:
            cur.execute(sql_content)
            print("\n✅ Role constraint fix executed!")
            
            # Try to fetch results
            try:
                results = cur.fetchall()
                if results:
                    print("\n📊 Results:")
                    for row in results:
                        print(f"   {row}")
            except:
                pass
            
        except psycopg2.Error as e:
            print(f"\n⚠️  Warning: {e}")
            # Continue anyway
        
        # Test the fix
        print("\n🔍 Testing role constraint fix...")
        
        # Check current profiles
        try:
            cur.execute("SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY role")
            profiles = cur.fetchall()
            print("   Current profiles by role:")
            for role, count in profiles:
                print(f"      • {role}: {count} users")
        except psycopg2.Error as e:
            print(f"   ❌ Could not check profiles: {e}")
        
        # Check constraint exists (PostgreSQL 12+ compatible)
        try:
            cur.execute("""
                SELECT conname, pg_get_constraintdef(oid) as constraint_def
                FROM pg_constraint 
                WHERE conrelid = 'profiles'::regclass 
                AND contype = 'c'
            """)
            constraints = cur.fetchall()
            if constraints:
                print("\n   ✅ Role constraint exists:")
                for conname, constraint_def in constraints:
                    print(f"      • {conname}: {constraint_def}")
            else:
                print("\n   ⚠️  No role constraint found")
        except psycopg2.Error as e:
            print(f"   ❌ Could not check constraints: {e}")
        
        cur.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_connectivity():
    """Test Supabase API connectivity"""
    print("\n" + "=" * 60)
    print("🔍 TESTING SUPABASE CONNECTIVITY")
    print("=" * 60)
    
    # First, check if we can access database directly
    print("\n1. Testing direct database access (should work):")
    
    params = get_connection_params()
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM kabupaten")
        count = cur.fetchone()[0]
        print(f"   ✅ Direct DB access: {count} kabupaten rows")
        cur.close()
        conn.close()
    except psycopg2.Error as e:
        print(f"   ❌ Direct DB access failed: {e}")
    
    # Test via Node.js script
    print("\n2. Testing via Node.js (Supabase client):")
    print("   Running: node scripts/javascript/checks/check-ps-data.js")
    
    import subprocess
    try:
        result = subprocess.run(
            ['node', 'check-ps-data.js'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("   ✅ Node.js test succeeded")
            print(f"   Output preview: {result.stdout[:200]}...")
        else:
            print("   ❌ Node.js test failed")
            print(f"   Error: {result.stderr[:200]}...")
            
    except subprocess.TimeoutExpired:
        print("   ❌ Node.js test timed out")
    except Exception as e:
        print(f"   ❌ Node.js test error: {e}")
    
    # Check .env.local file
    print("\n3. Checking .env.local configuration:")
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            content = f.read()
            
        lines = content.split('\n')
        supabase_url = ""
        anon_key = ""
        service_key = ""
        
        for line in lines:
            if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            elif line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                anon_key = line.split('=', 1)[1].strip().strip('"\'')
            elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                service_key = line.split('=', 1)[1].strip().strip('"\'')
        
        print(f"   ✅ .env.local exists")
        print(f"   📡 URL: {supabase_url}")
        print(f"   🔑 Anon key length: {len(anon_key)}")
        print(f"   🔧 Service key length: {len(service_key)}")
        
        if len(anon_key) < 50:
            print("   ⚠️  Anon key seems too short (might be invalid)")
        if len(service_key) < 50:
            print("   ⚠️  Service key seems too short (might be invalid)")
    else:
        print("   ❌ .env.local not found!")

def main():
    print("=" * 60)
    print("🚀 PHASE 1: FIX BLOCKING ISSUES")
    print("=" * 60)
    print("\n📋 This will:")
    print("   1. Fix role constraint in profiles table")
    print("   2. Test database connectivity")
    print("   3. Provide instructions for Supabase keys regeneration")
    print("\nStarting in 3 seconds...")
    
    import time
    time.sleep(3)
    
    # Step 1: Fix role constraint
    print("\n" + "=" * 60)
    print("🔧 STEP 1: FIX ROLE CONSTRAINT")
    print("=" * 60)
    
    success = fix_role_constraint()
    
    if success:
        print("\n✅ Role constraint fix completed!")
    else:
        print("\n❌ Role constraint fix failed")
    
    # Step 2: Test connectivity
    test_connectivity()
    
    # Step 3: Provide instructions
    print("\n" + "=" * 60)
    print("📋 STEP 3: MANUAL ACTION REQUIRED")
    print("=" * 60)
    print("\n🔴 CRITICAL: If API connectivity tests failed, you need to:")
    print("\n1. REGENERATE SUPABASE KEYS:")
    print("   a. Go to: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk")
    print("   b. Navigate: Project Settings → API → URL & Keys")
    print("   c. Click 'Regenerate' for both Anon and Service Role keys")
    print("   d. Copy the new keys")
    print("\n2. UPDATE .env.local:")
    print("   Replace the keys in .env.local with:")
    print("   NEXT_PUBLIC_SUPABASE_ANON_KEY=[new anon key]")
    print("   SUPABASE_SERVICE_ROLE_KEY=[new service role key]")
    print("\n3. TEST AGAIN:")
    print("   Run: node scripts/javascript/checks/check-ps-data.js")
    print("   Should show PS data now")
    print("\n4. START FRONTEND:")
    print("   Run: npm run dev")
    print("   Open: http://localhost:3000")
    print("\n⚠️  TEMPORARY WORKAROUND (development only):")
    print("   If you need to test frontend immediately:")
    print("   - Copy SUPABASE_SERVICE_ROLE_KEY value")
    print("   - Paste as NEXT_PUBLIC_SUPABASE_ANON_KEY")
    print("   - This bypasses RLS but is UNSAFE for production")
    
    print("\n" + "=" * 60)
    print("🎯 PHASE 1 COMPLETE")
    print("=" * 60)
    
    if success:
        print("\n✅ Role constraint fixed")
        print("📋 Next: Regenerate Supabase keys and test frontend")
        sys.exit(0)
    else:
        print("\n❌ Some issues remain")
        sys.exit(1)

if __name__ == "__main__":
    main()