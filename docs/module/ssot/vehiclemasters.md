# SSOT - Vehicle Masters
## Status: Next.js implemented; current-state behavior documented

This document describes the current Make, Model, and Variant master configuration page.

## 1. Purpose And Scope

Vehicle Masters manages the catalog hierarchy used by vehicle selectors throughout the application:

`Make → Model → Variant`

The page supports server-side search and pagination over Make rows, a user-oriented Make/Model/Variants overview, Make/Model/Variant edit/delete, and hierarchical creation of Make, Model, and Variant records.

## 2. Source Evidence

- `app/(dashboard)/config/catalog/page.tsx`
- `src/features/catalog/CatalogClient.tsx`
- `src/features/catalog/adminQueries.ts`
- `src/features/catalog/adminActions.ts`
- `src/components/Layout.tsx`
- `src/features/inventory/queries.ts`
- `app/api/catalog/models/route.ts`
- `app/api/catalog/variants/route.ts`
- `prisma/schema.prisma`

## 3. Route And Navigation

| Path | Behavior |
|---|---|
| `/config/catalog` | Authenticated Vehicle Masters page. |
| `/api/catalog/models?makeId=...` | Existing model selector endpoint. |
| `/api/catalog/variants?modelId=...` | Existing variant selector endpoint. |

The Configuration menu exposes the page as `Vehicle Masters`.

The page uses URL parameters for `search` and `page`.

## 4. Data Ownership

The page reads and writes these Prisma models and database tables:

- `CarMakeMaster` → `car_make_master`
- `CarModelMaster` → `car_model_master`
- `CarVariantMaster` → `car_variant_master`

Models reference a make through `fkMakeId`. Variants reference both a make through `fkMakeId` and a model through `fkModelId`.

## 5. Listing, Search, And Pagination

The server query returns at most 25 Make rows, orders by Make name, and returns total and page counts.

Search is server-side and matches the active master name field case-insensitively:

- Make: `make`
- Model: `model`
- Variant: `variant`

Search input is debounced by 400 ms and written to the URL. Search is applied server-side across Make, Model, and Variant names. The client only renders the returned Make page.

The main table has one row per displayed Model with four columns: `Make`, `Model`, `Variants`, and `Actions`. Make rows with no models are still shown. The Make cell shows the make name and, once per make, the total model and variant counts. The Variants cell shows the first three variants as compact labels and appends the remaining count as `+N more`.

For example:

| Make | Model | Variant |
|---|---|---|
| Maruti | Swift, Baleno +48 | ZXi, VXi, LXi +5, +150 |

Search matches Make, Model, or Variant and returns matching Make rows with the same summary representation. Pagination is at the Make-row level, with 25 Makes per page.

Displayed Model and Variant names are clickable. Clicking a Model, a Variant label, or the Variants `+N more` action opens that Model's complete variant manager. The `+N more models` action opens all Models for that Make. The pencil beside a Make opens its model list, and the pencil beside a Model opens its variant list; individual editing remains available inside those child lists. Make delete remains available once per Make. The child-list manager provides Edit and Delete actions for each Model or Variant and an Add Model/Add Variant action at the relevant level.

When Edit is selected from a child-list manager, the manager closes before the edit modal opens. Only the active edit modal remains mounted, preventing the child-list modal from appearing behind it.

## 6. Add And Edit

The Add Vehicle Master flow is hierarchical. The user can select an existing Make or choose `+ Add new make`; after a Make is selected, the user can select an existing Model or add a new Model; after a Model is selected, the user can select an existing Variant or add a new Variant.

New child records are created immediately from the inline Add controls and the new record becomes selected for the next step. The final `Done` button closes the flow; there is no separate aggregate save operation.

The Make edit modal supports editing a Make name. Make deletion is available from the summary row and is blocked when the database reports related records. Model and Variant edit/delete controls are available from their child-list manager. Model and Variant creation is also available in the hierarchical add flow and from the child-list manager.

The add/edit fields are:

| Tab | Fields | Rules |
|---|---|---|
| Makes | Make | Required; case-insensitive duplicate names are rejected. |
| Models | Model, Make | Both required; duplicate model names are rejected within the selected make. |
| Variants | Variant, Make, Model | All required; duplicate variant names are rejected within the selected model and make. |

Names are trimmed before saving. Create and update actions write creation/update timestamps. Existing catalog selector endpoints remain unchanged.

## 7. Delete Behavior

Deletion requires confirmation. Database foreign-key errors are translated to `This record is in use and cannot be deleted.` This protects master records referenced by inventory, inquiries, insurance, loans, RTO, DSA, feedback, or other related records.

## 8. Integration With Selectors

Existing inventory, inquiry, follow-up, RTO, and other vehicle workflows continue to use the catalog tables and existing catalog API endpoints. The new page is a management surface over those same records; it does not create a second catalog or change selector behavior.

## 9. SSOT Rule

This file is the current-state SSOT for Vehicle Masters. Update it whenever the route, hierarchy, fields, filters, queries, server actions, selector endpoints, validation, permissions, or delete behavior changes.
