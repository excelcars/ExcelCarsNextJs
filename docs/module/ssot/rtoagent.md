# SSOT - RTO Agent
## Status: Current Next.js implementation documented; shared-master scope accepted for the current release

## 1. Purpose and scope

In the legacy system, an RTO agent was not a separate master module. Agent name, mobile, and email were stored on each RTO record. Adding or editing those details happened as part of RTO Management.

The RTO transaction scope is to manage RTO-agent details for RTO transactions. The current release also has a separate shared Partner Master for reusable Insurance Agent, RTO Agent, and DSA contacts; that shared administrative surface is documented here only where it supplies RTO partners.

## 2. Access rules

RTO Agent access follows the RTO Management permission:

- **Add agent details:** requires `RTO_Agent_Management` because the details are saved with an RTO record.
- **Edit agent details:** requires `RTO_Agent_Management`.
- **Remove agent details:** deleting an RTO record requires `RTO_Agent_Management`; this removes the details from that RTO record only.
- **Agent autocomplete:** has no separate agent authorization filter; legacy behavior was covered by the controller session-expiry filter.
- **Use in Notification Management:** requires `Notification_Management`.

There is no separate RTO Agent permission in the legacy business model.

## 3. Current Next.js implementation

The current repository also contains a newer shared Agent Configuration screen at `/config/agents`, implemented by:

- `app/(dashboard)/config/agents/page.tsx`
- `src/features/agents/AgentsClient.tsx`
- `src/features/agents/adminQueries.ts`
- `src/features/agents/adminActions.ts`

This screen is the approved shared master for the current release. It stores `PartnerMaster` records and exposes three types: `Insurance Agent`, `RTO Agent`, and `DSA`. It is not a replacement for the legacy RTO transaction snapshot model; it supplies reusable RTO partners to that model.

RTO transactions use the shared `PartnerPicker` with `partnerType="RTO Agent"`. The RTO transaction still retains legacy snapshot fields and a nullable `fkPartnerId` relationship.

## 4. Legacy RTO behavior

Legacy RTO behavior was verified in:

- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Admin\RTO_Agent_Management_View.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\RTO_Agent_Management\RTO_Agent_Management.cs`

The RTO form allowed the operator to type an agent name and mobile, optionally enter email, and use name-prefix autocomplete to fill contact details from prior RTO rows. A manually typed agent could be saved without an existing master record. The values were copied into the RTO row and appeared in RTO results, exports, dashboard widgets, and stock-tracking output.

## 5. Next.js RTO behavior and data ownership

The Next.js RTO implementation is in:

- `src/features/rto/RtoClient.tsx`
- `src/features/rto/actions.ts`
- `src/features/rto/queries.ts`

The Prisma model `RtoAgent` stores the RTO transaction and contains:

- `agentNameLegacy`
- `agentMobileNoLegacy`
- `agentEmailIdLegacy`
- nullable `fkPartnerId` to `PartnerMaster`

The RTO screen displays the linked partner when available and falls back to the transaction snapshot. Removing an RTO record must not be treated as deleting a global agent.

## 6. Scope separation

- Insurance uses `partnerType="Insurance Agent"`.
- DSA uses `partnerType="DSA"`.
- Loan uses `partnerType="Bank"`.
- RTO uses `partnerType="RTO Agent"`.

RTO agents must not be treated as Insurance agents or DSA contacts merely because they share the `PartnerMaster` table.

## 7. Current scope and remaining parity decisions

`/config/agents` remains a shared three-type Partner Master protected by the `Agent_Management` route permission. Its scope is intentionally broader than a legacy RTO-only screen. RTO transaction creation, editing, and deletion continue to use the RTO route permission; the shared master does not make a global partner deletion equivalent to deleting RTO transaction snapshots.

The following are not implemented parity guarantees and require a separately approved business rule before code changes:

- direct manual RTO snapshot entry without a selected `PartnerMaster`;
- importing or reconciling snapshot-only historical RTO contacts into the shared master;
- a dedicated RTO-agent notification-recipient workflow; and
- changing the shared Agent Master authorization from `Agent_Management` to `RTO_Agent_Management`.

## 8. SSOT rule

This file is the SSOT for RTO Agent behavior. Update it whenever RTO agent fields, autocomplete, transaction linking, RTO permissions, notification usage, historical snapshots, or the `/config/agents` scope changes.
