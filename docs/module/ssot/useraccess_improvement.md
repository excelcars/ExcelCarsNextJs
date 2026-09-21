# User Access Management - Improvement Gap Analysis

## Status: Current implementation documented in `useraccess.md`; remaining items require separate security or lifecycle approval

## Comparison basis

Compare `docs/module/existing_ssot/useraccess.md` with `docs/module/ssot/useraccess.md`.

| Priority | Current gap or decision | Required improvement |
| --- | --- | --- |
| P1 | Privilege hierarchy is still represented by numeric role IDs. | Replace numeric ordering with explicit role rank/capabilities if roles may be reordered or if delegated administration becomes more complex. |
| P1 | No password reset, forced rotation, lockout, MFA, or account-activation notification is provided by this module. | Define the identity/security workflow and implement it centrally, not as another plaintext credential generator. |
| P2 | Deactivation leaves employee and account records intact, and there is no reactivation-specific audit workflow. | Add lifecycle reason/history and a dedicated reactivation flow if HR/accountability needs it. |
| P2 | Listing search is broad but lacks export and audit-history UI for account changes. | Add these only after defining retention, privacy, and who may view account audit data. |
| P3 | Email/mobile uniqueness is not enforced by the documented action. | Decide whether shared contact details are permitted; add database constraints and a remediation plan if they are not. |

## Deliberate improvements over legacy

- Server-side validation and authorization protect direct action calls.
- Passwords are bcrypt-hashed; no generated username/password pair is exposed.
- Target-user hierarchy is enforced on edit and deactivate, not only in the role selector.
- Search supports real filters and pagination.
