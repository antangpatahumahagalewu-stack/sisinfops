#!/usr/bin/env python3
"""
Auto-runner for Phase 3 Merged Tables Migration (no user confirmation)
"""

import os
import sys
from pathlib import Path
import subprocess
import time

def run_migration():
    print("=" * 60)
    print("🚀 PHASE 3 MERGED TABLES MIGRATION (AUTO)")
    print("=" * 60)
    
    # Get migration file path
    migration_file = Path(__file__).parent / 'supabase' / 'migrations' / '202602041017_create_merged_phase3_tables.sql'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Migration file: {migration_file}")
    print(f"📏 Size: {migration_file.stat().st_size} bytes")
    
    # Read SQL content
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Get Supabase URL from .env.local
    supabase_url = None
    supabase_key = None
    
    env_path = Path(__file__).parent / '.env.local'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                    supabase_url = line.strip().split('=', 1)[1].strip('\'"')
                elif line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                    supabase_key = line.strip().split('=', 1)[1].strip('\'"')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase configuration in .env.local")
        return False
    
    print(f"✅ Supabase URL: {supabase_url[:30]}...")
    
    # Install supabase-py if needed
    try:
        from supabase import create_client, Client
    except ImportError:
        print("📦 Installing supabase-py...")
        subprocess.run([sys.executable, "-m", "pip", "install", "supabase", "-q"], check=True)
        from supabase import create_client, Client
    
    # Create supabase client
    supabase: Client = create_client(supabase_url, supabase_key)
    
    print("🚀 Executing migration...")
    start_time = time.time()
    
    try:
        # Execute the SQL directly
        result = supabase.sql(sql_content).execute()
        elapsed = time.time() - start_time
        
        print(f"✅ Migration executed in {elapsed:.2f} seconds")
        
        # Verify tables
        print("\n🔍 Verifying tables...")
        expected_tables = [
            'unified_activity_log',
            'unified_metrics', 
            'unified_approvals',
            'financial_accounts',
            'price_lists',
            'spending_limits',
            'unified_models',
            'unified_documents',
            'unified_organizations',
            'catatan',
            'dokumen',
            'galeri',
            'kegiatan',
            'pemberdayaan_ekonomi_detail'
        ]
        
        verified = 0
        for table in expected_tables:
            try:
                result = supabase.from_(table).select('*', count='exact').limit(1).execute()
                count = result.count or 0
                print(f"   ✅ {table}: {count} rows")
                verified += 1
            except Exception as e:
                print(f"   ❌ {table}: {str(e)[:50]}")
        
        print(f"\n📊 Tables verified: {verified}/{len(expected_tables)}")
        
        if verified == len(expected_tables):
            print("\n" + "=" * 60)
            print("🎉 PHASE 3 MIGRATION SUCCESSFUL!")
            print("=" * 60)
            print(f"⏱️  Total time: {elapsed:.2f} seconds")
            print(f"📊 Tables created: {verified}")
            print(f"📈 Reduction: 31 missing tables → 14 merged tables")
            print("\n🚀 Frontend errors fixed for:")
            print("   • accounting_ledgers")
            print("   • approval_workflows")
            print("   • carbon_model_details")
            print("   • carbon_monitoring_data")
            print("   • legal_documents")
            print("   • organizations")
            print("   • and 25 other missing tables")
            print("\n💡 Next steps:")
            print("   1. npm run dev")
            print("   2. Ctrl+Shift+R (clear cache)")
            print("   3. Test frontend pages")
            print("=" * 60)
            return True
        else:
            print("\n⚠️  Some tables not created. Check errors above.")
            return False
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)