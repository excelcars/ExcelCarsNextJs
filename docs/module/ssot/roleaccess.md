# SSOT - Role Access Management

## Status: Next.js implemented

**Routes:** `/config/role-access` and `/config/role-access/history`

## Scope and evidence

Role Access manages roles and maps each role to application functions. It is the source of access grants consumed by route authorization; it does not create user accounts.

Evidence: `app/(dashboard)/config/role-access/page.tsx`, `app/(dashboard)/config/role-access/history/page.tsx`, `src/features/roleaccess/actions.ts`, `queries.ts`, `RoleAccessClient.tsx`, `RoleAccessHistoryClient.tsx`, `src/lib/access/accessCatalog.ts`, `src/lib/access/accessControl.ts`, `prisma/add_role_access_audit.sql`, and `prisma/schema.prisma`.

## Authorization

An active account holding either `Role_Access_Management` or `User_Access_Management` may open the role-access pages and perform role/access changes. This deliberate fallback lets an existing user-access administrator maintain role grants.

## Data model

`RoleMaster` owns role IDs and names. `AccessFunction` owns function names. `AccessFunctionRole` is the many-to-many role-to-function mapping. The managed function catalog is `APP_ACCESS_CATALOG`; it defines the route, label, group, and canonical function name for each application area.

`role_access_audit` records each permission change with the role snapshot, actor snapshot, timestamp, and comma-separated before/after/added/removed function names.

## Role and permission management

Roles can be created, renamed, and deleted. Names are required, limited to 100 characters, and unique case-insensitively. A role cannot be deleted while users are assigned to it.

Saving permissions accepts only known catalog function names. It creates missing catalog `AccessFunction` rows, replaces this role's mappings for managed functions in one transaction, and records an audit row only if the selection changed. Existing non-catalog mappings are not managed by this screen.

The system prevents removal/deletion of the final role holding either `Role_Access_Management` or `User_Access_Management`, preventing administrator lockout.

## Audit history

History is paginated at 20 rows, newest first. It filters by role, acting user, and inclusive date range. It shows the role/actor snapshots and the permission additions/removals plus complete before/after selections.

## SSOT rule

Update this file whenever the catalog, authorization fallback, lockout protection, mapping boundary, or audit schema changes.
