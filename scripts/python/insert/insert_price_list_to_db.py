#!/usr/bin/env python3
"""
Script untuk insert 500 item price_list ke database Supabase
"""

import json
import psycopg2
import os
import re
from datetime import datetime

def get_supabase_credentials():
    """Get Supabase database credentials from .env.local"""
    env_path = '/home/sangumang/Documents/sisinfops/.env.local'
    with open(env_path, 'r') as f:
        content = f.read()
    
    supabase_url = ''
    for line in content.split('\n'):
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
            break
    
    # Extract project ref from URL
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        raise ValueError("Invalid Supabase URL format")
    
    project_ref = match.group(1)
    db_host = f'db.{project_ref}.supabase.co'
    db_password = '4@@E-Zd%zCQ!7ZV'  # Password dari informasi sebelumnya
    
    return {
        'host': db_host,
        'port': 5432,
        'database': 'postgres',
        'user': 'postgres',
        'password': db_password,
        'sslmode': 'require'
    }

def check_existing_data(conn):
    """Check existing data in price_list table"""
    cur = conn.cursor()
    try:
        # Count existing rows
        cur.execute("SELECT COUNT(*) as total FROM price_list")
        count = cur.fetchone()[0]
        
        # Get sample of existing items
        cur.execute("SELECT item_code, item_name, category FROM price_list LIMIT 5")
        sample = cur.fetchall()
        
        return count, sample
    finally:
        cur.close()

def insert_items(conn, items):
    """Insert items into price_list table"""
    cur = conn.cursor()
    inserted_count = 0
    skipped_count = 0
    
    print(f"\n📤 Inserting {len(items)} items to price_list...")
    
    for item in items:
        try:
            # Check if item with same code already exists
            cur.execute(
                "SELECT COUNT(*) FROM price_list WHERE item_code = %s",
                (item['item_code'],)
            )
            exists = cur.fetchone()[0] > 0
            
            if exists:
                print(f"   ⚠️  Skipping {item['item_code']} - already exists")
                skipped_count += 1
                continue
            
            # Insert new item
            cur.execute("""
                INSERT INTO price_list (
                    id, item_code, item_name, item_description, unit, unit_price, currency,
                    category, is_active, valid_from, valid_until, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                item['id'],
                item['item_code'],
                item['item_name'],
                item['item_description'],
                item['unit'],
                item['unit_price'],
                item['currency'],
                item['category'],
                item['is_active'],
                item['valid_from'],
                item['valid_until'],
                item['created_at']
            ))
            
            inserted_count += 1
            if inserted_count % 50 == 0:
                print(f"   ✅ Inserted {inserted_count} items...")
                
        except Exception as e:
            print(f"   ❌ Error inserting {item['item_code']}: {str(e)}")
            conn.rollback()
            cur = conn.cursor()  # Reset cursor after error
            skipped_count += 1
    
    conn.commit()
    cur.close()
    return inserted_count, skipped_count

def main():
    print("🚀 Starting price_list data insertion to Supabase...")
    
    # Load generated items
    json_path = '/home/sangumang/Documents/sisinfops/price_list_500_items.json'
    with open(json_path, 'r') as f:
        items = json.load(f)
    
    print(f"📖 Loaded {len(items)} items from {json_path}")
    
    # Get database credentials
    try:
        credentials = get_supabase_credentials()
        print(f"🔗 Connecting to Supabase at {credentials['host']}...")
    except Exception as e:
        print(f"❌ Error getting credentials: {str(e)}")
        return
    
    # Connect to database
    try:
        conn = psycopg2.connect(**credentials)
        print("✅ Connected to database")
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        return
    
    try:
        # Check existing data
        print("\n🔍 Checking existing data...")
        existing_count, sample_items = check_existing_data(conn)
        print(f"   • Existing rows in price_list: {existing_count}")
        
        if sample_items:
            print("   • Sample existing items:")
            for item in sample_items:
                print(f"     - {item[0]}: {item[1]} ({item[2]})")
        
        # Insert new items
        inserted, skipped = insert_items(conn, items)
        
        # Verify total after insertion
        new_total = existing_count + inserted
        print(f"\n📊 INSERTION SUMMARY:")
        print(f"   • Existing items before: {existing_count}")
        print(f"   • New items inserted: {inserted}")
        print(f"   • Items skipped (already exists): {skipped}")
        print(f"   • Total items after insertion: {new_total}")
        
        if inserted > 0:
            # Show some newly inserted items
            cur = conn.cursor()
            cur.execute("""
                SELECT item_code, item_name, category, unit_price 
                FROM price_list 
                ORDER BY created_at DESC 
                LIMIT 5
            """)
            new_items = cur.fetchall()
            cur.close()
            
            print(f"\n🆕 Sample of newly inserted items:")
            for item in new_items:
                print(f"   • {item[0]}: {item[1]}")
                print(f"     Category: {item[2]}, Price: Rp {item[3]:,.0f}")
        
        print(f"\n✅ Data insertion completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during data insertion: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        print("🔒 Database connection closed")

if __name__ == "__main__":
    main()