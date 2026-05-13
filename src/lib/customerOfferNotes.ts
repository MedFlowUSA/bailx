import type { CustomerOfferNote } from "../types";
import { getCurrentProfile } from "./auth";
import { getDemoOfferNotes, shouldUseDemoData } from "./demoData";
import { addDemoOfferNote } from "./demoStore";
import { isSupabaseConfigured, supabase } from "./supabase";

export type CustomerOfferNotesResult =
  | { ok: true; notes: CustomerOfferNote[]; mocked: boolean }
  | { ok: false; error: string };

export type CustomerOfferNoteMutationResult =
  | { ok: true; note: CustomerOfferNote; mocked: boolean; message: string }
  | { ok: false; error: string };

const mockOfferNotes: CustomerOfferNote[] = [];

export async function getCustomerOfferNotesForRequest(
  bailRequestId: string,
): Promise<CustomerOfferNotesResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      notes: getDemoOfferNotes(bailRequestId),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      notes: mockOfferNotes.filter((note) => note.bail_request_id === bailRequestId),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("customer_offer_notes")
    .select("*")
    .eq("bail_request_id", bailRequestId);

  if (error) {
    return { ok: false, error: error.message || "Unable to load private offer notes." };
  }

  return { ok: true, notes: (data || []) as CustomerOfferNote[], mocked: false };
}

export async function saveCustomerOfferNote(input: {
  offerId: string;
  bailRequestId: string;
  note: string;
}): Promise<CustomerOfferNoteMutationResult> {
  const now = new Date().toISOString();

  if (shouldUseDemoData()) {
    const note = addDemoOfferNote(input.offerId, input.note, input.bailRequestId);
    return { ok: true, note, mocked: true, message: "Demo private offer note saved locally." };
  }

  if (!isSupabaseConfigured || !supabase) {
    let offerNote = mockOfferNotes.find((note) => note.offer_id === input.offerId);

    if (!offerNote) {
      offerNote = {
        id: `mock-offer-note-${Date.now()}`,
        offer_id: input.offerId,
        bail_request_id: input.bailRequestId,
        profile_id: "mock-profile",
        note: input.note,
        created_at: now,
        updated_at: now,
      };
      mockOfferNotes.push(offerNote);
    } else {
      offerNote.note = input.note;
      offerNote.updated_at = now;
    }

    return { ok: true, note: offerNote, mocked: true, message: "Private offer note saved locally." };
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return { ok: false, error: "Sign in to save private offer notes." };
  }

  const { data, error } = await supabase
    .from("customer_offer_notes")
    .upsert(
      {
        offer_id: input.offerId,
        bail_request_id: input.bailRequestId,
        profile_id: profile.id,
        note: input.note,
        updated_at: now,
      },
      { onConflict: "offer_id,profile_id" },
    )
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message || "Unable to save private offer note." };
  }

  return { ok: true, note: data as CustomerOfferNote, mocked: false, message: "Private offer note saved." };
}
