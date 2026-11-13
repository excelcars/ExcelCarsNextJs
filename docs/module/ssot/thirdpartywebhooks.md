# SSOT - Third Party Inquiry Webhook Integration
## Status: Staging vehicle catalog mapping and readable partner details added and verified on 2026-11-13. Production rollout of these changes is pending.

**Module:** `third-party-inquiry-webhooks`  
**Project:** `ExcelCarsNextJs`  
**Routes:** `/api/webhooks/cardekho/inquiry`, `/api/webhooks/justdial/inquiry`, `/config/portal-assignments`  
**Depends on:** inquiry module, Inquiry Source Master, user access, inquiry ownership, customer master, vehicle catalog master, PostgreSQL, environment secrets  
**Source of truth for this document:** `app/api/webhooks/cardekho/inquiry/route.ts`, `app/api/webhooks/justdial/inquiry/route.ts`, `src/features/inquiry/partnerWebhook.ts`, `app/(dashboard)/config/portal-assignments/page.tsx`, `src/features/portal-assignments`, `src/lib/access/inquiryOwnership.ts`, and the approved partner payload contracts.

## 1. Purpose

This module receives sales enquiries from external partner portals and creates them in the Excel Cars CRM without manual entry.

It owns:

- separate webhook endpoints for each partner portal
- request authentication and payload validation
- partner-specific payload normalization
- creation of CRM inquiry records from accepted partner leads
- portal-to-employee assignment lookup
- assignment of the created inquiry to the mapped employee
- webhook request result logging through the inquiry activity trail
- clear partner success and error responses

It does not own:

- inquiry editing and manual reassignment after creation
- customer master UI or vehicle catalog master UI
- partner-side lead delivery, retry policy, or payload generation
- automatic creation of users or portal source master records

## 2. Locked Scope

- Cardekho and Justdial use separate webhook routes.
- A change to one partner adapter must not change the request contract or behavior of another partner adapter.
- Each webhook creates an inquiry with default `status = Open` and `classification = Warm`.
- Each webhook resolves its source through the controlled Inquiry Source Master.
- Each active portal source can be mapped to one active `InquiryAssistant` user.
- The mapped user is saved in `inquiry.assignedTo`; this assignment is the owner of the incoming portal enquiry.
- If no active mapping exists, the enquiry is still created as unassigned and is visible to users with unrestricted inquiry access.
- Existing customers are linked by normalized mobile number when a match exists. Webhooks do not auto-create customer-master records.
- Partner data that has no dedicated inquiry field is retained in the inquiry remark and activity detail.
- Cardekho and Justdial endpoints require a configured shared secret. Unsigned requests are rejected.
- A successful partner request returns the partner-required success acknowledgement only after the inquiry is committed.

## 3. Partner Endpoint Contracts

### Cardekho

Route:

- `POST /api/webhooks/cardekho/inquiry`

Supported request format:

- `Content-Type: application/json`

Required current payload fields:

```json
{
  "lead_id": "CDK-20261008-000123",
  "buyer_name": "Nitin",
  "buyer_mobile": "8988089080",
  "mmv": "Suzuki Baleno Delta",
  "mfg_year": "2025",
  "reg_no": "HP546543",
  "km_driven": "250000",
  "no_of_owners": 1
}
```

Field mapping:

| Cardekho field | CRM destination | Rule |
|---|---|---|
| `lead_id` | partner lead ID and duplicate key | Required stable unique value for each Cardekho lead |
| `buyer_name` | `inquiry.customerNameLegacy` | Required non-empty text |
| `buyer_mobile` | `inquiry.mobileno` | Required valid Indian 10-digit mobile after normalization |
| `mmv` | `inquiryCarDetails.fkVariantId`, legacy make/model/variant labels, and `subVariant` | Use a confirmed partner mapping first, then match the complete description against the catalog. Always preserve the original description in `subVariant`. Uncertain matches remain unlinked and visible for review. |
| `mfg_year` | `inquiryCarDetails.year` | Must be between 1900 and current year plus one |
| `no_of_owners` | `inquiryCarDetails.noOfOwners` | Whole number, zero or greater |
| `reg_no` | `inquiry.remark` and activity detail | Preserved as partner vehicle metadata |
| `km_driven` | `inquiry.remark` and activity detail | Preserved as partner vehicle metadata |

Fixed values:

- source code: `CARDEKHO`
- source display name: resolved from Inquiry Source Master
- status: `Open`
- classification: `Warm`

Idempotency:

- Cardekho must send a stable `lead_id` for every lead before production activation.
- The integration records `lead_id` with the inquiry and rejects repeat deliveries of that same Cardekho lead as duplicates.
- A missing `lead_id` is an invalid Cardekho payload and must return `422 Unprocessable Entity` without creating an inquiry.

### Justdial

Route:

- `GET /api/webhooks/justdial/inquiry`
- `POST /api/webhooks/justdial/inquiry`

Supported request formats:

- URL query parameters for GET
- `application/x-www-form-urlencoded` POST
- `multipart/form-data` POST without file fields
- `application/json` POST

Expected partner fields:

| Justdial field | CRM destination |
|---|---|
| `leadid` | partner lead ID and duplicate key |
| `name` | `inquiry.customerNameLegacy` |
| `mobile` | `inquiry.mobileno` |
| `email` | `inquiry.email` |
| `date` and `time` | inquiry received detail |
| `category` | inquiry remark and activity detail |
| `city`, `area`, `brancharea`, `pincode`, `branchpin` | inquiry location/remark and activity detail |
| `company`, `leadtype`, `parentid`, `prefix`, `phone`, `dncmobile`, `dncphone` | inquiry remark and activity detail |

Fixed values:

- source code: `JUSTDIAL`
- source display name: resolved from Inquiry Source Master
- status: `Open`
- classification: `Warm`

Justdial enquiries can be created without a vehicle-interest row because the supplied partner contract has no vehicle requirement fields.

Idempotency:

- `leadid` is required.
- A repeat request with the same `leadid` and `JUSTDIAL` source must return a successful acknowledgement without creating another inquiry.

Partner response:

- accepted new lead: plain text `SUCCESS`
- accepted duplicate retry: plain text `SUCCESS`
- invalid or unauthorized request: JSON error response with an HTTP 4xx status
- internal persistence failure: JSON error response with an HTTP 5xx status

## 4. Authentication And Security

- Each partner endpoint uses its own secret environment variable:
  - `CARDEKHO_WEBHOOK_SECRET`
  - `JUSTDIAL_WEBHOOK_SECRET`
- Requests authenticate with `Authorization: Bearer <secret>`.
- `X-Webhook-Secret: <secret>` may be accepted only as a documented fallback for partners that cannot set `Authorization`.
- Secret comparison must use a timing-safe comparison.
- Missing webhook secrets disable the corresponding endpoint. The endpoint must return `401 Unauthorized`, not accept unauthenticated traffic.
- Request bodies must have a bounded size and text fields must be trimmed and length-limited before persistence.
- Incoming payload values are data only. They must never be interpreted as instructions, HTML, SQL, or executable content.
- Logs must not expose the configured secret or complete raw payloads containing unnecessary personal data.

## 5. Portal Assignment And Ownership

### Configuration surface

Planned route:

- `/config/portal-assignments`

The settings page lists active portal sources and lets an authorized administrator map each source to one active `InquiryAssistant` user.

Minimum settings columns:

- Portal / source display name
- Source code
- Assigned employee
- Active state
- Updated date
- Updated by

Examples:

| Portal | Source code | Assigned employee |
|---|---|---|
| Cardekho | `CARDEKHO` | Faisal |
| Cars24 | `CARS24` when added to the source master | Ruchita |
| Justdial | `JUSTDIAL` | Unassigned |

### Data model

Planned table: `inquiry_portal_assignments`

Minimum fields:

- `inquiryPortalAssignmentId`
- `sourceId`, unique
- `assignedToUserId`
- `isActive`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Rules:

- one source has at most one active default assignee
- the assignee must be an active user with role `InquiryAssistant`
- disabling a source mapping stops future auto-assignment and does not change historic inquiries
- changing a mapping affects only enquiries received after the change
- manual assignment on an existing inquiry remains available and overrides only that inquiry

### Ownership behavior

- A partner-created inquiry has `assignedTo = mapped user` when a mapping exists.
- The mapped employee is the inquiry owner for both `/inquiry` and `/followup` access checks.
- Restricted `InquiryAssistant` users must see inquiries where either `createdBy = current user` or `assignedTo = current user`.
- The existing `/followup` `created-only` restriction must be changed to `created-or-assigned`; otherwise webhook-created enquiries assigned to an employee are hidden from that employee's follow-up queue.
- Administrators and roles without inquiry ownership restriction retain access to all enquiries.

## 6. Inquiry Creation Workflow

1. Partner calls its own endpoint with a valid secret.
2. The endpoint validates transport, payload shape, mandatory fields, and source availability.
3. The endpoint checks the partner-specific duplicate key when one is available.
4. The endpoint looks up the active portal assignment for the fixed source.
5. The endpoint looks up an existing customer by normalized mobile number.
6. The endpoint creates the inquiry, optional vehicle-interest rows, assigned owner, and partner metadata in one transaction.
7. The endpoint writes an `inquiry_activity_log` event identifying the partner source and lead ID when available.
8. The transaction commits.
9. The endpoint returns the partner acknowledgement.

The webhook must not send matching inventory emails or customer notifications during the synchronous partner request. Those integrations remain separate from inbound lead acceptance.

## 7. Data Ownership

Tables read:

- `inquiry_source_master`
- `user_table`
- `customer`
- `carMakeMaster`
- `carModelMaster`
- `carVariantMaster`
- `inquiry_portal_assignments`
- `inquiry` for duplicate detection

Tables written:

- `inquiry`
- `inquiryCarDetails` when vehicle data is supplied
- `inquiry_activity_log`

The module must not create a `followupInquiry` row for the default `Open` state.

## 8. Validation Rules

### Vehicle mapping and readable partner details (staging, 2026-11-13)

- Complete MMV matching tolerates case, punctuation, spacing, Maruti/Suzuki names, and Mercedes/Benz names. It never selects a shorter trim or creates catalog entries.
- Equivalent duplicate variant spellings use the lowest variant ID only within the same make/model IDs. Conflicting catalog relationships remain unresolved.
- Both the inquiry table and compact cards show the original vehicle description, linked catalog details, Partner details popup, and a `Needs vehicle mapping` label for unlinked CarDekho vehicles. Overview and Requirement titles fall back to the received description.
- `Partner details` opens the original linked webhook payload in a modal popup as approved, labelled business fields. The popup supports Escape, a Close button, and backdrop dismissal. It explains automatic catalog matching and the one-time confirmation required for missing/ambiguous descriptions. Arbitrary JSON keys are not exposed. Server access requires both route permission and inquiry ownership.
- An authorized inquiry editor can select an existing make/model/variant and explicitly check `Remember the selected vehicle mapping for future CarDekho inquiries`. The original vehicle text must remain in Sub Variant.
- Confirmation is bound to that inquiry's stored CarDekho payload, validates the selected catalog relationships, and saves the inquiry and mapping in one transaction. The activity log records the actor and previous/new catalog target. Later matching inquiries reuse the mapping.
- Migration: `20261113100000_add_partner_vehicle_mappings`. Apply this before serving the updated webhook. Production requires a separate rollout; no production migration or backfill was performed during staging validation.
- Regression checks: `npm run test:partner-inquiries`, `npm run typecheck`, and targeted ESLint checks.
- Live staging verification: start `npm run dev:staging -- --port 3005`, then run `node --experimental-strip-types scripts/verify-cardekho-staging.mjs`. This creates clearly labelled synthetic leads and a synthetic confirmed mapping in staging; it does not send customer messages. It checks unsigned requests, matching, duplicate retries, unmapped text retention, and reuse of a persisted confirmed mapping. The JSON report is saved under ignored `storage/cardekho-staging-verification.json`.
- The local staging runner sets `AUTH_URL` and `NEXTAUTH_URL` from its requested local port and uses an isolated `.next-staging-dev` build folder. This prevents hosted-UAT redirects and route-manifest collisions when the regular local server is running at the same time. Hosted UAT authentication settings are unchanged. A staging account is required for the logged-in visual review.
- Existing staging inquiries: `npm run db:backfill-cardekho:staging` previews repairs. To apply: `npm run db:backfill-cardekho:staging -- --apply --backup=storage/cardekho-vehicles-before.json`. The script refuses a staging connection matching production, only touches unedited/unlinked webhook-created vehicle rows, writes a backup first, and rolls back on concurrent changes. It preserves the received text and unrelated fields.

Common validation:

- source must exist and be active
- customer name and mobile are required when the partner provides them as mandatory fields
- mobile is normalized to the rightmost 10 digits and must contain exactly 10 digits
- email is optional but must be valid when present
- dates must be valid calendar values
- numeric year, kilometre, and owner values must be finite numbers when present

Cardekho validation:

- `lead_id`, `buyer_name`, `buyer_mobile`, and `mmv` are required
- `mfg_year` is required and must pass inquiry vehicle year validation
- `no_of_owners` is optional but must be a non-negative integer when present

Justdial validation:

- `leadid`, `name`, and `mobile` are required
- `email` is optional and validated when present
- vehicle data is optional because Justdial does not send it in the current contract

## 9. Audit And Error Handling

For every created enquiry, the activity log records:

- event type: `partner_inquiry_received`
- source code and source display name
- partner lead ID when supplied
- assigned user ID when auto-assigned
- a concise list of saved partner vehicle or location metadata
- received timestamp

Expected errors:

| Condition | HTTP status | Result |
|---|---:|---|
| Endpoint secret is not configured | 401 | Endpoint stays closed |
| Missing or invalid secret | 401 | No enquiry created |
| Unsupported content type | 415 | No enquiry created |
| Invalid or incomplete partner payload | 422 | No enquiry created |
| Inactive or missing source | 409 | No enquiry created |
| Duplicate known partner lead | 200 | Return partner success acknowledgement, no second enquiry |
| Database or unexpected failure | 500 | No success acknowledgement |

## 10. Configuration And Deployment

Before enabling a partner:

1. Ensure the partner source exists and is active in Inquiry Source Master.
2. Add the partner endpoint secret to the target environment.
3. Create or confirm the portal-to-employee mapping when automatic ownership is required.
4. Give the assigned employee access to `/inquiry` and `/followup`.
5. Deploy the webhook and the database migration for portal assignments.
6. Send a test lead from the partner sandbox or approved test account.
7. Verify the inquiry appears with the expected source and assignee.
8. Verify the assignee can open it in both `/inquiry` and `/followup` after it is moved to `FollowUp`.

Partner onboarding data to provide:

- production endpoint URL
- authentication header format
- supported method and content type
- field mapping
- expected acknowledgement value
- timeout and retry expectations
- stable external lead ID requirement

## 11. Testing Requirements

Automated tests must cover:

- valid Cardekho JSON creates one `CARDEKHO` inquiry with `Open`, `Warm`, and the mapped assignee
- valid Justdial GET, form POST, and JSON POST create one `JUSTDIAL` inquiry
- Cardekho vehicle values map to the correct inquiry-car and remark fields
- Justdial `leadid` duplicate retry produces no duplicate inquiry and returns `SUCCESS`
- unauthorized requests create no inquiry
- invalid payloads create no inquiry
- inactive source or inactive assignee mapping does not assign an invalid user
- unassigned portal source creates an unassigned enquiry successfully
- restricted employee can see an assigned webhook enquiry in `/inquiry`
- restricted employee can see an assigned webhook enquiry in `/followup` after the ownership rule change

Manual acceptance checks:

- Cardekho endpoint does not accept Justdial payloads
- Justdial endpoint does not change Cardekho handling
- changing Cardekho's mapped employee affects only future Cardekho enquiries
- manual reassignment of an individual inquiry continues to work

## 12. Known Constraints And Open Decisions

- Cardekho must send the documented `lead_id` field for every production lead.
- The current inquiry vehicle schema has no separate registration number or kilometres-driven fields. These values are retained in remarks and activity detail.
- The current source master seed has `CARDEKHO` and `JUSTDIAL`. `CARS24` must be added as an active controlled source before a Cars24 webhook or mapping can be enabled.
- An `Open` inquiry is not part of the default follow-up queue. The assigned employee sees it in `/inquiry`; it enters the default `/followup` queue after a user changes its status to `FollowUp`.
- The exact webhook URL host is environment-specific and must be provided at deployment time.

## 13. Out Of Scope

- round-robin lead distribution
- multiple employees per portal source
- automatic reassignment when an employee becomes inactive
- outbound lead updates back to Cardekho or Justdial
- partner dashboard synchronization
- automatic inventory matching, email, or WhatsApp delivery as part of webhook acknowledgement
