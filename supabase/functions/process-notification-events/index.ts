import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotificationEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  recipient_profile_id: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  channel: "sms" | "email" | "in_app";
  status: "pending" | "processed" | "failed" | "skipped";
  payload: Record<string, unknown> | null;
  retry_count: number | null;
};

type SendResult =
  | { status: "processed" }
  | { status: "failed"; errorMessage: string }
  | { status: "skipped"; skippedReason: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(
      { error: "Notification processor is missing required server environment." },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return jsonResponse({ error: "Admin authentication is required." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Invalid admin session." }, 401);
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return jsonResponse({ error: "Admin access is required." }, 403);
  }

  const requestBody = await readRequestBody(req);
  const batchSize = normalizeBatchSize(requestBody.batchSize);
  const channel = normalizeChannel(requestBody.channel);

  let query = serviceClient
    .from("notification_events")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data: events, error: loadError } = await query;

  if (loadError) {
    return jsonResponse({ error: loadError.message }, 500);
  }

  const summary = {
    processed: 0,
    failed: 0,
    skipped: 0,
    handledEventIds: [] as string[],
  };

  for (const event of (events || []) as NotificationEvent[]) {
    const sendResult = sendSimulatedNotification(event);
    const now = new Date().toISOString();
    const retryCount = (event.retry_count || 0) + 1;
    const updatePayload = buildUpdatePayload(sendResult, now, retryCount);

    const { data: updatedRows, error: updateError } = await serviceClient
      .from("notification_events")
      .update(updatePayload)
      .eq("id", event.id)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      summary.failed += 1;
      summary.handledEventIds.push(event.id);
      continue;
    }

    if (!updatedRows || updatedRows.length === 0) {
      continue;
    }

    summary.handledEventIds.push(event.id);

    if (sendResult.status === "processed") {
      summary.processed += 1;
    } else if (sendResult.status === "failed") {
      summary.failed += 1;
    } else {
      summary.skipped += 1;
    }
  }

  return jsonResponse(summary, 200);
});

function sendSimulatedNotification(event: NotificationEvent): SendResult {
  if (event.payload?.test_force_fail === true) {
    return {
      status: "failed",
      errorMessage: "Simulated provider failure requested by test_force_fail.",
    };
  }

  if (event.channel === "sms") {
    return event.recipient_phone
      ? { status: "processed" }
      : { status: "skipped", skippedReason: "SMS event is missing recipient_phone." };
  }

  if (event.channel === "email") {
    return event.recipient_email
      ? { status: "processed" }
      : { status: "skipped", skippedReason: "Email event is missing recipient_email." };
  }

  return event.recipient_profile_id
    ? { status: "processed" }
    : { status: "skipped", skippedReason: "In-app event is missing recipient_profile_id." };
}

function buildUpdatePayload(result: SendResult, now: string, retryCount: number) {
  const base = {
    status: result.status,
    processed_at: now,
    last_attempt_at: now,
    retry_count: retryCount,
  };

  if (result.status === "failed") {
    return {
      ...base,
      error_message: result.errorMessage,
      skipped_reason: null,
    };
  }

  if (result.status === "skipped") {
    return {
      ...base,
      error_message: null,
      skipped_reason: result.skippedReason,
    };
  }

  return {
    ...base,
    error_message: null,
    skipped_reason: null,
  };
}

async function readRequestBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeBatchSize(value: unknown) {
  const parsed = Number(value || 10);

  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function normalizeChannel(value: unknown): "sms" | "email" | "in_app" | null {
  return value === "sms" || value === "email" || value === "in_app" ? value : null;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
