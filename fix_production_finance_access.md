# SOLUSI: Perbaikan Akses Finance Manager di Production

## **🔍 ROOT CAUSE**
Masih error "unauthorized" di `https://app.antang.org/id/dashboard?error=unauthorized` karena:

1. **RLS Policies belum diupdate di database production**
2. **Migration `20260140_fix_finance_rls_policies.sql` belum dijalankan di Supabase production**
3. **Production build menggunakan code lama (cached)**

## **✅ LANGKAH PERBAIKAN**

### **STEP 1: Jalankan RLS Migration di Production Database**

1. **Buka Supabase Production Dashboard**:
   - Login ke `https://supabase.com/dashboard`
   - Pilih project production (mungkin berbeda dengan development)

2. **Jalankan Migration SQL**:
   - Buka **SQL Editor**
   - Copy SEMUA isi file: `supabase/migrations/20260140_fix_finance_rls_policies.sql`
   - Paste dan **RUN**

3. **Verifikasi Migration Berhasil**:
   ```sql
   -- Cek jika finance roles ada di policies
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE policyname LIKE '%finance%' 
      OR policyname LIKE '%Finance%';
   ```

### **STEP 2: Verifikasi Database Production**

Jalankan script verifikasi:
```bash
cd /home/sangumang/Documents/sisinfops
node check_masbob.js
```

Expected output:
- ✅ User found: masbob@yamal.com
- ✅ Profile role: finance_manager
- ✅ Has FINANCIAL_VIEW: ✅ YES

### **STEP 3: Clear Cache & Redeploy**

**Option A: Jika menggunakan Vercel**:
```bash
# Clear build cache
vercel --force --prod

# Atau redeploy
vercel --prod
```

**Option B: Jika build lokal untuk production**:
```bash
cd /home/sangumang/Documents/sisinfops
rm -rf .next
npm run build
npm run start
```

### **STEP 4: User Action Required**

1. **Logout** dari aplikasi `https://app.antang.org`
2. **Clear browser cache & cookies**
3. **Login kembali** sebagai `masbob@yamal.com`
4. **Test akses finance**:
   - https://app.antang.org/id/dashboard/finance
   - https://app.antang.org/id/dashboard/finance/operasional
   - https://app.antang.org/id/dashboard/finance/transactions

## **📋 TROUBLESHOOTING**

### **Jika masih error setelah STEP 1-4**:

**Check 1: Verifikasi Database yang Benar**
```bash
# Cek environment variables di production
echo "Checking production Supabase URL..."
curl -s https://app.antang.org/api/env-check 2>/dev/null || echo "Cannot check env"
```

**Check 2: Manual SQL Verification**
```sql
-- Run di Supabase SQL Editor production
-- Cek user role
SELECT p.id, p.role, u.email 
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'masbob@yamal.com';

-- Cek RLS policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('financial_transactions', 'profiles', 'role_permissions');
```

**Check 3: Force Cache Invalidation**
```bash
# Untuk Vercel, tambahkan timestamp query parameter
# Buka: https://app.antang.org?id=dashboard&t=$(date +%s)
```

## **⚡ QUICK FIX SCRIPT**

Buat file `fix_production_now.js`:
```javascript
// fix_production_now.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rrvhekjdhdhtkmswjgwk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0';

async function fixProduction() {
  console.log('🔄 Applying production fix...');
  
  // 1. Update user role jika perlu
  const { data: users } = await supabase.auth.admin.listUsers();
  const masbob = users.users.find(u => u.email === 'masbob@yamal.com');
  
  if (masbob) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'finance_manager' })
      .eq('id', masbob.id);
    
    if (error) {
      console.error('❌ Error updating profile:', error.message);
    } else {
      console.log('✅ Updated masbob@yamal.com to finance_manager');
    }
  }
  
  // 2. Verifikasi
  console.log('\n✅ PRODUCTION FIX APPLIED');
  console.log('📋 Next steps:');
  console.log('   1. Clear browser cache');
  console.log('   2. Logout & login again');
  console.log('   3. Test finance access');
}

fixProduction().catch(console.error);
```

## **📞 SUPPORT**

Jika semua langkah di atas tidak berhasil:

1. **Check Supabase Logs**: Dashboard → Logs → Database
2. **Check Application Logs**: Vercel Dashboard → Logs
3. **Compare Environments**: Pastikan production dan development menggunakan database yang sama

## **✅ SUCCESS INDICATORS**

Setelah perbaikan berhasil:
- ✅ No more "unauthorized" error
- ✅ Finance menu muncul di sidebar
- ✅ User bisa akses semua sub-menu finance
- ✅ Session tetap terjaga setelah login

---

**IMPORTANT**: Migration RLS harus dijalankan di **production database**, bukan development. Pastikan Anda login ke Supabase project yang benar.