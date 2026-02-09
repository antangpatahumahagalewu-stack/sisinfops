#!/usr/bin/env python3
"""Fix ps_galeri table structure to match frontend expectations"""

import os
import sys
import psycopg2
import re
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_connection_params():
    """Get connection parameters from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse Supabase URL
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    # Extract project reference from URL
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if match:
        project_ref = match.group(1)
        db_host = f"db.{project_ref}.supabase.co"
    else:
        print(f"❌ Could not parse Supabase URL: {supabase_url}")
        return None
    
    # Database password
    db_password = "4@@E-Zd%zCQ!7ZV"
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def check_current_structure():
    """Check current ps_galeri table structure"""
    params = get_connection_params()
    if not params:
        return None
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("🔍 Checking current ps_galeri structure...")
        
        # Get columns
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ps_galeri'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        
        print(f"📋 Current columns ({len(columns)}):")
        for col_name, data_type, is_nullable in columns:
            nullable = "NULL" if is_nullable == 'YES' else "NOT NULL"
            print(f"   • {col_name} ({data_type}) [{nullable}]")
        
        # Check RLS policies
        cur.execute("""
            SELECT policyname, permissive, cmd, roles, qual, with_check
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'ps_galeri'
            ORDER BY policyname
        """)
        policies = cur.fetchall()
        
        print(f"\n🔒 RLS Policies ({len(policies)}):")
        for policyname, permissive, cmd, roles, qual, with_check in policies:
            print(f"   • {policyname}: {cmd} for {roles}")
            if qual:
                print(f"     WHERE: {qual[:100]}...")
        
        # Check sample data
        cur.execute("SELECT COUNT(*) FROM ps_galeri")
        count = cur.fetchone()[0]
        print(f"\n📊 Row count: {count}")
        
        cur.close()
        conn.close()
        
        return columns
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return None
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return None

def fix_table_structure():
    """Alter ps_galeri table to match frontend expectations"""
    params = get_connection_params()
    if not params:
        return False
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("\n🚀 Fixing ps_galeri table structure...")
        
        # Step 1: Rename judul_gambar to judul
        print("  1. Renaming judul_gambar to judul...")
        try:
            cur.execute("ALTER TABLE ps_galeri RENAME COLUMN judul_gambar TO judul")
            print("     ✅ judul_gambar → judul")
        except Exception as e:
            print(f"     ℹ️  Column already named judul or error: {e}")
        
        # Step 2: Rename file_url to foto_url
        print("  2. Renaming file_url to foto_url...")
        try:
            cur.execute("ALTER TABLE ps_galeri RENAME COLUMN file_url TO foto_url")
            print("     ✅ file_url → foto_url")
        except Exception as e:
            print(f"     ℹ️  Column already named foto_url or error: {e}")
        
        # Step 3: Add missing columns if they don't exist
        print("  3. Adding missing columns...")
        
        # Add foto_thumbnail_url
        try:
            cur.execute("ALTER TABLE ps_galeri ADD COLUMN IF NOT EXISTS foto_thumbnail_url TEXT")
            print("     ✅ Added foto_thumbnail_url")
        except Exception as e:
            print(f"     ℹ️  Error adding foto_thumbnail_url: {e}")
        
        # Add tanggal_foto
        try:
            cur.execute("ALTER TABLE ps_galeri ADD COLUMN IF NOT EXISTS tanggal_foto DATE")
            print("     ✅ Added tanggal_foto")
        except Exception as e:
            print(f"     ℹ️  Error adding tanggal_foto: {e}")
        
        # Add lokasi
        try:
            cur.execute("ALTER TABLE ps_galeri ADD COLUMN IF NOT EXISTS lokasi VARCHAR(255)")
            print("     ✅ Added lokasi")
        except Exception as e:
            print(f"     ℹ️  Error adding lokasi: {e}")
        
        # Step 4: Grant permissions
        print("  4. Setting permissions...")
        cur.execute("GRANT ALL ON ps_galeri TO anon, authenticated")
        print("     ✅ Permissions granted")
        
        # Step 5: Insert sample data if table is empty
        cur.execute("SELECT COUNT(*) FROM ps_galeri")
        count = cur.fetchone()[0]
        
        if count == 0:
            print("  5. Inserting sample data...")
            
            # Get a perhutanan_sosial_id for sample
            cur.execute("SELECT id FROM perhutanan_sosial LIMIT 1")
            ps_row = cur.fetchone()
            
            if ps_row:
                ps_id = ps_row[0]
                cur.execute("""
                    INSERT INTO ps_galeri (
                        perhutanan_sosial_id,
                        judul,
                        deskripsi,
                        foto_url,
                        foto_thumbnail_url,
                        tanggal_foto,
                        lokasi,
                        created_at
                    ) VALUES (
                        %s, 'Sample Foto', 'Foto dokumentasi PS', 
                        'https://via.placeholder.com/400x300', 
                        'https://via.placeholder.com/200x150',
                        CURRENT_DATE, 'Lokasi Sample', NOW()
                    )
                """, (ps_id,))
                print(f"     ✅ Inserted sample data for PS {ps_id}")
            else:
                print("     ℹ️  No perhutanan_sosial data found for sample")
        
        # Step 6: Refresh schema cache
        print("  6. Refreshing schema cache...")
        try:
            cur.execute("SELECT pg_notify('pgrst', 'reload schema')")
            print("     ✅ Schema refresh triggered")
        except Exception as e:
            print(f"     ℹ️  Could not trigger refresh: {e}")
        
        cur.close()
        conn.close()
        
        print("\n✅ Table structure fixed!")
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_fix():
    """Verify the fix worked"""
    params = get_connection_params()
    if not params:
        return False
    
    try:
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("\n🔍 Verifying fix...")
        
        # Check columns after fix
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ps_galeri'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        
        expected_columns = [
            'id', 'perhutanan_sosial_id', 'judul', 'deskripsi', 'foto_url',
            'file_name', 'file_size', 'jenis_file', 'created_at', 'updated_at',
            'foto_thumbnail_url', 'tanggal_foto', 'lokasi'
        ]
        
        current_columns = [col[0] for col in columns]
        
        print(f"📋 Columns after fix ({len(columns)}):")
        for col_name, data_type in columns:
            print(f"   • {col_name} ({data_type})")
        
        # Check critical columns
        critical_columns = ['judul', 'foto_url', 'foto_thumbnail_url', 'tanggal_foto', 'lokasi']
        missing = [col for col in critical_columns if col not in current_columns]
        
        if missing:
            print(f"\n❌ Missing critical columns: {missing}")
            return False
        else:
            print(f"\n✅ All critical columns present")
            
            # Test query
            cur.execute("SELECT judul, foto_url FROM ps_galeri LIMIT 1")
            row = cur.fetchone()
            if row:
                print(f"✅ Sample query works: {row[0]}")
            else:
                print("ℹ️  Table is empty (this is OK)")
            
            return True
        
        cur.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🔧 FIXING PS_GALERI TABLE STRUCTURE")
    print("=" * 60)
    
    print("\n📋 Problem analysis:")
    print("   • Frontend expects: foto_url, foto_thumbnail_url, tanggal_foto, lokasi")
    print("   • Current table has: file_url, judul_gambar")
    print("   • Need to rename columns and add missing ones")
    
    # Check current structure
    columns = check_current_structure()
    if columns is None:
        print("\n❌ Cannot check current structure")
        return
    
    # Fix structure
    print("\n" + "=" * 60)
    success = fix_table_structure()
    
    if success:
        # Verify fix
        print("\n" + "=" * 60)
        verified = verify_fix()
        
        if verified:
            print("\n🎉 FIX SUCCESSFUL!")
            print("\n💡 Next steps:")
            print("   1. Restart Next.js dev server")
            print("   2. Clear browser cache (Ctrl+Shift+R)")
            print("   3. Test PS detail page galeri tab")
            print("   4. The error should be resolved")
        else:
            print("\n⚠️  Fix applied but verification failed")
    else:
        print("\n❌ Fix failed")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()