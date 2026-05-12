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

Current RLS includes temporary development policies for anonymous emergency
intake and authenticated QA. Tighten policies before production.

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
3. Create an admin account at `/auth/sign-up`.
   - Confirm `profiles.role = admin`.
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

Agency onboarding and admin review currently use development-only anonymous RLS
policies. Replace them with authenticated provider/admin policies before
production.

## Provider Selection Test

1. Submit a bail request at `/get-help-now`.
2. Submit an agency offer from `/agency/leads`.
3. Open the request detail page from `/consumer/dashboard` or `/admin/bail-requests`.
4. Select a provider offer.
5. Confirm the selected offer status changes to `selected` in Supabase.
6. Confirm other offers for that request change to `declined`.
7. Confirm the bail request status changes to `provider_selected`.

Provider selection currently uses development-only anonymous update policies.
Replace them with authenticated consumer/admin policies before production.

## Status Timeline Test

1. Submit a request from `/get-help-now`.
2. Confirm the request timeline shows Request submitted.
3. Submit an offer from `/agency/leads`.
4. Confirm the request status changes to `offers_received`.
5. Select a provider from `/consumer/requests/:id`.
6. Confirm the request status changes to `provider_selected`.
7. Confirm the timeline updates on the consumer dashboard, request detail, admin
   bail requests page, and agency leads page.
