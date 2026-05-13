import type { Agency } from "../types";
import { getCurrentProfile } from "./auth";
import { createNotificationEvent, type NotificationEventType } from "./notificationEvents";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AgencyVerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "more_info_requested";

export type CreateAgencyApplicationInput = {
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  license_number: string;
  service_counties: string[];
  languages: string[];
  collateral_accepted: string[];
  subscription_tier: string;
};

export type AgencyMutationResult =
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

export type PendingAgenciesResult =
  | {
      ok: true;
      agencies: Agency[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type CurrentAgencyResult =
  | {
      ok: true;
      agency: Agency | null;
      mocked: boolean;
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

export const mockAgencies: Agency[] = [
  {
    id: "mock-agency-1",
    business_name: "Metro Release Partners",
    contact_name: "Avery Collins",
    phone: "(555) 214-0198",
    email: "ops@metrorelease.example",
    license_number: "CA-BAIL-10293",
    service_counties: ["Los Angeles", "Riverside"],
    languages: ["English", "Spanish"],
    collateral_accepted: ["Cash", "Vehicle title"],
    verification_status: "pending",
    subscription_tier: "pro",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const statusMessages: Record<AgencyVerificationStatus, string> = {
  approved: "Agency approved.",
  more_info_requested: "More information requested.",
  pending: "Agency marked pending.",
  rejected: "Agency rejected.",
};

const statusNotificationEvents: Record<AgencyVerificationStatus, NotificationEventType> = {
  approved: "agency_approved",
  more_info_requested: "agency_more_info_requested",
  pending: "agency_application_submitted",
  rejected: "agency_rejected",
};

function compactList(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean);
}

export async function createAgencyApplication(
  input: CreateAgencyApplicationInput,
): Promise<AgencyMutationResult> {
  const profile = isSupabaseConfigured && supabase ? await getCurrentProfile() : null;
  const payload = {
    owner_profile_id: profile?.role === "agency" ? profile.id : null,
    business_name: input.business_name,
    contact_name: input.contact_name,
    phone: input.phone,
    email: input.email,
    license_number: input.license_number,
    service_counties: compactList(input.service_counties),
    languages: compactList(input.languages),
    collateral_accepted: compactList(input.collateral_accepted),
    subscription_tier: input.subscription_tier,
    verification_status: "pending",
  };

  if (!isSupabaseConfigured || !supabase) {
    const now = new Date().toISOString();
    const agency: Agency = {
      id: `mock-agency-${Date.now()}`,
      ...payload,
      verification_status: "pending",
      created_at: now,
      updated_at: now,
    };
    mockAgencies.unshift(agency);
    await createNotificationEvent({
      eventType: "agency_application_submitted",
      entityType: "agency",
      entityId: agency.id,
      recipientPhone: input.phone,
      recipientEmail: input.email,
      channel: "in_app",
      payload: {
        business_name: input.business_name,
        subscription_tier: input.subscription_tier,
      },
    });

    return {
      ok: true,
      id: agency.id,
      mocked: true,
      message: "Your agency application has been submitted for review.",
    };
  }

  const { data, error } = await supabase
    .from("agencies")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to submit agency application.",
    };
  }

  await createNotificationEvent({
    eventType: "agency_application_submitted",
    entityType: "agency",
    entityId: data.id as string,
    recipientProfileId: profile?.role === "agency" ? profile.id : null,
    recipientPhone: input.phone,
    recipientEmail: input.email,
    channel: "in_app",
    payload: {
      business_name: input.business_name,
      subscription_tier: input.subscription_tier,
    },
  });

  return {
    ok: true,
    id: data.id as string,
    mocked: false,
    message: "Your agency application has been submitted for review.",
  };
}

export async function getPendingAgencies(): Promise<PendingAgenciesResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      agencies: mockAgencies.filter((agency) => agency.verification_status === "pending"),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load pending agencies.",
    };
  }

  return {
    ok: true,
    agencies: (data || []) as Agency[],
    mocked: false,
  };
}

export async function getCurrentAgencyApplication(): Promise<CurrentAgencyResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      agency: mockAgencies[0] || null,
      mocked: true,
      message: "Showing mock agency profile until Supabase is configured.",
    };
  }

  const profile = await getCurrentProfile();

  if (profile?.role !== "agency") {
    return {
      ok: true,
      agency: null,
      mocked: false,
      message: "Sign in with an agency account to view provider status.",
    };
  }

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("owner_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load agency profile.",
    };
  }

  return {
    ok: true,
    agency: data as Agency | null,
    mocked: false,
  };
}

export async function updateAgencyVerificationStatus(
  agencyId: string,
  status: AgencyVerificationStatus,
  reviewNotes = "",
): Promise<AgencyMutationResult> {
  const trimmedNotes = reviewNotes.trim();

  if (!isSupabaseConfigured || !supabase) {
    const agency = mockAgencies.find((item) => item.id === agencyId);

    if (!agency) {
      return {
        ok: false,
        error: "Agency not found.",
      };
    }

    const previousStatus = agency.verification_status;
    agency.verification_status = status;
    agency.previous_verification_status = previousStatus;
    agency.reviewed_by_profile_id = "mock-admin-profile";
    agency.reviewed_at = new Date().toISOString();
    agency.review_notes = trimmedNotes || null;
    agency.updated_at = new Date().toISOString();
    await createNotificationEvent({
      eventType: statusNotificationEvents[status],
      entityType: "agency",
      entityId: agencyId,
      recipientProfileId: agency.owner_profile_id || null,
      recipientPhone: agency.phone,
      recipientEmail: agency.email,
      channel: "in_app",
      payload: {
        status,
        previous_verification_status: previousStatus,
        has_review_notes: Boolean(trimmedNotes),
      },
    });

    return {
      ok: true,
      id: agencyId,
      mocked: true,
      message: statusMessages[status],
    };
  }

  const profile = await getCurrentProfile();
  const { data: existingAgency, error: lookupError } = await supabase
    .from("agencies")
    .select("verification_status,owner_profile_id,phone,email")
    .eq("id", agencyId)
    .maybeSingle();

  if (lookupError) {
    return {
      ok: false,
      error: lookupError.message || "Unable to load current agency status.",
    };
  }

  const { error } = await supabase
    .from("agencies")
    .update({
      verification_status: status,
      previous_verification_status: existingAgency?.verification_status || null,
      reviewed_by_profile_id: profile?.id || null,
      reviewed_at: new Date().toISOString(),
      review_notes: trimmedNotes || null,
    })
    .eq("id", agencyId);

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to update agency status.",
    };
  }

  await createNotificationEvent({
    eventType: statusNotificationEvents[status],
    entityType: "agency",
    entityId: agencyId,
    recipientProfileId: existingAgency?.owner_profile_id || null,
    recipientPhone: existingAgency?.phone || null,
    recipientEmail: existingAgency?.email || null,
    channel: "in_app",
    payload: {
      status,
      previous_verification_status: existingAgency?.verification_status || null,
      has_review_notes: Boolean(trimmedNotes),
    },
  });

  return {
    ok: true,
    id: agencyId,
    mocked: false,
    message: statusMessages[status],
  };
}
