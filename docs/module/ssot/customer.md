# SSOT - Customer Configuration
## Status: Next.js implemented; current-state behavior documented

This document describes the current Customer master screen in the Next.js application. It documents only the implemented `/config/customers` behavior; legacy behavior remains documented separately under `docs/module/existing_ssot/customers.md`.

## 1. Purpose And Scope

Customer Configuration manages shared customer/contact master records used by the CRM and operational pickers.

The current page supports:

- server-side search, type filtering, and pagination
- viewing customer details in a modal
- adding, editing, and deleting customers when write permission is granted
- customer validation and duplicate detection
- quick customer creation through the shared `CustomerPicker`

It does not provide a separate customer detail route, export control, or client-side loading of the full customer table.

## 2. Source Evidence

- `app/(dashboard)/config/customers/page.tsx`
- `src/features/customers/CustomersClient.tsx`
- `src/features/customers/adminQueries.ts`
- `src/features/customers/adminActions.ts`
- `src/features/customers/validation.ts`
- `src/features/customers/actions.ts`
- `src/features/customers/queries.ts`
- `src/components/CustomerPicker.tsx`
- `src/lib/access/accessCatalog.ts`
- `src/lib/access/accessControl.ts`
- `prisma/schema.prisma`

## 3. Route, Access, And Navigation

| Path/permission | Behavior |
|---|---|
| `/config/customers` | Authenticated Customer master page. |
| `Customer_Management` | Required to view the page and appear in navigation. |
| `Customer_Management_Write` | Required for Add, Edit, Delete, and quick customer creation. |
| `/api/customers/search?q=...` | Existing authenticated endpoint used by `CustomerPicker`; returns up to 15 matches after two or more characters. |

The page redirects to `/dashboard` when the current user lacks Customer view access. The page passes `canWrite` to the client; users without write access can still search and view records but do not see Add, Edit, or Delete controls.

## 4. Data Ownership

The page reads and writes Prisma model `Customer`, mapped to the `customer` table. The managed fields are:

- `type`
- `custName`
- `custAddress`
- `custMobile`
- `mobile_2`
- `custEmail`
- `custDob`
- `custAnniversaryDt`
- `comments`
- `companyName`

Create and update also write `createdDt`, `updatedDt`, and the authorized audit user relations. Customer records are referenced by inquiries, inventory, loans, RTO, checklists, feedback, vehicle email links, and other modules.

Related current Next.js modules include Inquiry Management, RTO Management, Follow-up, Insurance, Loan, DSA, Checklist / Docs, Inventory, Feedback, and tracked vehicle email links. Existing related current-state SSOTs are [Inquiry Management](inquirymanagement.md), [RTO Management](rtomanagement.md), and [Follow-up](followup.md). These modules consume Customer records or the shared `CustomerPicker`; Customer Configuration remains the owner of Customer master CRUD.

## 5. Listing, Search, Filters, And Pagination

The server query returns at most 25 rows per page, orders by descending `custId`, and returns total and page counts. The URL accepts `search`, `type`, and one-based `page` parameters.

Search is server-side and matches `custName`, `custMobile`, `custEmail`, `companyName`, or `comments` using a case-insensitive substring query. Search input is debounced by 400 ms before updating the URL.

The type filter supports the current values `Contact` and `Customer`, plus `All`. The edit form can also display the legacy `Individual` value when an existing record contains it; new records cannot be created with that legacy value.

The table columns are Name, Type, Contact, Company, DOB, Anniversary, and Actions. The Contact column shows primary mobile and email. Dates are displayed as `DD/MM/YYYY`.

## 6. Add And Edit

The add/edit modal contains:

| Field | Current behavior |
|---|---|
| Type | Required; new records allow `Contact` or `Customer`. |
| Name | Required; maximum 150 characters. Whitespace is normalized. |
| Mobile | Optional if email is supplied; exactly 10 digits when present. |
| Mobile 2 | Optional; exactly 10 digits and different from primary mobile. |
| Email | Optional if mobile is supplied; normalized to lowercase and validated when present. |
| Company Name | Optional; maximum 150 characters. |
| Date of Birth | Optional; `DD/MM/YYYY`, not future-dated, and customer must be at least 18. |
| Anniversary Date | Optional; `DD/MM/YYYY`, not future-dated, and not earlier than date of birth. |
| Address | Optional; maximum 500 characters. |
| Comments | Optional; maximum 1000 characters. |

At least one primary mobile number or email address is required. Duplicate detection compares normalized customer name together with the primary mobile when present, otherwise the primary email. The current record is excluded during edit.

The Save button is disabled when an edit has no changes. Closing a dirty add/edit form prompts for discard confirmation. Invalid fields show inline validation messages.

## 7. View And Delete

View opens a read-only modal showing Customer Summary, Contact Details, and Additional Details. It displays name, type, company, mobile numbers, email, dates, address, and comments.

Delete requires confirmation and is available only with write access. The server action requires the write permission again. If a foreign-key constraint prevents deletion, the user sees: `This customer has related records (inquiries, loans, etc.) and cannot be deleted.`

## 8. Shared Customer Picker

Operational modules use `CustomerPicker` to search the same Customer table through `/api/customers/search`. Search begins at two characters, waits 300 ms, handles loading/error/no-match states, and returns up to 15 results. Quick creation requires a valid name and either a valid 10-digit mobile or a valid email, then invokes the write-authorized customer action.

## 9. Validation And Server Boundaries

Client and server both run the shared validation rules from `validation.ts`. Server actions independently authorize through `Customer_Management_Write`; client visibility is not treated as authorization. Successful writes revalidate `/config/customers` and refresh the page.

## 10. SSOT Rule

This file is the current-state SSOT for Customer Configuration. Update it whenever the route, fields, filters, pagination, validation, permissions, CustomerPicker behavior, server actions, or deletion behavior changes.
