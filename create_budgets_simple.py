#!/usr/bin/env python3
"""
Simple script to create budgets for existing programs
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv
import re
import uuid

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

def main():
    print("=" * 80)
    print("SIMPLE BUDGET CREATION SCRIPT")
    print("=" * 80)
    
    db_params = get_db_params()
    if not db_params:
        return
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = True  # Use autocommit to avoid transaction issues
        
        # Start fresh connection for main work
        conn2 = psycopg2.connect(**db_params)
        conn2.autocommit = False
        cur = conn2.cursor()
        
        # Check current state
        print("\n🔍 Checking current state...")
        
        cur.execute("SELECT COUNT(*) FROM program_budgets")
        existing_budgets = cur.fetchone()[0]
        print(f"📊 Existing program_budgets: {existing_budgets}")
        
        if existing_budgets > 0:
            print("✅ Budgets already exist, skipping creation")
            conn2.close()
            conn.close()
            return
        
        # Get all programs
        cur.execute("""
            SELECT id, kode_program, nama_program, jenis_program, total_budget
            FROM programs 
            ORDER BY created_at
        """)
        programs = cur.fetchall()
        print(f"📋 Found {len(programs)} programs")
        
        # Get price list items
        cur.execute("""
            SELECT id, item_code, item_name, unit, unit_price, category
            FROM price_list 
            WHERE unit_price > 0
            ORDER BY RANDOM()
            LIMIT 10
        """)
        price_items = cur.fetchall()
        print(f"💰 Found {len(price_items)} price items")
        
        created_budgets = 0
        created_items = 0
        
        # Create budgets for each program
        for i, program in enumerate(programs):
            program_id = program[0]
            kode_program = program[1]
            nama_program = program[2]
            jenis_program = program[3]
            total_budget = program[4] or 0
            
            # Create budget header
            budget_id = str(uuid.uuid4())
            budget_code = f"BUD-2026-{i+1:03d}"
            budget_name = f"Anggaran {nama_program}"
            fiscal_year = 2026
            
            # Calculate appropriate total based on program type
            if jenis_program == "KARBON":
                base_budget = 500000000  # 500 juta
            elif jenis_program == "PEMBERDAYAAN_EKONOMI":
                base_budget = 250000000  # 250 juta
            else:
                base_budget = 150000000  # 150 juta
            
            budget_total = total_budget if total_budget > 0 else base_budget
            
            try:
                # Insert budget header
                cur.execute("""
                    INSERT INTO program_budgets 
                    (id, program_id, budget_code, budget_name, fiscal_year, total_amount, status, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    budget_id, program_id, budget_code, budget_name, 
                    fiscal_year, budget_total, 'draft',
                    f'Budget otomatis dibuat untuk program {kode_program} - {jenis_program}'
                ))
                created_budgets += 1
                
                # Create budget items (3 items per budget)
                num_items = min(3, len(price_items))
                selected_items = price_items[:num_items]
                
                for j, price_item in enumerate(selected_items):
                    item_id = str(uuid.uuid4())
                    price_list_id = price_item[0]
                    item_code = price_item[1] or f"ITEM-{j+1}"
                    item_name = price_item[2]
                    unit = price_item[3]
                    unit_price = price_item[4]
                    category = price_item[5]
                    
                    # Simple quantity logic
                    if "Development" in item_name or "Platform" in item_name:
                        quantity = 1.0
                    elif "Cloud" in item_name or "Storage" in item_name:
                        quantity = 1.0
                    elif "Station" in item_name or "Truck" in item_name:
                        quantity = 1.0
                    else:
                        quantity = 1.0
                    
                    # Insert budget item
                    cur.execute("""
                        INSERT INTO program_budget_items 
                        (id, program_budget_id, price_list_id, item_code, item_name, 
                         description, quantity, unit, unit_price, category, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        item_id, budget_id, price_list_id, item_code, item_name,
                        f"{item_name} untuk program {kode_program}",
                        quantity, unit, unit_price, category,
                        f"Item anggaran {j+1}"
                    ))
                    created_items += 1
                
                # Update program total_budget if it was 0
                if total_budget == 0:
                    cur.execute("""
                        UPDATE programs 
                        SET total_budget = %s
                        WHERE id = %s
                    """, (budget_total, program_id))
                
                print(f"  ✅ Created budget for {kode_program}: {budget_code} ({budget_total:,.0f} IDR)")
                
            except Exception as e:
                print(f"  ❌ Error creating budget for {kode_program}: {e}")
                conn2.rollback()
                continue
        
        conn2.commit()
        
        print(f"\n✅ Successfully created {created_budgets} budgets with {created_items} items")
        
        # Verification
        print("\n📊 VERIFICATION:")
        cur.execute("SELECT COUNT(*) FROM program_budgets")
        total_budgets = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM program_budget_items")
        total_items = cur.fetchone()[0]
        
        print(f"  • Total program_budgets: {total_budgets}")
        print(f"  • Total program_budget_items: {total_items}")
        
        # Get sample
        cur.execute("""
            SELECT pb.budget_code, pb.budget_name, pb.total_amount, 
                   COUNT(pbi.id) as item_count
            FROM program_budgets pb
            LEFT JOIN program_budget_items pbi ON pb.id = pbi.program_budget_id
            GROUP BY pb.id, pb.budget_code, pb.budget_name, pb.total_amount
            LIMIT 2
        """)
        samples = cur.fetchall()
        
        print("\n📋 Sample budgets:")
        for sample in samples:
            print(f"  • {sample[0]}: {sample[1]} - {sample[2]:,.0f} IDR ({sample[3]} items)")
        
        cur.close()
        conn2.close()
        conn.close()
        
        print(f"\n📋 NEXT STEPS:")
        print(f"  1. Restart Next.js dev server")
        print(f"  2. Test form at http://localhost:3000/id/dashboard/programs/new")
        print(f"  3. Check program detail pages for budget display")
        
    except Exception as e:
        print(f"❌ Main error: {e}")

if __name__ == "__main__":
    main()