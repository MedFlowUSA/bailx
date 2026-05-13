import type { NotificationEvent } from "../types";
import { getDemoNotifications, shouldUseDemoData } from "./demoData";
import { updateDemoNotificationStatus } from "./demoStore";
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

export type NotificationEventAdminUpdate = Partial<
  Pick<
    NotificationEvent,
    | "status"
    | "error_message"
    | "processed_at"
    | "retry_count"
    | "last_attempt_at"
    | "skipped_reason"
  >
>;

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
    retry_count: 0,
    last_attempt_at: null,
    skipped_reason: null,
  };
}

export async function createNotificationEvent(
  input: CreateNotificationEventInput,
): Promise<NotificationEventMutationResult> {
  try {
    if (shouldUseDemoData()) {
      const event = createMockEvent(input);
      return { ok: true, event, mocked: true };
    }

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
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create notification event.",
    };
  }
}

export async function getRecentNotificationEvents(limit = 10): Promise<NotificationEventsResult> {
  if (shouldUseDemoData()) {
    return { ok: true, events: getDemoNotifications().slice(0, limit), mocked: true };
  }

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

export async function getNotificationEventsForEntity(
  entityType: NotificationEntityType,
  entityId: string,
  limit = 8,
): Promise<NotificationEventsResult> {
  if (shouldUseDemoData()) {
    return {
      ok: true,
      events: getDemoNotifications()
        .filter((event) => event.entity_type === entityType && event.entity_id === entityId)
        .slice(0, limit),
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      events: mockNotificationEvents
        .filter((event) => event.entity_type === entityType && event.entity_id === entityId)
        .slice(0, limit),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
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

export async function updateNotificationEventForAdmin(
  id: string,
  updates: NotificationEventAdminUpdate,
): Promise<NotificationEventMutationResult> {
  if (shouldUseDemoData()) {
    const current = getDemoNotifications().find((item) => item.id === id);

    if (!current) {
      return { ok: false, error: "Notification event not found." };
    }

    updateDemoNotificationStatus(id, updates.status || current.status, updates);

    return {
      ok: true,
      event: { ...current, ...updates },
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const event = mockNotificationEvents.find((item) => item.id === id);

    if (!event) {
      return { ok: false, error: "Notification event not found." };
    }

    Object.assign(event, updates);
    return { ok: true, event, mocked: true };
  }

  const { data, error } = await supabase
    .from("notification_events")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message || "Unable to update notification event." };
  }

  return { ok: true, event: data as NotificationEvent, mocked: false };
}

async function updateNotificationEventStatus(
  id: string,
  status: Extract<NotificationStatus, "processed" | "failed">,
  errorMessage: string | null,
): Promise<NotificationEventMutationResult> {
  if (shouldUseDemoData()) {
    const current = getDemoNotifications().find((item) => item.id === id);

    if (!current) {
      return { ok: false, error: "Notification event not found." };
    }

    updateDemoNotificationStatus(id, status, { error_message: errorMessage });
    return {
      ok: true,
      event: { ...current, status, error_message: errorMessage },
      mocked: true,
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const event = mockNotificationEvents.find((item) => item.id === id);

    if (!event) {
      return { ok: false, error: "Notification event not found." };
    }

    event.status = status;
    event.error_message = errorMessage;
    event.processed_at = new Date().toISOString();
    event.last_attempt_at = event.processed_at;
    return { ok: true, event, mocked: true };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notification_events")
    .update({
      status,
      error_message: errorMessage,
      processed_at: now,
      last_attempt_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message || "Unable to update notification event." };
  }

  return { ok: true, event: data as NotificationEvent, mocked: false };
}
