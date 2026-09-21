# Feedback Management - Improvement Gap Analysis

## Status: Current implementation documented in `feedback.md`; remaining items are deferred product, support, and compliance decisions

## Comparison basis

Compare the legacy module in `docs/module/existing_ssot/feedback.md` with the current implementation in `docs/module/ssot/feedback.md`.

| Priority | Current gap or decision | Required improvement |
| --- | --- | --- |
| P1 | Customer feedback uses a public token link, but the current implementation has no resend history, rate limit, or explicit invalidation UI. | Add invitation audit/history, resend throttling, and an operator invalidation action if support operations require them. |
| P1 | The public feedback form depends on email delivery and a seven-day token. | Define email-delivery monitoring, bounce handling, and a recovery workflow for customers who cannot use the original link. |
| P2 | Feedback has no score, dashboard metric, trend analysis, or follow-up task creation. | Agree score rules and ownership before adding reporting or automatic follow-ups; do not infer a score from the five answer labels. |
| P2 | Staff deletion is a permanent delete. | Decide whether audit/compliance requirements need soft delete and a deletion reason. |
| P2 | Legacy search/export fields were exact, multi-field predicates; current search is one free-text query. | Add structured filters only if operations require precise filtering; preserve URL state and export parity. |
| P3 | Current data permits snapshot vehicle text without a linked inventory purchase. | If feedback must always relate to a sale, require inventory selection and derive the snapshot server-side. |

## Deliberate improvements over legacy

- Server actions validate required values, dates, answer options, mobile, email, and vehicle year.
- Authorization is enforced on current staff actions rather than relying on browser validation.
- Public responses use stored token hashes and expire; staff cannot later edit customer-submitted feedback.
- Listing has pagination, sortable fields, and export uses the same search boundary.
