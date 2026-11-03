# WhatsApp received-message dashboard

## Chat interface

The `/messages` screen uses a WhatsApp-style layout: one chat per customer and business number, contact initials, latest incoming or outgoing preview, unread badges, All/Unread filters, and search across the contact's saved messages. Opening a chat shows incoming messages, CRM replies, and Meta template sends in one chronological timeline, marks the loaded chat as read, and keeps the reply composer at the bottom. Enter sends; Shift+Enter inserts a newline. On phones the contact list and active conversation are separate views with a back button. Media retains its type/caption and shows a preview-unavailable label. Template delivery diagnostics are available from the list icon in the chat header, rather than a dashboard table.

Conversation lists are paginated by contact (50 per page). History is paginated with stable timestamp/key cursors (50 entries per page), so grouping is not limited to the old message-list page. Contacts with outgoing templates but no replies appear too; a text reply window only opens after an actual inbound customer message.

## Sent templates

Apply `20261103180000_add_whatsapp_sent_messages` (and the earlier reply/status migrations), regenerate Prisma, and deploy before using the new send-history implementation. The shared Meta template sender reserves a `whatsapp_sent_messages` journal row before sending, storing the sending phone number ID, recipient, template name/language, request component parameters, dynamic URL-button suffix, and outcome. This captures future enquiry, no-inventory, global/custom template and feedback sends made through `src/lib/whatsapp/meta.ts`. If journal reservation fails, the send is blocked; if finalization fails after Meta accepted, the result remains accepted to avoid caller retries.

Existing vehicle inquiry, no-inventory and insurance-reminder attempt logs with Meta message IDs are included in history without resending them. Copies of the same send in the new journal and older logs are deduplicated by provider message ID. Older logs did not record the sending phone number ID, so those environment-local logs are associated with the environment's current `WHATSAPP_PHONE_NUMBER_ID`; only new journal records can reliably distinguish past sender-number changes.

Bubbles show saved template details and parameters, not invented approved text. Meta's static template wording and URL origin were not saved in older logs, so the URL suffix is shown as a parameter rather than a reconstructed link. Global/custom template bodies show the saved custom-message variable. Sends from other tools and earlier global sends with no stored log cannot be recovered by this feature. Delivery callbacks show Submitted/Sent/Delivered/Read/Failed with actual error details, separately from acceptance.

The inbox is available at `/messages` under Operations → WhatsApp Inbox. It shows incoming messages, sender names and phone numbers, message types, timestamps (IST), search, pagination, and a shared team read status. It refreshes every 15 seconds while visible. Media captions and IDs are saved; media downloads and previews are outside this implementation. Delivery-status notifications are acknowledged without creating inbox messages.

## Replying

After deploying the `20261103160000_add_whatsapp_inbox_replies` migration, select an incoming message and use the Reply box. Users with WhatsApp Inbox access can view and send replies. Configure `WHATSAPP_ACCESS_TOKEN` for the Meta app and actual WhatsApp business number, with the `whatsapp_business_messaging` permission and account access; the server's `WHATSAPP_PHONE_NUMBER_ID` must match the selected message's business number. Secrets remain server-side.

Text replies (up to 4096 characters) are permitted within 24 hours of the latest incoming message from that customer to that business number, using the original sender timestamp. After that, an approved template is required; this composer does not send templates. Replies quote the latest incoming message. History records the sending user ID, body, provider ID and acceptance/failure/uncertain status. Accepted means Meta accepted the request, not that delivery is confirmed. The conversation overlays stored delivery/read callback evidence onto outgoing replies and templates.

A client request UUID is reserved in the database before contacting Meta to prevent duplicate sends on request retries. Network errors and provider server errors have an uncertain outcome and are never automatically resent. A worker crash can leave a reply in Processing; check WhatsApp before sending a new reply. If the browser loses the response, retrying the same pending request uses its original UUID. No actual messages are sent by automated tests.

## Deployment

1. Apply the checked-in migration using the normal deployment process (`npx prisma migrate deploy`) and regenerate Prisma (`npx prisma generate`). The new table is `whatsapp_received_messages`.
2. In Role Access, grant **WhatsApp Inbox** (`WhatsApp_Inbox`) to the roles allowed to see all incoming customer messages. This is a team-wide inbox, without inquiry ownership filtering.
3. Set the following server environment variables in the deployment:
   - `WHATSAPP_PHONE_NUMBER_ID`: the Meta phone number ID already used for outbound templates.
   - `WHATSAPP_APP_SECRET`: the Meta app secret, used to verify delivery signatures. This is different from the WhatsApp access token.
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: a new random secret chosen for webhook setup.
4. Deploy to a publicly reachable HTTPS domain. In the Meta app's WhatsApp webhook configuration, set callback URL `https://YOUR_DOMAIN/api/webhooks/whatsapp` and enter the same verify token. Subscribe to the **messages** webhook field and ensure the app is subscribed to the intended WhatsApp Business Account.
5. Send a WhatsApp message from a customer/test number to the configured business number, then check `/messages`. Verify the sender and content and test Mark read. Resending the same Meta event must create only one inbox row.

Meta verifies the callback through GET `hub.mode`, `hub.verify_token`, and `hub.challenge`. POST requests are authenticated using HMAC-SHA256 over the exact raw body and the `X-Hub-Signature-256` header. See [Meta's webhook documentation](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/).

The receiver rejects bodies over 1 MiB. It only saves messages for the configured phone number ID and acknowledges after persistence. A database failure returns HTTP 500 so Meta can retry. Message IDs have a unique database constraint; retries and concurrent duplicate deliveries do not reset read status. No raw request payload or secret is logged.

## Diagnosing an empty inbox

Apply migration `20261103170000_add_whatsapp_delivery_statuses` before deploying delivery tracking. The inbox includes a Template delivery status panel for the latest 20 inquiry template attempts (vehicle match and no-inventory). It joins Meta status callbacks by provider message ID and shows failure codes and descriptions. Callbacks are stored separately so they can arrive before the sending action saves its response. Delivered/read evidence takes priority over delayed lower-status events. This panel does not resend templates. Historical callbacks acknowledged before this feature was deployed cannot be recovered from the local database.

An HTTP 200 acknowledgement can also mean that an event contained only delivery statuses, a different phone number ID, or duplicate messages. After a POST, Vercel runtime logs show `WhatsApp webhook processed` with counts for `incomingMessages`, `statusUpdates`, `skippedPhoneNumberMessages`, `savedMessages`, and `duplicateMessages`. The signed request's response includes the same counts. Customer content, phone numbers and secrets are excluded.

If `savedMessages` is positive but the inbox remains empty, confirm the webhook and inbox use the same deployment and database, then clear the inbox filters and refresh. If no new POST arrives when sending an actual message, check the Meta app's publishing status, messages subscription and WhatsApp Business Account subscription. A successful GET verification alone does not demonstrate POST message delivery.

## Validation

Run `node --test --experimental-strip-types src/lib/whatsapp/webhook.test.ts tests/whatsappWebhook.test.mjs`, `npm run typecheck`, and ESLint on the changed TypeScript files. Live delivery requires the deployed domain, environment configuration and Meta subscription above.
