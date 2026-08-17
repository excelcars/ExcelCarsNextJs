# SSOT - user-shell Module
## Status: Draft

**Module:** `user-shell`  
**Project:** ExcelCars  
**Depends On:** `module/ssot/05_SSOT_home-auth-session.md`

## 1. Purpose
This module is currently a placeholder controller surface. It exists in the codebase but does not yet own a functional business workflow.

It owns:
- a skeletal MVC controller endpoint for `User`

It does not own:
- authentication
- user profile management
- user CRUD
- settings
- reporting
- any transactional feature flow

Primary controller:
- `ExcelCars/Controllers/UserController.cs`

## 2. Locked v1 Scope
- controller contains only `Index()`
- no custom model interactions are present
- no access-control attribute is applied
- no dedicated module-specific behaviors are implemented

## 3. Data Ownership
This module currently owns no table, file, or integration boundary.

## 4. Interface Contracts
- `Index()`
- implied route surface: `GET /User/Index`

## 5. Business Rules
- no module-specific business rules are implemented
- this controller should be treated as reserved/unused until real user-facing ownership is introduced

## 6. Integration And Side Effects
- none observed

## 7. Audit Requirements
- none observed

## 8. Tests Required
- controller route resolves without error if a view exists
- no hidden dependency should be introduced without defining module ownership first
