# WhatsApp received-message dashboard

The inbox is available at `/messages` under Operations → WhatsApp Inbox. It shows incoming messages, sender names and phone numbers, message types, timestamps (IST), search, pagination, and a shared team read status. It refreshes every 15 seconds while visible. Media captions and IDs are saved; media downloads, previews and sending replies are outside this implementation. Delivery-status notifications are acknowledged without creating inbox messages.

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

## Validation

Run `node --test --experimental-strip-types src/lib/whatsapp/webhook.test.ts tests/whatsappWebhook.test.mjs`, `npm run typecheck`, and ESLint on the changed TypeScript files. Live delivery requires the deployed domain, environment configuration and Meta subscription above.
