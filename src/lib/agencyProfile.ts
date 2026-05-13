import type { Agency } from "../types";
import { getCurrentAgencyApplication } from "./agencies";
import { getDemoAgencyDetail, shouldUseDemoData } from "./demoData";
import { updateDemoAgencyProfile } from "./demoStore";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AgencyProfileUpdateInput = {
  agencyId: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  service_counties: string[];
  languages: string[];
  collateral_accepted: string[];
  subscription_tier: string;
};

export type AgencyProfileResult =
  | { ok: true; agency: Agency | null; mocked: boolean; message?: string }
  | { ok: false; error: string };

export type AgencyProfileMutationResult =
  | { ok: true; agency: Agency; mocked: boolean; message: string }
  | { ok: false; error: string };

export async function getCurrentAgencyProfile(): Promise<AgencyProfileResult> {
  return getCurrentAgencyApplication();
}

export async function updateAgencyProfile(
  input: AgencyProfileUpdateInput,
): Promise<AgencyProfileMutationResult> {
  if (shouldUseDemoData()) {
    const agency = getDemoAgencyDetail();

    if (!agency) {
      return { ok: false, error: "Demo agency profile not found." };
    }

    const updates: Partial<Agency> = {
      business_name: input.business_name,
      contact_name: input.contact_name,
      phone: input.phone,
      email: input.email,
      service_counties: input.service_counties,
      languages: input.languages,
      collateral_accepted: input.collateral_accepted,
      subscription_tier: input.subscription_tier,
      updated_at: new Date().toISOString(),
    };
    updateDemoAgencyProfile(updates);

    return {
      ok: true,
      agency: { ...agency, ...updates },
      mocked: true,
      message: "Demo agency profile updated locally.",
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const result = await getCurrentAgencyApplication();

    if (!result.ok || !result.agency) {
      return { ok: false, error: result.ok ? "Agency profile not found." : result.error };
    }

    Object.assign(result.agency, {
      business_name: input.business_name,
      contact_name: input.contact_name,
      phone: input.phone,
      email: input.email,
      service_counties: input.service_counties,
      languages: input.languages,
      collateral_accepted: input.collateral_accepted,
      subscription_tier: input.subscription_tier,
      updated_at: new Date().toISOString(),
    });

    return {
      ok: true,
      agency: result.agency,
      mocked: true,
      message: "Agency profile updated locally.",
    };
  }

  const { data, error } = await supabase.rpc("update_own_agency_profile", {
    p_agency_id: input.agencyId,
    p_business_name: input.business_name,
    p_contact_name: input.contact_name,
    p_phone: input.phone,
    p_email: input.email,
    p_service_counties: input.service_counties,
    p_languages: input.languages,
    p_collateral_accepted: input.collateral_accepted,
    p_subscription_tier: input.subscription_tier,
  });

  if (error) {
    return { ok: false, error: error.message || "Unable to update agency profile." };
  }

  return { ok: true, agency: data as Agency, mocked: false, message: "Agency profile updated." };
}
