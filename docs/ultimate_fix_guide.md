# ULTIMATE FIX GUIDE: Finance Manager Access + RLS Issues

## **🚨 PROBLEMS IDENTIFIED**

### **1. Policy Name Length Issue**
```
ERROR: 42710: policy "Donors manageable by admin and carbon_specialist and finance ro" for table "donors" already exists
```
**Root Cause**: PostgreSQL truncates policy names to 63 characters → duplicate policy names.

### **2. Profiles Table RLS Missing**
```
cannot execute INSERT in a read-only transaction
```
**Root Cause**: `hasPermission()` cannot read user role from `profiles` table.

### **3. Perhutanan Sosial 400 Error**
```
GET https://rrvhekjdhdhtkmswjgwk.supabase.co/rest/v1/perhutanan_sosial?select=id%2Cnama_kelompok_tani%2Cupdated_at&limit=50 400 (Bad Request)
```
**Root Cause**: RLS policy missing for `perhutanan_sosial` table.

## **✅ COMPLETE SOLUTION - 4 MIGRATIONS**

### **STEP 1: Run Profiles Table Fix**
```sql
-- Run in Supabase SQL Editor
-- File: fix_profiles_rls.sql
-- OR use this simple version:
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (auth.uid() = id);
```

### **STEP 2: Run Policy Name Length Fix**
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/20260141_fix_policy_name_length.sql
-- This fixes the 63-character limit issue
```

### **STEP 3: Run Finance RLS Policies**
```sql
-- Run in Supabase SQL Editor  
-- File: supabase/migrations/20260140_fix_finance_rls_policies.sql
-- OR use simpler version: fix_rls_simple.sql
```

### **STEP 4: Fix Perhutanan Sosial Table**
```sql
-- Run in Supabase SQL Editor
-- Fix 400 error for perhutanan_sosial table
DROP POLICY IF EXISTS "ps_select_authenticated" ON perhutanan_sosial;
CREATE POLICY "ps_select_authenticated" ON perhutanan_sosial
FOR SELECT USING (auth.role() = 'authenticated');
```

## **🔄 CLEAR CACHE & RESTART**

```bash
# Terminal 1 - Stop server
pkill -f "next.*dev" 2>/dev/null

# Terminal 2 - Clear cache and restart
cd /home/sangumang/Documents/sisinfops
rm -rf .next
npm run dev
```

## **👤 USER ACTION REQUIRED**

1. **Clear browser cache** (Ctrl+Shift+Del)
2. **Logout** dari aplikasi
3. **Login kembali** sebagai `masbob@yamal.com`
4. **Test akses**: 
   - `http://localhost:3000/id/dashboard/finance`
   - `http://localhost:3000/id/dashboard`

## **🔍 VERIFICATION**

Run verification script:
```bash
cd /home/sangumang/Documents/sisinfops
node final_verification.js
```

**Expected output:**
- ✅ Profiles table accessible
- ✅ Financial transactions accessible  
- ✅ hasPermission() returns TRUE
- ✅ User role: finance_manager in FINANCIAL_VIEW
- ✅ No 400 errors in console

## **📁 FILE SUMMARY**

| File | Purpose | Status |
|------|---------|--------|
| `fix_profiles_rls.sql` | Fix profiles table RLS | ✅ Ready |
| `20260141_fix_policy_name_length.sql` | Fix 63-char policy limit | ✅ In migrations |
| `20260140_fix_finance_rls_policies.sql` | Full finance RLS | ✅ In migrations |
| `fix_rls_simple.sql` | Simple RLS with short names | ✅ Ready |
| `ultimate_fix_guide.md` | This guide | ✅ Ready |

## **⚡ QUICK COMMANDS FOR ALL FIXES**

```sql
-- Copy/paste ALL of this into Supabase SQL Editor:

-- 1. Fix Profiles RLS
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (auth.uid() = id);

-- 2. Fix Perhutanan Sosial RLS
DROP POLICY IF EXISTS "ps_select_authenticated" ON perhutanan_sosial;
CREATE POLICY "ps_select_authenticated" ON perhutanan_sosial
FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Fix Financial Transactions (simplified)
DROP POLICY IF EXISTS "finance_tx_select" ON financial_transactions;
CREATE POLICY "finance_tx_select" ON financial_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'carbon_specialist',
                 'finance_manager', 'finance_operational', 'finance_project_carbon',
                 'finance_project_implementation', 'finance_project_social')
  )
);

-- 4. Create similar policies for other financial tables
-- (Use fix_rls_simple.sql for complete set)
```

## **🚨 TROUBLESHOOTING**

### **If still getting errors:**

**Check migration order:**
```sql
-- Run migrations in this order:
1. 20260139_fix_all_roles_constraint.sql
2. 20260140_fix_finance_rls_policies.sql
3. 20260141_fix_policy_name_length.sql
4. fix_profiles_rls.sql
```

**Check for duplicate policies:**
```sql
SELECT tablename, policyname, LENGTH(policyname) as name_length
FROM pg_policies 
WHERE LENGTH(policyname) >= 60
ORDER BY name_length DESC;
```

**Check server logs:**
```bash
# Check Next.js logs
tail -f /tmp/nextjs_restart.log

# Check browser console
# Press F12 → Console tab
```

## **🎯 SUCCESS CRITERIA**

After all fixes:
1. ✅ No "unauthorized" error on dashboard
2. ✅ Finance menu appears in sidebar
3. ✅ User can access all finance sub-menus
4. ✅ No 400 errors in console
5. ✅ Session remains active after login

## **📞 SUPPORT**

If all steps fail:
1. **Check Supabase Dashboard** → Logs → Database
2. **Rollback and retry** with simpler approach
3. **Contact system administrator** with this guide

**Important**: SQL fixes must be run in **Supabase SQL Editor**, not via API. Run migrations in correct order.