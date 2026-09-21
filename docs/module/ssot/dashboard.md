# Dashboard - Current Next.js SSOT

## 1. Status and evidence

**Status:** Next.js implemented; current-state behavior documented and code-verified.

This document records the current actual Next.js dashboard implementation after the approved command-center redesign.

Current route: `/dashboard`  
Primary page: `app/(dashboard)/dashboard/page.tsx`

Source files:

- `app/(dashboard)/dashboard/page.tsx`
- `src/features/dashboard/DashboardCommandCenterClient.tsx`
- `src/features/dashboard/queries.ts`
- `src/features/dashboard/LeadSourceChart.tsx`
- `app/(dashboard)/layout.tsx`
- `src/components/Layout.tsx`
- `src/components/ui.tsx`
- `src/lib/access/accessControl.ts`
- `src/lib/access/accessCatalog.ts`
- `app/(dashboard)/followup/page.tsx`
- `src/features/followup/queries.ts`
- `prisma/schema.prisma`

## 2. Purpose and scope

Dashboard is a read-only CRM/operations command center. It answers, at a glance:

- how the business is doing;
- what needs attention right now;
- what should be handled today;
- what is at risk;
- where the user can go for detailed module work.

The dashboard does not create, update, delete, export, or inline-edit records. It keeps detailed information in a same-screen workspace and preserves module navigation through row-level `Open` links.

The implemented route is `/dashboard`. There is no `/config/dashboard` route.

## 3. Access control

- `/dashboard` requires an authenticated NextAuth session through the dashboard route-group layout.
- `/dashboard` remains available to all authenticated users because unauthorized protected routes redirect there.
- The dashboard layout resolves the visible user name from `UserTable.displayName`, then `UserTable.userName`, then the session name. This prevents the header from falling back to generic `User` when the database has a real login/display name.
- Dashboard content is section-gated by granted access functions:
  - Inventory KPI: `Inventory_Management`.
  - Inquiry KPI and Insights chart: `Inquiry_Management`.
  - Lead Details, Follow-ups, and overdue alerts: `Followup_Management` or `FollowUp_Management`.
  - Insurance KPI and insurance detail workspace: `Insurance_Management`.
  - Loan KPI: `Loan_Management`.
  - RTO KPI, RTO details, and combined pending-payment details: `RTO_Management` or `RTO_Agent_Management`.
- Birthday/Anniversary reminders are visible to all authenticated dashboard users.
- Pending Payment follows legacy behavior: only RTO-access users see the combined RTO/Loan/Insurance pending-payment list.

## 4. Information architecture

The dashboard is no longer a vertically stacked report. It is organized as a one-screen dark command-center shell on desktop:

1. compact header;
2. compact visual KPI strip;
3. two-column command center;
4. same-screen detail workspace with tabs and compact summary widgets.

On smaller screens, the layout collapses responsively in priority order: KPIs, Needs Attention, summary widgets, details.

## 5. Compact header

The header is intentionally compact and does not show a large visible `Dashboard` title inside the command center. It shows:

- greeting/date: `Good morning, <firstName>. <current date>`;
- attention summary: `<N> items need your attention`.

On the dashboard route only, the shared page layout removes normal page padding so the command-center shell is flush to the available page area below the application header.

The attention summary is computed from visible/allowed attention sources:

- overdue follow-ups;
- pending payments;
- pending and expiring insurance items;
- RTO transfer/RC pending items;
- birthdays/anniversaries today.

## 6. KPI strip

The compact KPI strip uses four visual groups rather than six tall cards. Cards are shown only when the user has the matching module access.

KPI groups:

- Available Stock: `InventoryManagement.count({ status: "In Stock" })`, with total inventory as subtext and a compact sparkline visual.
- Today's Leads: inquiries created within today's local day window, with all inquiries as subtext and a compact funnel visual. It opens the Leads matrix when Follow-up access is available; otherwise it opens Insights for inquiry-source context.
- Critical Actions: `status == "FollowUp"` pending follow-up count, with overdue count as subtext and a progress bar based on overdue versus pending follow-ups.
- Pending Files: consolidated pending RTO, pending payment, and pending insurance counts with compact module icons.

Clicking a KPI changes the same-screen workspace where relevant rather than navigating away.

## 7. Command center overview

The main overview uses two columns on desktop.

Left side: `Needs Attention`

- Shows one unified priority table across modules.
- Initially shows the highest-priority items, not every module table.
- Columns: Priority, Customer, Type, Due / Date, Status, Action.
- Sources: overdue/today follow-ups, pending insurance policies, insurance renewal/expiry, pending payments, and RTO pending items.
- Priority order: overdue follow-up first, insurance expiring soon and pending insurance policy second, payment pending third, RTO RC pending fourth, normal follow-up/RTO items after that.
- `Details` keeps the user on the dashboard and switches workspace.
- `Open` navigates to the relevant module with filters where available.

Right side: `Action Load` and `Daily Totals`

- Action Load Analyzer shows the total open attention count with a donut/ring visual and a compact category breakdown for overdue follow-ups, pending payments, insurance items, and RTO RC pending. Birthday/anniversary reminders remain available in the detail workspace but are not included in this analyzer chart.
- Daily Totals shows four compact operation rows for available stock, today's leads, today's follow-ups, and payments received today. Each row shows the count/unit, a module icon, a label/status callout, and a compact visual cue.

## 9. Detail workspace

The lower workspace is same-screen and tab-based. Tabs do not stack module tables vertically. KPI, `Details`, `View All`, back, and workspace tab clicks update client state without a full page reload. The browser URL is also updated with `/dashboard?workspace=<tab>` through history state so direct links and reloads preserve the selected tab.

The dashboard no longer shows the old percentage-based task-completion ring because that derived percentage could be misleading when attention volume is high.

Tabs:

- Overview;
- Leads;
- Follow-ups;
- Insurance;
- RTO;
- Payments;
- Birthdays;
- Insights.

Tabs are permission-aware and include count badges where relevant. The workspace includes:

- Back to Overview;
- Search input;
- Sort control for the overview queue;
- pagination controls for overview attention rows;
- row actions that open the relevant full module.

## 10. Detailed tab behavior

Leads:

- Shows the legacy Lead Details matrix.
- Rows: All Leads, Fresh Leads, Today's Appointment Fixed, Follow up Today, Pending Follow up, Follow up (Upcoming), Closed.
- Columns: Total Count, Own Count, Other's Count.
- Role id `4` has own-only total counts and zero Other count.
- Fresh Leads intentionally preserves the legacy mismatch: count is today's inquiries, drill-down link filters to today's `FollowUp` inquiries.

Follow-ups:

- Shows pending follow-up rows.
- Source: `Inquiry` rows where `status == "FollowUp"`.
- Order: `followUpDate asc`, then `inquiryId asc`.
- Columns: Customer, Mobile, Follow-up Date, Classification, Status, Action.
- Dashboard loads all pending follow-up rows so the Follow-ups workspace and Overview `View All` are not capped to a preview-only subset.

Insurance:

- Uses one `Insurance` tab with two compact legacy-aligned sections inside the same workspace:
  - Pending Insurance Policy Details.
  - Expiry Date/Renewal Date of Policy.
- Pending policies use `policyStatus == "Pending"`.
- Expiring soon uses `expiryDate` from start of today through 15 days ahead.
- Pending Insurance columns: Registration, Customer, Mobile, Agent, Agent Mobile, Status, Action.
- Expiry/Renewal columns: Registration, Customer, Mobile, Agent, Agent Mobile, Expiry Date, Renewal Date, Action.
- Registration actions link to `/insurance?search=<registration>`.

RTO:

- Shows RTO rows where `transferStatus == "Pending"` or `rcStatus == "Pending"`.
- Columns: Registration, Customer, Mobile, Agent, Agent Mobile, Transfer, RC, Action.
- Registration actions link to `/rto?registrationNo=<registration>`.

Payments:

- Visible only to RTO-access users.
- Includes RTO, Loan, and Insurance pending-payment rows.
- RTO pending condition: `transferCharges > amtPaid`.
- Loan pending condition: `payoutAmount > totalAmountReceived`.
- Insurance pending condition: `payoutAmount > totalAmountReceived`.
- Columns: Type, Registration, Customer, Customer Mobile, Agent, Agent Mobile, Due, Total, Received, Balance, Action.
- Balance is `actual - received`.

Birthdays:

- Shows customers whose DOB or anniversary day/month matches today.
- Null dates are ignored safely.
- Type values remain legacy-compatible: `Birth Day` and `Anniversary`.

Lead Details source chart:

- Shows the top five Inquiry Sources plus an `Other` bar beside the Lead Details table. `Other` includes every remaining source and inquiries with no linked source, so the bars reconcile to the total.
- Uses `InquirySourceMaster` relation counts and does not group orphaned legacy free-text source values.

## 11. Error handling and edge cases

- Dashboard has no dashboard-specific error boundary.
- Date windows use local JavaScript date boundaries.
- Pending payment cross-column comparisons are performed after loading rows.
- Same-screen search is client-side over currently loaded dashboard datasets and is applied to each active detail workspace.
- The sort control applies to the active detail workspace. `Priority` uses the module's dashboard priority order; `Date Asc` and `Date Desc` use available date fields where the dataset has dates.
- Detail tabs are lightweight dashboard summaries, not replacements for full module pages.
- `Open` links remain the path to full module workflows.

## 12. SSOT rule

Update this file whenever dashboard metrics, permission gates, command-center layout, attention scoring, same-screen workspace behavior, or drill-down links change.
