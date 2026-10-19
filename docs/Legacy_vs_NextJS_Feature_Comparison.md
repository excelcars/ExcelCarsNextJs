# Legacy ASP.NET vs. New Next.js App — Feature Comparison

This document compares every module in the legacy ExcelCars ASP.NET MVC + SQL Server system against what was built in the new Next.js + Postgres app. For each module it covers: what the old system actually did (verified by reading the legacy C# controllers/models/views, not assumed), what real data exists, what was built in the new app, and what was deliberately changed and why.

Legend: ✅ built & tested against real data · 🆕 new/improved vs legacy · ⚠️ legacy bug fixed · ❌ dropped (dead in legacy)

---

## Authentication & Session

| | Legacy | New App |
|---|---|---|
| Password storage | **Plaintext.** New accounts had `Password = UserName` (a generated string), compared with `dbUser.Password.Equals(...)`. No hashing anywhere. | bcrypt-hashed (`pgcrypto`/`bcryptjs`), existing accounts hashed in place during migration, new accounts hashed on creation ⚠️ |
| Session | ASP.NET session state | NextAuth v5 (Auth.js), JWT strategy, Credentials provider |
| Route protection | Server-side session checks per action, `[AuthorizeFilter(DatabaseFunctionname=...)]` attributes tied to the (never-editable) `access_function_role` matrix | Next.js middleware protecting all dashboard routes; **note:** middleware excludes `/api/*`, so every API route added its own explicit `auth()` check |
| Bug found & fixed | — | `session.user.id` was never populated in the NextAuth `session` callback (a common Auth.js gotcha — the JWT's `sub` claim isn't auto-forwarded). This silently caused every `createdBy`/`updatedBy` write across the **entire app** to save `null` for one full working session before being caught and fixed. ⚠️ |

---

## Dashboard

Built fresh against live Prisma aggregate queries (stat cards, lead-source chart). Legacy had no directly equivalent single-screen dashboard reviewed in this pass — this was designed from scratch based on what data was available and useful to surface.

---

## Operations Modules

### Inventory Management
- **Legacy:** single flat `Inventory_Management` table, make/model/variant as free text with jQuery autocomplete.
- **New:** ✅ full CRUD, Make→Model→Variant now proper normalized FKs (`car_make_master`/`car_model_master`/`car_variant_master`) with cascading dropdowns instead of free-text autocomplete — a real data-quality upgrade, not just a UI port. 🆕 Photo records exist (`inventory_photos`, 727 rows) but the actual image **files** were never migrated from the legacy fileserver — Stock Report shows filenames with an explicit note rather than broken `<img>` tags.

### Inquiry Management
- **Legacy:** single form covering inquiry + car-of-interest + status, `Followup_Inquiry` as a loosely-consistent side table (legacy's own upsert logic for it was internally inconsistent — sometimes updated in place, sometimes not).
- **New:** ✅ full CRUD with **server-side pagination** (53,489 real rows — legacy had no pagination anywhere in the app, a real scale risk we didn't repeat). Customer linking via a proper `CustomerPicker` (search-existing or quick-create) instead of legacy's implicit name+mobile fuzzy-match-and-upsert. Car-of-interest uses the same normalized Make/Model/Variant cascade as Inventory. 🆕

### Follow-up Management
- **Legacy:** flat activity log (`followup_inquiry`, 509,700 rows across 49,962 inquiries) with **no distinction** in the UI between "still needs action" and "historical, already closed" — every row ever logged looked the same in a flat table.
- **New:** ✅ redesigned as a **work queue** — only the 262 inquiries currently `status = 'FollowUp'`, sorted by due date, overdue ones highlighted, with a "Log Follow-up" action that appends to history and updates the parent inquiry. This was an explicit design decision (confirmed with you) after finding the flat-log approach didn't match how staff would actually use a 509K-row table. 🆕

### Checklist / Documents
- **Legacy:** fixed 8 hardcoded document types (RC Book, Insurance, PUC, etc.) as checkboxes.
- **New:** ✅ dynamic document list (add/remove rows) with the same 8 as suggestions via a datalist, backed by the real flexible schema (`checklist_doc_details`, one row per document). **Real data note:** `check_list_doc_main` has 0 rows — this feature was never actually used in the legacy system either (not a migration gap).

### Insurance Management
- **Legacy:** referral-commission tracker (agent, not ExcelCars, sells the policy) with a real payout calculation bug pattern — the main form's payment upsert and the separate "Pay" modal's insert-new-row behavior were inconsistent with each other.
- **New:** ✅ built against 28 real rows. Payout amount auto-calculated (`OD Premium × Payout %`) exactly as legacy did. **Standardized on "always insert a new payment history row"** (the more correct of legacy's two inconsistent behaviors) for the Log Payment flow. Agent linking now goes through the normalized `partner_master` table (already existed from earlier schema work) instead of legacy's separate free-text agent fields. 🆕

### Loan Management
- **Legacy:** same referral-commission shape as Insurance (bank contact earns a payout %, not a loan ExcelCars issues), same payment-upsert inconsistency bug.
- **New:** ✅ built and tested (0 real rows — confirmed genuinely unused in legacy, same as Checklist, not a migration gap). Same "always insert new payment row" standardization as Insurance.

### RTO Management
- **Legacy:** tracks an agent handling vehicle registration transfer paperwork, with **three independent status fields** (payment, RC status, transfer status). Real legacy bug: the "Pay" modal updated payment status and RC status on the main record but **silently left transfer status stale**, even though it captured the value.
- **New:** ✅ built against 33 real rows. **Fixed the legacy bug** — logging a payment now updates all three statuses consistently, not two of three. ⚠️

---

## Configuration Screens

### Dealers
- **Legacy:** simple contact directory (name, mobile ×2, email, address, company, website), duplicate check on name+mobile. No link found anywhere to purchase/inventory transactions — appears to be a pure contact list, not a workflow.
- **New:** ✅ built 1:1 against 143 real rows.

### Customers
- **Legacy:** full 54,974-row directory, but **zero pagination** — results only appear after an explicit search, and then render **unbounded** (a real scale risk: a broad search could return tens of thousands of rows into one HTML table).
- **New:** ✅ built with real server-side pagination from the start — the same fix applied to Inquiry. Type field confirmed as exactly `"Contact"` / `"Customer"` (not "Individual/Company" as might be guessed). 🆕

### Customer Feedback
- **Legacy:** a fixed 5-question radio-button survey **hardcoded as static text in the view**, not database-driven — recovered the exact question wording and option sets from the legacy `.cshtml`. Entered by staff on behalf of a customer, not customer-submitted.
- **New:** ✅ built against 67 real rows with the exact recovered questions/options. Found and fixed a real bug before release: the vehicle picker was matching the wrong ID field (`inventoryId` vs `fkVariantId`), which would have silently broken edit pre-fill. ⚠️

### User Access
- **Legacy:** employee + login CRUD (not a permission-matrix editor — no UI for that existed; the `access_function_role` table is maintained only via direct SQL). Real role hierarchy: SystemAdmin > SuperAdmin > Admin > InquiryAssistant, a user can only create accounts *below* their own rank. Delete = soft-deactivate only, never a hard delete.
- **New:** ✅ built with the same role hierarchy and soft-deactivate. Passwords properly bcrypt-hashed instead of legacy's plaintext-equals-username pattern (per your explicit choice: admin sets the initial password directly). ⚠️

### SMS / Email Templates
- **Legacy:** **not** a pure template screen — one button both saved a template *and* actually sent real email via a live SMTP integration (with a hardcoded CC rule to a specific staff email). SMS was **dead code** the entire time — the gateway URL was a hardcoded empty string, so selecting "SMS" and clicking Send updated a template row but delivered nothing, ever.
- **New:** ✅ built as **template management only**, by your explicit choice — no live send wired up (would need SMTP credentials you'd need to provide, plus a decision on the hardcoded CC rule). 13 real templates (9 Email, 4 SMS). 🆕

### Notifications
- **Legacy:** confirmed **entirely non-functional** — no `Notification` table ever existed (it was an in-memory DTO only), and the SMS-send methods were commented out with a hardcoded empty gateway URL. The feature could never send anything in the legacy codebase.
- **New:** ❌ **dropped**, by your explicit choice — nothing real to preserve.

---

## Reports (all read-only, built fresh against already-migrated data)

### Stock Report
Filters + search over Inventory (83 rows), photo metadata viewer (see Inventory note above re: files not migrated), CSV export. 1:1 with legacy scope.

### Outstanding Payments
Legacy unioned **RTO + Insurance + Loan** balances (`payout − received`) into one report — **DSA was explicitly commented out** in the legacy code, not an oversight on our part; we matched that. Balance now reads directly from the already-correctly-maintained `total_amount_received` columns (no need to re-aggregate payment history live, since the Log Payment actions already keep that column authoritative).

### Stock Tracking
Legacy's "tracking" report is **not** a change-history/audit log (no timestamped tracking table exists) — it's a per-vehicle drill-down dashboard pulling together Checklist + Insurance + RTO + Loan records for one registration number, linked from a stock list. DSA is excluded here too, matching legacy's commented-out DSA section in this report specifically.

### Today's Inquiry & Followup
Legacy filtered on a **date range applied to Followup_Inquiry.Updated_Dt**, defaulting to today, plus a hardcoded row-security rule: an `InquiryAssistant`-role user is always restricted to inquiries *they* created, regardless of what's picked in the "Updated By" dropdown. Both behaviors replicated in the new build with the correct real role name.

---

## Cross-cutting changes made throughout (not legacy-driven, applied consistently)

- **Normalized master data:** Make/Model/Variant (already done pre-Next.js), and a shared `partner_master` table (bank/insurance/RTO/DSA agent contacts) reused across all four referral modules via one `PartnerPicker` component, replacing legacy's separate free-text agent fields per module.
- **Legacy junk-data display fix:** some catalog rows carry literal text `"null"`/`"na"`/`"n/a"` instead of a real SQL NULL (leftovers from the original MSSQL→Postgres text-to-FK conversion). Display-side fix applied everywhere these fields render; the underlying ~280 junk catalog rows are flagged as a separate background cleanup task, not yet actioned.
- **Consistent "payout history" pattern:** everywhere legacy had a payment/followup sub-table (Insurance, Loan, RTO), the new app always inserts a new history row and keeps the parent record's running total server-recomputed — resolving legacy's own internal inconsistency between its two different payment-save code paths.
