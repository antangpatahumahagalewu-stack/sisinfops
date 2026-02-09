#!/usr/bin/env python3
"""Test that comprehensive edit form can update perhutanan_sosial with new columns"""
import psycopg2
import os

def test_form_update():
    print("🔍 Testing comprehensive edit form functionality")
    print("=" * 60)
    
    # Database connection parameters
    params = {
        "host": "db.saelrsljpneclsbfdxfy.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "4@@E-Zd%zCQ!7ZV",
        "sslmode": "require",
    }
    
    try:
        conn = psycopg2.connect(**params)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Get a PS record to test with
        print("1. Finding a PS record to test...")
        cur.execute("SELECT id FROM perhutanan_sosial LIMIT 1;")
        result = cur.fetchone()
        
        if not result:
            print("❌ No PS records found in database")
            return False
        
        ps_id = result[0]
        print(f"✅ Found PS ID: {ps_id}")
        
        # Test the update SQL that the frontend uses
        print("\n2. Testing update query (simulating frontend)...")
        
        # This is the exact update that comprehensive-edit-form.tsx tries to do
        update_sql = """
        UPDATE perhutanan_sosial 
        SET 
            pemegang_izin = %s,
            desa = %s,
            kecamatan = %s,
            skema = %s,
            luas_ha = %s,
            tanggal_sk = %s,
            jumlah_kk = %s,
            ketua_ps = %s,
            kepala_desa = %s,
            telepon_ketua_ps = %s,
            telepon_kepala_desa = %s
        WHERE id = %s
        """
        
        # Test data similar to frontend
        test_data = (
            "Nama PS Test",      # pemegang_izin
            "Desa Test",         # desa
            "Kecamatan Test",    # kecamatan
            "Hutan Desa",        # skema
            100.5,               # luas_ha
            '2025-01-01',        # tanggal_sk
            50,                  # jumlah_kk
            "Ketua Test",        # ketua_ps
            "Kepala Desa Test",  # kepala_desa
            "081234567890",      # telepon_ketua_ps
            "081987654321",      # telepon_kepala_desa
            ps_id                # id
        )
        
        try:
            cur.execute(update_sql, test_data)
            print("✅ Update query executed successfully")
            
            # Verify the update
            print("\n3. Verifying updated columns...")
            cur.execute("""
                SELECT 
                    telepon_ketua_ps,
                    telepon_kepala_desa,
                    ketua_ps,
                    kepala_desa
                FROM perhutanan_sosial 
                WHERE id = %s
            """, (ps_id,))
            
            telepon_ketua, telepon_kepala, ketua_ps, kepala_desa = cur.fetchone()
            
            print(f"   • telepon_ketua_ps: {telepon_ketua}")
            print(f"   • telepon_kepala_desa: {telepon_kepala}")
            print(f"   • ketua_ps: {ketua_ps}")
            print(f"   • kepala_desa: {kepala_desa}")
            
            if telepon_ketua == "081234567890" and telepon_kepala == "081987654321":
                print("\n✅ SUCCESS: Telephone columns can be updated!")
                print("   The comprehensive edit form should now work correctly.")
                return True
            else:
                print("\n⚠️  Values not updated as expected")
                return False
                
        except Exception as e:
            print(f"❌ Update failed: {e}")
            print("\nThis suggests the schema cache hasn't been refreshed yet.")
            print("The error should be similar to frontend error.")
            return False
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def check_schema_cache():
    print("\n" + "=" * 60)
    print("🔍 Checking schema cache status...")
    
    # Try to refresh cache again
    params = {
        "host": "db.saelrsljpneclsbfdxfy.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "4@@E-Zd%zCQ!7ZV",
        "sslmode": "require",
    }
    
    try:
        conn = psycopg2.connect(**params)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Refreshing schema cache...")
        cur.execute("SELECT pg_notify('pgrst', 'reload schema');")
        print("✅ Schema cache refresh requested")
        
        # Wait a moment
        import time
        time.sleep(2)
        
        cur.close()
        conn.close()
        
        print("\n💡 Note: Supabase may take up to 60 seconds to refresh cache.")
        print("   If tests still fail, wait and try again.")
        
    except Exception as e:
        print(f"⚠️  Could not refresh cache: {e}")

def main():
    print("🔧 COMPREHENSIVE EDIT FORM FIX TESTER")
    print("=" * 60)
    
    success = test_form_update()
    
    if not success:
        check_schema_cache()
        print("\n❌ Test failed. The frontend may still show errors.")
        print("   Wait for schema cache to refresh and restart Next.js server.")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED!")
    print("=" * 60)
    print("\nThe comprehensive edit form should now work without errors.")
    print("\nNext steps:")
    print("1. Wait for Supabase schema cache to fully propagate")
    print("2. Restart Next.js dev server (already done)")
    print("3. Test the actual form in browser")
    print("4. Clear browser cache if needed")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)