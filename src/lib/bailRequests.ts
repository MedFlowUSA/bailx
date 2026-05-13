import type { Agency, BailRequest } from "../types";
import { addMockAdminBailRequest } from "./adminDashboard";
import { mockAgencies } from "./agencies";
import { getCurrentProfile } from "./auth";
import { mockConsumerRequests } from "./consumerRequests";
import { createNotificationEvent } from "./notificationEvents";
import { isSupabaseConfigured, supabase } from "./supabase";

export type CreateBailRequestInput = {
  requester_name: string;
  requester_phone: string;
  requester_email: string;
  defendant_name: string;
  jail_location: string;
  jail_city?: string;
  jail_county?: string;
  jail_state?: string;
  jail_zip?: string;
  bond_amount: number | null;
  charges?: string;
  urgency_level: string;
  preferred_language: string;
  collateral_available: string[];
  notes?: string;
  consent_marketplace_share: boolean;
  consent_no_legal_advice: boolean;
  consent_terms_privacy: boolean;
};

export type CreateBailRequestResult =
  | {
      ok: true;
      id: string;
      mocked: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

type MatchedAgency = Pick<
  Agency,
  "id" | "business_name" | "owner_profile_id" | "phone" | "email" | "service_counties"
>;

function getMatchedMockAgencies(county?: string) {
  const normalizedCounty = county?.trim();

  if (!normalizedCounty) {
    return [];
  }

  return mockAgencies.filter(
    (agency) =>
      agency.verification_status === "approved" &&
      agency.service_counties.some((agencyCounty) => agencyCounty === normalizedCounty),
  );
}

async function createAgencyMatchEvents(
  requestId: string,
  input: Pick<CreateBailRequestInput, "jail_county" | "urgency_level" | "preferred_language">,
  agencies: MatchedAgency[],
) {
  const results = await Promise.all(
    agencies.map((agency) =>
      createNotificationEvent({
        eventType: "agency_matched_to_request",
        entityType: "bail_request",
        entityId: requestId,
        recipientProfileId: agency.owner_profile_id || null,
        recipientPhone: agency.phone,
        recipientEmail: agency.email,
        channel: "in_app",
        payload: {
          agency_id: agency.id,
          business_name: agency.business_name,
          jail_county: input.jail_county || null,
          urgency_level: input.urgency_level,
          preferred_language: input.preferred_language,
          match_reason: `County match: ${input.jail_county || "Not listed"}`,
        },
      }),
    ),
  );

  return results.filter((result) => result.ok).length;
}

async function dispatchAgencyMatchNotifications(
  requestId: string,
) {
  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase.rpc("dispatch_agency_matches", {
    p_request_id: requestId,
  });

  if (error) {
    return 0;
  }

  const result = data as { matched_count?: number; inserted_count?: number } | null;
  return Number(result?.matched_count || result?.inserted_count || 0);
}

export async function createBailRequest(
  input: CreateBailRequestInput,
): Promise<CreateBailRequestResult> {
  if (
    !input.consent_marketplace_share ||
    !input.consent_no_legal_advice ||
    !input.consent_terms_privacy
  ) {
    return {
      ok: false,
      error: "Review and accept the required BailX marketplace disclosures before submitting.",
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const id = `mock-${Date.now()}`;
    const now = new Date().toISOString();
    const matchedAgencies = getMatchedMockAgencies(input.jail_county);
    const request: BailRequest = {
      id,
      requester_name: input.requester_name,
      requester_phone: input.requester_phone,
      requester_email: input.requester_email,
      defendant_name: input.defendant_name,
      jail_location: input.jail_location,
      jail_city: input.jail_city,
      jail_county: input.jail_county,
      jail_state: input.jail_state,
      jail_zip: input.jail_zip,
      bond_amount: input.bond_amount,
      charges: input.charges,
      urgency_level: input.urgency_level as BailRequest["urgency_level"],
      preferred_language: input.preferred_language,
      collateral_available: input.collateral_available,
      notes: input.notes,
      consent_marketplace_share: input.consent_marketplace_share,
      consent_no_legal_advice: input.consent_no_legal_advice,
      consent_terms_privacy: input.consent_terms_privacy,
      consented_at: now,
      status: matchedAgencies.length > 0 ? "providers_notified" : "submitted",
      created_at: now,
      updated_at: now,
    };

    mockConsumerRequests.unshift(request);
    addMockAdminBailRequest(request);

    await createNotificationEvent({
      eventType: "bail_request_submitted",
      entityType: "bail_request",
      entityId: id,
      recipientPhone: input.requester_phone,
      recipientEmail: input.requester_email,
      channel: "in_app",
      payload: {
        jail_county: input.jail_county || null,
        urgency_level: input.urgency_level,
      },
    });

    const notifiedCount = await createAgencyMatchEvents(id, input, matchedAgencies);

    return {
      ok: true,
      id,
      mocked: true,
      message:
        notifiedCount > 0
          ? "Request captured locally and matched providers were notified."
          : "Request captured locally. Configure Supabase to save real records.",
    };
  }

  const profile = await getCurrentProfile();
  const requestId = crypto.randomUUID();

  const { error } = await supabase
    .from("bail_requests")
    .insert({
      id: requestId,
      consumer_profile_id: profile?.role === "consumer" ? profile.id : null,
      requester_name: input.requester_name,
      requester_phone: input.requester_phone,
      requester_email: input.requester_email,
      defendant_name: input.defendant_name,
      jail_location: input.jail_location,
      jail_city: input.jail_city || null,
      jail_county: input.jail_county || null,
      jail_state: input.jail_state || null,
      jail_zip: input.jail_zip || null,
      bond_amount: input.bond_amount,
      charges: input.charges || null,
      urgency_level: input.urgency_level,
      preferred_language: input.preferred_language,
      collateral_available: input.collateral_available,
      notes: input.notes || null,
      consent_marketplace_share: input.consent_marketplace_share,
      consent_no_legal_advice: input.consent_no_legal_advice,
      consent_terms_privacy: input.consent_terms_privacy,
      consented_at: new Date().toISOString(),
      status: "submitted",
    });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to submit bail request.",
    };
  }

  await createNotificationEvent({
    eventType: "bail_request_submitted",
    entityType: "bail_request",
    entityId: requestId,
    recipientProfileId: profile?.role === "consumer" ? profile.id : null,
    recipientPhone: input.requester_phone,
    recipientEmail: input.requester_email,
    channel: "in_app",
    payload: {
      jail_county: input.jail_county || null,
      urgency_level: input.urgency_level,
    },
  });

  const notifiedCount = await dispatchAgencyMatchNotifications(requestId);

  return {
    ok: true,
    id: requestId,
    mocked: false,
    message:
      notifiedCount > 0
        ? "Emergency bail request submitted. Matched providers have been notified."
        : "Emergency bail request submitted.",
  };
}
