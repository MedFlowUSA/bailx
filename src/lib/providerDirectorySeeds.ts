import { abbaBailBondsSeed, type ProviderDirectorySeed } from "../data/providerSeeds/abbaBailBonds";
import type { Agency } from "../types";
import { createAdminNote } from "./adminNotes";
import { mockAgencies } from "./agencies";
import { getCurrentProfile } from "./auth";
import { isSupabaseConfigured, supabase } from "./supabase";

export type ProviderDirectorySeedResult =
  | {
      ok: true;
      seeds: ProviderDirectorySeed[];
    }
  | {
      ok: false;
      error: string;
    };

export type ProviderDirectoryImportResult =
  | {
      ok: true;
      agency: Agency;
      mocked: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export type ProviderSeedExistsResult =
  | {
      ok: true;
      exists: boolean;
      agency?: Agency | null;
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const providerSeeds = [abbaBailBondsSeed];

export function getProviderSeeds(): ProviderDirectorySeedResult {
  return { ok: true, seeds: providerSeeds };
}

export async function providerSeedExists(
  providerName: string,
  sourceUrl: string,
): Promise<ProviderSeedExistsResult> {
  const normalizedName = normalize(providerName);
  const normalizedSourceUrl = normalize(sourceUrl);

  if (!isSupabaseConfigured || !supabase) {
    const agency = mockAgencies.find(
      (item) =>
        normalize(item.business_name) === normalizedName &&
        normalize(item.source_url || "") === normalizedSourceUrl,
    );

    return { ok: true, exists: Boolean(agency), agency: agency || null, mocked: true };
  }

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .ilike("business_name", providerName)
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message || "Unable to check provider seed." };
  }

  return {
    ok: true,
    exists: Boolean(data),
    agency: (data as Agency | null) || null,
    mocked: false,
  };
}

export async function importProviderSeed(seedId: string): Promise<ProviderDirectoryImportResult> {
  const seed = providerSeeds.find((item) => item.id === seedId);

  if (!seed) {
    return { ok: false, error: "Provider seed not found." };
  }

  const profile = await getCurrentProfile();

  if (isSupabaseConfigured && profile?.role !== "admin") {
    return { ok: false, error: "Admin access is required to import provider seeds." };
  }

  const existsResult = await providerSeedExists(seed.providerName, seed.websiteUrl);

  if (!existsResult.ok) {
    return existsResult;
  }

  if (existsResult.exists && existsResult.agency) {
    return {
      ok: true,
      agency: existsResult.agency,
      mocked: existsResult.mocked,
      message: "Provider seed already exists in the directory.",
    };
  }

  const now = new Date().toISOString();
  const agencyPayload = {
    business_name: seed.providerName,
    contact_name: "",
    phone: seed.mainPhone,
    email: "",
    license_number: "",
    service_counties: seed.serviceCounties,
    languages: [],
    collateral_accepted: [],
    verification_status: "unclaimed_directory" as const,
    subscription_tier: "directory",
    claimed_by_profile_id: null,
    claimed_at: null,
    source_type: seed.sourceType,
    source_url: seed.websiteUrl,
    public_listing_disclaimer: seed.publicListingDisclaimer,
  };

  if (!isSupabaseConfigured || !supabase) {
    const agency: Agency = {
      id: `mock-provider-seed-${Date.now()}`,
      ...agencyPayload,
      created_at: now,
      updated_at: now,
    };
    mockAgencies.unshift(agency);

    return {
      ok: true,
      agency,
      mocked: true,
      message: "Provider seed imported locally as an unclaimed directory listing.",
    };
  }

  const { data, error } = await supabase
    .from("agencies")
    .insert(agencyPayload)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message || "Unable to import provider seed." };
  }

  const agency = data as Agency;

  void createAdminNote({
    entityType: "agency",
    entityId: agency.id,
    noteType: "system_event",
    message: "Imported unclaimed public provider directory seed.",
    metadata: {
      seed_id: seed.id,
      source_type: seed.sourceType,
      source_url: seed.websiteUrl,
    },
  });

  return {
    ok: true,
    agency,
    mocked: false,
    message: "Provider seed imported as an unclaimed directory listing.",
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
