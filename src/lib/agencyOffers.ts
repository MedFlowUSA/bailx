import type { AgencyOffer } from "../types";
import { updateMockConsumerRequestStatus } from "./consumerRequests";
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
  const payload = {
    bail_request_id: input.bail_request_id,
    agency_id: input.agency_id,
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

  const { error: statusError } = await supabase
    .from("bail_requests")
    .update({ status: "offers_received" })
    .eq("id", input.bail_request_id)
    .in("status", ["submitted", "providers_notified"]);

  if (statusError) {
    return {
      ok: false,
      error: statusError.message || "Offer submitted, but request status was not updated.",
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
  if (!isSupabaseConfigured || !supabase) {
    mockOffers.forEach((offer) => {
      if (offer.bail_request_id !== bailRequestId) {
        return;
      }

      offer.status = offer.id === offerId ? "selected" : "declined";
      offer.updated_at = new Date().toISOString();
    });

    return {
      ok: true,
      id: offerId,
      mocked: true,
      message: "Provider selected. Please confirm all terms directly with the licensed bail provider.",
    };
  }

  const { error: selectError } = await supabase
    .from("agency_offers")
    .update({ status: "selected" })
    .eq("id", offerId)
    .eq("bail_request_id", bailRequestId);

  if (selectError) {
    return {
      ok: false,
      error: selectError.message || "Unable to select provider.",
    };
  }

  const { error: declineError } = await supabase
    .from("agency_offers")
    .update({ status: "declined" })
    .eq("bail_request_id", bailRequestId)
    .neq("id", offerId);

  if (declineError) {
    return {
      ok: false,
      error: declineError.message || "Provider selected, but competing offers were not updated.",
    };
  }

  const { error: requestError } = await supabase
    .from("bail_requests")
    .update({ status: "provider_selected" })
    .eq("id", bailRequestId);

  if (requestError) {
    return {
      ok: false,
      error: requestError.message || "Provider selected, but request status was not updated.",
    };
  }

  return {
    ok: true,
    id: offerId,
    mocked: false,
    message: "Provider selected. Please confirm all terms directly with the licensed bail provider.",
  };
}
