#!/bin/bash

# FINANCIAL DASHBOARD 500 ERROR FIX - QUICK START
# Run this script to get instructions for fixing the financial dashboard errors

echo "🔧 FINANCIAL DASHBOARD 500 ERROR FIX"
echo "=========================================="
echo ""
echo "PROBLEM: Financial dashboard shows 500 errors when fetching:"
echo "  • Failed to fetch transactions: 500"
echo "  • Failed to fetch budgets: 500"
echo ""
echo "ROOT CAUSE:"
echo "  1. Missing 'created_by' column in 'budgets' table"
echo "  2. Missing 'accounting_ledgers' table"
echo ""
echo "SOLUTION: Run SQL migration in Supabase Dashboard"
echo ""
echo "📋 STEP-BY-STEP INSTRUCTIONS:"
echo "------------------------------------------"
echo ""
echo "1. OPEN SUPABASE DASHBOARD:"
echo "   Go to: https://supabase.com/dashboard"
echo "   Sign in with your account"
echo ""
echo "2. SELECT YOUR PROJECT:"
echo "   Project: saelrsljpneclsbfdxfy"
echo ""
echo "3. OPEN SQL EDITOR:"
echo "   • Click 'SQL Editor' in left sidebar"
echo "   • Click 'New query'"
echo ""
echo "4. COPY AND PASTE THIS SQL:"
echo ""
cat << 'EOF'
-- FIX FOR FINANCIAL DASHBOARD 500 ERRORS
BEGIN;

-- 1. Add missing created_by column to budgets table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'budgets' AND column_name = 'created_by') THEN
        ALTER TABLE budgets ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE CASCADE;
        
        -- Set default value for existing rows
        UPDATE budgets 
        SET created_by = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
        WHERE created_by IS NULL;
        
        RAISE NOTICE '✅ Added created_by column to budgets table';
    END IF;
END $$;

-- 2. Create accounting_ledgers table if it doesn't exist
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

-- 3. Add sample data for testing
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
EOF

echo ""
echo "5. RUN THE SQL:"
echo "   • Click the 'Run' button (or press Ctrl+Enter)"
echo "   • Wait for success message: 'Success. No rows returned'"
echo ""
echo "6. WAIT FOR SCHEMA CACHE REFRESH:"
echo "   • Wait 1-2 minutes"
echo "   • Supabase caches schema for 60 seconds"
echo ""
echo "7. TEST THE FIX:"
echo "   • Run: python3 test_financial_apis.py"
echo "   • Or check the financial dashboard in browser"
echo ""
echo "⚠️  IMPORTANT: You MUST run this SQL manually in Supabase Dashboard."
echo "   I cannot execute it automatically because the exec_sql RPC function"
echo "   doesn't exist in your database."
echo ""
echo "📁 FILES CREATED FOR YOU:"
echo "   • supabase/migrations/202602131209_fix_financial_tables_quick.sql"
echo "   • MIGRATION_INSTRUCTIONS_FINANCIAL_FIX.md"
echo "   • test_financial_apis.py"
echo "   • check_budget_schema.py"
echo ""
echo "❓ NEED HELP?"
echo "   If you encounter issues:"
echo "   1. Check browser console for detailed errors"
echo "   2. Check Next.js terminal for server errors"
echo "   3. Check Supabase Dashboard → Logs"
echo ""
echo "✅ AFTER FIX:"
echo "   • budgets table will have created_by column"
echo "   • accounting_ledgers table will exist with 4 sample rows"
echo "   • Financial dashboard will load without 500 errors"
echo ""
echo "=========================================="
echo "Run this command to test after migration:"
echo "  python3 test_financial_apis.py"
echo "=========================================="