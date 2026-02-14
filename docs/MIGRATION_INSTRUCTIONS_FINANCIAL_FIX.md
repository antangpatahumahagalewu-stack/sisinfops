# Financial Dashboard 500 Error Fix - Migration Instructions

## Problem
The financial dashboard shows 500 errors when fetching:
1. **Budgets**: Missing `created_by` column in `budgets` table
2. **Ledger Balances**: `accounting_ledgers` table doesn't exist

## Solution
Run the SQL migration in Supabase Dashboard to fix both issues.

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Sign in if needed
- Select your project: **saelrsljpneclsbfdxfy**

### 2. Open SQL Editor
- Click on **SQL Editor** in the left sidebar
- Click **New query**

### 3. Copy and Paste SQL
Copy the SQL below and paste it into the SQL Editor:

```sql
-- MIGRATION: QUICK FIX FOR FINANCIAL DASHBOARD 500 ERRORS
-- Date: 2026-02-13 12:09 PM

BEGIN;

-- PART 1: ADD MISSING created_by COLUMN TO BUDGETS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'budgets' AND column_name = 'created_by') THEN
        ALTER TABLE budgets ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE CASCADE;
        
        -- Update existing rows with a default user
        UPDATE budgets 
        SET created_by = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
        WHERE created_by IS NULL;
        
        RAISE NOTICE '✅ Added created_by column to budgets table';
    END IF;
END $$;

-- PART 2: CREATE ACCOUNTING_LEDGERS TABLE
CREATE TABLE IF NOT EXISTS accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ledger_code VARCHAR(50) UNIQUE NOT NULL,
    ledger_name VARCHAR(255) NOT NULL,
    ledger_type VARCHAR(50) DEFAULT 'OPERATIONAL',
    opening_balance DECIMAL(20,2) DEFAULT 0,
    current_balance DECIMAL(20,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PART 3: ADD SAMPLE DATA
DO $$
DECLARE
    ledger_count INTEGER;
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM profiles LIMIT 1;
    END IF;
    
    SELECT COUNT(*) INTO ledger_count FROM accounting_ledgers;
    
    IF ledger_count = 0 AND admin_user_id IS NOT NULL THEN
        INSERT INTO accounting_ledgers (ledger_code, ledger_name, ledger_type, opening_balance, current_balance, currency, is_active, created_by, description)
        VALUES
            ('OPR-1001', 'Kas dan Bank', 'OPERATIONAL', 500000000, 500000000, 'IDR', true, admin_user_id, 'Kas dan bank operasional'),
            ('OPR-1002', 'Piutang Usaha', 'OPERATIONAL', 150000000, 150000000, 'IDR', true, admin_user_id, 'Piutang dari klien'),
            ('OPR-2001', 'Hutang Usaha', 'OPERATIONAL', 75000000, 75000000, 'IDR', true, admin_user_id, 'Hutang kepada supplier'),
            ('OPR-3001', 'Modal', 'OPERATIONAL', 1000000000, 1000000000, 'IDR', true, admin_user_id, 'Modal awal yayasan')
        ON CONFLICT (ledger_code) DO NOTHING;
    END IF;
END $$;

COMMIT;
```

### 4. Run the Migration
- Click the **Run** button (or press Ctrl+Enter)
- Wait for the query to complete (should take 1-2 seconds)
- You should see "Success. No rows returned" or similar message

### 5. Wait for Schema Cache Refresh
- Supabase caches schema for 60 seconds
- Wait **1-2 minutes** for the changes to propagate

### 6. Restart Next.js Dev Server (if needed)
If your dev server is running:
```
cd /home/sangumang/Documents/sisinfops
# Stop the server (Ctrl+C)
npm run dev
```

### 7. Test the Fix
Run the test script:
```
python3 test_financial_apis.py
```

Or test manually:
1. Open the financial dashboard in your browser
2. Check browser console for errors (F12 → Console)
3. Verify no more "Failed to fetch transactions: 500" errors

## Verification
After migration, check:
- ✅ `budgets` table has `created_by` column
- ✅ `accounting_ledgers` table exists with 4 sample rows
- ✅ API endpoints return 200 OK instead of 500 errors

## Troubleshooting

### If migration fails:
1. **"relation profiles does not exist"**: Create a profiles table first
2. **"duplicate key value violates unique constraint"**: Table already has data - that's OK
3. **Permission errors**: Use Service Role key instead of Anon key

### If APIs still return 500:
1. Wait longer for schema cache (2-3 minutes)
2. Restart Next.js dev server
3. Clear browser cache
4. Check Supabase logs for errors

## Files Created
1. `supabase/migrations/202602131209_fix_financial_tables_quick.sql` - Migration SQL
2. `test_financial_apis.py` - Test script
3. `check_budget_schema.py` - Schema verification script
4. `run_financial_migration.py` - Migration helper script

## Support
If issues persist, check:
- Browser console for error details
- Next.js terminal for server errors
- Supabase Dashboard → Logs for database errors