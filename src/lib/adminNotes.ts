import type { AdminNote } from "../types";
import { getCurrentProfile } from "./auth";
import { getDemoAdminNotesForEntity, getDemoAdminDashboardData, shouldUseDemoData } from "./demoData";
import { addDemoAdminNote } from "./demoStore";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AdminNoteEntityType =
  | "agency"
  | "bail_request"
  | "agency_document"
  | "agency_offer"
  | "system";

export type AdminNoteType =
  | "admin_note"
  | "status_change"
  | "document_review"
  | "provider_selection"
  | "compliance_review"
  | "system_event";

export type CreateAdminNoteInput = {
  entityType: AdminNoteEntityType;
  entityId?: string | null;
  noteType?: AdminNoteType;
  message: string;
  metadata?: Record<string, unknown>;
};

export type AdminNoteMutationResult =
  | {
      ok: true;
      note: AdminNote;
      mocked: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminNotesResult =
  | {
      ok: true;
      notes: AdminNote[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const mockAdminNotes: AdminNote[] = [];

function buildMockNote(input: CreateAdminNoteInput): AdminNote {
  const now = new Date().toISOString();
  return {
    id: `mock-admin-note-${Date.now()}`,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    note_type: input.noteType || "admin_note",
    message: input.message,
    created_by_profile_id: "mock-admin-profile",
    metadata: input.metadata || {},
    related_table: input.entityType,
    related_id: input.entityId || null,
    note: input.message,
    created_by: "mock-admin-profile",
    created_at: now,
    updated_at: now,
  };
}

export async function createAdminNote(
  input: CreateAdminNoteInput,
): Promise<AdminNoteMutationResult> {
  const trimmedMessage = input.message.trim();

  if (!trimmedMessage) {
    return { ok: false, error: "Add a note before saving." };
  }

  if (shouldUseDemoData()) {
    const note = addDemoAdminNote(input.entityType, input.entityId, trimmedMessage);

    if (!note) {
      return { ok: false, error: "Add a note before saving." };
    }

    return { ok: true, note, mocked: true, message: "Demo admin activity captured locally." };
  }

  if (!isSupabaseConfigured || !supabase) {
    const note = buildMockNote({ ...input, message: trimmedMessage });
    mockAdminNotes.unshift(note);
    return { ok: true, note, mocked: true, message: "Admin activity captured locally." };
  }

  const profile = await getCurrentProfile();
  const payload = {
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    note_type: input.noteType || "admin_note",
    message: trimmedMessage,
    created_by_profile_id: profile?.id || null,
    metadata: input.metadata || {},
    related_table: input.entityType,
    related_id: input.entityId || null,
    note: trimmedMessage,
    created_by: profile?.id || null,
  };

  const { data, error } = await supabase
    .from("admin_notes")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to save admin activity.",
    };
  }

  return {
    ok: true,
    note: data as AdminNote,
    mocked: false,
    message: "Admin note saved.",
  };
}

export async function getAdminNotesForEntity(
  entityType: AdminNoteEntityType,
  entityId: string,
): Promise<AdminNotesResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      notes: getDemoAdminNotesForEntity(entityType, entityId),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      notes: mockAdminNotes.filter(
        (note) => note.entity_type === entityType && note.entity_id === entityId,
      ),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("admin_notes")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load admin activity.",
    };
  }

  return { ok: true, notes: (data || []) as AdminNote[], mocked: false };
}

export async function getRecentAdminNotes(limit = 8): Promise<AdminNotesResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      notes: getDemoAdminDashboardData().adminNotes.slice(0, limit),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, notes: mockAdminNotes.slice(0, limit), mocked: true };
  }

  const { data, error } = await supabase
    .from("admin_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load recent admin activity.",
    };
  }

  return { ok: true, notes: (data || []) as AdminNote[], mocked: false };
}
