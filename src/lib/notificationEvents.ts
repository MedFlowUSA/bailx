import type { NotificationEvent } from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";

export type NotificationEventType = NotificationEvent["event_type"];
export type NotificationEntityType = NotificationEvent["entity_type"];
export type NotificationChannel = NotificationEvent["channel"];
export type NotificationStatus = NotificationEvent["status"];

export type CreateNotificationEventInput = {
  eventType: NotificationEventType;
  entityType: NotificationEntityType;
  entityId: string;
  recipientProfileId?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  channel?: NotificationChannel;
  payload?: Record<string, unknown>;
};

export type NotificationEventMutationResult =
  | {
      ok: true;
      event: NotificationEvent;
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type NotificationEventsResult =
  | {
      ok: true;
      events: NotificationEvent[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const mockNotificationEvents: NotificationEvent[] = [];

function createMockEvent(input: CreateNotificationEventInput): NotificationEvent {
  return {
    id: `mock-notification-${Date.now()}`,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    recipient_profile_id: input.recipientProfileId || null,
    recipient_phone: input.recipientPhone || null,
    recipient_email: input.recipientEmail || null,
    channel: input.channel || "in_app",
    status: "pending",
    payload: input.payload || {},
    error_message: null,
    created_at: new Date().toISOString(),
    processed_at: null,
  };
}

export async function createNotificationEvent(
  input: CreateNotificationEventInput,
): Promise<NotificationEventMutationResult> {
  if (!isSupabaseConfigured || !supabase) {
    const event = createMockEvent(input);
    mockNotificationEvents.unshift(event);
    return { ok: true, event, mocked: true };
  }

  const { data, error } = await supabase
    .from("notification_events")
    .insert({
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      recipient_profile_id: input.recipientProfileId || null,
      recipient_phone: input.recipientPhone || null,
      recipient_email: input.recipientEmail || null,
      channel: input.channel || "in_app",
      status: "pending",
      payload: input.payload || {},
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message || "Unable to create notification event." };
  }

  return { ok: true, event: data as NotificationEvent, mocked: false };
}

export async function getRecentNotificationEvents(limit = 10): Promise<NotificationEventsResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, events: mockNotificationEvents.slice(0, limit), mocked: true };
  }

  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false, error: error.message || "Unable to load notification events." };
  }

  return { ok: true, events: (data || []) as NotificationEvent[], mocked: false };
}

export async function markNotificationEventProcessed(
  id: string,
): Promise<NotificationEventMutationResult> {
  return updateNotificationEventStatus(id, "processed", null);
}

export async function markNotificationEventFailed(
  id: string,
  errorMessage: string,
): Promise<NotificationEventMutationResult> {
  return updateNotificationEventStatus(id, "failed", errorMessage);
}

async function updateNotificationEventStatus(
  id: string,
  status: Extract<NotificationStatus, "processed" | "failed">,
  errorMessage: string | null,
): Promise<NotificationEventMutationResult> {
  if (!isSupabaseConfigured || !supabase) {
    const event = mockNotificationEvents.find((item) => item.id === id);

    if (!event) {
      return { ok: false, error: "Notification event not found." };
    }

    event.status = status;
    event.error_message = errorMessage;
    event.processed_at = new Date().toISOString();
    return { ok: true, event, mocked: true };
  }

  const { data, error } = await supabase
    .from("notification_events")
    .update({
      status,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message || "Unable to update notification event." };
  }

  return { ok: true, event: data as NotificationEvent, mocked: false };
}
