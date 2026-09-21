# Outstanding Payments — Historical Gap Analysis

## Status: Superseded by the current-state SSOT on 2026-09-21

The original comparison was written before the report gained separate server-side customer, mobile, registration, and type filters; URL-backed pagination; customer and registration autocomplete; server-generated CSV export with a grand total; aligned visible/export columns; and route-level report authorization.

Those implemented behaviors are now documented in [outstandingpayments.md](outstandingpayments.md), which is the sole current-state SSOT.

## Remaining intentional scope boundaries

- The report covers RTO, Insurance, and Loan only. Financial and DSA are outside the locked current scope.
- The report includes paid, zero-balance, and negative-balance rows; no payment-status filter is implemented.
- The accepted export format is CSV with a grand-total row.
- The page enforces `Outstanding_Payments_Report`. Its export and autocomplete APIs require authentication but do not independently repeat that route-permission check.
- Remarks, saved filters, snapshots, and additional report types are not in current scope.

These are current product boundaries, not unimplemented behavior. Any change requires a new approved requirement and a corresponding update to the main SSOT.
