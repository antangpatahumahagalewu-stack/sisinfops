# STEP BY STEP FIX: Finance Manager Access
## Problem: `http://localhost:3000/id/dashboard?error=unauthorized`

## **ROOT CAUSE**
1. **RLS policy name too long** - PostgreSQL truncates to 63 characters, causing duplicate policy names
2. **Profiles table RLS missing** - hasPermission() cannot read user role
3. **Finance roles not in RLS policies** - finance_manager cannot access financial tables

## **QUICK FIX - 3 SIMPLE STEPS**

### **STEP 1: Run Profiles Table Fix**
**File**: `fix_profiles_rls.sql`
```sql
-- Run in Supabase SQL Editor
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (auth.uid() = id);
```

### **STEP 2: Run Simple RLS Fix**
**File**: `fix_rls_simple.sql`
```sql
-- Run in Supabase SQL Editor
-- This file has SHORT policy names (< 63 chars)
-- Copy/paste entire file
```

### **STEP 3: Clear Cache & Restart**
```bash
# Terminal 1 - Stop server if running
pkill -f "next.*dev" 2>/dev/null

# Terminal 2 - Clear cache and restart
cd /home/sangumang/Documents/sisinfops
rm -rf .next
npm run dev
```

## **USER ACTION REQUIRED**
1. **Clear browser cache** (Ctrl+Shift+Del)
2. **Logout** dari aplikasi
3. **Login kembali** sebagai `masbob@yamal.com`
4. **Test akses**: `http://localhost:3000/id/dashboard/finance`

## **VERIFICATION**

### **Check if fix worked:**
```bash
cd /home/sangumang/Documents/sisinfops
node final_verification.js
```

### **Expected output:**
- ✅ Profiles table accessible
- ✅ Financial transactions accessible  
- ✅ hasPermission() returns TRUE
- ✅ User role: finance_manager in FINANCIAL_VIEW

## **TROUBLESHOOTING**

### **If still getting "unauthorized":**

**Check 1: SQL execution errors**
```sql
-- Check for duplicate policies
SELECT tablename, policyname, LENGTH(policyname) as name_length
FROM pg_policies 
WHERE LENGTH(policyname) >= 60
ORDER BY name_length DESC;
```

**Check 2: User role verification**
```sql
-- Verify masbob role
SELECT p.role, u.email 
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'masbob@yamal.com';
```

**Check 3: Server logs**
```bash
tail -f /tmp/nextjs_restart.log
```

## **ALTERNATIVE FIX**

If simple fix doesn't work, run **manual cleanup**:

```sql
-- 1. Drop ALL problematic policies
DROP POLICY IF EXISTS "Donors manageable by admin and carbon_specialist and finance ro" ON donors;
DROP POLICY IF EXISTS "Grants manageable by admin, carbon_specialist, program_planner and finance roles" ON grants;
DROP POLICY IF EXISTS "Budgets manageable by admin, program_planner, carbon_specialist and finance roles" ON budgets;

-- 2. Create simple policies with SHORT names
CREATE POLICY "donors_finance" ON donors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role LIKE 'finance%' OR role = 'admin' OR role = 'carbon_specialist')
);

CREATE POLICY "grants_finance" ON grants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role LIKE 'finance%' OR role IN ('admin', 'carbon_specialist', 'program_planner'))
);

CREATE POLICY "budgets_finance" ON budgets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role LIKE 'finance%' OR role IN ('admin', 'program_planner', 'carbon_specialist'))
);
```

## **SUCCESS INDICATORS**

After successful fix:
- ✅ No "unauthorized" error
- ✅ Finance menu appears in sidebar
- ✅ User can access all finance sub-menus
- ✅ Session remains active

## **FILE SUMMARY**

| File | Purpose |
|------|---------|
| `fix_profiles_rls.sql` | Fix profiles table RLS (CRITICAL) |
| `fix_rls_simple.sql` | Simple RLS with short names |
| `final_verification.js` | Verify fix worked |
| `simple_rls_check.js` | Debug RLS issues |
| `step_by_step_fix.md` | This guide |

## **SUPPORT**

If all steps fail:
1. Check Supabase Dashboard → Logs → Database
2. Restart Supabase local instance if using localhost
3. Contact system administrator

**Important**: Run SQL fixes in **Supabase SQL Editor**, not via API.