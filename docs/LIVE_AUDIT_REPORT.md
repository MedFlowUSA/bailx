# BailX Live Deployment Audit Report

Date: May 12, 2026

Scope: static code audit plus production build verification for Vercel readiness.
This report does not replace live browser QA against the deployed Vercel URL and
production Supabase project.

## Executive Status

BailX is structurally ready for live MVP QA. The main routes are present, Vercel
SPA rewrites are configured, protected route guards are in place, and the core
Supabase flows are wired through role and ownership-aware helpers.

No code-level production blocker was found during this pass. Production launch
still depends on operational checks: latest migrations applied, Supabase env vars
configured in Vercel, private Storage bucket verified, and at least one admin
profile manually provisioned.

## Route-by-Route Status

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Pass | Public landing page with compliance positioning and CTAs. |
| `/get-help-now` | Pass | Public emergency intake route remains available to anonymous users. |
| `/auth/sign-up` | Pass | Consumer, agency, and attorney sign-up only. Admin self-selection is blocked. |
| `/auth/sign-in` | Pass | Handles failed sign-in and missing profile states. |
| `/auth/sign-out` | Pass | Signs out through Supabase and returns the user to public flow. |
| `/consumer/dashboard` | Pass | Protected for consumer role. Shows owned request dashboard and empty state. |
| `/consumer/requests/:id` | Pass | Protected for consumer/admin. Consumer helper scopes reads to own request. |
| `/agency/onboarding` | Pass | Protected for agency role. Existing agency application now loads for document upload. |
| `/agency/dashboard` | Pass | Protected for agency role. Shows status, document readiness, leads, offers. |
| `/agency/leads` | Pass | Protected for agency role. Approved linked agencies see matched county leads. |
| `/admin/dashboard` | Pass | Protected for admin role. Shows operational metrics and reminders. |
| `/admin/agencies` | Pass | Protected for admin role. Supports review filters and status actions. |
| `/admin/bail-requests` | Pass | Protected for admin role. Shows request audit cards, filters, offer counts. |
| `/admin/agency-documents` | Pass | Protected for admin role. Shows pending document metadata and review actions. |
| `/attorneys` | Pass | Public attorney route; no billing features added. |

## Protected Route Behavior

| Scenario | Status | Notes |
| --- | --- | --- |
| Anonymous to consumer dashboard | Pass | Redirects to `/auth/sign-in`. |
| Anonymous to agency dashboard/leads | Pass | Redirects to `/auth/sign-in`. |
| Anonymous to admin pages | Pass | Redirects to `/auth/sign-in`. |
| Consumer to agency/admin pages | Pass | Unauthorized state renders. |
| Agency to admin pages | Pass | Unauthorized state renders. |
| Admin to admin pages | Pass | Admin role is allowed. |

Small fix applied: unauthorized route CTA now sends the user to the correct
dashboard for their role instead of always pointing to `/consumer/dashboard`.

## Public Flow

Status: Pass

Anonymous users can submit emergency intake at `/get-help-now`. The insert helper
sets `consumer_profile_id` only when the current profile role is `consumer`; for
anonymous users it remains `null`. Compliance language is present in the global
footer, landing page, and portal flows.

## Consumer Flow

Status: Pass

Consumer sign-up and sign-in route to the consumer dashboard. Logged-in request
submission attaches `consumer_profile_id`. Consumer dashboard reads use
`consumer_profile_id = current profile id`. Request detail reads are restricted
to the signed-in consumer unless the user is admin. Provider selection uses the
`select_provider_offer` RPC transaction.

## Agency Flow

Status: Pass

Agency sign-up routes to onboarding. Onboarding creates a linked agency
application. Existing agency applications now load when returning to onboarding,
so document upload is available after the initial submission. Document upload uses
the private `agency-documents` bucket and metadata rows in `agency_documents`.
Approved linked agencies can view matched leads and submit offers.

## Admin Flow

Status: Pass

Admins cannot be created through public sign-up and must be manually provisioned.
Admin dashboard metrics load through admin-only reads. Admin users can review
agencies, bail requests, and pending document metadata. Agency review actions
support approve, reject, and request more info.

## UX Audit

| Area | Status | Notes |
| --- | --- | --- |
| Mobile layout | Pass | Responsive grids and stacked controls are present. Live device QA still recommended. |
| Empty states | Pass | Consumer, agency, admin, and document queues have empty states. |
| Loading states | Pass | Protected routes and data pages show loading states. |
| Error states | Pass | Auth, request, agency, document, and offer flows show errors. |
| Compliance notices | Pass | Present across public, consumer, agency, and admin surfaces. |
| CTA clarity | Pass | Main dashboard/detail/onboarding/admin CTAs are clear. |
| Provider contact privacy | Pass | Provider contact actions render only after offer selection. |
| Selected provider state | Pass | Selected provider panel and selected offer state are visible. |

## Production Risks

| Severity | Risk | Recommendation |
| --- | --- | --- |
| High | Supabase migrations may not all be applied in production. | Confirm migrations `001` through `014` are applied in order before live traffic. |
| High | Storage bucket/policies may differ by Supabase project settings. | Verify private bucket `agency-documents` and Storage object policies in dashboard. |
| High | No admin can access admin pages until manually provisioned. | Create a normal user, then set `profiles.role = 'admin'` in Supabase. |
| Medium | Mock fallbacks appear if Vercel env vars are missing. | Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured in Vercel production. |
| Medium | Agency lead fallback exists in code for local development. | It is gated behind `import.meta.env.DEV`; confirm production build is used. |
| Medium | Admin dashboard helper reads up to 1000 rows for metrics. | Acceptable for MVP; replace with SQL aggregate/RPC metrics as data grows. |
| Medium | Consumer request detail route is reused for admin viewing. | Works with admin role, but a dedicated `/admin/bail-requests/:id` route would be clearer later. |
| Low | No branded catch-all 404 route. | Add a Not Found route in a polish pass. |
| Low | Vite reports a chunk just over 500 kB. | Add route-level code splitting after MVP QA. |
| Low | Consumer intake document upload is not part of the current MVP. | Placeholder control was removed; add a real upload flow only if needed later. |

## Issues Found and Fixed

| Severity | Issue | Fix |
| --- | --- | --- |
| Low | Unauthorized CTA always linked to consumer dashboard. | Updated `ProtectedRoute` to route users to their own role dashboard. |
| Low | README still referenced temporary RLS language after lockdown. | Updated README to reflect final role/ownership RLS posture. |

## Production Blockers

No code blocker found.

Operational blockers before production traffic:

1. Configure Vercel production env vars:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. Apply Supabase migrations through `014_agency_document_upload.sql`.
3. Verify private Storage bucket `agency-documents`.
4. Manually provision an admin profile.
5. Run live role-based smoke tests with real Supabase accounts.

## Recommended Next Build Priorities

1. Live browser QA against deployed Vercel URL using consumer, agency, and admin accounts.
2. Add a small branded Not Found route and route-level error boundary.
3. Add route-level code splitting to reduce the production bundle warning.
4. Replace admin dashboard row-scan metrics with aggregate SQL/RPC metrics.
5. Add a dedicated admin request detail route for clearer operations workflow.
