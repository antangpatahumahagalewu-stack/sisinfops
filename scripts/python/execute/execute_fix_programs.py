#!/usr/bin/env python3
"""
Script untuk mengeksekusi fix_programs_structure.sql melalui Supabase API.
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

def main():
    print("🚀 EXECUTING PROGRAMS STRUCTURE FIX")
    print("=" * 70)
    
    # Load environment variables
    load_dotenv('.env.local')
    
    # Initialize Supabase client
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        sys.exit(1)
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        sys.exit(1)
    
    # Read SQL file
    sql_file = "fix_programs_structure.sql"
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        sys.exit(1)
    
    try:
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        print(f"📋 Read SQL file: {sql_file}")
    except Exception as e:
        print(f"❌ Error reading SQL file: {e}")
        sys.exit(1)
    
    # Split SQL by statements (simple approach)
    # Remove BEGIN/COMMIT for Supabase execution
    sql_statements = []
    lines = sql_content.split('\n')
    current_statement = []
    
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('--') or not stripped:
            continue
        if stripped.upper() in ['BEGIN', 'COMMIT']:
            continue
        current_statement.append(line)
        if stripped.endswith(';'):
            sql_statements.append('\n'.join(current_statement))
            current_statement = []
    
    # Execute SQL statements
    print(f"\n📋 Executing {len(sql_statements)} SQL statements...")
    print("-" * 70)
    
    for i, sql in enumerate(sql_statements, 1):
        if not sql.strip():
            continue
            
        print(f"\nStatement {i}/{len(sql_statements)}:")
        print(f"  {sql[:100]}..." if len(sql) > 100 else f"  {sql}")
        
        try:
            # Use rpc for SQL execution if available, otherwise try direct
            result = supabase.rpc('exec_sql', {'query': sql}).execute()
            print(f"  ✅ Executed successfully")
        except Exception as e:
            # Fallback: try to execute via simple queries if possible
            error_msg = str(e)
            print(f"  ⚠️  Error with RPC: {error_msg[:100]}")
            
            # Try alternative approach for simple statements
            if 'CREATE' in sql.upper() or 'ALTER' in sql.upper() or 'UPDATE' in sql.upper():
                print(f"  ⚠️  Complex statement may need manual execution")
            else:
                print(f"  ❌ Cannot execute this statement automatically")
    
    print("\n" + "=" * 70)
    print("📋 VERIFICATION STEP:")
    print("Please check the Supabase SQL Editor or run verification query manually.")
    
    # Provide verification Python code
    print("\n📋 Run this Python code to verify:")
    print("""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# Check programs structure
resp = supabase.table('programs').select('*').limit(1).execute()
if resp.data:
    print('Columns in programs table:')
    for key in resp.data[0].keys():
        print(f'  - {key}')

# Check data quality
resp2 = supabase.table('programs').select('program_code, carbon_project_id, perhutanan_sosial_id, status').execute()
total = len(resp2.data)
with_carbon = len([p for p in resp2.data if p.get('carbon_project_id')])
with_ps = len([p for p in resp2.data if p.get('perhutanan_sosial_id')])

print(f'\\nTotal programs: {total}')
print(f'Programs with carbon_project_id: {with_carbon} ({with_carbon/total*100:.1f}%)')
print(f'Programs with perhutanan_sosial_id: {with_ps} ({with_ps/total*100:.1f}%)')

# Show sample
print('\\nSample programs:')
for p in resp2.data[:5]:
    print(f"  {p['program_code']}: Carbon={p.get('carbon_project_id', 'None')}, PS={p.get('perhutanan_sosial_id', 'None')}")
""")

if __name__ == "__main__":
    main()