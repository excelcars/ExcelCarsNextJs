# SSOT - Agent Configuration
## Status: Next.js implemented; current-state behavior documented

This document describes the implemented Agent master configuration screen. It is implementation-backed documentation for the current Next.js application.

## 1. Purpose And Scope

Agent Configuration manages reusable agent contact records used by the Insurance, RTO, and DSA workflows.

The current page supports:

- listing agents with server-side search and pagination
- filtering by agent type
- adding, editing, and deleting agents
- storing agent name, mobile number, and email
- preventing deletion when an agent is referenced by an existing transaction

It does not manage bank contacts. `Bank` remains a separate `PartnerMaster` type used by Loan Management.

## 2. Source Evidence

- `app/(dashboard)/config/agents/page.tsx`
- `src/features/agents/AgentsClient.tsx`
- `src/features/agents/adminQueries.ts`
- `src/features/agents/adminActions.ts`
- `src/components/Layout.tsx`
- `src/components/PartnerPicker.tsx`
- `src/features/partners/queries.ts`
- `src/features/partners/actions.ts`
- `prisma/schema.prisma`

## 3. Navigation And Route

| Path | Behavior |
|---|---|
| `/config/agents` | Authenticated dashboard page for Agent master records. |
| `/api/partners/search?partnerType=...&q=...` | Existing picker endpoint used by operational modules; it searches the same `partner_master` records. |

The Configuration menu contains an `Agents` link alongside User Access, Dealers, Customers, Feedback, and SMS / Email.

The page accepts these query parameters:

- `search`: case-insensitive search text
- `type`: `All`, `Insurance Agent`, `RTO Agent`, or `DSA`
- `page`: one-based page number

## 4. Data Ownership And Agent Types

The page reads and writes Prisma model `PartnerMaster`, mapped to the `partner_master` table. Each record contains:

- `partnerType`
- `name`
- `mobile`
- `email`

The page exposes exactly these agent types:

- `Insurance Agent` — selected by Insurance Management
- `RTO Agent` — selected by RTO Management
- `DSA` — selected by DSA Management

The shared `PartnerPicker` uses the exact type string to keep records separated between workflows. Existing picker quick-create behavior remains unchanged.

## 5. Listing And Search

The server query loads at most 25 rows per page, orders by descending `partnerId`, and returns the total count and page count. `All` includes only the three agent types listed above.

Search matches `name`, `mobile`, or `email` using a case-insensitive substring query. Changing search text is debounced by 400 ms and updates the URL. Type changes and pagination reset the page to 1.

The table columns are:

- Name
- Type
- Mobile
- Email
- Actions

## 6. Add And Edit

The add/edit modal contains:

| Field | Current behavior |
|---|---|
| Type | Required selection from the three supported agent types; add defaults to `Insurance Agent`. |
| Name | Required. Trimmed before saving. |
| Mobile | Optional when email is supplied. Stored as null when blank. |
| Email | Optional when mobile is supplied. Stored as null when blank. |

At least one of mobile or email is required. A duplicate with the same type, name, and mobile is rejected, excluding the current record during edit.

Successful saves revalidate `/config/agents` and refresh the page data.

## 7. Delete Behavior

Deletion requires confirmation. If the selected `PartnerMaster` record is referenced by Insurance, RTO, DSA, or another related transaction, the database foreign-key error is translated to:

`This agent is linked to existing transactions and cannot be deleted.`

Unreferenced records can be deleted. The confirmation states that deletion cannot be undone.

## 8. Validation And Access Boundaries

The page is rendered inside the authenticated dashboard. The Agent server actions validate name and contact presence and apply duplicate checks. They do not independently perform a session or role check.

The shared partner quick-create action used by operational pickers also writes to `PartnerMaster` and validates name plus mobile/email presence, but does not independently require an authenticated session. This is a shared action boundary, not specific to the Agent Configuration page.

## 9. SSOT Rule

This file is the current-state SSOT for Agent Configuration. Update it whenever the route, agent types, fields, queries, server actions, picker integration, validation, permissions, or deletion behavior changes.
