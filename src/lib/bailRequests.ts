import { getCurrentProfile } from "./auth";
import { isSupabaseConfigured, supabase } from "./supabase";

export type CreateBailRequestInput = {
  requester_name: string;
  requester_phone: string;
  requester_email: string;
  defendant_name: string;
  jail_location: string;
  jail_city?: string;
  jail_county?: string;
  jail_state?: string;
  jail_zip?: string;
  bond_amount: number | null;
  charges?: string;
  urgency_level: string;
  preferred_language: string;
  collateral_available: string[];
  notes?: string;
};

export type CreateBailRequestResult =
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

export async function createBailRequest(
  input: CreateBailRequestInput,
): Promise<CreateBailRequestResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      id: `mock-${Date.now()}`,
      mocked: true,
      message: "Request captured locally. Configure Supabase to save real records.",
    };
  }

  const profile = await getCurrentProfile();
  const requestId = crypto.randomUUID();

  const { error } = await supabase
    .from("bail_requests")
    .insert({
      id: requestId,
      consumer_profile_id: profile?.role === "consumer" ? profile.id : null,
      requester_name: input.requester_name,
      requester_phone: input.requester_phone,
      requester_email: input.requester_email,
      defendant_name: input.defendant_name,
      jail_location: input.jail_location,
      jail_city: input.jail_city || null,
      jail_county: input.jail_county || null,
      jail_state: input.jail_state || null,
      jail_zip: input.jail_zip || null,
      bond_amount: input.bond_amount,
      charges: input.charges || null,
      urgency_level: input.urgency_level,
      preferred_language: input.preferred_language,
      collateral_available: input.collateral_available,
      notes: input.notes || null,
      status: "submitted",
    });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to submit bail request.",
    };
  }

  return {
    ok: true,
    id: requestId,
    mocked: false,
    message: "Emergency bail request submitted.",
  };
}
