# ExcelCars live audit — 22 October 2026

Target: https://excelcars.vercel.app. Browser account: SystemAdmin.

This was a read-only production audit, supplemented by inspection of the local source and existing local tests. No business records, permissions, payments, or messages were changed during this audit. The Role Access save checks performed earlier in this chat are separate.

## Result

The system is not ready for an unqualified “everything works” sign-off. Of 24 top-level/supporting routes checked, 17 opened and seven redirected SystemAdmin to the dashboard. Important findings include permission migration gaps, missing module authorization checks, unavailable legacy photos, and legacy data quality problems.

The configured production database contains all 61 models and 703 scalar columns expected by the generated Prisma client. No missing tables/columns or unvalidated PostgreSQL constraints were found. This verifies presence, not every column type, index, business rule, or migration history.

The existing local test suite passed all 36 tests. These are local automated tests, not proof that every live workflow works.

## Findings, in recommended order

### 1. High: Vehicle Masters and Agents do not consistently enforce module permissions

- Live Vehicle Masters opened with SystemAdmin even though its saved grants do not contain `Vehicle_Master_Management`.
- `app/(dashboard)/config/catalog/page.tsx` and `src/features/catalog/adminActions.ts` do not check the module permission.
- `app/(dashboard)/config/agents/page.tsx` and `src/features/agents/adminActions.ts` likewise lack module authorization checks. SystemAdmin currently has `Agent_Management`, so unauthorized access to Agents was not tested under another account.
- The shared dashboard layout checks login and computes sidebar links, but does not authorize each page or each mutation.
- Recommendation: enforce permissions server-side on both pages and every create/update/delete action. Hiding a menu item is insufficient. Validate with allowed and denied roles before deploying.
- No unauthorized write was attempted.

### 2. High: Seven modules are blocked by current role grants

SystemAdmin was redirected from Checklist, RTO, Follow-up, Outstanding Payments, Inquiry Source Master, Portal Assignments, and Email Templates. The database confirms its grants are missing the modern names required by these routes.

| Area | Existing legacy grant | Current required grant |
| --- | --- | --- |
| Checklist | `Document_CheckList` | `Checklist_Management` |
| RTO | `RTO_Agent_Management` | `RTO_Management` |
| Follow-up | `FollowUp_Management` | `Followup_Management` |
| Outstanding Payments | `Outstanding_Payment_Report` | `Outstanding_Payments_Report` |
| Inquiry Source Master | No corresponding current grant | `Inquiry_Source_Master_Management` |
| Portal Assignments | No corresponding current grant | `Portal_Assignment_Management` |
| Email Templates | No corresponding current grant | `Message_Template_Management` |

Recommendation: reconcile roles against an approved permission matrix. For renamed permissions, use an explicit migration or appropriate compatibility aliases. Determine grants for genuinely new modules separately. Do not grant all new capabilities to every role automatically. These seven module workflows remain unverified because access was denied.

### 3. High functional impact: legacy inventory photos are unavailable

- Sampled vehicle: inventory ID 555, Audi Q7.
- The gallery displayed 20 records; every record said `Legacy file reference only` and `File unavailable in current app storage`.
- The sampled filenames appeared twice. Database aggregation found 18 duplicate `(fk_inventory_id, path)` groups across the photo table.
- Recommendation: recover/migrate the referenced files to the deployed storage system, verify photo previews and customer-facing links, then deduplicate references without removing the original files or breaking relationships.
- Scope: this confirms the sampled gallery failure; every photo in the database was not individually downloaded or tested.

### 4. Medium: master and inventory data need cleanup

The database contains the following null/blank/placeholder names, counting SQL NULL and trimmed empty, `null`, `na`, or `n/a` values:

| Master | Rows requiring review |
| --- | ---: |
| Makes | 173 |
| Models | 212 |
| Variants | 452 |

The live catalog visibly displays placeholder values. Inventory also displayed an implausible owner count of 29,000 on one vehicle. Current owner-count validation enforces a minimum but no plausible maximum (`src/lib/validation.ts`).

Recommendation: identify dependent records before merging or replacing placeholders; quarantine incomplete master options from new selection, normalize legacy display values, and add suitable validation. Do not delete these records blindly.

### 5. Medium: React hydration error needs investigation

One console event, React error #418, was recorded during the Role Access History / Stock Report navigation sequence. The Stock Report subsequently rendered successfully. Later reads returned the same event timestamp, so this is one observed event, not evidence of a new failure on every later page.

React identifies #418 as a mismatch between server-rendered and client-rendered output: https://react.dev/errors/418.

The exact component was not isolated from the minified stack. Date/locale formatting is a possible contributor, not a confirmed root cause. Recommendation: reproduce with a development build or source maps and correct the specific mismatch.

### 6. Medium: time-zone handling is inconsistent in source

- Today's Activity explicitly uses `Asia/Kolkata`.
- Dashboard and inquiry date boundaries use host-local `Date` constructors / `setHours`.
- Profile and Role Access History call locale date formatting without an explicit time zone.
- Recommendation: define the business time zone centrally and use it consistently for date boundaries and audit display. Validate records around IST midnight. Boundary errors were not reproduced by modifying the clock or production data.

## Route coverage

“Opened” means the page rendered and its visible read path was checked; it does not certify all mutation workflows.

| Module/page | Route | Result |
| --- | --- | --- |
| Dashboard | `/dashboard` | Opened; summary counts and links rendered |
| Inventory | `/inventory` | Opened; vehicle detail rendered; In Stock filter settled at 2 records; photo problem above |
| Checklist / Docs | `/checklist` | Redirected to dashboard |
| Inquiries | `/inquiry` | Opened; sample detail rendered; legacy incomplete vehicle requirements visible |
| Loan Management | `/loan` | Opened, empty state; database confirms zero loan rows |
| Insurance | `/insurance` | Opened; sample policy detail rendered |
| RTO | `/rto` | Redirected to dashboard |
| Follow-up | `/followup` | Redirected to dashboard |
| User Access | `/config/user-access` | Opened |
| Role Access | `/config/role-access` | Opened; prior save verification is documented in this chat |
| Role Access History | `/config/role-access/history` | Opened; one event displayed |
| Dealers | `/config/dealers` | Opened |
| Customers | `/config/customers` | Opened; sample customer detail rendered |
| Agents | `/config/agents` | Opened; authorization finding above |
| Vehicle Masters | `/config/catalog` | Opened; authorization and placeholder-data findings above |
| Inquiry Source Master | `/config/inquiry-sources` | Redirected to dashboard |
| Portal Assignments | `/config/portal-assignments` | Redirected to dashboard |
| Customer Feedback | `/config/feedback` | Opened |
| Email Templates | `/config/sms-email` | Redirected to dashboard |
| Stock Report | `/reports/stock` | Opened; 84 records, summary and table rendered after recovery |
| Outstanding Payments | `/reports/outstanding` | Redirected to dashboard |
| Stock Tracking | `/reports/tracking` | Opened; detail `/reports/tracking/555` rendered |
| Today's Activity | `/reports/today` | Opened; Search completed and returned zero activity for 22 October 2026 |
| Profile | `/profile` | Opened; password was not changed |

## Remaining verification

- Create, edit, delete, payment logging, permission changes, and account revocation require controlled test records and an agreed role matrix.
- Actual email/WhatsApp delivery, feedback invitations, scheduled reminders, webhook ingestion, file uploads, videos, and private document downloads were not exercised.
- Exports were not downloaded and reconciled against their lists.
- Lower-privilege roles and anonymous access were not tested as separate browser sessions.
- Public vehicle/feedback links were not opened because opening tracked links can itself create visits/engagement records.
- The CLI account still cannot access the ExcelCars Vercel project, so deployment settings, runtime logs, cron runs, and deployed environment variables were not audited.
- The batched Role Access save improvement from the preceding task remains local in `src/features/roleaccess/actions.ts`; this audit does not constitute its deployment.

Recommended next work: resolve server-side authorization and the role migration first, recover legacy media second, then run controlled end-to-end workflow tests and data cleanup.

## Remediation progress

### Fix 1 — Vehicle Masters and Agents authorization

Implemented locally on 22 October 2026:

- Both pages now check their module permission before loading module data.
- All nine Vehicle Masters mutation actions and all three Agents mutation actions now authorize each request before accessing module data.
- Denied actions return `Not authorized.`; denied pages redirect to `/dashboard`, following the existing application pattern.
- Regression tests execute the actual page/action functions with the real access policy and stubbed authentication/database I/O. They cover signed-out users, users holding only an unrelated permission, and users with the required module permission. These checks never connect to production.
- The full test suite passes 78 tests (42 new permission checks plus 36 existing tests).

Deployment is pending access to the owning ExcelCars Vercel project. SystemAdmin lacked `Vehicle_Master_Management` during the initial audit. That prerequisite was subsequently resolved by the explicitly approved configuration grants below. The server-side page/action guards themselves still require code deployment.

### Fix 2 — renamed permission reconciliation (applied live)

Applied on 22 October 2026 with `scripts/migrate-legacy-access-grants.mjs` after reviewing its read-only production preview:

- SystemAdmin, SuperAdmin, and Admin: replaced each of the four legacy Checklist, RTO, Follow-up, and Outstanding Payments grants with the current permission name.
- InquiryAssistant: replaced only its legacy Follow-up grant. Its existing ownership restrictions and other permissions were preserved.
- Total: 13 current grants inserted, 13 equivalent old grants retired, four role audit events recorded. All changes committed together in a serializable transaction.
- Retiring the old grants avoids reviving revoked access on a later rerun. A post-apply preview returned zero additions and zero retirements.
- Five migration regression tests cover preservation of unrelated rights, existing current grants, all four rename pairs, missing/ambiguous target definitions, and rerun/revocation behavior.

Live SystemAdmin verification now succeeds:

| Repaired module | Observed result |
| --- | --- |
| Checklist / Documents | Page loads; zero existing checklists |
| RTO | Page loads; 33 transfer jobs |
| Follow-up | Page loads; 262 active follow-ups |
| Outstanding Payments | Page loads; 61 records |

This database repair takes effect with the existing live application and does not depend on deploying the local code changes. New configuration permissions are a separate role decision; this rename migration does not grant them.

### Approved configuration grants (applied live)

The user explicitly selected SystemAdmin, SuperAdmin, and Admin for Vehicle Masters, Inquiry Source Master, Portal Assignments, and Email Templates.

- Applied with `scripts/grant-admin-configuration-access.mjs` after previewing the exact role/function pairs.
- Inserted 12 grants and recorded three role audit events in one serializable transaction. InquiryAssistant and unrelated grants were unchanged by this separate grant operation.
- A post-apply preview returned zero additions.
- Verified live under SystemAdmin: Vehicle Masters (227 make rows), Inquiry Source Master (35 sources), Portal Assignments, and the Email Templates tab (nine templates). Together with the four renamed modules, all seven initially redirected routes now open.
- Portal Assignments currently has unassigned sources and no eligible employee options in its dropdowns. Eligible active employee accounts and assignment policy require a separate data/configuration task; sources were not automatically assigned.
- Email Templates includes legacy URL-encoded bodies and test/empty templates. Those require content review in the data-cleanup task; no messages were sent.
- The complete local suite now passes 86 tests, including explicit-grant scoping, duplicate prevention, and invalid-role/definition checks. Lint checks pass for the migration scripts and tests.

The live database permission repairs are complete. The first fix's source-code deployment and the media/data/rendering findings remain outstanding.

### Legacy photo recovery search — no matching originals found locally

Read-only search on 22 October 2026:

- Compared all 727 live legacy photo rows (709 distinct filenames) with images in the local legacy project, Next.js public assets, and the workspace backup directory.
- Found the legacy folder at `C:\Ruchita\Next\Universe_CC_tool\ExcelCars\ExcelCars\FileUpload\Inventory_Car_Photo` and a second copy in `obj\Release\Package\PackageTmp`. Each holds 40 images, mostly old demo/interface assets.
- Across all scanned local image directories, including packaged assets, there were 234 image copies and 116 unique filenames. None matched the 709 required live filenames.
- Inspected the ZIP directories of `C:\Users\Admin\Downloads\ExcelCars.zip` and `ExcelCars (1).zip` without extracting or modifying them. Each has 232 image entries, including 80 inventory-folder entries across the source/deployment copies. Every image basename already exists in the scanned local project, so neither ZIP adds a matching recovery candidate.
- Searched Desktop, Downloads, Documents, and the local Git/shared delivery folders for the known Audi Q7 filenames and ExcelCars bundles; no additional matching originals were found.
- Several SQL Server `.bak`, PostgreSQL `.sql`, and PostgreSQL `.dump` database backups were identified. They were not restored or claimed to contain recoverable image bytes; the application photo records store paths/references.
- The alternate local IIS and historical development paths checked were absent.

Reproducible local/database filename comparison: `node scripts/find-legacy-inventory-photos.mjs` (read-only; uses `.env.production.local`).

Next recovery source: the old production host's `FileUpload/Inventory_Car_Photo` folder, a full website/filesystem backup, or another original image archive. No uploads, database photo edits, or deduplication were performed by this search.

### Catalog cleanup safeguards — implemented locally, not deployed

The user asked to skip further photo recovery and move to the next finding.

- Added a shared catalog-name policy for blank values and exact placeholders (`null`, `na`, `n/a`, hyphen and em dash), with case-insensitive matching and whitespace trimming. Meaningful names such as `NA Edition` remain valid.
- Vehicle Masters now labels incomplete entries with their record IDs instead of ambiguous blanks. Its repair views include SQL-null model/variant rows behind the existing Vehicle Masters permission; ordinary authenticated lookup behavior is unchanged.
- New-choice suggestions in Inventory, Inquiry, Follow-up and Vehicle Masters exclude placeholders. ID-based pickers retain a currently selected placeholder when its row is available, so they do not silently change historical relationships. Inventory's existing text values are not rewritten.
- Catalog create/update actions reject placeholder names. Model saves require a named make; variant saves require a named model under the selected named make. Existing referenced rows were neither deleted nor guessed/renamed in production.
- Verification: 111 tests pass, including placeholder normalization, stable selection IDs, server validation, module authorization and repair-endpoint permission checks. TypeScript passes. Targeted ESLint has no errors; the Follow-up file retains two pre-existing unused-symbol warnings.

These are local code changes. Deployment and live verification remain pending access to the Vercel account/team owning ExcelCars. This does not resolve the missing historical photos, the anomalous owner count, template content or date/time consistency findings.

### Dashboard tab overlap and chart compression — fixed locally, not deployed

- Reproduced the live source plot at approximately 98px high. At the browser's narrow width, the search input overlapped part of the RTO tab. Other workspace tabs selected on one click; no general double-click requirement was reproduced.
- Put the wrapping tab group and search/sort controls in separate grid rows. Search now shrinks within its own row rather than painting over tab hit targets.
- Removed the desktop viewport-height constraint that forced the workspace/charts into leftover screen space. Charts have explicit row-aware plot heights (minimum 180px; six-source chart 204px), wrapping headers, non-intercepting tooltips and no bar replay animation on tab changes. Workspaces can scroll vertically instead of compressing charts.
- Verified the real components with synthetic data in the isolated `tests/fixtures/dashboard-ui` Next.js preview. All nine tabs selected with one click; Quarter selected with one click; returning to Lead Details preserved plot heights.
- Independent 360px, 768px and 1440px iframe viewports reported zero tab/control overlaps, zero horizontal document overflow and plot heights of 204px/180px. The iframe content widths were 343px, 751px and 1439px after scrollbars.
- Added three dashboard regression tests (114 total passing). The separate fixture is not an application route and uses no live authentication or database access.

Live deployment/verification is still pending access to the owning Vercel team. The local preview is evidence of the code fix, not a claim that production has changed.

### Dashboard sidebar auto-close — updated locally, not deployed

- Centralized sidebar closing in the navigation handler after the ordinary-click guard, before the same-path check. Dashboard clicks now explicitly prevent the Link's default navigation and close both desktop expansion and the mobile drawer even when Dashboard is already open.
- Same-path query changes still navigate (for example, returning from `?workspace=rto` to the main Dashboard), without starting a loading overlay that waits for a pathname change. Cross-page navigation retains its loading state. Modified/new-tab clicks leave the current sidebar unchanged.
- Added nine regression cases in `tests/sidebarNavigation.test.mjs`. The elevated test-run request was declined, so these new cases have not been executed; do not count them as passing tests. Deployment and live verification remain pending.

Verification update after the user requested continuation: the complete suite now passes all 123 tests, including all nine sidebar cases and the final chart animation assertion. `git diff --check` also passes. This supersedes the earlier unexecuted-test status; deployment and live verification are still pending.
