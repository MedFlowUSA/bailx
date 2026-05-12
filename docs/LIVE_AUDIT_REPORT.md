# BailX Live Audit Report

Date: May 12, 2026

Live URL: https://bailx-1.vercel.app

Scope: live deployment readiness checklist plus route-level code splitting polish.
This report should be used while testing the deployed Vercel app against the
production Supabase project.

## Deployment Status

- Vercel SPA rewrite is present in `vercel.json`.
- Unknown routes are handled by the branded Not Found page.
- Route loading errors are handled by the route error boundary.
- Major route pages are lazy-loaded with a branded `Loading BailX...` fallback.
- Anonymous emergency intake remains public.
- RLS is expected to include migrations through `015_fix_bail_request_intake_rls.sql`.

## Routes to Test

| Route | Expected Result |
| --- | --- |
| `/` | Public landing page loads. |
| `/get-help-now` | Public intake form loads and submits anonymously. |
| `/auth/sign-up` | Public sign-up loads without admin role option. |
| `/auth/sign-in` | Public sign-in loads and handles invalid credentials. |
| `/auth/sign-out` | Clears session and returns to public state. |
| `/consumer/dashboard` | Anonymous users redirect to sign-in; consumers see own requests. |
| `/consumer/requests/:id` | Consumers see only owned request details; admins may view. |
| `/agency/onboarding` | Agency users can submit application and upload documents after application exists. |
| `/agency/dashboard` | Agency users see status, documents, leads, and offers summary. |
| `/agency/leads` | Approved linked agencies see matched leads. |
| `/admin/dashboard` | Admin users see operations dashboard. |
| `/admin/agencies` | Admin users can filter and review agencies. |
| `/admin/bail-requests` | Admin users can audit requests, offer counts, and provider selections. |
| `/admin/agency-documents` | Admin users can review pending agency document metadata. |
| `/attorneys` | Public attorney information page loads. |
| Unknown route | Branded Not Found page renders with Get Help Now and Go Home CTAs. |

## Auth Flows to Test

1. Sign up as a consumer and confirm redirect to `/consumer/dashboard`.
2. Sign up as an agency and confirm redirect to `/agency/onboarding`.
3. Sign up as an attorney and confirm redirect to `/attorneys`.
4. Confirm admin is not available in public sign-up.
5. Manually provision an admin in Supabase by setting `profiles.role = 'admin'`.
6. Sign in as admin and confirm redirect/access to `/admin/dashboard`.
7. Confirm anonymous users cannot access consumer, agency, or admin protected routes.
8. Confirm consumer users cannot access agency/admin routes.
9. Confirm agency users cannot access admin routes.

## Customer Portal Test

1. Sign in as a consumer.
2. Submit a request from `/get-help-now`.
3. Confirm the new `bail_requests.consumer_profile_id` matches the consumer profile.
4. Return to `/consumer/dashboard`.
5. Confirm only that consumer's requests appear.
6. Have an approved agency submit an offer.
7. Open `/consumer/requests/:id`.
8. Confirm offer comparison, next steps, provider questions, and compliance notice render.
9. Select a provider.
10. Confirm the `select_provider_offer` RPC marks selected offer, declines competing offers, and sets request status to `provider_selected`.
11. Confirm provider contact actions appear only after selection.

## Agency Portal Test

1. Sign in as an agency.
2. Open `/agency/onboarding`.
3. Submit an agency application.
4. Return to onboarding and confirm the existing application loads for document upload.
5. Upload a verification document after confirming the private `agency-documents` bucket exists.
6. Open `/agency/dashboard`.
7. Confirm agency status, document readiness counts, lead count, and offer summaries render.
8. As admin, approve the agency.
9. Return to `/agency/leads` as the agency.
10. Confirm matched leads appear for approved service counties.
11. Submit an offer.

## Admin Portal Test

1. Sign in as a manually provisioned admin.
2. Open `/admin/dashboard`.
3. Confirm metrics, recent requests, pending agencies, recent selections, and compliance checklist render.
4. Open `/admin/agencies`.
5. Filter by pending, approved, more info requested, and rejected.
6. Approve, reject, and request more info for test agencies.
7. Open `/admin/bail-requests`.
8. Confirm requester contact, jail details, bond, urgency, status, offer count, selected provider, and created date render.
9. Test all request filters.

## Document Upload Test

1. Confirm private Supabase Storage bucket `agency-documents` exists.
2. Confirm Storage object policies from migration `014` are active.
3. Sign in as an agency with a linked application.
4. Upload a bail license, business registration, insurance/bond document, or other file.
5. Confirm the file appears in Storage.
6. Confirm metadata appears in `agency_documents`.
7. Sign in as admin.
8. Open `/admin/agency-documents`.
9. Approve, reject, or request more information.
10. Confirm `agency_documents.review_status` and `admin_notes` update.

## Route Fallback and Error Tests

1. Visit `https://bailx-1.vercel.app/not-a-real-route`.
2. Confirm the branded Not Found page renders.
3. Refresh a deep route such as `/admin/dashboard`.
4. Confirm Vercel rewrites to `index.html` and React Router handles the route.
5. Confirm lazy route transitions show a calm loading state when chunks load slowly.

## Known Warnings

- Route-level lazy loading removed the Vite 500 kB chunk warning in the latest
  local production build. Keep an eye on this as new portal pages are added.
- Admin dashboard metrics currently read rows and count client-side. Replace with
  aggregate SQL/RPC metrics as production data grows.
- Admin request detail still reuses the consumer request detail route. A dedicated
  `/admin/bail-requests/:id` route would improve operations clarity.
- Attorney advertising management is intentionally placeholder-only.

## Production Blockers

No code-level production blocker is currently known.

Operational checks before heavier traffic:

1. Confirm Vercel production env vars:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. Confirm Supabase migrations are applied through `015_fix_bail_request_intake_rls.sql`.
3. Confirm private Storage bucket `agency-documents`.
4. Confirm at least one admin profile is manually provisioned.
5. Run live role-based smoke tests with real Supabase accounts.

## Next Recommended Build Pass

Build a dedicated admin request detail page:

- Route: `/admin/bail-requests/:id`
- Admin-specific request timeline and offer review
- Provider selection outcome audit
- Internal admin notes hook for future operations
