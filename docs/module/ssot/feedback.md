# SSOT - Feedback Management

## Status: Next.js implemented

**Route:** `/config/feedback`  
**Public response route:** `/feedback/[token]`

## Scope and evidence

Feedback Management records staff-entered customer feedback and supports invitation-based customer responses. The current implementation is evidenced by:

- `app/(dashboard)/config/feedback/page.tsx`
- `src/features/feedback/FeedbackClient.tsx`, `actions.ts`, `queries.ts`, and `publicActions.ts`
- `app/feedback/[token]/page.tsx`
- `app/api/feedback/export/route.ts`
- `prisma/schema.prisma` and `prisma/add_feedback_invitations.sql`

## Access and navigation

The Configuration menu routes to `/config/feedback`. It accepts either `Customer_Feedback_Management` or the legacy-compatible `Feedback_Management` function grant. The page, list-detail actions, vehicle search, create, update, delete, invitation send, and export require that route authorization.

The customer response route is intentionally public: its one-time token is the authorization boundary.

## Data ownership

`CustomerFeedback` is the main record. It stores a customer reference when selected, an optional vehicle-variant reference, customer/vehicle snapshot fields, five answers, comments, creation/update audit data, and `submittedAt` for customer-originated responses.

`FeedbackInvitation` stores a SHA-256 token hash, recipient email, customer and inventory references, expiry, creator, submission time, and invalidation time. The raw token is only included in the invitation email; it is not persisted.

## Staff workflow

The staff page lists feedback with URL-driven search, sort, and pagination. Search matches customer name, mobile, email, or registration case-insensitively. Page sizes are 25, 50, and 100; default ordering is newest feedback id first.

Create and update require customer name, a ten-digit mobile number, valid email, five allowed answer values, valid optional dates, and a valid optional vehicle year. Staff may save legacy vehicle text and/or linked customer and variant IDs. A saved customer-feedback record is editable until it has `submittedAt`; customer-submitted records are read-only to staff.

Delete permanently removes the feedback row. Successful staff mutations revalidate `/config/feedback`.

## Invitation and public response workflow

A permitted operator can invite a customer only for an inventory purchase belonging to that customer and having an email address. Sending a new invitation invalidates the current unsubmitted invitation for the same customer/purchase. Invitations expire after seven days.

The email contains a single-use public link. A failed email send invalidates the newly created invitation. Public submission validates the token, expiry, and invalidation state, writes the response, marks the invitation submitted, and makes that feedback record read-only through the staff edit path.

## Export and constraints

The export API applies the same free-text search as the list and exports all matches. No score, automatic follow-up, delivery queue, or feedback analytics calculation is implemented.

## SSOT rule

Update this file whenever feedback fields, public-token policy, permissions, listing/export behavior, or edit/delete behavior changes.
