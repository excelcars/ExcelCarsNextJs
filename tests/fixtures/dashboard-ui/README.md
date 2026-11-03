# Dashboard UI preview

Run from the repository root:

```powershell
node node_modules/next/dist/bin/next dev tests/fixtures/dashboard-ui --port 3101 --hostname 127.0.0.1
```

Open `http://127.0.0.1:3101` to exercise the real dashboard components with synthetic data. `/responsive` embeds independent 360px, 768px and 1440px viewports for layout checks. No authentication or database connection is used. This is a separate Next.js test project, not a route in the main application.

`/messages` previews the real WhatsApp chat UI with synthetic conversations. Its local fixture API supports search, unread filtering, marking a chat read, and mock replies. Sending in this preview never contacts Meta. Check the contact list, incoming/outgoing bubbles, composer, mobile back navigation, and delivery drawer.

Verify each workspace opens on a single click; the active tab remains correct; search/sort controls never overlap tabs; source bars remain legible after returning to Lead Details; and region period buttons preserve the chart's plot height. Empty workspaces should remain usable without squeezing the dashboard.
