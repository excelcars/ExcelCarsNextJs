# SSOT — SMS / Email Send Message (Legacy)

## Status and evidence

**Module:** `Configuration/SMS_Email_Send_Message` (view `SMS_Email_Send_Msg`) in the legacy ASP.NET MVC application.  This is an implementation-backed description of the supplied code, including dormant code where it materially affects the supported UI.

Primary evidence:

- `ExcelCars/Controllers/ConfigurationController.cs` — `SMS_Email_Send_Message`, search, send, autocomplete, upload, and delete-file endpoints.
- `ExcelCars/Views/Configuration/SMS_Email_Send_Msg.cshtml` — one form, JavaScript validation, preview, search results, recipient selection, and AJAX uploads.
- `ApModel/Model/SMS_Email_Send_MSG/SMS_Email_Sent_MSG_Model.cs` — data queries, template persistence, attachment processing, and email delivery.
- `db/ExcelCars_merged.sql` — `Message_Template` and `Email_Attachment` structures.

## 1. Purpose and navigation

The Configuration menu opens `/Configuration/SMS_Email_Send_Message`.  The screen is a send-composer, not a standalone template-management list: an operator chooses SMS or Email, composes or recalls a template, identifies receivers, optionally selects many searched recipients, then sends.  Every send also creates or updates a template record.

There is no template listing, explicit template delete, paging, sorting, delivery history, delivery status, retry, or queued/bulk-job workflow.

## 2. Authorization and request boundary

- The page, receiver search, and send actions declare `AuthorizeFilter(DatabaseFunctionname = "Notification_Management")` and also require `Session["SessionInfo"]`; a missing session redirects to `Home/Logout`.
- The four JSON autocomplete actions and file endpoints shown in the controller have no local authorization attribute or session check. They nevertheless query or mutate application data and should be treated as an exposed legacy boundary, not as verified permission enforcement.
- Controller exceptions are logged through `Exceptioncatch.create`; search and send place a generic warning/error in `TempData`.

## 3. Form contract and client interactions

| Control | Legacy behavior |
| --- | --- |
| Message Type | Selects exactly `SMS` or `Email`. Email-only attachment/upload sections are hidden for SMS. |
| Subject | Required by client code for both types. It autocompletes saved subjects for the selected type; choosing one also replaces the body with the stored body after stripping HTML tags and `&nbsp;`. |
| Body | Required by client code. The form URI-encodes it for Search, Reset, and Send; Send additionally converts line breaks to `<br />`. |
| Preview Message | Opens a client modal rendering the entered body after wrapping it in `<pre>` and replacing newlines. It does not send or persist. |
| Attach Document | Email-only multi-file AJAX upload. Each uploaded file is immediately stored under `Fileupload/Email_Attachment`, added to an attachment table in the form, and is removable from that client table. |
| Insert Img Email Body | Email-only AJAX upload that appends a fixed-size `<img ...>` tag to the message body. |
| Receiver Type | `Customer`, `Dealer`, `RTO Agent`, `Insurance Agent`, `Loan Agent`, `Contact`, or `Other`. |
| Receiver Name / Mobile / Email | Optional search terms for known receiver types. Each has type-specific prefix autocomplete. For `Other`, name is optional, while mobile is required for SMS and email is required for Email. |
| Search / Reset | Search posts the entire composer and renders a recipient table. Reset posts back to the page action, producing a fresh view model. |
| Recipient table | Has select-all plus per-row checkbox, Name, one or two mobiles, and Email. Sending a known-type message requires a table with at least one selected recipient. |
| Send Msg | Performs client checks then posts the entire form to the send action. On controller success/failure the response is a blank fresh composer with a TempData message. |

The page has no HTML `required`, input length, email-format, phone-format, file-type, file-size, or recipient-count validation. All client checks are bypassable.

## 4. Receiver search and autocomplete rules

Autocomplete is a case/collation-dependent `StartsWith` query against the matching source. Search is a `Contains` query and each supplied name, mobile, and email term is ANDed. Results are ordered by name and projected with `Distinct()`; no page size is imposed.

| Receiver type | Source and returned fields |
| --- | --- |
| Customer | `Customers` where `Type == "Customer"`; name, `Cust_Mobile`, `Mobile_2`, email. |
| Contact | `Customers` where `Type == "Contact"`; same fields. |
| Dealer | `Dealer_Master`; name, primary/secondary mobile, email. |
| RTO Agent | `RTO_Agent`; name, primary mobile, email. |
| Insurance Agent | `Insurance_Main`; name, primary mobile, email. |
| Loan Agent | `Loan_Management`; bank-person name, mobile, email. |
| Other | No database search results; the direct supplied contact values are used. |

The server trusts the posted recipient rows when sending. It does not re-query the chosen IDs (the source primary-key assignments are commented out), so direct requests can substitute recipient name/email/mobile values.

## 5. Templates, attachments, and persistence

`Message_Template` owns `Type_id`, type, subject, body, and created/updated audit values. `Email_Attachment` has a nullable foreign key (`FK_Type_ID`), stored path, and message/subject text.

On **every send**, the model:

1. URI-decodes the body. For Email it wraps/normalizes it as HTML, including newline conversion.
2. Locates the first template with the same exact `(Message_Type, Message_Subject)` when the subject is nonblank. If found, it overwrites body, update timestamp, and updater; otherwise it creates one with both creation and update audit values. No database uniqueness constraint or duplicate race protection exists.
3. Removes all `Email_Attachment` rows for the resulting template id, then recreates attachment rows from posted `lstImagePath`. This happens for SMS too if a client posts image paths.
4. Uses current server time and the session user ID for audit fields.

The browser upload naming rule uses the current maximum attachment id plus a per-request `TempData["ImageCount"]` value and replaces spaces with underscores. Files are physically stored before a template exists. Removing an attachment in the page only removes the form row; it does not call `deleteDoc_Email`, so an orphaned file can remain. `deleteDoc_Email` deletes a named physical file but returns no result and is not called by this view.

For email body images, the implementation parses a brittle exact `<img src=... alt='image'>` shape, converts paths, assigns `cid:logoN` resources, and creates a linked alternate HTML view. It assumes JPEG media type for all embedded images. Regular attachments are read from `Email_Attachment` after template persistence and attached to each sent message.

## 6. Delivery behavior

### Email

For a known receiver type, each checked row with a nonempty email is sent individually using `Utility.PKSendMailWithImageEmbedded`. It reads sender address/name from `SystemDefault` values `InvitationEmailFromEmailId` and `InvitationEmailFromName`; the template subject and processed HTML body are used for every recipient. Each template attachment and embedded image is included.

For `Other`, one email is sent to `Receiver_Email`; `Receiver_Name` is used as display name. A blank/invalid email on a selected known row is silently skipped. There is no per-recipient result, partial-success record, delivery audit, or transaction around persistence and delivery: a later SMTP failure can leave the template/attachments saved while the controller reports a generic failure.

### SMS

The UI supports SMS templates, recipient search, validation, and the same template/attachment persistence path. However every actual HTTP/SMS-provider send block is commented out in `Send_SMS_Email`. Thus the reviewed legacy implementation sends **no SMS** for selected recipients or `Other`, while its controller still reports “Messages Sent Successfully.”

## 7. Failure modes and edge cases

- A non-empty selected recipient list is enforced only in JavaScript; server send does not enforce it.
- Subject/body are validated only in JavaScript. Direct requests can save nullable/empty values (the database allows nulls) and can select any message type/receiver type string.
- Search action catches errors and reports “record not found” only after a successful empty list; invalid URI encoding, null source fields, or other query errors produce the generic system message.
- Email address syntax, uploaded content, attachment path safety, file sizes, and HTML safety are not validated. Uploaded file names are sanitized only by `Path.GetFileName` at save time and replacing spaces.
- Selecting a template returns body text with HTML stripped, losing rich formatting when resent unless the operator restores it.
- Saving duplicate type/subject templates is prevented only by the application’s first-match lookup at send time; existing duplicates remain ambiguous.

## 8. Second-pass coverage result

The second code pass also covered the helper JSON endpoints, two independent upload widgets, template attachment replacement, `Other` recipient branch, rich-image conversion, and the commented SMS branches. No additional active send path, template listing, or hidden delivery log was found.

