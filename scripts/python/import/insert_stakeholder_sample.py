#!/usr/bin/env python3
"""
Insert sample data into stakeholders table
"""
import os
import sys
import re
import psycopg2

def get_connection_params():
    """Get connection parameters from .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(env_path):
        print(f"❌ .env.local not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    supabase_url = ""
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    if not supabase_url:
        print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local")
        return None
    
    if 'supabase.co' in supabase_url:
        match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
        if match:
            project_ref = match.group(1)
            db_host = f"db.{project_ref}.supabase.co"
        else:
            print(f"❌ Could not parse Supabase URL: {supabase_url}")
            return None
    else:
        print(f"❌ Not a Supabase URL: {supabase_url}")
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

def main():
    print("📝 Inserting sample stakeholders data...")
    
    params = get_connection_params()
    if not params:
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(**params)
        conn.autocommit = True
        cur = conn.cursor()
        
        # First, check current count
        cur.execute("SELECT COUNT(*) FROM stakeholders")
        current_count = cur.fetchone()[0]
        print(f"📊 Current row count: {current_count}")
        
        # Insert sample data (with ON CONFLICT to avoid duplicates)
        sample_data = [
            ("Dinas Kehutanan Provinsi Kalimantan Tengah", "Pemerintah Provinsi Kalimantan Tengah", "dishut@kaltengprov.go.id", "government", "high", "completed"),
            ("Komunitas Adat Dayak Ngaju", "Lembaga Adat Dayak Ngaju", "dayakngaju@community.org", "community", "high", "in_progress"),
            ("Yayasan Borneo Orangutan Survival", "BOS Foundation", "info@borneoorangutansurvival.org", "ngo_cso", "medium", "not_started"),
            ("PT. Carbon Investment Indonesia", "Carbon Investment Group", "contact@carboninvestment.co.id", "investor", "high", "completed"),
            ("Universitas Palangka Raya", "Fakultas Kehutanan UNPAR", "kehutanan@unpar.ac.id", "academic", "medium", "not_started"),
            ("PT. Sinar Mas Forestry", "Sinar Mas Group", "forestry@sinarmas.com", "private_sector", "medium", "in_progress"),
            ("Kementerian Lingkungan Hidup dan Kehutanan", "KLHK", "info@klhk.go.id", "government", "high", "completed"),
            ("WWF Indonesia", "World Wildlife Fund", "info@wwf.id", "ngo_cso", "medium", "in_progress"),
        ]
        
        inserted_count = 0
        for nama, org, email, kategori, pengaruh, fpic in sample_data:
            try:
                cur.execute("""
                    INSERT INTO stakeholders (
                        nama_stakeholder,
                        organisasi,
                        email,
                        kategori,
                        tingkat_pengaruh,
                        fpic_status,
                        status_aktif,
                        telepon,
                        alamat
                    ) VALUES (%s, %s, %s, %s, %s, %s, true, '081234567890', 'Alamat lengkap')
                    ON CONFLICT (email) DO UPDATE SET
                        nama_stakeholder = EXCLUDED.nama_stakeholder,
                        organisasi = EXCLUDED.organisasi,
                        kategori = EXCLUDED.kategori,
                        tingkat_pengaruh = EXCLUDED.tingkat_pengaruh,
                        fpic_status = EXCLUDED.fpic_status,
                        updated_at = NOW()
                """, (nama, org, email, kategori, pengaruh, fpic))
                inserted_count += 1
                print(f"   ✅ {nama}")
            except Exception as e:
                print(f"   ❌ {nama}: {e}")
        
        # Check final count
        cur.execute("SELECT COUNT(*) FROM stakeholders")
        final_count = cur.fetchone()[0]
        
        print(f"\n📊 Insertion summary:")
        print(f"   Attempted: {len(sample_data)}")
        print(f"   Inserted/updated: {inserted_count}")
        print(f"   Total rows now: {final_count}")
        
        # Show the data
        print(f"\n📋 Stakeholders in database:")
        cur.execute("""
            SELECT nama_stakeholder, kategori, tingkat_pengaruh, fpic_status 
            FROM stakeholders 
            ORDER BY nama_stakeholder
        """)
        rows = cur.fetchall()
        for row in rows:
            print(f"   - {row[0]} ({row[1]}, Pengaruh: {row[2]}, FPIC: {row[3]})")
        
        cur.close()
        conn.close()
        
        print("\n✅ Sample data insertion completed!")
        print("\n🔍 Next steps:")
        print("   1. Visit: http://localhost:3002/id/dashboard/stakeholders")
        print("   2. You should see the stakeholders list")
        print("   3. Use 'Tambah Stakeholder' button to add more")
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()