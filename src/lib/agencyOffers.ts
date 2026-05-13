import type { AgencyOffer } from "../types";
import { getCurrentProfile } from "./auth";
import { updateMockConsumerRequestStatus } from "./consumerRequests";
import {
  getDemoAgencyDetail,
  getDemoOffersForAgency,
  getDemoOffersForRequest,
  getOfferCounts,
  getSelectedOffers,
  shouldUseDemoData,
} from "./demoData";
import { addDemoOffer, updateDemoRequest } from "./demoStore";
import { createNotificationEvent } from "./notificationEvents";
import { isSupabaseConfigured, supabase } from "./supabase";

export type CreateAgencyOfferInput = {
  bail_request_id: string;
  agency_id: string;
  down_payment: number | null;
  estimated_release_time: string;
  financing_available: boolean;
  collateral_notes: string;
  message: string;
};

export type AgencyOfferResult =
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

export type AgencyOffersResult =
  | {
      ok: true;
      offers: AgencyOffer[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type OfferCountsResult =
  | {
      ok: true;
      counts: Record<string, number>;
    }
  | {
      ok: false;
      error: string;
    };

export type SelectedOffersResult =
  | {
      ok: true;
      selectedOffers: Record<string, AgencyOffer>;
    }
  | {
      ok: false;
      error: string;
    };

const mockOffers: AgencyOffer[] = [];

export async function createAgencyOffer(
  input: CreateAgencyOfferInput,
): Promise<AgencyOfferResult> {
  if (shouldUseDemoData()) {
    const agency = getDemoAgencyDetail();

    if (!agency || agency.verification_status !== "approved") {
      return {
        ok: false,
        error: "Demo agency profile is not approved or linked.",
      };
    }

    const now = new Date().toISOString();
    const offer: AgencyOffer = {
      id: `demo-offer-${Date.now()}`,
      agency_id: agency.id,
      bail_request_id: input.bail_request_id,
      down_payment: input.down_payment,
      estimated_release_time: input.estimated_release_time,
      financing_available: input.financing_available,
      collateral_notes: input.collateral_notes,
      message: input.message,
      status: "submitted",
      created_at: now,
      updated_at: now,
      agencies: {
        business_name: agency.business_name,
        phone: agency.phone,
        email: agency.email,
      },
    };
    addDemoOffer(offer);
    updateDemoRequest(input.bail_request_id, { status: "offers_received" });

    return {
      ok: true,
      id: offer.id,
      mocked: true,
      message: "Demo offer submitted locally. No provider or consumer notification was sent.",
    };
  }

  let agencyId = input.agency_id;

  if (isSupabaseConfigured && supabase) {
    const profile = await getCurrentProfile();

    if (profile?.role !== "agency") {
      return {
        ok: false,
        error: "Only linked agency accounts can submit offers.",
      };
    }

    const { data: linkedAgency, error: agencyError } = await supabase
      .from("agencies")
      .select("id")
      .eq("owner_profile_id", profile.id)
      // Offer submission is limited to approved marketplace agencies.
      // unclaimed_directory providers are never eligible to submit offers.
      .eq("verification_status", "approved")
      .limit(1)
      .maybeSingle();

    if (agencyError) {
      return {
        ok: false,
        error: agencyError.message || "Unable to verify linked agency.",
      };
    }

    if (!linkedAgency?.id) {
      return {
        ok: false,
        error:
          "Your agency profile is not approved or linked yet. Please complete onboarding or contact BailX support.",
      };
    }

    agencyId = String(linkedAgency.id);
  }

  const payload = {
    bail_request_id: input.bail_request_id,
    agency_id: agencyId,
    down_payment: input.down_payment,
    estimated_release_time: input.estimated_release_time,
    financing_available: input.financing_available,
    collateral_notes: input.collateral_notes,
    message: input.message,
    status: "submitted",
  };

  if (!isSupabaseConfigured || !supabase) {
    const now = new Date().toISOString();
    const offer: AgencyOffer = {
      id: `mock-offer-${Date.now()}`,
      ...payload,
      status: "submitted",
      created_at: now,
      updated_at: now,
    };
    mockOffers.unshift(offer);
    updateMockConsumerRequestStatus(input.bail_request_id, "offers_received");
    await createNotificationEvent({
      eventType: "agency_offer_submitted",
      entityType: "agency_offer",
      entityId: offer.id,
      channel: "in_app",
      payload: {
        agency_id: agencyId,
        bail_request_id: input.bail_request_id,
      },
    });

    return {
      ok: true,
      id: offer.id,
      mocked: true,
      message: "Offer captured locally. Configure Supabase to save real records.",
    };
  }

  const { data, error } = await supabase
    .from("agency_offers")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to submit offer.",
    };
  }

  await createNotificationEvent({
    eventType: "agency_offer_submitted",
    entityType: "agency_offer",
    entityId: data.id as string,
    channel: "in_app",
    payload: {
      agency_id: agencyId,
      bail_request_id: input.bail_request_id,
    },
  });

  const { error: statusError } = await supabase
    .from("bail_requests")
    .update({ status: "offers_received" })
    .eq("id", input.bail_request_id)
    .in("status", ["submitted", "providers_notified"]);

  if (statusError) {
    return {
      ok: true,
      id: data.id as string,
      mocked: false,
      message: "Offer submitted. Request status will update after consumer review.",
    };
  }

  return {
    ok: true,
    id: data.id as string,
    mocked: false,
    message: "Offer submitted.",
  };
}

export async function getOffersForBailRequest(
  bailRequestId: string,
): Promise<AgencyOffersResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      offers: getDemoOffersForRequest(bailRequestId),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      offers: mockOffers.filter((offer) => offer.bail_request_id === bailRequestId),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("agency_offers")
    .select("*, agencies(business_name, phone, email)")
    .eq("bail_request_id", bailRequestId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load offers.",
    };
  }

  return {
    ok: true,
    offers: (data || []) as AgencyOffer[],
    mocked: false,
  };
}

export async function getAgencyOffers(agencyId: string): Promise<AgencyOffersResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      offers: getDemoOffersForAgency(agencyId),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      offers: mockOffers.filter((offer) => offer.agency_id === agencyId),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("agency_offers")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load agency offers.",
    };
  }

  return {
    ok: true,
    offers: (data || []) as AgencyOffer[],
    mocked: false,
  };
}

export async function getOfferCountsForBailRequests(
  bailRequestIds: string[],
): Promise<OfferCountsResult> {
  if (bailRequestIds.length === 0) {
    return { ok: true, counts: {} };
  }

  if (shouldUseDemoData()) {
    return { ok: true, counts: getOfferCounts(bailRequestIds) };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      counts: mockOffers.reduce<Record<string, number>>((counts, offer) => {
        counts[offer.bail_request_id] = (counts[offer.bail_request_id] || 0) + 1;
        return counts;
      }, {}),
    };
  }

  const { data, error } = await supabase
    .from("agency_offers")
    .select("bail_request_id")
    .in("bail_request_id", bailRequestIds);

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load offer counts.",
    };
  }

  return {
    ok: true,
    counts: (data || []).reduce<Record<string, number>>((counts, offer) => {
      const requestId = String(offer.bail_request_id);
      counts[requestId] = (counts[requestId] || 0) + 1;
      return counts;
    }, {}),
  };
}

export async function getSelectedOffersForBailRequests(
  bailRequestIds: string[],
): Promise<SelectedOffersResult> {
  if (bailRequestIds.length === 0) {
    return { ok: true, selectedOffers: {} };
  }

  if (shouldUseDemoData()) {
    return { ok: true, selectedOffers: getSelectedOffers(bailRequestIds) };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      selectedOffers: mockOffers
        .filter(
          (offer) =>
            bailRequestIds.includes(offer.bail_request_id) && offer.status === "selected",
        )
        .reduce<Record<string, AgencyOffer>>((selectedOffers, offer) => {
          selectedOffers[offer.bail_request_id] = offer;
          return selectedOffers;
        }, {}),
    };
  }

  const { data, error } = await supabase
    .from("agency_offers")
    .select("*, agencies(business_name, phone, email)")
    .in("bail_request_id", bailRequestIds)
    .eq("status", "selected");

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load selected offers.",
    };
  }

  return {
    ok: true,
    selectedOffers: ((data || []) as AgencyOffer[]).reduce<Record<string, AgencyOffer>>(
      (selectedOffers, offer) => {
        selectedOffers[offer.bail_request_id] = offer;
        return selectedOffers;
      },
      {},
    ),
  };
}

export async function selectAgencyOffer(
  offerId: string,
  bailRequestId: string,
): Promise<AgencyOfferResult> {
  if (shouldUseDemoData()) {
    const offers = getDemoOffersForRequest(bailRequestId);

    offers.forEach((offer) => {
      addDemoOffer({
        ...offer,
        status: offer.id === offerId ? "selected" : "declined",
        updated_at: new Date().toISOString(),
      });
    });
    updateDemoRequest(bailRequestId, { status: "provider_selected" });

    return {
      ok: true,
      id: offerId,
      mocked: true,
      message:
        "Demo provider selected locally. Please confirm all terms directly in a real workflow.",
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    mockOffers.forEach((offer) => {
      if (offer.bail_request_id !== bailRequestId) {
        return;
      }

      offer.status = offer.id === offerId ? "selected" : "declined";
      offer.updated_at = new Date().toISOString();
    });
    await createNotificationEvent({
      eventType: "provider_selected",
      entityType: "agency_offer",
      entityId: offerId,
      channel: "in_app",
      payload: {
        bail_request_id: bailRequestId,
        offer_id: offerId,
      },
    });

    return {
      ok: true,
      id: offerId,
      mocked: true,
      message: "Provider selected. Please confirm all terms directly with the licensed bail provider.",
    };
  }

  const { data, error } = await supabase.rpc("select_provider_offer", {
    p_offer_id: offerId,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to select provider.",
    };
  }

  await createNotificationEvent({
    eventType: "provider_selected",
    entityType: "agency_offer",
    entityId: String((data as { offer_id?: string } | null)?.offer_id || offerId),
    channel: "in_app",
    payload: {
      bail_request_id: bailRequestId,
      offer_id: String((data as { offer_id?: string } | null)?.offer_id || offerId),
    },
  });

  return {
    ok: true,
    id: String((data as { offer_id?: string } | null)?.offer_id || offerId),
    mocked: false,
    message: "Provider selected. Please confirm all terms directly with the licensed bail provider.",
  };
}
