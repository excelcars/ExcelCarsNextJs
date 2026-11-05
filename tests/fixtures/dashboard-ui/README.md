# CRM UI preview

`/followup` previews the real Follow-up filters, responsive queue, inline editor layout, and history list. Synthetic records include overdue entries, long names, and long remarks. The preview uses the shared follow-up validation rules and saves only to local React state; export and inquiry editing show mock feedback.

`/checklist` previews the real Checklist header, filters, vehicle list, document editor, and read-only document list. Search and pagination use synthetic data; document toggles, adding/removing documents, and removal confirmation run locally. Save, export, and checklist deletion show mock feedback.

`/inventory` exercises the real Inventory header, filters, vehicle cards/table, pagination, and view modal with synthetic data. Selection, search, fuel/status/budget filters, and pagination work locally. Email, exports, editing, media management, and deletion show mock feedback without writing to application data or contacting external services.

Run from the repository root:

```powershell
node node_modules/next/dist/bin/next dev tests/fixtures/dashboard-ui --port 3101 --hostname 127.0.0.1
```

Open `http://127.0.0.1:3101` to exercise the real dashboard components with synthetic data. `/responsive` embeds independent 360px, 768px and 1440px viewports for layout checks. No authentication or database connection is used. This is a separate Next.js test project, not a route in the main application.

`/messages` previews the real WhatsApp chat UI with synthetic conversations. Its local fixture API supports search, unread filtering, marking a chat read, and mock replies. Sending in this preview never contacts Meta. Check the contact list, incoming/outgoing bubbles, composer, mobile back navigation, and delivery drawer.

Verify each workspace opens on a single click; the active tab remains correct; search/sort controls never overlap tabs; source bars remain legible after returning to Lead Details; and region period buttons preserve the chart's plot height. Empty workspaces should remain usable without squeezing the dashboard.

`/insurance` previews the real policy cards/table, filters, pagination, and details with synthetic policies. Mobile view, edit, payment, and delete actions use preview feedback; no application data is changed.

`/agents` previews the real agent header, filters, cards/table, pagination, and form fields with synthetic data. Add, edit, and confirmed deletion update only the local preview state; no application data is changed.

`/feedback` previews the real feedback header, filters, response cards/table, pagination, contact/vehicle fields, survey choices, and details using synthetic responses. Search, sorting, page size, and local add/edit/delete work in preview; exports and invitations show mock feedback without contacting customers.
