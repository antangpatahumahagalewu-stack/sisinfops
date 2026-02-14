
-- MINIMAL FIX FOR FINANCIAL DASHBOARD 500 ERRORS
-- Run this in Supabase Dashboard SQL Editor

-- 1. Add created_by column to budgets (make it nullable first)
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Set a default value from profiles table
UPDATE budgets 
SET created_by = (SELECT id FROM profiles LIMIT 1)
WHERE created_by IS NULL;

-- 3. Make it a foreign key
ALTER TABLE budgets 
ADD CONSTRAINT budgets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Create accounting_ledgers table with minimal schema
CREATE TABLE IF NOT EXISTS accounting_ledgers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ledger_code VARCHAR(50) UNIQUE NOT NULL,
    ledger_name VARCHAR(255) NOT NULL,
    current_balance DECIMAL(20,2) DEFAULT 0
);

-- 5. Add one sample ledger
INSERT INTO accounting_ledgers (ledger_code, ledger_name, current_balance)
VALUES ('OPR-1001', 'Kas dan Bank', 500000000)
ON CONFLICT (ledger_code) DO NOTHING;

-- 6. Verify the fix
SELECT 
    (SELECT COUNT(*) FROM budgets WHERE created_by IS NOT NULL) as budgets_with_created_by,
    (SELECT COUNT(*) FROM accounting_ledgers) as ledger_count;
