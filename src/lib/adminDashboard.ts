import type { Agency, AgencyOffer, BailRequest } from "../types";
import { mockAgencies } from "./agencies";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AdminDashboardSummary = {
  totalBailRequests: number;
  openRequests: number;
  offersSubmitted: number;
  providerSelections: number;
  pendingAgencies: number;
  approvedAgencies: number;
  reviewsPendingLater: number;
};

export type AdminSelectedOffer = AgencyOffer & {
  bail_requests?: {
    defendant_name?: string | null;
    requester_name?: string | null;
  } | null;
};

export type AdminDashboardSummaryResult =
  | {
      ok: true;
      summary: AdminDashboardSummary;
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminBailRequestsResult =
  | {
      ok: true;
      bailRequests: BailRequest[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminAgenciesResult =
  | {
      ok: true;
      agencies: Agency[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminMarketplaceMetricsResult =
  | {
      ok: true;
      selectedOffers: AdminSelectedOffer[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const openRequestStatuses = new Set(["submitted", "providers_notified", "offers_received"]);

const mockAdminRequests: BailRequest[] = [
  {
    id: "mock-admin-request-1",
    requester_name: "Jamie R.",
    requester_phone: "(555) 210-0192",
    requester_email: "jamie@example.com",
    defendant_name: "Taylor R.",
    jail_location: "Los Angeles County Jail",
    jail_city: "Los Angeles",
    jail_county: "Los Angeles",
    jail_state: "CA",
    bond_amount: 25000,
    charges: "Pending",
    urgency_level: "urgent",
    preferred_language: "English",
    collateral_available: ["Cash", "Vehicle title"],
    notes: "Family is ready to speak with providers.",
    status: "submitted",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function addMockAdminBailRequest(request: BailRequest) {
  mockAdminRequests.unshift(request);
}

const mockSelectedOffers: AdminSelectedOffer[] = [
  {
    id: "mock-selected-offer-1",
    agency_id: "mock-agency-1",
    bail_request_id: "mock-admin-request-1",
    down_payment: 2500,
    estimated_release_time: "2-4 hours after paperwork",
    financing_available: true,
    collateral_notes: "Vehicle title may be accepted.",
    message: "Available for immediate follow-up.",
    status: "selected",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    agencies: {
      business_name: "Metro Release Partners",
      phone: "(555) 214-0198",
      email: "ops@metrorelease.example",
    },
    bail_requests: {
      defendant_name: "Taylor R.",
      requester_name: "Jamie R.",
    },
  },
];

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummaryResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      mocked: true,
      summary: buildSummary(mockAdminRequests, mockAgencies, mockSelectedOffers.length),
    };
  }

  const [requestsResult, agenciesResult, offersResult] = await Promise.all([
    supabase.from("bail_requests").select("id,status").limit(1000),
    supabase.from("agencies").select("id,verification_status").limit(1000),
    supabase.from("agency_offers").select("id,status").limit(1000),
  ]);

  if (requestsResult.error) {
    return { ok: false, error: requestsResult.error.message || "Unable to load request metrics." };
  }

  if (agenciesResult.error) {
    return { ok: false, error: agenciesResult.error.message || "Unable to load agency metrics." };
  }

  if (offersResult.error) {
    return { ok: false, error: offersResult.error.message || "Unable to load offer metrics." };
  }

  return {
    ok: true,
    mocked: false,
    summary: buildSummary(
      (requestsResult.data || []) as BailRequest[],
      (agenciesResult.data || []) as Agency[],
      (offersResult.data || []).filter((offer) => offer.status === "selected").length,
      (offersResult.data || []).length,
    ),
  };
}

export async function getRecentAdminBailRequests(limit = 8): Promise<AdminBailRequestsResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, bailRequests: mockAdminRequests, mocked: true };
  }

  const { data, error } = await supabase
    .from("bail_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false, error: error.message || "Unable to load recent bail requests." };
  }

  return { ok: true, bailRequests: (data || []) as BailRequest[], mocked: false };
}

export async function getRecentAgencyApplications(limit = 50): Promise<AdminAgenciesResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, agencies: mockAgencies, mocked: true };
  }

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false, error: error.message || "Unable to load agency applications." };
  }

  return { ok: true, agencies: (data || []) as Agency[], mocked: false };
}

export async function getAdminMarketplaceMetrics(): Promise<AdminMarketplaceMetricsResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, selectedOffers: mockSelectedOffers, mocked: true };
  }

  const { data, error } = await supabase
    .from("agency_offers")
    .select("*, agencies(business_name, phone, email), bail_requests(defendant_name, requester_name)")
    .eq("status", "selected")
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    return { ok: false, error: error.message || "Unable to load marketplace selections." };
  }

  return { ok: true, selectedOffers: (data || []) as AdminSelectedOffer[], mocked: false };
}

function buildSummary(
  requests: BailRequest[],
  agencies: Agency[],
  providerSelections: number,
  offersSubmitted = providerSelections,
): AdminDashboardSummary {
  return {
    totalBailRequests: requests.length,
    openRequests: requests.filter((request) => openRequestStatuses.has(request.status)).length,
    offersSubmitted,
    providerSelections,
    pendingAgencies: agencies.filter((agency) => agency.verification_status === "pending").length,
    approvedAgencies: agencies.filter((agency) => agency.verification_status === "approved").length,
    reviewsPendingLater: 0,
  };
}
