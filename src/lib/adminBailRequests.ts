import type { BailRequest } from "../types";
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

const mockBailRequests: BailRequest[] = [
  {
    id: "mock-request-1",
    requester_name: "Jamie R.",
    requester_phone: "(555) 210-0192",
    requester_email: "jamie@example.com",
    defendant_name: "Taylor R.",
    jail_location: "Los Angeles County",
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
