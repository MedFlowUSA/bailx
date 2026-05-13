import type { AgencyOffer, BailRequest, NotificationEvent } from "../types";
import { getOffersForBailRequest } from "./agencyOffers";
import {
  getNotificationEventsForEntity,
  type NotificationEntityType,
} from "./notificationEvents";
import {
  getDemoAdminBailRequestDetail as getDemoAdminBailRequestById,
  getDemoAdminBailRequests,
  shouldUseDemoData,
} from "./demoData";
import { isSupabaseConfigured, supabase } from "./supabase";

export type BailRequestsResult =
  | {
      ok: true;
      bailRequests: BailRequest[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminBailRequestDetailResult =
  | {
      ok: true;
      bailRequest: BailRequest | null;
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminBailRequestOffersResult =
  | {
      ok: true;
      offers: AgencyOffer[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminNotificationEventsResult =
  | {
      ok: true;
      events: NotificationEvent[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const mockBailRequests: BailRequest[] = [
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

export async function getRecentBailRequests(): Promise<BailRequestsResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      bailRequests: getDemoAdminBailRequests(),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      bailRequests: mockBailRequests,
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("bail_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load bail requests.",
    };
  }

  return {
    ok: true,
    bailRequests: (data || []) as BailRequest[],
    mocked: false,
  };
}

export async function getAdminBailRequestDetail(
  id: string,
): Promise<AdminBailRequestDetailResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      bailRequest: getDemoAdminBailRequestById(id),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      bailRequest: mockBailRequests.find((request) => request.id === id) || null,
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("bail_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load bail request.",
    };
  }

  return {
    ok: true,
    bailRequest: data as BailRequest | null,
    mocked: false,
  };
}

export async function getAdminOffersForBailRequest(
  id: string,
): Promise<AdminBailRequestOffersResult> {
  const result = await getOffersForBailRequest(id);

  if (!result.ok) {
    return result;
  }

  return result;
}

export async function getAdminNotificationEventsForEntity(
  entityType: NotificationEntityType,
  entityId: string,
): Promise<AdminNotificationEventsResult> {
  const result = await getNotificationEventsForEntity(entityType, entityId);

  if (!result.ok) {
    return result;
  }

  return result;
}
