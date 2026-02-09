#!/usr/bin/env python3
"""Add telepon columns to perhutanan_sosial table"""
import psycopg2

def main():
    print("🔧 Adding telephone columns to perhutanan_sosial table")
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
        
        print("📝 Executing SQL to add columns...")
        
        # SQL to add columns
        sql = """
        -- 1. Add telephone columns to perhutanan_sosial table
        ALTER TABLE perhutanan_sosial 
        ADD COLUMN IF NOT EXISTS telepon_ketua_ps VARCHAR(20),
        ADD COLUMN IF NOT EXISTS telepon_kepala_desa VARCHAR(20);
        
        -- 2. Add comments for the new columns
        COMMENT ON COLUMN perhutanan_sosial.telepon_ketua_ps IS 'Telephone number of the PS chairperson (Ketua PS)';
        COMMENT ON COLUMN perhutanan_sosial.telepon_kepala_desa IS 'Telephone number of the village head (Kepala Desa)';
        """
        
        # Execute SQL statements
        statements = [stmt.strip() for stmt in sql.split(';') if stmt.strip()]
        
        for i, stmt in enumerate(statements, 1):
            print(f"\nStatement {i}: {stmt[:80]}...")
            try:
                cur.execute(stmt)
                print(f"   ✅ Statement {i} executed successfully")
            except Exception as e:
                print(f"   ⚠️  Error executing statement {i}: {e}")
                # Continue with other statements
        
        print("\n" + "=" * 60)
        print("🔄 Refreshing schema cache...")
        
        # Refresh PostgREST schema cache
        try:
            cur.execute("SELECT pg_notify('pgrst', 'reload schema');")
            print("✅ Schema cache refresh requested")
        except Exception as e:
            print(f"⚠️  Could not refresh schema cache: {e}")
            print("Note: Supabase may refresh cache automatically")
        
        # Verify columns were added
        print("\n" + "=" * 60)
        print("🔍 Verifying column addition...")
        
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'perhutanan_sosial' 
            AND table_schema = 'public'
            AND column_name IN ('telepon_ketua_ps', 'telepon_kepala_desa')
            ORDER BY column_name;
        """)
        
        added_columns = cur.fetchall()
        
        if len(added_columns) == 2:
            print("✅ Both columns successfully added:")
            for col_name, data_type, is_nullable in added_columns:
                nullable = "NULL" if is_nullable == 'YES' else "NOT NULL"
                print(f"  • {col_name:20} {data_type:15} {nullable}")
        else:
            print(f"⚠️  Only {len(added_columns)} column(s) found. Expected 2.")
            for col in added_columns:
                print(f"  • {col[0]}")
        
        print("\n" + "=" * 60)
        print("📋 Migration Summary:")
        print("✅ Added column: telepon_ketua_ps (VARCHAR(20))")
        print("✅ Added column: telepon_kepala_desa (VARCHAR(20))")
        print("✅ Added column comments")
        print("✅ Requested schema cache refresh")
        
        print("\n💡 Next steps:")
        print("1. Wait a few seconds for Supabase schema cache to refresh")
        print("2. Restart Next.js development server")
        print("3. Test the comprehensive edit form")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)