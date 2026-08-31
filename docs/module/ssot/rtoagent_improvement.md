# RTO Agent Improvement / Gap Analysis

**Status:** Pending review. This file remains separate from `rtoagent.md` until approved implementation is complete.

## 1. Align the Agent screen with RTO-only scope

**Feature / Business Logic Name:** RTO Agent master scope

**Existing System Behavior:** Legacy had no standalone RTO Agent master. RTO agent details were part of RTO Management and were controlled by `RTO_Agent_Management`.

**Current Next.js Status:** `/config/agents` is a shared screen exposing Insurance Agent, RTO Agent, and DSA records in `PartnerMaster`.

**Missing Functionality or Logic:** The current page is broader than the requested RTO Agent scope.

**Required Improvement:** Restrict the page to RTO agents, or explicitly approve it as a separate shared master module. Under the requested model, use `RTO_Agent_Management` for add, edit, and delete access.

**Relevant Existing Code Location:** `app/(dashboard)/config/agents/page.tsx`; `src/features/agents/AgentsClient.tsx`; `src/features/agents/adminQueries.ts`; `src/lib/access/accessCatalog.ts`.

**Priority / Impact:** High.

## 2. Apply the RTO Management permission consistently

**Feature / Business Logic Name:** RTO Agent authorization

**Existing System Behavior:** RTO agent add/edit/delete behavior was protected by `RTO_Agent_Management`. Autocomplete had no separate authorization filter. Notification usage required `Notification_Management`.

**Current Next.js Status:** The RTO page uses its own route authorization, but the shared Agent Configuration page and its CRUD actions do not currently enforce the requested RTO permission boundary.

**Missing Functionality or Logic:** A user’s ability to manage global `RTO Agent` records is not yet aligned with the stated RTO Management rule.

**Required Improvement:** If `/config/agents` becomes RTO-only, protect its page, query, create, update, and delete actions using the existing `RTO_Agent_Management` permission. Do not add a new RTO Agent permission.

**Relevant Existing Code Location:** `src/features/agents/adminActions.ts`; `app/(dashboard)/config/agents/page.tsx`; `src/lib/access/accessControl.ts`; `src/lib/access/accessCatalog.ts`.

**Priority / Impact:** Critical.

## 3. Preserve manual RTO agent entry and transaction snapshots

**Feature / Business Logic Name:** Manual entry and historical contact preservation

**Existing System Behavior:** Legacy allowed a new agent name/mobile to be typed directly into an RTO record. The values remained on that transaction and were used in RTO listings, reports, dashboard output, and exports.

**Current Next.js Status:** RTO keeps legacy snapshot fields but the server action requires a selected partner ID, so a manually typed contact cannot be saved without creating/selecting a `PartnerMaster` record.

**Missing Functionality or Logic:** The legacy-compatible manual-entry path is blocked or the client/server validation is inconsistent.

**Required Improvement:** Either allow valid manual snapshot saving or make master creation mandatory and explicit. Define whether later master edits can change historical RTO display values.

**Relevant Existing Code Location:** `src/features/rto/RtoClient.tsx`; `src/features/rto/actions.ts`; `prisma/schema.prisma`; legacy `RTO_Agent_Management_View.cshtml`.

**Priority / Impact:** High.

## 4. Reconcile historical RTO contacts

**Feature / Business Logic Name:** Snapshot-only RTO agent discovery

**Existing System Behavior:** All historical RTO agent values were searchable through RTO workflows and autocomplete, even without a master record.

**Current Next.js Status:** `PartnerPicker` searches only `PartnerMaster`; `/config/agents` lists only master rows. Snapshot-only RTO contacts may not appear in either location.

**Missing Functionality or Logic:** No verified reconciliation/import flow exists for old RTO contacts with null `fkPartnerId`.

**Required Improvement:** Add a reconciliation report/process or document that snapshot-only contacts are intentionally excluded. Define duplicate matching, conflicts, and preservation of historical snapshots.

**Relevant Existing Code Location:** `src/features/partners/queries.ts`; `src/components/PartnerPicker.tsx`; `src/features/agents/adminQueries.ts`; `prisma/schema.prisma` model `RtoAgent`.

**Priority / Impact:** High.

## 5. Restore or formally retire notification behavior

**Feature / Business Logic Name:** RTO agent notification search and sending

**Existing System Behavior:** Notification Management had an Agent tab with agent search, mobile lookup, checkbox selection, message selection, and an SMS action. The reviewed legacy SMS provider call was disabled, but the workflow surface existed and required `Notification_Management`.

**Current Next.js Status:** No Notification Management route or RTO-agent recipient workflow exists. The current SMS/Email page focuses on templates and single-recipient email.

**Missing Functionality or Logic:** RTO agent notification search and selection are absent.

**Required Improvement:** Decide whether this workflow is required. If yes, add it with `Notification_Management` authorization, recipient rules, delivery handling, and audit logging. If no, document the approved scope removal.

**Relevant Existing Code Location:** `src/features/messagetemplates`; `app/(dashboard)/config/sms-email/page.tsx`; legacy `Views\Configuration\NotificationManagement.cshtml`; `Controllers\ConfigurationController.cs`.

**Priority / Impact:** Medium to High, depending on business need.

No code has been changed by this improvement document.
