# DATABASE REFACTORING GUIDE
## Clean Slate Approach: Keep Only Essential Tables

## **🚨 WARNING: DESTRUCTIVE OPERATION**
This process will **DROP MOST TABLES** from your database. Only 5 tables will remain:
1. `profiles`
2. `role_permissions` 
3. `user_roles` (optional, if exists)
4. `perhutanan_sosial`
5. `kabupaten`

**ALL OTHER TABLES WILL BE PERMANENTLY DELETED.**

## **📋 PREREQUISITES**

### **1. Backup Existing Database**
```bash
# Option 1: Backup via Supabase Dashboard
# Go to Supabase Dashboard → Database → Backups → Download backup

# Option 2: Run backup script first
# Copy/paste backup_simple_tables.sql in Supabase SQL Editor
```

### **2. Stop Application Server**
```bash
cd /home/sangumang/Documents/sisinfops
pkill -f "next.*dev" 2>/dev/null
```

### **3. Prepare for Downtime**
- Users will not be able to access the application during refactoring
- Some API endpoints will return errors until updated
- Plan for 15-30 minutes downtime

## **🔧 EXECUTION STEPS (IN ORDER)**

### **STEP 1: Backup Data**
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy/paste **`backup_simple_tables.sql`**
3. Click **RUN**
4. Verify backup: `SELECT COUNT(*) FROM backup_20260129.profiles;`

### **STEP 2: Drop Non-Essential Tables**
1. In same SQL Editor, copy/paste **`cleanup_non_essential_tables.sql`**
2. Click **RUN**
3. This will drop ~40+ tables
4. Verify only 5 tables remain

### **STEP 3: Simplify Remaining Tables**
1. Copy/paste **`simplify_remaining_tables.sql`**
2. Click **RUN**
3. This simplifies structure of remaining 5 tables
4. Creates simple RLS policies

### **STEP 4: Remove Complex Migration Files**
```bash
cd /home/sangumang/Documents/sisinfops
# Move complex migrations to backup folder
mkdir -p supabase/migrations_backup
mv supabase/migrations/202601* supabase/migrations_backup/
mv supabase/migrations/202501* supabase/migrations_backup/

# Keep only initial migration
cp supabase/migrations/20250106_initial.sql supabase/migrations_backup/
rm supabase/migrations/*.sql

# Create new simple migration
cp simplify_remaining_tables.sql supabase/migrations/20260129_simple_schema.sql
```

### **STEP 5: Restart Application**
```bash
cd /home/sangumang/Documents/sisinfops
rm -rf .next
npm run dev
```

## **📊 POST-REFACTORING DATABASE STRUCTURE**

### **Table 1: `profiles` (User Profiles)**
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
full_name VARCHAR(255)
role VARCHAR(20) CHECK (role IN ('admin', 'finance', 'viewer'))
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### **Table 2: `role_permissions` (Simple Permissions)**
```sql
role_name VARCHAR(20) PRIMARY KEY
permissions JSONB DEFAULT '{}'
created_at TIMESTAMPTZ DEFAULT NOW()
```

### **Table 3: `perhutanan_sosial` (PS Data)**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
kabupaten_id UUID REFERENCES kabupaten(id)
skema VARCHAR(50)
pemegang_izin VARCHAR(255)
desa VARCHAR(100)
-- ... essential columns only
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### **Table 4: `kabupaten` (Reference)**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
nama VARCHAR(100) UNIQUE NOT NULL
created_at TIMESTAMPTZ DEFAULT NOW()
```

### **Table 5: `user_roles` (Optional, if app needs many-to-many)**
- May not be needed if using `profiles.role`

## **🔍 RLS POLICIES (SIMPLE)**

1. **`profiles`**: Users can read own profile
2. **`role_permissions`**: All authenticated users can read
3. **`kabupaten`**: All authenticated users can read  
4. **`perhutanan_sosial`**: All authenticated users can read, only admin can write

## **⚠️ IMPACT ON APPLICATION**

### **API Endpoints that will WORK:**
- `/api/ps/**` - PS management
- `/api/profile/**` - User profile
- `/api/admin/users/**` - User management (if updated)
- Authentication & authorization

### **API Endpoints that will BREAK:**
- `/api/finance/**` - All finance APIs (tables deleted)
- `/api/carbon-projects/**` - Carbon projects (tables deleted)
- `/api/dashboard/carbon-stats/**` - Dashboard stats
- `/api/potensi/**` - Potensi management
- `/api/activity-logs/**` - Activity logs
- Most other APIs that access deleted tables

### **Frontend Pages that will WORK:**
- Login/authentication
- User profile
- PS data management (list, create, edit)
- Basic dashboard (if updated)

### **Frontend Pages that will BREAK:**
- Financial dashboard
- Carbon project management
- Advanced reporting
- Any page accessing deleted data

## **🛠️ APPLICATION UPDATES NEEDED**

### **1. Update API Routes**
- Remove/disable routes that access deleted tables
- Update remaining routes to use simplified schema
- Update permission checks to use new role system

### **2. Update Frontend Components**
- Hide/remove navigation items for deleted features
- Update PS management forms for simplified schema
- Update permission checks

### **3. Update Permission Logic**
```javascript
// Old complex permission system → New simple system
const hasPermission = (permission) => {
  // Check user role from profiles.role
  // Check permissions from role_permissions table
};
```

## **🧪 TESTING AFTER REFACTORING**

### **Test 1: Authentication**
1. Logout and login again
2. Verify session works
3. Verify user role is preserved

### **Test 2: PS Data Management**
1. Navigate to PS list (`/id/dashboard/ps`)
2. Create new PS entry (admin only)
3. Edit existing PS entry (admin only)
4. View PS details

### **Test 3: User Management**
1. View own profile
2. Update profile information
3. Admin: view other users (if implemented)

### **Test 4: Permission System**
1. Admin: should have full access
2. Finance: should have read/write but no delete
3. Viewer: should have read-only

## **🚨 ROLLBACK PROCEDURE**

If something goes wrong:

### **Option 1: Restore from Backup Schema**
```sql
-- Restore profiles
DROP TABLE IF EXISTS profiles;
CREATE TABLE profiles AS SELECT * FROM backup_20260129.profiles;

-- Restore perhutanan_sosial
DROP TABLE IF EXISTS perhutanan_sosial;
CREATE TABLE perhutanan_sosial AS SELECT * FROM backup_20260129.perhutanan_sosial;

-- Restore kabupaten
DROP TABLE IF EXISTS kabupaten;
CREATE TABLE kabupaten AS SELECT * FROM backup_20260129.kabupaten;
```

### **Option 2: Restore Full Database Backup**
1. Go to Supabase Dashboard → Database → Backups
2. Restore from previous backup
3. May result in data loss since backup

## **📞 SUPPORT**

If you encounter issues:
1. Check Supabase Dashboard → Logs → Database
2. Verify remaining tables: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
3. Check RLS policies: `SELECT * FROM pg_policies;`
4. Rollback using backup schema

## **✅ SUCCESS CRITERIA**

Refactoring is successful when:
1. Database has only 5 essential tables
2. RLS policies are simple and work
3. Authentication works
4. PS data management works
5. Permission system works with 3 simple roles
6. No complex migration files remain