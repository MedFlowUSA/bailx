# BailX MVP

BailX is an emergency bail marketplace and legal access platform. It connects
consumers with independently licensed bail bond providers, attorney advertisers,
and emergency legal service resources.

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and add `VITE_SUPABASE_URL` plus
   `VITE_SUPABASE_ANON_KEY` from Supabase Project Settings > API.
3. Open the Supabase SQL editor and run the files in `supabase/migrations` in
   numeric order.
4. Start the app with `npm run dev`.

Current RLS uses role and ownership policies from the final lockdown migrations.
Anonymous emergency intake remains public for insert-only request submission.

## Admin Provisioning Note

Admin accounts cannot be created through public sign-up. Create a normal user,
then manually set `profiles.role = 'admin'` in Supabase during development.
Production admin creation should move to a secure server-side provisioning flow.

## Consumer Privacy Note

Consumers must sign in to view their own request dashboard and offers. Anonymous
emergency intake remains public, but anonymous users cannot track submitted
requests from the consumer dashboard.

## Final RLS Lockdown Notes

- Anonymous users can submit emergency requests only. They cannot read request,
  offer, agency, or profile data.
- Consumers must sign in to view their own request dashboard and offers.
- Agencies must sign in, complete onboarding, and be approved before viewing
  matched leads or submitting offers.
- Admin accounts cannot be created through public sign-up. Create a normal user,
  then manually set `profiles.role = 'admin'` in Supabase during development.
- Temporary development fallbacks, including mock records and local-only agency
  lead fallback behavior, should not be used in production.
- Provider selection uses the secure `select_provider_offer` RPC transaction.

## Agency Document Storage Note

Agency verification files use the private Supabase Storage bucket
`agency-documents`. Migration `014_agency_document_upload.sql` attempts to
create the bucket and object policies, but Storage policy behavior should still
be verified in the Supabase dashboard after migration.

## Auth Test Checklist

1. Create a consumer account at `/auth/sign-up`.
   - Confirm `profiles` has `full_name`, `email`, `phone`, `role = consumer`,
     and `auth_user_id`.
   - Confirm redirect lands on `/consumer/dashboard`.
2. Create an agency account at `/auth/sign-up`.
   - Confirm `profiles.role = agency`.
   - Confirm redirect lands on `/agency/onboarding`.
   - Submit agency onboarding and confirm `agencies.owner_profile_id` links to
     the agency user's profile.
3. Provision an admin account.
   - Create a normal user, then set `profiles.role = 'admin'` in Supabase.
   - Confirm sign-in redirects to `/admin/dashboard`.
   - Confirm `/admin/bail-requests` and `/admin/agencies` load.
4. Create an attorney account at `/auth/sign-up`.
   - Confirm redirect lands on `/attorneys`.
5. Test anonymous emergency intake.
   - Sign out at `/auth/sign-out`.
   - Submit `/get-help-now`.
   - Confirm a `bail_requests` row is created with `consumer_profile_id` empty.
6. Test logged-in consumer emergency intake.
   - Sign in as the consumer.
   - Submit `/get-help-now`.
   - Confirm the `bail_requests.consumer_profile_id` matches the consumer
     profile.
7. Test agency onboarding and leads.
   - Sign in as the agency user.
   - Submit `/agency/onboarding`.
   - As admin, approve the linked agency application.
   - Return as the agency user and confirm `/agency/leads` loads eligible
     requests. If no linked approved agency exists, the app should show the
     no-linked-agency state; the first-approved-agency fallback is development
     only.
8. Test protected route behavior.
   - Signed-out users visiting `/agency/dashboard`, `/agency/onboarding`,
     `/agency/leads`, `/admin/dashboard`, `/admin/agencies`, or
     `/admin/bail-requests` should be sent to sign in.
   - Consumer or attorney users should see an unauthorized state on agency/admin
     routes.
   - Agency users should be blocked from admin routes.
   - Admin users should be blocked from agency routes.
9. Test failed auth states.
   - Try an invalid password at `/auth/sign-in` and confirm an error appears.
   - Try an already-used email at `/auth/sign-up` and confirm an error appears.
   - Remove or break a test user's profile and confirm sign-in reports a missing
     BailX profile.

## Agency Onboarding Test

1. Run `npm run dev`.
2. Visit `/agency/onboarding`.
3. Submit a test agency application.
4. Confirm the new row appears in the Supabase `agencies` table.
5. Visit `/admin/agencies`.
6. Use Approve, Reject, or Request More Info and confirm the row status changes
   in Supabase.

Agency onboarding and admin review use authenticated provider/admin policies.
Verify the latest migrations are applied before production traffic.

## Provider Selection Test

1. Submit a bail request at `/get-help-now`.
2. Submit an agency offer from `/agency/leads`.
3. Open the request detail page from `/consumer/dashboard` or `/admin/bail-requests`.
4. Select a provider offer.
5. Confirm the selected offer status changes to `selected` in Supabase.
6. Confirm other offers for that request change to `declined`.
7. Confirm the bail request status changes to `provider_selected`.

Provider selection uses the `select_provider_offer` RPC so offer selection,
competing offer decline, and request status update happen atomically.

## Provider Selection RPC Test

1. Sign in as a consumer.
2. Submit a request from `/get-help-now`.
3. Sign in as an approved linked agency and submit one or more offers from
   `/agency/leads`.
4. Sign back in as the consumer and open the request detail page.
5. Select one provider offer.
6. Confirm `select_provider_offer` updates in one transaction:
   - selected offer status is `selected`
   - other offers for the same request are `declined`
   - `bail_requests.status` is `provider_selected`
7. Sign in as a different consumer and confirm they cannot select that offer.

## Agency Document Upload Test

1. Create or verify a private Supabase Storage bucket named `agency-documents`.
2. Sign in as an agency.
3. Submit `/agency/onboarding`.
4. After the application is created, upload a bail license document.
5. Confirm the file appears in the private Supabase Storage bucket
   `agency-documents`.
6. Confirm metadata appears in `agency_documents`.
7. Sign in as an admin.
8. Open `/admin/agency-documents`.
9. Approve, reject, or request more information and confirm
   `agency_documents.review_status` updates.

## Customer Portal Test

1. Sign in as a consumer.
2. Submit a request from `/get-help-now`.
3. Have an approved agency submit an offer from `/agency/leads`.
4. Return to `/consumer/dashboard`.
5. Confirm the dashboard summary cards and offer count appear.
6. Open the request detail page.
7. Confirm request overview, defendant/jail info, bond info, timeline, agency
   offers, next steps, and provider questions render.
8. Select a provider and confirm the selected provider panel appears with contact
   actions.

## Agency Portal Test

1. Sign in as an agency.
2. Open `/agency/dashboard`.
3. Confirm agency status, document status, lead count, offers submitted, and CTAs
   render.
4. Complete onboarding and upload documents if the agency has no linked profile.
5. As admin, approve the agency.
6. Return to `/agency/leads`.
7. Confirm eligible lead cards show county match, jail, bond, requester context,
   collateral, notes, and offer submission guidance.
8. Submit an offer and confirm the lead card shows the submitted state.

## Admin Portal QA

1. Sign in as an admin.
2. Open `/admin/dashboard` and confirm request, offer, provider selection, agency,
   and review-placeholder metrics render.
3. Confirm recent bail requests, pending agencies, recent provider selections, and
   the admin compliance checklist render.
4. Open `/admin/agencies`, filter by pending, approved, more info requested, and
   rejected.
5. Review a pending agency, then approve it after manual license and document
   verification.
6. Open `/admin/bail-requests`, review a request card, and confirm requester,
   defendant, jail, bond, urgency, status, offer count, selected provider status,
   and created date render.
7. Test bail request filters for all, submitted, offers received, provider
   selected, and closed.

## Admin Agency Review Audit QA

1. Sign in as admin.
2. Approve an agency from `/admin/agencies`.
3. Confirm the success message stays visible.
4. Confirm the `agencies` table has `reviewed_at`,
   `reviewed_by_profile_id`, `previous_verification_status`, and
   `review_notes`.
5. Test Request More Info with notes.
6. Test Reject with notes.

## Admin Activity Log QA

1. Sign in as admin.
2. Add an admin note to an agency.
3. Change the agency status and confirm an automatic activity note appears.
4. Add an admin note to a bail request.
5. Review an agency document and confirm a document activity note is created.
6. Confirm recent activity appears on the admin dashboard.

## Notification Events QA

1. Submit a bail request and confirm a `bail_request_submitted` row appears in
   `notification_events`.
2. Submit an agency offer and confirm an `agency_offer_submitted` event.
3. Select a provider and confirm a `provider_selected` event.
4. Change agency status and confirm the matching agency status event:
   `agency_approved`, `agency_more_info_requested`, or `agency_rejected`.
5. Upload and review an agency document and confirm
   `agency_document_uploaded` and `agency_document_reviewed` events.
6. Open `/admin/notifications` and confirm events display with status, channel,
   recipient fields, and payload preview.
7. Confirm recent notification events appear on `/admin/dashboard`.

`agency_matched_to_request` is supported by the notification event schema but
should be emitted later by an explicit lead dispatch job to avoid duplicate
events from read-only agency lead queries.

## Status Timeline Test

1. Submit a request from `/get-help-now`.
2. Confirm the request timeline shows Request submitted.
3. Submit an offer from `/agency/leads`.
4. Confirm the request status changes to `offers_received`.
5. Select a provider from `/consumer/requests/:id`.
6. Confirm the request status changes to `provider_selected`.
7. Confirm the timeline updates on the consumer dashboard, request detail, admin
   bail requests page, and agency leads page.
