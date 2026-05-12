# BailX Master Build Plan

## Product Summary

BailX is a mobile-first emergency bail marketplace and legal access platform. The platform connects consumers and families with independently licensed bail bond agencies, attorney advertisers, and emergency legal service resources.

BailX is not a bail bond company, broker, lender, law firm, or legal representative. BailX is a technology marketplace and advertising platform that connects consumers with independently licensed providers.

Primary slogan:
Find Freedom Fast

Core positioning:
Emergency bail help, provider comparison, flexible collateral matching, and legal access resources in one trusted platform.

---

## Core MVP Goal

Build the first working marketplace loop:

1. Consumer submits emergency bail request
2. Request saves to Supabase
3. Admin can view bail requests
4. Bail agency submits onboarding application
5. Admin can approve/reject/request more info from agencies
6. Approved agencies can see eligible bail requests
7. Agencies can submit structured offers
8. Consumers can compare offers
9. Consumer can choose an agency and contact them

---

## Technology Stack

Frontend:
React + Vite + TypeScript

Backend:
Supabase

Database:
PostgreSQL

Auth:
Supabase Auth later, not in early MVP

Hosting:
Vercel

Future integrations:
Twilio for SMS
Stripe for subscriptions
Google Maps for location/jail autocomplete
Supabase Storage for documents

---

## Design Direction

Mobile-first
Premium emergency service feel
Trustworthy, calm, and fast
Dark navy background
White content cards
Electric blue primary CTAs
Subtle orange/red urgency accents
Clear compliance disclaimers
Large buttons
Simple forms
No clutter
No gimmicky bail bond look

---

## User Roles

### Consumer

Can:
- Submit emergency bail request
- View request status
- Compare agency offers
- Contact agency
- Leave review later

### Bail Agency

Can:
- Submit onboarding application
- Provide license and business information
- Set service counties
- Set languages
- Set collateral preferences
- View eligible bail requests after approval
- Submit offers
- Manage profile later

### Admin

Can:
- View bail requests
- View agency applications
- Approve agencies
- Reject agencies
- Request more info
- Moderate reviews later
- Manage attorney ads later
- Manage subscription status later

---

## Account And Auth Strategy

BailX will eventually use Supabase Auth with role-based access.

Account types:
- consumer
- agency
- admin
- attorney later

Do not require consumer signup before emergency intake. The emergency flow should allow a fast request first, then encourage phone/email verification or account creation after submission.

Agency accounts are required before accessing leads.

Admin accounts are required before accessing admin dashboards.

Attorney accounts will be added later for advertising management.

Future auth implementation:
- Add auth_user_id to profiles
- Add role to profiles
- Link agencies to owner_profile_id
- Link bail_requests to consumer_profile_id when available
- Replace all temporary anon RLS policies with authenticated role-based RLS

Do not implement auth yet unless asked. Finish the marketplace loop first:
agency offer submission -> consumer offer comparison -> provider selection.

---

## Core Routes

Public:
/
 /get-help-now
 /agency/onboarding
 /attorneys
 /about
 /compliance

Consumer:
 /consumer/dashboard
 /consumer/requests/:id

Agency:
 /agency/dashboard
 /agency/leads
 /agency/offers
 /agency/profile

Admin:
 /admin/dashboard
 /admin/bail-requests
 /admin/agencies
 /admin/reviews
 /admin/attorney-ads

---

## Core Database Tables

profiles
agencies
agency_documents
bail_requests
agency_offers
reviews
subscriptions
attorney_ads
admin_notes

Future tables:
states
counties
jails
agency_service_areas
agency_radius_coverage
request_activity_log
consumer_contacts
provider_messages
court_reminders
collateral_items

---

## Bail Request Fields

requester_name
requester_phone
requester_email
defendant_name
jail_location
jail_city
jail_county
jail_state
bond_amount
charges
urgency_level
preferred_language
collateral_available
notes
status

Default status:
submitted

Future statuses:
submitted
providers_notified
offers_received
provider_selected
closed
cancelled

---

## Agency Fields

business_name
contact_name
phone
email
license_number
service_counties
languages
collateral_accepted
verification_status
subscription_tier

Verification statuses:
pending
approved
rejected
more_info_requested

Subscription tiers:
free
professional
elite

---

## Agency Offer Fields

bail_request_id
agency_id
down_payment
estimated_release_time
financing_available
collateral_notes
message
status

Offer statuses:
submitted
viewed
selected
declined
expired

---

## Compliance Rules

Always include compliance disclaimers in consumer-facing flows.

Required language:
BailX is not a bail bond company, broker, lender, law firm, or legal representative. BailX is a technology marketplace and advertising platform that connects consumers with independently licensed providers.

BailX does not issue bail bonds, make underwriting decisions, provide legal advice, custody collateral, or guarantee release outcomes.

Agency verification means marketplace eligibility review only. BailX does not independently guarantee legal compliance, service quality, bond approval, or release timing.

Do not write copy that suggests BailX:
- Issues bonds
- Negotiates bonds
- Holds collateral
- Provides legal representation
- Guarantees release
- Guarantees lowest price
- Acts as a licensed bail agent

---

## Development Philosophy

Build in passes.
Keep each pass small and testable.
Always run npm run build.
Keep mock fallback behavior if Supabase env vars are missing.
Do not overbuild authentication until the marketplace workflow works.
Do not require consumer signup before emergency intake.
Require agency/admin accounts later, after the core marketplace loop works.
Do not add Stripe until subscription UI and agency value are clear.
Do not add Twilio until lead routing works.
Do not add Google Maps until county matching works.
Keep temporary RLS policies clearly marked as development-only.

---

## Current Build Priorities

Priority 1:
Consumer bail request insert to Supabase

Priority 2:
Admin bail request queue from Supabase

Priority 3:
Agency onboarding insert to Supabase

Priority 4:
Admin agency review and approval

Priority 5:
County/service-area matching

Priority 6:
Agency lead inbox

Priority 7:
Agency offer submission

Priority 8:
Consumer offer comparison

Priority 9:
Basic review flow

Priority 10:
Attorney ad placement placeholders

---

## Geolocation Strategy

Do not start with live GPS.

Phase 1:
Use jail location, city, county, state, and ZIP.

Current MVP matching:
Use jail_state and jail_county. Do not rely on live GPS or radius for primary routing yet.

Phase 2:
Create jail/county lookup table.

Phase 3:
Use ZIP code to infer county and state where possible.

Phase 4:
Add Google Maps autocomplete.
Add optional “Use my location.”

Phase 5:
Add optional "Use my location."

Phase 6:
Distance-based provider ranking and radius fallback.

Core MVP matching should be county-based.

ZIP code should be used first to infer county. Radius matching should be a secondary fallback when county or jail-specific matching is unavailable, not the primary MVP routing method.

---

## Matching Logic

A bail request should match agencies based on:

1. Agency verification_status = approved
2. Agency licensed state includes request jail_state
3. Agency service_counties includes request jail_county
4. Agency jail-specific service area matches request jail when available
5. ZIP/radius fallback if exact state/county/jail matching is unavailable
6. Agency language compatibility if available
7. Agency collateral preference if relevant
8. Subscription tier as ranking boost, not sole ranking factor

National coverage matching should eventually evaluate:
1. State
2. County
3. Jail
4. ZIP
5. Optional radius

Agency matching priority should eventually be:
1. Approved agency
2. Licensed state match
3. Exact county match
4. Jail-specific match
5. ZIP/radius fallback
6. Subscription/ranking boost
7. Response time and reviews

Ranking should eventually blend:
- Subscription tier
- Response time
- Reviews
- Conversion rate
- Service county match
- Collateral flexibility

Paid placement should not be the only ranking factor.

---

## Monetization

Agency subscriptions:
Free
Professional
Elite

Attorney ads:
Featured attorney listings
DUI attorney placement
Criminal defense attorney placement
Geo-based sponsorship

Future:
Lead fees
Featured placements
Court reminders
Emergency financing referrals
GPS monitoring referrals

---

## Near-Term Codex Behavior

When asked to complete a task:
1. Inspect existing files first
2. Reuse existing components and styles
3. Avoid duplicate mock data
4. Keep Supabase functions in src/lib
5. Keep shared types in src/types
6. Add migrations for database changes
7. Mark development RLS policies clearly
8. Run npm run build
9. Fix errors
10. Summarize files changed and remaining warnings
