# Role Access Management - Improvement Gap Analysis

## Current improvement backlog

| Priority | Gap or risk | Required improvement |
| --- | --- | --- |
| P1 | User Access permission also grants Role Access administration. | Decide whether this compatibility fallback should remain. If not, migrate administrators to the dedicated function and remove the fallback from route authorization. |
| P1 | Audit storage uses CSV snapshots. | Normalize audit detail rows or store structured JSON if reporting, reliable diffing, or function-name renames become necessary. |
| P2 | The page manages only catalog functions; unknown legacy mappings remain outside its replacement set. | Inventory legacy functions and either add them to the catalog, deliberately retire them, or display them as read-only migration evidence. |
| P2 | Critical coverage prevents total Role/User Access lockout but does not protect other business-critical functions. | Define break-glass/admin policy, approval requirements, and recovery steps for permission changes. |
| P2 | No role hierarchy/rank is owned by this module. | Add explicit rank/capability delegation only if user-access administration must be delegated beyond the current numeric-ID rule. |
| P3 | No export/retention policy is documented for role-access audit data. | Define access, retention, export, and privacy requirements before exposing broader audit reporting. |

## Existing safeguards

- Direct actions require a current authorized actor.
- Function names are allow-listed from the access catalog.
- Permission replacements and their audit entry occur in one transaction.
- A role with assigned users cannot be deleted.
