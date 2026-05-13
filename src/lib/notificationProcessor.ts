import type { NotificationEvent } from "../types";
import { createAdminNote } from "./adminNotes";
import {
  getRecentNotificationEvents,
  updateNotificationEventForAdmin,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationEventsResult,
  type NotificationStatus,
} from "./notificationEvents";
import { getDemoNotifications, shouldUseDemoData } from "./demoData";
import { isSupabaseConfigured, supabase } from "./supabase";

export type NotificationAdminFilters = {
  status?: NotificationStatus | "all";
  channel?: NotificationChannel | "all";
  eventType?: NotificationEventType | "all";
  limit?: number;
};

export type NotificationProcessorMutationResult =
  | {
      ok: true;
      event: NotificationEvent;
      mocked: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export type NotificationProcessorSummary = {
  processed: number;
  failed: number;
  skipped: number;
  handledEventIds: string[];
};

export type NotificationProcessorInvokeResult =
  | {
      ok: true;
      mocked: boolean;
      message: string;
      summary?: NotificationProcessorSummary;
    }
  | {
      ok: false;
      error: string;
    };

export async function getNotificationEventsForAdmin(
  filters: NotificationAdminFilters = {},
): Promise<NotificationEventsResult> {
  const limit = filters.limit || 100;

  if (shouldUseDemoData()) {
    return {
      ok: true,
      mocked: true,
      events: applyLocalFilters(getDemoNotifications(), filters).slice(0, limit),
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const result = await getRecentNotificationEvents(limit);

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      mocked: true,
      events: applyLocalFilters(result.events, filters).slice(0, limit),
    };
  }

  let query = supabase
    .from("notification_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.channel && filters.channel !== "all") {
    query = query.eq("channel", filters.channel);
  }

  if (filters.eventType && filters.eventType !== "all") {
    query = query.eq("event_type", filters.eventType);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message || "Unable to load notification events." };
  }

  return { ok: true, events: (data || []) as NotificationEvent[], mocked: false };
}

export async function retryNotificationEvent(
  eventId: string,
): Promise<NotificationProcessorMutationResult> {
  const current = await safeFindNotificationEvent(eventId);

  if (!current) {
    return { ok: false, error: "Notification event not found." };
  }

  const now = new Date().toISOString();
  const result = await updateNotificationEventForAdmin(eventId, {
    status: "pending",
    error_message: null,
    processed_at: null,
    skipped_reason: null,
    last_attempt_at: now,
    retry_count: (current.retry_count || 0) + 1,
  });

  if (!result.ok) {
    return result;
  }

  void createAdminNote({
    entityType: "system",
    noteType: "system_event",
    message: "Admin retried a notification event.",
    metadata: {
      notification_event_id: eventId,
      previous_status: current.status,
      new_status: "pending",
    },
  });

  return {
    ok: true,
    event: result.event,
    mocked: result.mocked,
    message: "Notification event returned to pending.",
  };
}

export async function markNotificationEventSkipped(
  eventId: string,
  reason: string,
): Promise<NotificationProcessorMutationResult> {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return { ok: false, error: "Add a reason before marking the event skipped." };
  }

  const current = await safeFindNotificationEvent(eventId);

  if (!current) {
    return { ok: false, error: "Notification event not found." };
  }

  const now = new Date().toISOString();
  const result = await updateNotificationEventForAdmin(eventId, {
    status: "skipped",
    error_message: null,
    processed_at: now,
    skipped_reason: trimmedReason,
    last_attempt_at: now,
  });

  if (!result.ok) {
    return result;
  }

  void createAdminNote({
    entityType: "system",
    noteType: "system_event",
    message: "Admin marked a notification event skipped.",
    metadata: {
      notification_event_id: eventId,
      previous_status: current.status,
      skipped_reason: trimmedReason,
    },
  });

  return {
    ok: true,
    event: result.event,
    mocked: result.mocked,
    message: "Notification event marked skipped.",
  };
}

export async function processPendingNotificationEvents(input?: {
  batchSize?: number;
  channel?: NotificationChannel | "all";
}): Promise<NotificationProcessorInvokeResult> {
  if (shouldUseDemoData()) {
    const events = applyLocalFilters(getDemoNotifications(), {
      status: "pending",
      channel: input?.channel || "all",
      limit: input?.batchSize || 10,
    }).slice(0, input?.batchSize || 10);

    return {
      ok: true,
      mocked: true,
      message: "Demo processor simulated locally. No SMS, email, or provider integration ran.",
      summary: {
        processed: 0,
        failed: 0,
        skipped: events.length,
        handledEventIds: events.map((event) => event.id),
      },
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      mocked: true,
      message:
        "Supabase is not configured in this environment, so the backend processor was not invoked.",
    };
  }

  const body: Record<string, unknown> = {
    batchSize: input?.batchSize || 10,
  };

  if (input?.channel && input.channel !== "all") {
    body.channel = input.channel;
  }

  const { data, error } = await supabase.functions.invoke("process-notification-events", {
    body,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "Unable to invoke the notification processor. Confirm the Edge Function is deployed.",
    };
  }

  const summary = normalizeProcessorSummary(data);

  return {
    ok: true,
    mocked: false,
    message: "Notification processor completed.",
    summary,
  };
}

function applyLocalFilters(
  events: NotificationEvent[],
  filters: NotificationAdminFilters,
): NotificationEvent[] {
  return events.filter((event) => {
    const statusMatches =
      !filters.status || filters.status === "all" || event.status === filters.status;
    const channelMatches =
      !filters.channel || filters.channel === "all" || event.channel === filters.channel;
    const typeMatches =
      !filters.eventType || filters.eventType === "all" || event.event_type === filters.eventType;

    return statusMatches && channelMatches && typeMatches;
  });
}

async function findNotificationEvent(eventId: string): Promise<NotificationEvent | null> {
  if (shouldUseDemoData()) {
    return getDemoNotifications().find((event) => event.id === eventId) || null;
  }

  if (!isSupabaseConfigured || !supabase) {
    const result = await getRecentNotificationEvents(500);
    return result.ok ? result.events.find((event) => event.id === eventId) || null : null;
  }

  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to load notification event.");
  }

  return (data as NotificationEvent | null) || null;
}

async function safeFindNotificationEvent(eventId: string): Promise<NotificationEvent | null> {
  try {
    return await findNotificationEvent(eventId);
  } catch {
    return null;
  }
}

function normalizeProcessorSummary(data: unknown): NotificationProcessorSummary | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const value = data as Partial<NotificationProcessorSummary>;

  return {
    processed: Number(value.processed || 0),
    failed: Number(value.failed || 0),
    skipped: Number(value.skipped || 0),
    handledEventIds: Array.isArray(value.handledEventIds) ? value.handledEventIds : [],
  };
}
