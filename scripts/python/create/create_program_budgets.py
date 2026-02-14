#!/usr/bin/env python3
"""
Create sample budgets for existing 12 programs
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv
import re
import uuid
from datetime import datetime

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

def check_price_list_structure(cur):
    """Check price_list table structure"""
    try:
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'price_list'
            ORDER BY ordinal_position
        """)
        cols = cur.fetchall()
        print("📊 Price List Columns:")
        for col in cols:
            print(f"  • {col[0]}: {col[1]}")
        
        # Get sample price items
        cur.execute("""
            SELECT id, item_code, item_name, unit, unit_price, category
            FROM price_list 
            WHERE unit_price IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 5
        """)
        sample_items = cur.fetchall()
        print(f"\n📦 Sample price items:")
        for item in sample_items:
            # Print first few columns
            print(f"  • ID: {item[0]}, Code: {item[1]}, Name: {item[2]}, Price: {item[4]:,.0f} IDR/{item[3]}")
        
        return True
    except Exception as e:
        print(f"❌ Error checking price_list: {e}")
        return False

def create_program_budgets(cur):
    """Create budgets for existing programs"""
    try:
        # Get all programs
        cur.execute("""
            SELECT id, kode_program, nama_program, jenis_program, total_budget
            FROM programs 
            ORDER BY created_at
        """)
        programs = cur.fetchall()
        
        print(f"\n📋 Found {len(programs)} programs")
        
        # Get price list items for budget references
        cur.execute("""
            SELECT id, item_code, item_name, unit, unit_price, category
            FROM price_list 
            WHERE unit_price > 0
            ORDER BY category, item_name
            LIMIT 20
        """)
        price_items = cur.fetchall()
        
        if not price_items:
            # Try alternative column names
            cur.execute("""
                SELECT id, kode, nama, satuan, harga_satuan, kategori
                FROM price_list 
                WHERE harga_satuan > 0
                ORDER BY kategori, nama
                LIMIT 20
            """)
            price_items = cur.fetchall()
        
        print(f"💰 Found {len(price_items)} price items for budget creation")
        
        created_budgets = 0
        created_items = 0
        
        for i, program in enumerate(programs):
            program_id = program[0]
            kode_program = program[1]
            nama_program = program[2]
            jenis_program = program[3]
            total_budget = program[4] or 0
            
            # Skip if already has budget
            cur.execute("SELECT COUNT(*) FROM program_budgets WHERE program_id = %s", (program_id,))
            existing_budgets = cur.fetchone()[0]
            
            if existing_budgets > 0:
                print(f"  ⏭️  Program {kode_program} already has budget(s), skipping...")
                continue
            
            # Create budget header
            budget_id = str(uuid.uuid4())
            budget_code = f"BUD-2026-{i+1:03d}"
            budget_name = f"Anggaran {nama_program}"
            fiscal_year = 2026
            
            # Calculate appropriate total based on program type
            if jenis_program == "KARBON":
                base_budget = 500000000  # 500 juta untuk program karbon
            elif jenis_program == "PEMBERDAYAAN_EKONOMI":
                base_budget = 250000000  # 250 juta untuk pemberdayaan
            else:
                base_budget = 150000000  # 150 juta untuk lainnya
            
            # Use existing total_budget if available, otherwise use calculated
            budget_total = total_budget if total_budget > 0 else base_budget
            
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
            
            # Create budget items (3-5 items per budget)
            num_items = min(5, len(price_items))
            selected_items = price_items[:num_items] if len(price_items) >= num_items else price_items
            
            total_calculated = 0
            
            for j, price_item in enumerate(selected_items):
                item_id = str(uuid.uuid4())
                price_list_id = price_item[0]
                
                # Handle different column name structures
                if len(price_item) >= 6:
                    if 'item_code' in [desc[0] for desc in cur.description]:
                        item_code = price_item[1]
                        item_name = price_item[2]
                        unit = price_item[3]
                        unit_price = price_item[4]
                        category = price_item[5]
                    else:
                        item_code = price_item[1] if price_item[1] else f"ITEM-{j+1}"
                        item_name = price_item[2]
                        unit = price_item[3]
                        unit_price = price_item[4]
                        category = price_item[5]
                else:
                    # Fallback
                    item_code = f"ITEM-{j+1}"
                    item_name = f"Item {j+1}"
                    unit = "unit"
                    unit_price = 1000000
                    category = "Umum"
                
                # Calculate quantity based on program type and item
                if "Konsultasi" in item_name or "Pelatihan" in item_name:
                    quantity = 10.0 if jenis_program == "KARBON" else 5.0
                elif "Material" in item_name or "Peralatan" in item_name:
                    quantity = 50.0 if jenis_program == "KARBON" else 25.0
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
                    f"Item anggaran {j+1} dari {len(selected_items)}"
                ))
                created_items += 1
                
                total_calculated += quantity * unit_price
            
            # Update program total_budget if it was 0
            if total_budget == 0:
                cur.execute("""
                    UPDATE programs 
                    SET total_budget = %s
                    WHERE id = %s
                """, (budget_total, program_id))
            
            print(f"  ✅ Created budget for {kode_program}: {budget_code} ({budget_total:,.0f} IDR)")
        
        return created_budgets, created_items
        
    except Exception as e:
        print(f"❌ Error creating budgets: {e}")
        return 0, 0

def verify_budget_creation(cur):
    """Verify budgets were created correctly"""
    try:
        # Count budgets
        cur.execute("SELECT COUNT(*) FROM program_budgets")
        total_budgets = cur.fetchone()[0]
        
        # Count budget items
        cur.execute("SELECT COUNT(*) FROM program_budget_items")
        total_items = cur.fetchone()[0]
        
        # Get sample budget with items
        cur.execute("""
            SELECT 
                pb.budget_code,
                pb.budget_name,
                pb.total_amount,
                COUNT(pbi.id) as item_count,
                SUM(pbi.total_amount) as items_total
            FROM program_budgets pb
            LEFT JOIN program_budget_items pbi ON pb.id = pbi.program_budget_id
            GROUP BY pb.id, pb.budget_code, pb.budget_name, pb.total_amount
            LIMIT 3
        """)
        sample_budgets = cur.fetchall()
        
        print(f"\n📊 BUDGET CREATION VERIFICATION:")
        print(f"  • Total program_budgets: {total_budgets}")
        print(f"  • Total program_budget_items: {total_items}")
        
        if sample_budgets:
            print(f"\n📋 Sample budgets:")
            for budget in sample_budgets:
                print(f"  • {budget[0]}: {budget[1]}")
                print(f"    Amount: {budget[2]:,.0f} IDR, Items: {budget[3]}, Items Total: {budget[4]:,.0f} IDR")
        
        # Check programs with budgets
        cur.execute("""
            SELECT 
                COUNT(*) as total_programs,
                COUNT(DISTINCT pb.program_id) as programs_with_budgets,
                AVG(pb.total_amount) as avg_budget
            FROM programs p
            LEFT JOIN program_budgets pb ON p.id = pb.program_id
        """)
        program_stats = cur.fetchone()
        
        print(f"\n📊 PROGRAM BUDGET STATS:")
        print(f"  • Total programs: {program_stats[0]}")
        print(f"  • Programs with budgets: {program_stats[1]}")
        print(f"  • Average budget: {program_stats[2]:,.0f} IDR")
        
    except Exception as e:
        print(f"❌ Verification error: {e}")

def main():
    print("=" * 80)
    print("PROGRAM BUDGET CREATION SCRIPT")
    print("=" * 80)
    
    db_params = get_db_params()
    if not db_params:
        print("❌ Cannot connect to database")
        return
    
    try:
        conn = psycopg2.connect(**db_params)
        conn.autocommit = False
        cur = conn.cursor()
        
        # Check price list structure
        print("\n🔍 Checking database structure...")
        check_price_list_structure(cur)
        
        # Create budgets
        print("\n💰 Creating budgets for programs...")
        created_budgets, created_items = create_program_budgets(cur)
        
        if created_budgets > 0:
            conn.commit()
            print(f"\n✅ Successfully created {created_budgets} budgets with {created_items} items")
            
            # Verification
            verify_budget_creation(cur)
            
            print(f"\n📋 NEXT STEPS:")
            print(f"  1. Restart Next.js dev server")
            print(f"  2. Test form at http://localhost:3000/id/dashboard/programs/new")
            print(f"  3. Check program detail pages for budget display")
            print(f"  4. Verify API endpoints for budget management")
        else:
            print(f"\nℹ️  No new budgets created (may already exist)")
            conn.rollback()
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Main error: {e}")
        if 'conn' in locals():
            conn.rollback()

if __name__ == "__main__":
    main()