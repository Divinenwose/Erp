# Department Manager Onboarding Framework

This document describes the generic framework for creating department managers in the ERP system. The same workflow can be used for all departments (HR, Finance, Inventory, Procurement, Sales, IT, Legal, Operations, Logistics, etc.).

## Overview

The department manager onboarding framework provides a unified approach to:
- Create department-specific manager roles
- Assign appropriate permissions to managers
- Create users with authentication, profiles, and employee records
- Assign users to departments
- Designate department heads
- Send invitation emails

## Architecture

### Database Schema

The framework uses these existing tables:
- `auth.users` - Supabase Auth users
- `profiles` - User profiles with company/department associations
- `employees` - Employee records (optional)
- `departments` - Department definitions with `head_id`
- `roles` - Role definitions
- `permissions` - Permission definitions
- `user_roles` - User-role assignments
- `role_permissions` - Role-permission assignments
- `audit_logs` - Audit trail

### Server Actions

**File**: `app/actions/users.ts`

The framework uses Next.js Server Actions for secure server-side operations:

- `createUser()` - Creates complete user with auth, profile, employee record, roles, and department head assignment
- `updateUser()` - Updates existing user
- `deactivateUser()` - Deactivates users

**Security**: Server Actions use the Supabase Service Role Key, which never exposes to the client.

### User Creation Form

**File**: `app/(dashboard)/settings/users/page.tsx`

The user creation form includes:
- Basic user information (name, email, phone, job title)
- Department selection
- Branch selection
- Role selection (multi-select)
- **Create employee record** checkbox
- **Assign as department head** checkbox

## Workflow

### Step 1: Run Initial Migration

Run the SQL migration to create all department permissions and manager roles:

```bash
# Apply the migration
supabase db push supabase/migrations/20240730_seed_all_departments_permissions.sql
```

This creates:
- All department permissions (HR, Finance, Inventory, Procurement, Sales, Legal, Administration, Operations, IT, Logistics, QA/QC)
- All department manager roles
- Permission assignments to each manager role

### Step 2: Company Admin Creates Department Manager

1. Navigate to **Settings → Users**
2. Click **Add User**
3. Fill in the form:
   - First Name: "John"
   - Last Name: "Smith"
   - Email: "john.smith@company.com"
   - Phone: (optional)
   - Job Title: "Administration Manager"
   - Department: "Administration"
   - Branch: (select branch)
   - Roles: "Administration Manager" (check the box)
   - **[✓] Create employee record** (check if employee record needed)
   - **[✓] Assign as department head** (check if this user should be department head)
4. Click **Add User**

### Step 3: System Processes

The Server Action `createUser()` executes:

1. **Create Supabase Auth user**
   - Email: john.smith@company.com
   - Email confirmation: false (invitation flow)
   - User metadata: first_name, last_name

2. **Create profile**
   - Links to company
   - Links to department
   - Links to branch
   - Stores job title, phone, etc.

3. **Create employee record** (if checkbox checked)
   - Generates employee number
   - Links to user
   - Links to department/branch
   - Sets employment type/status

4. **Assign as department head** (if checkbox checked)
   - Updates `departments.head_id`
   - Links user as department head

5. **Assign roles**
   - Inserts into `user_roles` table
   - Records who assigned the role

6. **Send invitation email**
   - Generates magic link
   - Sends to user email
   - Redirects to `/setup-password`

7. **Log audit events**
   - User creation logged
   - Role assignment logged
   - Department head assignment logged (if applicable)

### Step 4: New User Logs In

1. User receives invitation email
2. Clicks link → `/setup-password` (needs to be created)
3. Sets password
4. Navigates to `/login`
5. Enters credentials
6. AuthContext loads:
   - Profile with department
   - Company information
   - Roles (e.g., "Administration Manager")
   - Permissions (all Administration permissions)
7. Sidebar renders based on permissions
8. User sees only their department's module

## Department Manager Roles

The migration creates these manager roles:

| Role Name | Module | Permissions |
|-----------|--------|-------------|
| HR Manager | Human Resources | hr.*, dashboard.view, settings.* |
| Finance Manager | Finance & Accounts | finance.*, dashboard.view, settings.* |
| Inventory Manager | Inventory | inventory.*, dashboard.view, settings.* |
| Procurement Manager | Procurement | procurement.*, dashboard.view, settings.* |
| Sales Manager | Sales & CRM | crm.*, dashboard.view, settings.* |
| Legal Manager | Legal | legal.*, dashboard.view, settings.* |
| Administration Manager | Administration | facilities.*, assets.*, reception.*, supplies.*, vendors.*, documents.*, dashboard.view, settings.* |
| Operations Manager | Operations | operations.*, dashboard.view, settings.* |
| IT Manager | Information Technology | it.*, dashboard.view, settings.* |
| Logistics Manager | Logistics | logistics.*, dashboard.view, settings.* |
| QA/QC Manager | Quality Assurance | qa_qc.*, dashboard.view, settings.* |

## Permission Naming Convention

Permissions follow this pattern: `resource.action`

Examples:
- `hr.view` - View HR module
- `hr.employees.create` - Create employees
- `finance.expenses.approve` - Approve expenses
- `assets.delete` - Delete assets

## Adding a New Department

To add a new department manager role:

### 1. Add Permissions to Migration

Add the department's permissions to the SQL migration:

```sql
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('new_department', 'view', 'View New Department module', NOW()),
  ('new_department.submodule', 'view', 'View submodule', NOW()),
  ('new_department.submodule', 'create', 'Create items', NOW())
ON CONFLICT (resource, action) DO NOTHING;
```

### 2. Create Manager Role

```sql
INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES 
  ('New Department Manager', 'Full access to New Department module', false, NULL, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

### 3. Assign Permissions

```sql
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'New Department Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'new_department' OR
  p.resource LIKE 'new_department.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);
```

### 4. Update Navigation Config

Add the department to `config/navigation.ts`:

```typescript
{
  title: 'New Department',
  icon: Icon,
  module: 'new_department',
  permission: 'new_department.view',
  children: [
    { title: 'Overview', href: '/new-department', icon: LayoutDashboard, permission: 'new_department.view' },
    // ... other pages
  ],
},
```

### 5. Create Department Pages

Create pages in `app/(dashboard)/new-department/` following the existing pattern.

### 6. Add Permission Guards

Add `<Can>` guards to pages for action-level permissions:

```tsx
<Can resource="new_department.submodule" action="create">
  <Button>Create Item</Button>
</Can>
```

## Environment Variables Required

Add these to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Audit Trail

All user creation and role assignment actions are automatically logged to the `audit_logs` table:

- `user_created` - When a new user is created
- `user_updated` - When a user is updated
- `role_assigned` - When a role is assigned
- `role_updated` - When a role is updated
- `user_deactivated` - When a user is deactivated

## Security Considerations

1. **Service Role Key**: Never exposed to client. Only used in Server Actions.
2. **Permission Checks**: Sidebar filtering + page-level guards provide defense-in-depth.
3. **Audit Logging**: All administrative actions are logged.
4. **Company Isolation**: Users can only see their company's data via RLS policies.
5. **Role-Based Access**: Users only have permissions assigned to their roles.

## Testing Checklist

For each department manager:

- [ ] Migration applied successfully
- [ ] Role exists in database
- [ ] Permissions assigned to role
- [ ] User can be created via Settings → Users
- [ ] Employee record created (if checkbox checked)
- [ ] Department head assigned (if checkbox checked)
- [ ] Invitation email sent
- [ ] User can set password
- [ ] User can log in
- [ ] Profile loads correctly
- - Department assigned correctly
- [ ] Role loads correctly
- [ ] Permissions load correctly
- [ ] Sidebar shows only department module
- [ ] Sidebar does NOT show other departments
- [ ] Department pages are accessible
- [ ] Permission guards work correctly

## Future Enhancements

Potential improvements to the framework:

1. **Password Setup Page**: Create `/setup-password` page for invitation flow
2. **Department Head Validation**: Prevent multiple department heads per department
3. **Employee Number Generation**: More sophisticated employee number generation
4. **Company Currency**: Fetch company currency instead of hardcoding USD
5. **Bulk Department Manager Creation**: Create multiple managers at once
6. **Department Manager Dashboard**: Dedicated dashboard for department managers
7. **Permission Templates**: Reusable permission templates for similar departments

## Troubleshooting

### User creation fails
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- Check that `NEXT_PUBLIC_APP_URL` is set
- Check Supabase logs for errors

### Permissions not loading
- Verify role-permission assignments in database
- Check AuthContext console logs
- Verify permission naming matches navigation config

### Sidebar not filtering
- Check that permissions are assigned to role
- Check that navigation config has correct permission fields
- Verify `hasPermission()` function in AuthContext

### Invitation email not sent
- Check Supabase email settings
- Verify email template exists
- Check that user email is valid

## Files Modified

### Core Framework
- `app/actions/users.ts` - Server Actions for user operations
- `app/(dashboard)/settings/users/page.tsx` - User creation form
- `.env.local.example` - Environment variable template

### Database
- `supabase/migrations/20240730_seed_all_departments_permissions.sql` - Permissions and roles

### Documentation
- `docs/DEPARTMENT_MANAGER_ONBOARDING.md` - This file

## Summary

The department manager onboarding framework provides a unified, secure, and scalable approach to creating department managers across all departments. By using Server Actions, proper permission systems, and audit logging, it ensures that the same workflow can be reused for HR, Finance, Inventory, Procurement, Sales, IT, Legal, Operations, Logistics, and any future departments without code duplication.
