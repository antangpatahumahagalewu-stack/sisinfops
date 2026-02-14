# ADMIN GOD MODE IMPLEMENTATION

## Overview

The Admin God Mode provides **absolute access control** to the sole administrator of the SIPS+ application. This feature ensures that the administrator has complete, unrestricted access to all data and operations within the system, while maintaining security through comprehensive auditing.

## Key Principles

1. **Absolute Access**: The administrator can perform ANY operation (SELECT, INSERT, UPDATE, DELETE) on ANY table
2. **Immutability**: Audit logs are read-only and cannot be modified, even by the administrator
3. **Accountability**: All admin actions are logged with full details (who, what, when, where)
4. **Safety**: Query execution is limited to read-only operations for security

## Architecture

### 1. Database Layer (Supabase Policies)
- **Admin Bypass Policies**: Added to ALL tables in the public schema
- **Utility Functions**: `is_admin_user()`, `get_database_stats()`, `admin_query_readonly()`
- **Audit Table**: `god_mode_audit` table with comprehensive logging
- **Triggers**: Automatically log admin actions on critical tables

### 2. Application Layer (RBAC Extensions)
- **God Mode Detection**: `isGodAdmin()`, `hasGodMode()` functions
- **Permission Bypass**: `hasPermissionOrGodMode()` automatically grants all permissions
- **Enhanced Permissions**: `getUserEnhancedPermissions()` includes GOD_MODE flag
- **Admin Dashboard**: Complete system monitoring and control interface

### 3. Security Layer
- **Audit Logging**: All admin actions are recorded
- **Read-Only Queries**: SQL execution limited to SELECT operations
- **Immutable Logs**: Audit logs cannot be modified
- **Single Admin Verification**: Ensures only one admin has god mode

## Implementation Details

### Database Migration
The migration file `supabase/migrations/202602141000_admin_god_mode_policies.sql` includes:

#### A. Audit Table Creation
```sql
CREATE TABLE IF NOT EXISTS god_mode_audit (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'EXECUTE')),
    affected_rows INTEGER,
    sql_query TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### B. Admin Bypass Policies
The migration adds policies to ALL tables in the format:
```sql
CREATE POLICY "admin_bypass_select_table_name" ON table_name FOR SELECT USING (is_admin_user());
CREATE POLICY "admin_bypass_insert_table_name" ON table_name FOR INSERT WITH CHECK (is_admin_user());
CREATE POLICY "admin_bypass_update_table_name" ON table_name FOR UPDATE USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY "admin_bypass_delete_table_name" ON table_name FOR DELETE USING (is_admin_user());
```

#### C. Utility Functions
1. `is_admin_user()`: Checks if current user has role="admin"
2. `get_database_stats()`: Returns table statistics (row counts, sizes)
3. `admin_query_readonly(query_text TEXT)`: Executes safe SELECT queries

### Application Code
#### RBAC Extensions (`lib/auth/rbac.ts`)
```typescript
// Check if user is the sole admin (god mode)
export async function isGodAdmin(userId?: string): Promise<boolean>

// Check if user can bypass all restrictions (god mode)
export async function hasGodMode(userId?: string): Promise<boolean>

// Bypass permission check for god mode admin
export async function hasPermissionOrGodMode(
  permission: keyof typeof Permissions,
  userId?: string
): Promise<boolean>

// Get enhanced permissions including god mode flag
export async function getUserEnhancedPermissions(userId?: string): Promise<Record<string, boolean> & { GOD_MODE: boolean }>
```

#### Admin Dashboard (`components/dashboard/admin-god-mode.tsx`)
- Complete system monitoring interface
- Audit log viewer with filtering
- Database statistics display
- Safe SQL query execution
- Permission status dashboard

## Installation & Setup

### 1. Run the Migration
```bash
# Method 1: Using the provided script
node scripts/run-admin-god-mode-migration.js

# Method 2: Manual execution via Supabase Dashboard
# Copy content from: supabase/migrations/202602141000_admin_god_mode_policies.sql
# Paste into Supabase SQL Editor and run
```

### 2. Verify Installation
After migration, verify the following:

#### A. Check Admin Policies
```sql
-- Verify admin bypass policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE 'admin_bypass_%'
ORDER BY tablename;
```

#### B. Verify Utility Functions
```sql
-- Check if functions exist
SELECT proname, prokind 
FROM pg_proc 
WHERE proname IN ('is_admin_user', 'get_database_stats', 'admin_query_readonly');
```

#### C. Test God Mode
1. Login as an admin user (role="admin" in profiles table)
2. Navigate to `/dashboard/admin-god-mode`
3. Verify you can see the Admin God Mode Dashboard

### 3. Configure Single Admin (Optional)
By default, any user with role="admin" gets god mode privileges. To restrict to a single admin:

1. Ensure only ONE user has role="admin" in the profiles table
2. The `isGodAdmin()` function will return true only for this user

## Usage Guide

### Accessing Admin God Mode Dashboard
1. Login as admin user
2. Navigate to: `/dashboard/admin-god-mode`
3. Or add link to sidebar for admin users

### Features Available

#### A. System Monitoring
- Database connection status
- Admin user count
- Total system users
- Audit log count
- Table statistics

#### B. Audit Log Management
- View all admin actions (timestamp, action, table, operation)
- Export logs to CSV
- Clear logs (with confirmation)
- Filter by operation type

#### C. Database Operations
- View all tables in the system
- See estimated row counts
- Execute safe SELECT queries
- View query results

#### D. Permission Management
- View all permissions granted to current user
- See GOD_MODE status
- Verify permission bypass is working

### Safe SQL Query Execution
Only SELECT queries are allowed for security:
```sql
-- Allowed
SELECT * FROM profiles LIMIT 10;
SELECT COUNT(*) FROM perhutanan_sosial;
SELECT id, name FROM programs WHERE status = 'active';

-- Rejected (will throw error)
INSERT INTO profiles (id, role) VALUES (gen_random_uuid(), 'admin');
UPDATE profiles SET role = 'admin' WHERE id = 'some-id';
DELETE FROM profiles WHERE id = 'some-id';
```

## Security Considerations

### 1. Audit Trail Integrity
- Audit logs are IMMUTABLE (read-only)
- Even admin cannot modify or delete audit logs
- All logs include full details (old/new values, timestamps, admin ID)

### 2. Query Safety
- Only SELECT queries allowed via `admin_query_readonly()`
- Prevents accidental or malicious data modification
- Query execution is logged in audit trail

### 3. Access Control
- Only users with role="admin" can bypass policies
- System verifies admin status on every request
- God mode status can be verified using `isGodAdmin()`

### 4. Data Protection
- Sensitive operations are logged
- No data can be permanently hidden from audit trail
- Export functionality for compliance purposes

## Maintenance

### Regular Tasks
1. **Monitor Audit Logs**: Check for unusual admin activity
2. **Export Logs**: Regularly backup audit logs for compliance
3. **Verify Policies**: Ensure admin bypass policies are intact
4. **Test Functions**: Periodically test utility functions

### Troubleshooting

#### Problem: Admin cannot access all tables
**Solution**: Verify the migration ran successfully and check:
```sql
-- Check if user has admin role
SELECT role FROM profiles WHERE id = 'user-id';

-- Check if admin bypass policies exist for specific table
SELECT * FROM pg_policies 
WHERE tablename = 'table_name' 
AND policyname LIKE 'admin_bypass_%';
```

#### Problem: Audit logs not being created
**Solution**: Check triggers and function:
```sql
-- Check if triggers exist
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE 'log_admin_action_%';

-- Test the logging function
SELECT log_admin_action();
```

#### Problem: SQL queries fail with permission error
**Solution**: Ensure queries are read-only and user is admin:
1. Verify query starts with "SELECT"
2. Check user role with `SELECT role FROM profiles WHERE id = auth.uid()`
3. Test with simple query: `SELECT 1 as test`

## API Reference

### Database Functions

#### `is_admin_user()`
```sql
RETURNS BOOLEAN
```
Checks if current authenticated user has role="admin".

#### `get_database_stats()`
```sql
RETURNS TABLE (
    table_name VARCHAR,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT
)
```
Returns statistics for all tables in public schema.

#### `admin_query_readonly(query_text TEXT)`
```sql
RETURNS JSONB
```
Executes a safe read-only SQL query (SELECT only) and returns results as JSON.

### Application Functions

#### `isGodAdmin(userId?: string)`
```typescript
Promise<boolean>
```
Returns true if user is the SOLE administrator (only one admin in system).

#### `hasGodMode(userId?: string)`
```typescript
Promise<boolean>
```
Returns true if user has god mode privileges (any admin user).

#### `hasPermissionOrGodMode(permission, userId?)`
```typescript
Promise<boolean>
```
Returns true if user has specific permission OR has god mode.

#### `getUserEnhancedPermissions(userId?: string)`
```typescript
Promise<Record<string, boolean> & { GOD_MODE: boolean }>
```
Returns all permissions including GOD_MODE flag (all true if god mode enabled).

## Best Practices

### 1. Use God Mode Responsibly
- Only use for system administration tasks
- Document major changes in audit logs
- Export logs before major operations

### 2. Monitor Activity
- Regularly review audit logs
- Set up alerts for unusual patterns
- Export logs for compliance audits

### 3. Maintain Security
- Keep admin credentials secure
- Rotate admin passwords regularly
- Limit admin user count (ideally 1)

### 4. Testing & Validation
- Test god mode features in development first
- Validate audit logging is working
- Test permission bypass with different roles

## Migration Rollback

If needed, the god mode policies can be removed:

```sql
-- Remove all admin bypass policies
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_select_%s" ON %I', table_record.tablename, table_record.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_insert_%s" ON %I', table_record.tablename, table_record.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_update_%s" ON %I', table_record.tablename, table_record.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_bypass_delete_%s" ON %I', table_record.tablename, table_record.tablename);
    END LOOP;
END $$;

-- Drop utility functions
DROP FUNCTION IF EXISTS admin_query_readonly(TEXT);
DROP FUNCTION IF EXISTS get_database_stats();
DROP FUNCTION IF EXISTS is_admin_user();
DROP FUNCTION IF EXISTS log_admin_action();

-- Drop triggers
DROP TRIGGER IF EXISTS log_admin_action_profiles ON profiles;
-- Repeat for other tables...

-- Drop audit table
DROP TABLE IF EXISTS god_mode_audit;
```

## Conclusion

The Admin God Mode implementation provides the ultimate level of access control for system administrators while maintaining security, accountability, and auditability. It ensures that critical system operations can be performed when needed while keeping a complete record of all administrative actions.

**Key Benefits:**
- Absolute access for critical system administration
- Comprehensive audit trail for accountability
- Safe query execution for debugging
- Permission bypass for emergency situations
- System monitoring and statistics

This feature should be used judiciously and with full awareness of the power it grants to the administrator.