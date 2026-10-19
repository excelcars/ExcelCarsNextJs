# SSOT - Role Access Module

## Status: Next.js implemented; current-state behavior documented

**Route:** `/config/role-access`  
**Related route:** `/config/role-access/history`  
**Project:** `ExcelCarsNextJs`  
**Source of truth:** `app/(dashboard)/config/role-access/page.tsx`, `src/features/roleaccess/{RoleAccessClient,actions,queries}.ts(x)`, `src/lib/access/{accessCatalog,accessControl}.ts`, `src/components/Layout.tsx`, and `prisma/schema.prisma`.

> This documents the actual current permission system in the Next.js app.

## 1. Purpose and owned data

The page manages:

- role definitions in `role_master`
- module/function definitions in `access_function`
- role-to-function mappings in `access_function_role`

It is now the application-side source of truth for which roles can access which major modules/pages in the dashboard.

## 2. Current permission model

The permission system is function-based, not action-matrix-based.

- A role is stored on `user_table.role_id`.
- A function/module permission is stored in `access_function.access_function_name`.
- The mapping between role and permission is stored in `access_function_role`.

The app-side permission catalog is defined in:

- [src/lib/access/accessCatalog.ts](C:/Ruchita/Next/Universe_CC_tool/ExcelCarsNextJs/src/lib/access/accessCatalog.ts)

Each catalog row currently includes:

- `group`
- `label`
- `functionName`
- `route`
- optional `description`

That catalog currently drives:

- Role Access page rendering
- sidebar visibility
- page-level route guards
- most module server-action authorization

## 3. Access and bootstrap rules

- `/config/role-access` is protected.
- A current active account can open it if its role has either:
  - `Role_Access_Management`
  - or `User_Access_Management`

The second path is a bootstrap fallback so the system can be managed before a dedicated Role Access mapping exists for at least one role.

## 4. UI behavior

The page is split into two panels:

- Left: role list
- Right: grouped permission checklist for the selected role

Implemented features:

- search roles
- search permissions
- save permission mapping for selected role
- view role-permission history in a dedicated read-only history screen
- reset unsaved permission changes
- unsaved-change confirmation when switching roles
- add role
- edit role name
- delete role

## 5. Role create/edit/delete behavior

### Create role

- requires Role Access authorization
- creates a new `role_master` row
- role name must be nonblank
- role name must be unique case-insensitively
- role name max length is 100 characters

### Edit role

- requires Role Access authorization
- updates only the role name
- preserves the same uniqueness and length rules

### Delete role

- requires Role Access authorization
- is blocked if any `user_table` record still references that role
- deletes `access_function_role` mappings for that role before deleting the role row
- is also blocked if deletion would remove the last remaining role holding:
  - `Role_Access_Management`
  - or `User_Access_Management`

So a role can only be deleted when:

- no users are assigned to it
- and critical system access would still remain somewhere else

## 6. Permission mapping save behavior

Saving access for a role:

1. validates the role exists
2. validates the actor is allowed
3. ensures critical coverage for `Role_Access_Management` and `User_Access_Management`
4. ensures catalog functions exist in `access_function` (missing rows are auto-created on save)
5. replaces the selected role’s managed mappings in `access_function_role`
6. writes an append-only `role_access_audit` entry when any managed permission was actually added or removed

This is currently scoped to the app catalog functions, not arbitrary legacy rows outside the catalog.

## 7. Role access audit history

The history screen at `/config/role-access/history` is read-only and uses the same authorization gate as Role Access.

It reads from:

- `role_access_audit`

Each audit row stores:

- target `role_id`
- role name snapshot at the time of save
- actor `changed_by_user_id`
- actor display/username snapshot
- change timestamp
- added function list snapshot
- removed function list snapshot
- full before snapshot
- full after snapshot

The UI currently supports:

- filter by role
- filter by changed-by user
- filter by from/to date
- pagination
- per-row detail modal for before/after, added, and removed permissions

## 8. Enforcement coverage

As of August 26, 2026, this permission model is applied in these layers:

- sidebar visibility
- page-level route access
- server-action authorization for the main managed modules

Protected modules now include:

- Role Access
- User Access
- Dealers
- Customers
- Feedback
- SMS / Email
- Inventory
- Checklist
- Inquiry
- Loan
- Insurance
- RTO
- Follow-up
- DSA
- Reports pages currently cataloged

Shared quick-create helpers are also permission-aware now:

- `quickCreateCustomer` allows access only from modules that actually use the customer picker
- `quickCreatePartner` allows access only from modules that actually use the partner picker

## 9. Current limitations

- There is still no action-level ACL split like separate view/create/edit/delete permissions per module.
- Middleware is still auth-only; module permission checks are enforced in server route/page logic and server actions instead.
- The dashboard home page itself is not permission-gated by Role Access.
- Existing legacy `access_function` rows not represented in the app catalog are shown in Role Access, but only cataloged functions are treated as the managed application surface.
- Audit history starts from the moment `role_access_audit` was added; older permission changes are not reconstructable unless they were separately logged elsewhere.

## 10. Verification checklist

- Unauthorized users do not see Role Access in the sidebar.
- Unauthorized users are redirected away from `/config/role-access`.
- Unauthorized users are redirected away from `/config/role-access/history`.
- Role create/edit reject duplicate names.
- Role delete is blocked when a user is assigned to the role.
- Role delete is blocked when it would remove the last critical access holder.
- Sidebar visibility and page access change when `access_function_role` mappings change.
- Permission changes create `role_access_audit` rows with added/removed/before/after snapshots.
- Main module server actions reject users without the corresponding mapped function.
