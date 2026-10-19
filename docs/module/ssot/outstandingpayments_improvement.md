# Outstanding Payments — Historical Gap Analysis

## Status: Superseded by the current-state SSOT on 2026-09-21

The original comparison was written before the report gained separate server-side customer, mobile, registration, and type filters; URL-backed pagination; customer and registration autocomplete; server-generated CSV export with a grand total; aligned visible/export columns; and route-level report authorization.

Those implemented behaviors are now documented in [outstandingpayments.md](outstandingpayments.md), which is the sole current-state SSOT.

## Remaining intentional scope boundaries

- The report covers RTO, Insurance, and Loan only. Financial and DSA are outside the locked current scope.
- The report includes paid, zero-balance, and negative-balance rows; its payment-status filter supports the status vocabulary used by RTO, Insurance, and Loan.
- The accepted export format is CSV with a grand-total row.
- The page and report APIs enforce `Outstanding_Payments_Report`; the shared customer autocomplete route recognizes the same permission.
- Remarks, saved filters, snapshots, and additional report types are not in current scope.

These are current product boundaries, not unimplemented behavior. Any change requires a new approved requirement and a corresponding update to the main SSOT.
