#!/usr/bin/env python3
"""Check if telepon columns exist in perhutanan_sosial table"""
import psycopg2
import os

def main():
    print("🔍 Checking perhutanan_sosial table columns")
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
        
        # Check all columns in perhutanan_sosial
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'perhutanan_sosial' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        columns = cur.fetchall()
        print(f"📊 Found {len(columns)} columns in perhutanan_sosial table:\n")
        
        # Track the telepon columns
        telepon_ketua_found = False
        telepon_kepala_found = False
        
        for col_name, data_type, is_nullable, col_default in columns:
            nullable = "NULL" if is_nullable == 'YES' else "NOT NULL"
            default = f" DEFAULT {col_default}" if col_default else ""
            print(f"  • {col_name:30} {data_type:20} {nullable:10}{default}")
            
            if col_name == 'telepon_ketua_ps':
                telepon_ketua_found = True
            if col_name == 'telepon_kepala_desa':
                telepon_kepala_found = True
        
        print("\n" + "=" * 60)
        print("📋 Telepon Column Status:")
        print(f"  • telepon_ketua_ps:      {'✅ EXISTS' if telepon_ketua_found else '❌ MISSING'}")
        print(f"  • telepon_kepala_desa:   {'✅ EXISTS' if telepon_kepala_found else '❌ MISSING'}")
        
        if not telepon_ketua_found or not telepon_kepala_found:
            print("\n🔧 Action needed: Add missing columns")
            return False
        else:
            print("\n✅ All required columns exist!")
            return True
            
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)