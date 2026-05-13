import type { BailRequest } from "../types";
import { getCurrentProfile } from "./auth";
import { isSupabaseConfigured, supabase } from "./supabase";

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
