# PHASE 2: FRONTEND INTEGRATION GUIDE

## 🎯 OBJECTIVES
1. Test dashboard dengan data aktual (92 PS records)
2. Implement Role-Based Access Control (RBAC) menggunakan `role_permissions`
3. Test semua fitur: filters, Excel upload, navigation
4. Verify frontend-backend integration complete

## 📊 CURRENT STATUS ANALYSIS

### **✅ GOOD NEWS: Frontend sudah menggunakan schema baru!**
Berdasarkan search results:
- **Table name**: `perhutanan_sosial` (✅ CORRECT - match dengan schema baru)
- **Column names**: `kabupaten_id`, `skema`, `pemegang_izin`, `luas_ha`, `jumlah_kk`, dll (✅ CORRECT)
- **API calls**: Semua queries menggunakan Supabase client dengan table name yang benar

### **🔴 BLOCKING ISSUE: API Connectivity**
Masih ada error: "permission denied for table kabupaten"
**Solution**: Regenerate Supabase keys di dashboard

## 🚀 PHASE 2 EXECUTION PLAN

### **STEP 1: FIX API CONNECTIVITY (CRITICAL)**

#### **Option A: Regenerate Keys (Recommended)**
```bash
1. Buka: https://supabase.com/dashboard/project/rrvhekjdhdhtkmswjgwk
2. Navigate: Project Settings → API → URL & Keys
3. Klik 'Regenerate' untuk:
   - Anon public key
   - Service Role key (secret)
4. Update .env.local:
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[new_anon_key]
   SUPABASE_SERVICE_ROLE_KEY=[new_service_key]
5. Test: node check-ps-data.js
```

#### **Option B: Temporary Workaround (Development Only)**
```bash
# Copy service role key ke anon key (bypass RLS)
# Edit .env.local:
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PASTE_SERVICE_ROLE_KEY_HERE]

# ⚠️ WARNING: UNSAFE untuk production!
# Hanya untuk testing cepat
```

### **STEP 2: TEST DASHBOARD DATA**

Setelah API bekerja, jalankan:

```bash
# 1. Start frontend
npm run dev

# 2. Buka browser
#    http://localhost:3000
#    atau http://localhost:3000/id (Bahasa Indonesia)

# 3. Expected results:
#    - Dashboard menampilkan 92 PS records
#    - Total luas: ~60,000+ ha
#    - Total KK: ~2,000+ KK
#    - Charts & statistics muncul

# 4. Test navigation:
#    - Dashboard Nasional → 92 records
#    - Kabupaten Management → 5 kabupaten dengan stats
#    - Data PS Management → Table dengan 92 rows
#    - Statistics → Charts by skema, jenis hutan, dll
```

### **STEP 3: RBAC IMPLEMENTATION**

#### **Current RBAC Status:**
- `role_permissions` table ada dengan 13 roles
- `profiles.role` constraint sudah fixed (12 roles)
- Frontend perlu integrate dengan role permissions

#### **RBAC Implementation Tasks:**

**1. Create RBAC Hook/Utility:**
```typescript
// lib/rbac.ts atau hooks/usePermissions.ts
import { createClient } from '@supabase/supabase-js'

export async function getUserPermissions(userId: string) {
  const supabase = createClient(...)
  
  // Get user role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (!profile?.role) return null
  
  // Get permissions for role
  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role_name', profile.role)
    .single()
  
  return rolePerms?.permissions || {}
}

export function checkPermission(permissions: any, resource: string, action: string) {
  return permissions?.[resource]?.[action] === true
}
```

**2. Update Navigation Components:**
```typescript
// components/Navigation.tsx
const { permissions } = usePermissions()

// Show/hide menu items berdasarkan permissions
{permissions?.dashboard?.view && <DashboardLink />}
{permissions?.ps_data?.manage && <PSManagementLink />}
{permissions?.finance?.view && <FinanceLink />}
```

**3. Protect API Routes/Pages:**
```typescript
// app/[locale]/dashboard/finance/page.tsx
export default function FinancePage() {
  const { permissions } = usePermissions()
  
  if (!permissions?.finance?.view) {
    return <Unauthorized />
  }
  
  // Render finance page
}
```

### **STEP 4: TEST ALL FEATURES**

#### **Test Matrix:**

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| **Dashboard** | Load dashboard | Show 92 PS records, statistics |
| **Kabupaten Filter** | Filter by kabupaten | Show PS data filtered by kabupaten |
| **Excel Upload** | Upload Excel template | Import data ke `perhutanan_sosial` |
| **PS Profile** | Click PS record | Show detail tabs (kelembagaan, peta, dll) |
| **Role Navigation** | Login dengan role berbeda | Show different menu items |
| **Search & Filter** | Search by pemegang_izin | Filter results correctly |
| **Pagination** | Navigate pages | Load next page of PS data |
| **Statistics** | View statistics page | Charts by skema, jenis hutan, tahun |

#### **Automated Test Script:**
```bash
# Buat test script untuk frontend
node test-frontend-integration.js
```

### **STEP 5: PERFORMANCE OPTIMIZATION**

**Issues Identified:**
1. **No indexes** di schema yang diberikan
2. **Large data queries** tanpa pagination
3. **Frontend caching** belum optimal

**Optimizations:**
```sql
-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_kabupaten_id ON perhutanan_sosial(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_perhutanan_sosial_skema ON perhutanan_sosial(skema);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
```

**Frontend Optimizations:**
- Implement React Query/SWR untuk caching
- Add pagination untuk large tables
- Lazy load components

## 🔧 SUPPORTING SCRIPTS

### **1. Frontend Integration Test Script:**
```bash
# test-frontend-integration.js
# Test semua API endpoints yang digunakan frontend
```

### **2. RBAC Setup Script:**
```bash
# setup-rbac.js
# Create default role permissions jika belum ada
```

### **3. Performance Test Script:**
```bash
# test-performance.js
# Test page load times dengan 100+ records
```

## 📋 SUCCESS CRITERIA

### **✅ MUST HAVE (Phase 2 Complete)**
1. Dashboard menampilkan 92 PS records
2. All navigation links work
3. Excel upload imports data correctly
4. Role-based navigation implemented
5. No console errors

### **✅ NICE TO HAVE**
1. Page load < 2 seconds
2. Caching implemented
3. All statistics charts render correctly
4. Mobile responsive

### **✅ FUTURE ENHANCEMENTS**
1. Real-time updates dengan Supabase Realtime
2. Advanced filtering & search
3. Export to PDF/Excel
4. Audit trail integration

## 🚨 TROUBLESHOOTING

### **Jika dashboard tidak show data:**
```bash
1. Check browser console untuk error
2. Test API: node check-ps-data.js
3. Verify .env.local keys correct
4. Check Supabase dashboard → Table Editor → perhutanan_sosial
```

### **Jika role navigation tidak work:**
```bash
1. Check role_permissions table has data
2. Check profiles.role untuk current user
3. Verify RBAC hook returns correct permissions
```

### **Jika Excel upload failed:**
```bash
1. Check file format matches template
2. Check RLS policies allow insert
3. Check console untuk validation errors
```

## ⏱️ TIMELINE ESTIMATION

| Task | Time Estimate | Priority |
|------|---------------|----------|
| Fix API Connectivity | 10-30 minutes | CRITICAL |
| Test Dashboard | 30 minutes | HIGH |
| Implement RBAC | 2-4 hours | HIGH |
| Test All Features | 1-2 hours | MEDIUM |
| Performance Optimization | 1-2 hours | LOW |

**Total Estimate**: 5-9 hours (1-2 hari kerja)

## 🎯 NEXT STEPS SETELAH PHASE 2

### **PHASE 3: PRODUCTION READINESS**
1. Enable RLS dengan proper policies
2. Import real production data
3. Security audit & penetration testing
4. Load testing dengan 1000+ records
5. Deployment to production

### **PHASE 4: ADVANCED FEATURES**
1. Carbon module integration
2. Financial module implementation
3. Program management module
4. Monitoring & Evaluation (MONEV) module
5. Mobile app development

---

**IMMEDIATE ACTION**: Regenerate Supabase keys dan test dashboard. Setelah dashboard bekerja, lanjut ke RBAC implementation.

**STATUS**: Frontend code sudah compatible dengan schema baru, tinggal fix API connectivity!