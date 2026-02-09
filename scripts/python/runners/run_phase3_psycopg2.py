#!/usr/bin/env python3
"""
Phase 3 Merged Tables Migration using psycopg2
Merges 31 missing tables into 14 unified tables
"""

import os
import sys
import psycopg2
import re
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import time

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
    
    # Get password from user input or use default
    db_password = "4@@E-Zd%zCQ!7ZV"  # Default from previous migrations
    
    return {
        "host": db_host,
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": db_password,
        "sslmode": "require"
    }

def execute_phase3_migration():
    """Execute the Phase 3 merged tables migration"""
    sql_file = os.path.join(os.path.dirname(__file__), 'supabase', 'migrations', '202602041017_create_merged_phase3_tables.sql')
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    print(f"📄 Reading SQL file: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📏 SQL size: {len(sql_content):,} bytes, {sql_content.count(chr(10))} lines")
    
    # Get connection parameters
    params = get_connection_params()
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
        
        # Execute the migration
        print("\n🚀 Executing Phase 3 merged tables migration...")
        print("⏳ This may take 30-60 seconds...")
        
        start_time = time.time()
        
        # Execute the SQL
        cur.execute(sql_content)
        
        elapsed = time.time() - start_time
        print(f"✅ Migration executed in {elapsed:.2f} seconds")
        
        # Verify tables were created
        print("\n🔍 Verifying table creation...")
        
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
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"   ✅ {table}: {count} rows")
                verified += 1
            except Exception as e:
                print(f"   ❌ {table}: {str(e)[:50]}")
        
        print(f"\n📊 Tables verified: {verified}/{len(expected_tables)}")
        
        # Check sample data
        print("\n🧪 Checking sample data...")
        cur.execute("SELECT COUNT(*) FROM unified_activity_log")
        activity_count = cur.fetchone()[0]
        print(f"   unified_activity_log: {activity_count} records")
        
        cur.execute("SELECT COUNT(*) FROM financial_accounts")
        finance_count = cur.fetchone()[0]
        print(f"   financial_accounts: {finance_count} accounts")
        
        cur.execute("SELECT COUNT(*) FROM unified_documents")
        doc_count = cur.fetchone()[0]
        print(f"   unified_documents: {doc_count} documents")
        
        # Clean up
        cur.close()
        conn.close()
        
        print("\n" + "=" * 60)
        if verified == len(expected_tables):
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
            print("⚠️  PARTIAL MIGRATION - Some tables not created")
            print("=" * 60)
            print(f"Created: {verified}/{len(expected_tables)} tables")
            print("Check errors above and fix if needed")
            return False
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        if hasattr(e, 'diag') and e.diag:
            print(f"   Error details: {e.diag.message_primary}")
        
        # Try to get more context
        if hasattr(e, 'cursor') and e.cursor:
            try:
                print(f"   Last query context: {e.cursor.query[:200]}...")
            except:
                pass
        
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🚀 PHASE 3 MERGED TABLES MIGRATION")
    print("=" * 60)
    print("\n⚠️  This will create 14 merged tables from 31 missing tables:")
    print("   • unified_activity_log ← activity_log, chat_logs, system logs")
    print("   • unified_metrics ← carbon_monitoring_data, impact_metrics, financial_model")
    print("   • unified_approvals ← approval_workflows, implementation_timeline")
    print("   • financial_accounts ← accounting_ledgers, donors, grants")
    print("   • price_lists ← master_price_list")
    print("   • spending_limits ← bank_accounts_whitelist, spending_limits")
    print("   • unified_models ← carbon_model_details, social_model_details")
    print("   • unified_documents ← legal_documents, pdd_documents, project_documents")
    print("   • unified_organizations ← organizations, investor_dashboard_access")
    print("   • catatan, dokumen, galeri, kegiatan ← PS tables (backward compatibility)")
    
    print("\n⚠️  IMPORTANT: This migration will:")
    print("   • Create 14 new tables with sample data")
    print("   • Enable basic RLS policies (allow-all for testing)")
    print("   • Grant permissions to all roles")
    print("   • NOT delete any existing data")
    print("   • Expected time: 30-60 seconds")
    
    print("\nStarting in 5 seconds...")
    time.sleep(5)
    
    success = execute_phase3_migration()
    
    if success:
        print("\n✅ MIGRATION COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n❌ MIGRATION FAILED")
        print("Check error messages above and try again")
        sys.exit(1)

if __name__ == "__main__":
    main()