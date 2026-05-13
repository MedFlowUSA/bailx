import type { BailRequest } from "../types";
import { getCurrentProfile } from "./auth";
import { getDemoConsumerRequestDetail, getDemoConsumerRequests, shouldUseDemoData } from "./demoData";
import { updateDemoRequest } from "./demoStore";
import { isSupabaseConfigured, supabase } from "./supabase";

export type UpdateCustomerBailRequestPacketInput = {
  jail_location: string;
  jail_city?: string;
  jail_county?: string;
  jail_state?: string;
  jail_zip?: string;
  bond_amount: number | null;
  charges?: string;
  preferred_language?: string;
  collateral_available: string[];
  notes?: string;
  has_crypto_collateral?: boolean;
  crypto_assets?: string[];
  estimated_crypto_value?: string;
  crypto_wallet_type?: string;
  willing_to_convert_to_stablecoin?: boolean;
  preferred_stablecoin?: string;
  crypto_collateral_notes?: string;
  crypto_collateral_acknowledged?: boolean;
};

export type BailRequestResult =
  | {
      ok: true;
      bailRequest: BailRequest | null;
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type RecentBailRequestsResult =
  | {
      ok: true;
      bailRequests: BailRequest[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type BailRequestMutationResult =
  | {
      ok: true;
      bailRequest: BailRequest;
      mocked: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export const mockConsumerRequests: BailRequest[] = [
  {
    id: "mock-request-1",
    requester_name: "Jamie R.",
    requester_phone: "(555) 210-0192",
    requester_email: "jamie@example.com",
    defendant_name: "Taylor R.",
    jail_location: "Los Angeles County Jail",
    jail_city: "Los Angeles",
    jail_county: "Los Angeles",
    jail_state: "CA",
    jail_zip: "90012",
    bond_amount: 25000,
    charges: "Pending",
    urgency_level: "urgent",
    preferred_language: "English",
    collateral_available: ["Cash", "Vehicle title"],
    has_crypto_collateral: true,
    crypto_assets: ["Bitcoin", "USDC"],
    estimated_crypto_value: "$10,000-$25,000",
    crypto_wallet_type: "Coinbase",
    willing_to_convert_to_stablecoin: true,
    preferred_stablecoin: "Agency preference",
    crypto_collateral_notes: "Requester says digital assets may be available for provider review.",
    crypto_collateral_acknowledged: true,
    crypto_collateral_acknowledged_at: new Date().toISOString(),
    notes: "Family is ready to speak with providers.",
    status: "submitted",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function updateMockConsumerRequestStatus(id: string, status: BailRequest["status"]) {
  const request = mockConsumerRequests.find((item) => item.id === id);

  if (request) {
    request.status = status;
    request.updated_at = new Date().toISOString();
  }
}

export async function getRecentConsumerBailRequests(): Promise<RecentBailRequestsResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      bailRequests: getDemoConsumerRequests(),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      bailRequests: mockConsumerRequests,
      mocked: true,
    };
  }

  const profile = await getCurrentProfile();

  // Anonymous users can submit emergency requests, but tracking a request
  // dashboard requires signing in as the linked consumer profile.
  if (profile?.role !== "consumer") {
    return {
      ok: true,
      bailRequests: [],
      mocked: false,
    };
  }

  const { data, error } = await supabase
    .from("bail_requests")
    .select("*")
    .eq("consumer_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load requests.",
    };
  }

  return {
    ok: true,
    bailRequests: (data || []) as BailRequest[],
    mocked: false,
  };
}

export async function getBailRequestById(id: string): Promise<BailRequestResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      bailRequest: getDemoConsumerRequestDetail(id).bailRequest,
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      bailRequest: mockConsumerRequests.find((request) => request.id === id) || null,
      mocked: true,
    };
  }

  const profile = await getCurrentProfile();

  if (!profile || !["consumer", "admin"].includes(profile.role)) {
    return {
      ok: true,
      bailRequest: null,
      mocked: false,
    };
  }

  let query = supabase
    .from("bail_requests")
    .select("*")
    .eq("id", id);

  if (profile.role === "consumer") {
    query = query.eq("consumer_profile_id", profile.id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load request.",
    };
  }

  return {
    ok: true,
    bailRequest: data as BailRequest | null,
    mocked: false,
  };
}

export async function updateCustomerBailRequestPacket(
  requestId: string,
  updates: UpdateCustomerBailRequestPacketInput,
): Promise<BailRequestMutationResult> {
  if (shouldUseDemoData()) {
    const request = getDemoConsumerRequestDetail(requestId).bailRequest;

    if (!request) {
      return { ok: false, error: "Request not found." };
    }

    const nextRequest: BailRequest = {
      ...request,
      ...updates,
      updated_at: new Date().toISOString(),
      crypto_assets: updates.has_crypto_collateral ? updates.crypto_assets || [] : null,
      estimated_crypto_value: updates.has_crypto_collateral
        ? updates.estimated_crypto_value || null
        : null,
      crypto_wallet_type: updates.has_crypto_collateral ? updates.crypto_wallet_type || null : null,
      preferred_stablecoin: updates.has_crypto_collateral ? updates.preferred_stablecoin || null : null,
      crypto_collateral_notes: updates.has_crypto_collateral
        ? updates.crypto_collateral_notes || null
        : null,
      crypto_collateral_acknowledged: updates.has_crypto_collateral
        ? Boolean(updates.crypto_collateral_acknowledged)
        : false,
      crypto_collateral_acknowledged_at:
        updates.has_crypto_collateral && updates.crypto_collateral_acknowledged
          ? request.crypto_collateral_acknowledged_at || new Date().toISOString()
          : null,
    };

    updateDemoRequest(requestId, nextRequest);

    return {
      ok: true,
      bailRequest: nextRequest,
      mocked: true,
      message: "Demo request packet updated locally.",
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const request = mockConsumerRequests.find((item) => item.id === requestId);

    if (!request) {
      return { ok: false, error: "Request not found." };
    }

    Object.assign(request, {
      ...updates,
      updated_at: new Date().toISOString(),
      crypto_assets: updates.has_crypto_collateral ? updates.crypto_assets || [] : null,
      estimated_crypto_value: updates.has_crypto_collateral
        ? updates.estimated_crypto_value || null
        : null,
      crypto_wallet_type: updates.has_crypto_collateral ? updates.crypto_wallet_type || null : null,
      preferred_stablecoin: updates.has_crypto_collateral ? updates.preferred_stablecoin || null : null,
      crypto_collateral_notes: updates.has_crypto_collateral
        ? updates.crypto_collateral_notes || null
        : null,
      crypto_collateral_acknowledged: updates.has_crypto_collateral
        ? Boolean(updates.crypto_collateral_acknowledged)
        : false,
      crypto_collateral_acknowledged_at:
        updates.has_crypto_collateral && updates.crypto_collateral_acknowledged
          ? request.crypto_collateral_acknowledged_at || new Date().toISOString()
          : null,
    });

    return {
      ok: true,
      bailRequest: request,
      mocked: true,
      message: "Request packet updated locally.",
    };
  }

  const { data, error } = await supabase.rpc("update_own_bail_request_packet", {
    p_request_id: requestId,
    p_jail_location: updates.jail_location,
    p_jail_city: updates.jail_city || "",
    p_jail_county: updates.jail_county || "",
    p_jail_state: updates.jail_state || "",
    p_jail_zip: updates.jail_zip || "",
    p_bond_amount: updates.bond_amount,
    p_charges: updates.charges || "",
    p_preferred_language: updates.preferred_language || "",
    p_collateral_available: updates.collateral_available,
    p_notes: updates.notes || "",
    p_has_crypto_collateral: Boolean(updates.has_crypto_collateral),
    p_crypto_assets: updates.crypto_assets || [],
    p_estimated_crypto_value: updates.estimated_crypto_value || "",
    p_crypto_wallet_type: updates.crypto_wallet_type || "",
    p_willing_to_convert_to_stablecoin: Boolean(updates.willing_to_convert_to_stablecoin),
    p_preferred_stablecoin: updates.preferred_stablecoin || "",
    p_crypto_collateral_notes: updates.crypto_collateral_notes || "",
    p_crypto_collateral_acknowledged: Boolean(updates.crypto_collateral_acknowledged),
  });

  if (error) {
    return { ok: false, error: error.message || "Unable to update request packet." };
  }

  return {
    ok: true,
    bailRequest: data as BailRequest,
    mocked: false,
    message: "Request packet updated.",
  };
}
