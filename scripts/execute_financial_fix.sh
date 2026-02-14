#!/bin/bash

echo "🚀 FINANCIAL DASHBOARD FIX EXECUTION"
echo "=========================================="
echo ""
echo "This script will guide you through fixing the 500 errors in financial dashboard."
echo ""
echo "📋 PREREQUISITES:"
echo "1. You must be logged into Supabase Dashboard"
echo "2. Your Next.js dev server should be running"
echo ""
echo "Press Ctrl+C to cancel at any time."
echo ""
read -p "Press Enter to continue..."

echo ""
echo "🔧 STEP 1: CHECK CURRENT STATUS"
echo "=================================="
python3 check_budget_schema.py

echo ""
echo "📋 STEP 2: MIGRATION OPTIONS"
echo "=================================="
echo "Choose which SQL migration to run:"
echo ""
echo "1. MINIMAL FIX (Quick)"
echo "   - Adds only required columns and tables"
echo "   - Fastest option"
echo ""
echo "2. COMPLETE FIX (Recommended)"
echo "   - Adds all missing columns with proper constraints"
echo "   - Creates sample data for testing"
echo "   - Includes indexes for performance"
echo ""
read -p "Enter option (1 or 2): " migration_option

if [ "$migration_option" == "1" ]; then
    echo ""
    echo "📝 RUNNING MINIMAL FIX"
    echo "======================"
    echo ""
    echo "SQL to run in Supabase Dashboard:"
    echo "----------------------------------"
    cat minimal_financial_fix.sql
    echo ""
    echo "📋 INSTRUCTIONS:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select project: saelrsljpneclsbfdxfy"
    echo "3. Open SQL Editor → New query"
    echo "4. Copy the SQL above"
    echo "5. Click 'Run'"
    echo "6. Wait for success message"
    
elif [ "$migration_option" == "2" ]; then
    echo ""
    echo "📝 RUNNING COMPLETE FIX"
    echo "======================="
    echo ""
    echo "SQL to run in Supabase Dashboard:"
    echo "----------------------------------"
    cat supabase/migrations/202602131209_fix_financial_tables_quick.sql
    echo ""
    echo "📋 INSTRUCTIONS:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select project: saelrsljpneclsbfdxfy"
    echo "3. Open SQL Editor → New query"
    echo "4. Copy the SQL above"
    echo "5. Click 'Run'"
    echo "6. Wait for success message"
else
    echo "❌ Invalid option. Exiting."
    exit 1
fi

echo ""
echo "⏳ STEP 3: WAIT FOR SCHEMA CACHE REFRESH"
echo "========================================="
echo "Supabase caches schema for 60 seconds."
echo "Please wait 1-2 minutes after running the SQL."
echo ""
read -p "Have you run the SQL migration in Supabase Dashboard? (yes/NO): " migration_done

if [ "$migration_done" != "yes" ]; then
    echo ""
    echo "⚠️  Please run the migration first, then run this script again."
    echo "   Or run: python3 test_financial_apis.py after migration."
    exit 0
fi

echo ""
echo "⏳ Waiting 90 seconds for schema cache refresh..."
sleep 90

echo ""
echo "🧪 STEP 4: TEST THE FIX"
echo "======================="
python3 test_financial_apis.py

echo ""
echo "🔍 STEP 5: VERIFY DATABASE CHANGES"
echo "==================================="
python3 check_budget_schema.py

echo ""
echo "📋 STEP 6: NEXT STEPS"
echo "====================="
echo ""
echo "If tests pass:"
echo "1. ✅ Financial dashboard should load without 500 errors"
echo "2. ✅ Check browser console for any remaining errors"
echo "3. ✅ Verify data displays correctly in dashboard"
echo ""
echo "If tests fail:"
echo "1. ❌ Wait another 60 seconds for schema cache"
echo "2. ❌ Restart Next.js dev server: npm run dev"
echo "3. ❌ Check Supabase Dashboard → Logs for errors"
echo ""
echo "🎉 FINISHED!"
echo "Run 'python3 test_financial_apis.py' anytime to test API endpoints."