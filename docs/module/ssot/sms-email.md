# SSOT — Email Templates (Current Next.js Implementation)

## Status and evidence

**Route:** `/config/sms-email`. This document describes the code currently implemented, not the legacy target behavior.

Primary evidence:

- `app/(dashboard)/config/sms-email/page.tsx`
- `src/features/messagetemplates/TemplatesClient.tsx`, `queries.ts`, and `actions.ts`
- `src/lib/email/sendMail.ts`
- `src/components/CustomerPicker.tsx` and `app/api/customers/search/route.ts`
- `src/lib/access/accessControl.ts`, `accessCatalog.ts`, and `prisma/schema.prisma`

## 1. Purpose, navigation, and access

The Configuration navigation has an **Email Templates** link to `/config/sms-email`. The server page checks `canCurrentUserAccessRoute('/config/sms-email')`, which requires the active signed-in user to have the `Message_Template_Management` function; failure redirects to `/dashboard`. The route and permission-function name are retained for compatibility with existing role grants.

All template mutations, recipient search, and email send use `getAuthorizedUserIdForRoute('/config/sms-email')`, so direct server-action calls require the same active user and function grant. The page runs inside the authenticated dashboard.

## 2. Template data and list

Prisma model `MessageTemplate` maps to `message_template`. The new `MessageAttachmentUpload` table tracks a template id, private stored path, original file name, MIME type, byte size, scope (`template` or `send`), uploader, and timestamp. The screen reads every template in descending `typeId` order; it has no server pagination or loaded-row cap.

The client table presents Type, Subject, a truncated Body, and actions, including attachment management. Its local search is case-insensitive and checks only subject and body. The only type/filter is `Email`; filtering and search do not update the URL or request the server. Existing non-email rows are preserved in the database but excluded from this page.

## 3. Template create, edit, and delete

The Add/Edit modal exposes:

| Field | Actual behavior |
| --- | --- |
| Type | A select containing only `Email`; add defaults to `Email`. Server actions reject any other type, including direct requests. |
| Subject | Required after trimming. Blank is rejected with `Subject and body are required.` |
| Body | Required after trimming for validation, but saved without trimming, preserving entered whitespace/HTML. The rich-text editor supports bold, italic, underline, bulleted/numbered lists, links, and clearing formatting; pasted content is inserted as plain text. |

Create records the current time and current authorized user as both creator/updater. Update modifies type, trimmed subject, unchanged-form body, update timestamp, and updater. Create/update reject another Email template with the same subject after trimming and case-insensitive comparison. Existing duplicate legacy rows are preserved. A server-side cleaner removes scripts, embedded pages, forms, event handlers, and `javascript:` links when a body is saved and again immediately before it is sent. The actions do not apply content-length limits.

Delete opens a confirmation dialog (“This cannot be undone.”), then deletes by `typeId`. The database relation is `onDelete: NoAction`; a template referenced by `EmailAttachment` can therefore fail deletion and is surfaced only as the generic save/delete error. Successful mutations revalidate `/config/sms-email`; client create/edit then reloads the full page, while delete removes the row from local state.

## 4. Email send workflow

Only rows whose type exactly equals `Email` expose the Send icon. Its modal supports either an “Other recipient email” or selection of up to 50 stored recipients. An operator chooses a group and types at least two characters; results load automatically as they type, with no Search click required. The supported groups are Customers, Contacts, Dealers, RTO Agents, Insurance Agents, and Loan Agents. The latter uses the current `PartnerMaster` `Bank` records, which are the Next.js canonical source for the legacy loan-bank-person contacts. Search results deliberately include only named records with a nonblank email.

The direct search server action requires the Email Templates route permission. Send submits only the selected group/id pairs, not browser-supplied addresses; `sendTemplateEmail` resolves those records again on the server, checks that their group is still correct, removes duplicate email addresses, and accepts a separately typed email only when it passes the shared email validator. It requires at least one resolved/typed email, and finds the template by id, rejects any non-Email template, and rejects an empty body. It passes the stored body verbatim as `html` and the subject (or `(no subject)`) to Nodemailer.

Delivery is one email per resolved address. The modal reports how many were sent and lists addresses that failed after a partial success. Each attempt is also recorded in `EmailDeliveryLog` with its template, recipient email, Sent/Retrying/Failed status, safe error message, attachment count, attempting user, and timestamp. Each template has a History action that displays its latest 50 attempts. Failed attempts enter the retry worker’s queue and are retried twice at five-minute intervals; a persistent failure becomes `Failed`.

Before sending, the operator can open **Preview Email**. It displays the subject, selected-recipient count, saved/one-send attachment names, and the stored HTML body in a sandboxed iframe. The preview does not send or persist anything.

## 5. Attachments

Each saved email template has an Attachments action. It accepts PDF, JPG, PNG, and DOCX files up to 10 MB each; those files are stored privately under `storage/email-attachments` and are included every time that template is sent. The Send modal also accepts up to 10 extra files for just that send. Upload and delete calls require Email Templates access; the send action only uses stored paths inside the private attachment root and verifies that files still exist. One-time upload records are removed after a successful send. Uploaded files are not publicly browsable.

`sendEmail` requires `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM_ADDRESS`. It uses `SMTP_PORT` (default 587), `SMTP_SECURE === 'true'`, optional `EMAIL_FROM_NAME` (default `Excel Cars`), and sends an optional CC from `STAFF_CC_EMAIL`. It returns the configuration error or Nodemailer’s error message to the UI. It sends one direct recipient at a time, includes saved and extra attachments, and has no queue/retry/timeout policy in this code.

## 6. Future WhatsApp direction

SMS is not supported in the active UI or server actions. Historic SMS rows remain preserved but hidden. WhatsApp is the intended future messaging channel; it is not shown as a template type yet because no approved WhatsApp Business provider/account, template-approval process, consent rules, or delivery integration is configured. Adding an option before those dependencies exist would create a non-functional workflow.

## 7. Errors and second-pass coverage result

Template action failures are returned as generic action-specific strings; email configuration and SMTP errors are returned verbatim from `sendMail`. The UI shows save errors in the template modal (or after a delete attempt) and send errors in the send modal. There is no global error boundary or structured logging in this feature.

A second review covered route authorization, direct action authorization, private attachment paths, Prisma relations, client-local filters, recipient search/re-resolution, all modal branches, and SMTP configuration. No additional SMS transport was found.
