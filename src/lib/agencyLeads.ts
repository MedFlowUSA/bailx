import type { Agency, BailRequest } from "../types";
import { getCurrentProfile } from "./auth";
import { isDevelopmentMode, isSupabaseConfigured, supabase } from "./supabase";

export type AgencyLead = BailRequest & {
  match_reason: string;
};

export type AgencyLeadsResult =
  | {
      ok: true;
      agency: Agency | null;
      leads: AgencyLead[];
      mocked: boolean;
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

const mockAgency: Agency = {
  id: "mock-approved-agency",
  business_name: "North County Bail Services",
  contact_name: "Dana Miller",
  phone: "(555) 210-4410",
  email: "leads@northcounty.example",
  license_number: "CA-BAIL-77821",
  service_counties: ["Los Angeles", "Orange"],
  languages: ["English", "Spanish"],
  collateral_accepted: ["Cash", "Vehicle title", "Property"],
  verification_status: "approved",
  subscription_tier: "professional",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockLeads: AgencyLead[] = [
  {
    id: "mock-lead-1",
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
    match_reason: "County match: Los Angeles",
  },
];

export async function getAgencyLeads(): Promise<AgencyLeadsResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      agency: mockAgency,
      leads: mockLeads,
      mocked: true,
      message: "Showing mock leads until Supabase is configured.",
    };
  }

  const profile = await getCurrentProfile();

  let agencyQuery = supabase
    .from("agencies")
    .select("*")
    // Only approved marketplace agencies may view matched lead details.
    // unclaimed_directory records are admin outreach only.
    .eq("verification_status", "approved")
    .order("created_at", { ascending: true });

  if (profile?.role === "agency") {
    agencyQuery = agencyQuery.eq("owner_profile_id", profile.id);
  }

  const { data: agency, error: agencyError } = await agencyQuery.limit(1).maybeSingle();

  if (agencyError) {
    return {
      ok: false,
      error: agencyError.message || "Unable to load approved agency.",
    };
  }

  if (!agency && profile?.role === "agency" && isDevelopmentMode) {
    // Explicit local-development fallback only. Production agency users must be
    // linked to their own approved agency before viewing leads.
    const { data: fallbackAgency, error: fallbackError } = await supabase
      .from("agencies")
      .select("*")
      .eq("verification_status", "approved")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      return {
        ok: false,
        error: fallbackError.message || "Unable to load development fallback agency.",
      };
    }

    if (fallbackAgency) {
      return getLeadsForAgency(fallbackAgency as Agency, true);
    }
  }

  if (!agency) {
    return {
      ok: true,
      agency: null,
      leads: [],
      mocked: false,
      message:
        profile?.role === "agency"
          ? "Your agency profile is not approved or linked yet. Please complete onboarding or contact BailX support."
          : "Approve an agency before the lead inbox can match requests.",
    };
  }

  return getLeadsForAgency(agency as Agency, false);
}

async function getLeadsForAgency(
  approvedAgency: Agency,
  usedDevelopmentFallback: boolean,
): Promise<AgencyLeadsResult> {
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase is not configured.",
    };
  }

  const counties = approvedAgency.service_counties || [];

  if (counties.length === 0) {
    return {
      ok: true,
      agency: approvedAgency,
      leads: [],
      mocked: false,
      message: "This approved agency has no service counties yet.",
    };
  }

  const { data: requests, error: requestsError } = await supabase
    .from("bail_requests")
    .select("*")
    .in("jail_county", counties)
    .in("status", ["submitted", "providers_notified"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (requestsError) {
    return {
      ok: false,
      error: requestsError.message || "Unable to load eligible bail requests.",
    };
  }

  return {
    ok: true,
    agency: approvedAgency,
    leads: ((requests || []) as BailRequest[]).map((request) => ({
      ...request,
      match_reason: `County match: ${request.jail_county || "Not listed"}`,
    })),
    mocked: false,
    message: usedDevelopmentFallback
      ? "Using first approved agency as a temporary development fallback."
      : undefined,
  };
}
