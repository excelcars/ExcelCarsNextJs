# Legacy Messaging vs Current Email Templates — Gap Analysis

## Comparison basis

This compares [the legacy module SSOT](../existing_ssot/sms-email.md) with [the current Next.js SSOT](sms-email.md). The requested files remain separate. “Missing” means legacy functionality that is not present in current code; it does not automatically recommend reproducing insecure or non-working legacy behavior.

| Priority | Feature / business logic | Existing-system behavior | Current Next.js status | Required improvement | Relevant code |
| --- | --- | --- | --- | --- | --- |
| P1 | WhatsApp messaging (future replacement for SMS) | Legacy had an SMS option, but its provider code was commented out and did not deliver messages. | SMS has been removed from the active Next.js feature; WhatsApp is not yet implemented. | When ready, select an approved WhatsApp Business provider, complete Meta template approval and recipient-consent requirements, then add a real WhatsApp compose/send workflow with mobile validation, delivery results, audit history, retries, and rate limits. Do not add a placeholder type before the provider and operational policy are ready. | Legacy `Send_SMS_Email` commented SMS blocks; Next `actions.ts`, `recipients.ts`. |
| P2 | Template attachment lifecycle and deletion errors | Legacy replaces all attachment rows on each send (while leaving possible physical orphans). | Deleting a template with attachments can fail because the relation is NoAction; error is generic. | Define attachment deletion policy (cascade or explicit transaction + storage cleanup), show a targeted dependency error, and prevent orphaned objects. | Legacy attachment replacement; Next Prisma `EmailAttachment` / `MessageTemplate`, `deleteTemplate`. |
| P2 | Search/list scalability | Legacy receiver results are unpaged; template autocomplete limits by the DB/query only. | Loads every template then filters in browser, with no pagination or server-side search. | Add server-side query parameters, indexes/constraints as needed, pagination, and stable sorting when template volume warrants it. | Next `listTemplates`, `TemplatesClient.tsx`. |
| P2 | Sender/CC configuration governance | Legacy obtains sender values from application `SystemDefault` settings. | Sender and optional CC come from deployment environment variables; CC is applied to every message silently. | Document ownership and environment provisioning; consider admin-managed, audited sender profiles and an explicit per-send CC choice/visibility. Ensure secrets remain environment-only. | Legacy `SystemDefault`; Next `.env*.example`, `sendMail.ts`. |
| P3 | Legacy-only reset and typed direct recipient fields | Legacy has a full-form Reset plus `Other` name/mobile/email fields. | Modal state resets when opened; recipient is an email field only. | Add only if needed after recipient-workflow design. For email, typed recipient already covers the useful `Other` behavior; do not add a mobile field absent an SMS transport. | Legacy view; Next Send modal. |

## Important non-gaps / deliberate changes

- Recipient discovery and bulk email selection are now implemented: searches and server-side re-resolution cover Customers, Contacts, Dealers, RTO Agents, Insurance Agents, and canonical Bank records for Loan Agents. Delivery reports the sent count and addresses that failed. Audit history, retries, and queues remain open work.
- Reusable template attachments and one-send attachments are now implemented. They support PDF, JPG, PNG, and DOCX files up to 10 MB each, private storage, path validation, and server-authorized CRUD. Inline images/CID embedding and malware scanning remain future work.
- Email delivery history is now implemented: each recipient attempt records its outcome, time, sender, attachment count, and safe error message; the template History action shows the latest 50. A background queue, retry policy, idempotency, provider message ID, and rate limits remain future work.
- The old typed subject-autocomplete/save-on-send flow is intentionally replaced by explicit template selection from the list plus duplicate-subject protection. Recipient lookup is authorized, resolves IDs again on the server, validates manual email addresses, and loads automatically while typing. A sandboxed preview is also implemented.
- SMS has been removed from the active Next.js UI and actions. Existing SMS rows are preserved but hidden; WhatsApp is documented as the future channel and remains unimplemented until an approved provider and policy are available.
- Explicit create/edit/delete template management is an improvement over legacy’s hidden “save on send” model. A listing is present in Next.js and absent in legacy.
- Next.js has stronger route/action permission checks for the page and mutations than the legacy autocomplete/upload endpoints shown. The recommended recipient API should keep that stronger boundary.
- Legacy’s unvalidated uploads, trusted posted recipient details, raw HTML handling, and orphan-file behavior are risks to replace, not requirements to replicate.

## Approval gate

No implementation changes are included in this analysis. Keep this document until the approved scope is implemented; only then update `sms-email.md` to reflect approved behavior and remove this file, as requested.
