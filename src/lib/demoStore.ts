import type {
  AdminNote,
  Agency,
  AgencyDocument,
  AgencyOffer,
  BailRequest,
  CustomerOfferNote,
  CustomerRequestTask,
  NotificationEvent,
} from "../types";

export type DemoState = {
  requestUpdates: Record<string, Partial<BailRequest>>;
  agencyUpdates: Record<string, Partial<Agency>>;
  documentUpdates: Record<string, Partial<AgencyDocument>>;
  agencyProfileUpdates: Partial<Agency>;
  offers: AgencyOffer[];
  offerNotes: CustomerOfferNote[];
  requestTasks: CustomerRequestTask[];
  adminNotes: AdminNote[];
  notificationUpdates: Record<string, Partial<NotificationEvent>>;
};

const demoStateKey = "bailx.demo.state";
export const demoStateChangedEvent = "bailx-demo-state-changed";

const emptyState: DemoState = {
  requestUpdates: {},
  agencyUpdates: {},
  documentUpdates: {},
  agencyProfileUpdates: {},
  offers: [],
  offerNotes: [],
  requestTasks: [],
  adminNotes: [],
  notificationUpdates: {},
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function emitDemoStateChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(demoStateChangedEvent));
  }
}

function cloneState(state: DemoState): DemoState {
  return JSON.parse(JSON.stringify(state)) as DemoState;
}

export function getDemoState(): DemoState {
  if (!canUseStorage()) {
    return cloneState(emptyState);
  }

  const raw = window.localStorage.getItem(demoStateKey);

  if (!raw) {
    return cloneState(emptyState);
  }

  try {
    return {
      ...cloneState(emptyState),
      ...(JSON.parse(raw) as Partial<DemoState>),
    };
  } catch {
    return cloneState(emptyState);
  }
}

export function updateDemoState(partial: Partial<DemoState>) {
  if (!canUseStorage()) {
    return getDemoState();
  }

  const nextState: DemoState = {
    ...getDemoState(),
    ...partial,
  };
  window.localStorage.setItem(demoStateKey, JSON.stringify(nextState));
  emitDemoStateChanged();
  return nextState;
}

export function resetDemoState() {
  if (canUseStorage()) {
    window.localStorage.removeItem(demoStateKey);
    emitDemoStateChanged();
  }
}

export function updateDemoRequest(id: string, updates: Partial<BailRequest>) {
  const state = getDemoState();
  updateDemoState({
    requestUpdates: {
      ...state.requestUpdates,
      [id]: {
        ...(state.requestUpdates[id] || {}),
        ...updates,
        updated_at: new Date().toISOString(),
      },
    },
  });
}

export function addDemoOfferNote(offerId: string, note: string, bailRequestId?: string) {
  const state = getDemoState();
  const now = new Date().toISOString();
  const existing = state.offerNotes.find((item) => item.offer_id === offerId);
  const nextNote: CustomerOfferNote = existing
    ? { ...existing, note, updated_at: now }
    : {
        id: `demo-offer-note-${Date.now()}`,
        offer_id: offerId,
        bail_request_id: bailRequestId || "",
        profile_id: "demo-profile-consumer",
        note,
        created_at: now,
        updated_at: now,
      };

  updateDemoState({
    offerNotes: [
      nextNote,
      ...state.offerNotes.filter((item) => item.offer_id !== offerId),
    ],
  });

  return nextNote;
}

export function addDemoRequestTask(
  bailRequestId: string,
  taskKey: CustomerRequestTask["task_key"],
  completed: boolean,
) {
  const state = getDemoState();
  const now = new Date().toISOString();
  const existing = state.requestTasks.find(
    (task) => task.bail_request_id === bailRequestId && task.task_key === taskKey,
  );
  const nextTask: CustomerRequestTask = existing
    ? {
        ...existing,
        completed,
        completed_at: completed ? now : null,
        updated_at: now,
      }
    : {
        id: `demo-task-${Date.now()}`,
        bail_request_id: bailRequestId,
        profile_id: "demo-profile-consumer",
        task_key: taskKey,
        completed,
        completed_at: completed ? now : null,
        created_at: now,
        updated_at: now,
      };

  updateDemoState({
    requestTasks: [
      nextTask,
      ...state.requestTasks.filter(
        (task) => !(task.bail_request_id === bailRequestId && task.task_key === taskKey),
      ),
    ],
  });

  return nextTask;
}

export function addDemoOffer(offer: AgencyOffer) {
  const state = getDemoState();
  updateDemoState({
    offers: [offer, ...state.offers.filter((item) => item.id !== offer.id)],
  });
}

export function updateDemoOfferStatus(offerId: string, bailRequestId: string) {
  const state = getDemoState();
  const now = new Date().toISOString();
  const offers = state.offers.map((offer) =>
    offer.bail_request_id === bailRequestId
      ? {
          ...offer,
          status: (offer.id === offerId ? "selected" : "declined") as AgencyOffer["status"],
          updated_at: now,
        }
      : offer,
  );

  updateDemoState({ offers });
}

export function addDemoAdminNote(
  entityType: AdminNote["entity_type"],
  entityId: string | null | undefined,
  note: string,
) {
  const trimmedNote = note.trim();

  if (!trimmedNote) {
    return null;
  }

  const state = getDemoState();
  const now = new Date().toISOString();
  const adminNote: AdminNote = {
    id: `demo-admin-note-${Date.now()}`,
    entity_type: entityType,
    entity_id: entityId || null,
    note_type: "admin_note",
    message: trimmedNote,
    created_by_profile_id: "demo-profile-admin",
    metadata: {},
    related_table: entityType || "system",
    related_id: entityId || null,
    note: trimmedNote,
    created_by: "demo-profile-admin",
    created_at: now,
    updated_at: now,
  };

  updateDemoState({ adminNotes: [adminNote, ...state.adminNotes] });
  return adminNote;
}

export function updateDemoNotificationStatus(
  id: string,
  status: NotificationEvent["status"],
  extra: Partial<NotificationEvent> = {},
) {
  const state = getDemoState();
  const now = new Date().toISOString();
  updateDemoState({
    notificationUpdates: {
      ...state.notificationUpdates,
      [id]: {
        ...(state.notificationUpdates[id] || {}),
        ...extra,
        status,
        last_attempt_at: now,
        processed_at: status === "processed" || status === "skipped" ? now : null,
      },
    },
  });
}

export function updateDemoAgencyProfile(updates: Partial<Agency>) {
  const state = getDemoState();
  updateDemoState({
    agencyProfileUpdates: {
      ...state.agencyProfileUpdates,
      ...updates,
      updated_at: new Date().toISOString(),
    },
  });
}

export function updateDemoAgency(agencyId: string, updates: Partial<Agency>) {
  const state = getDemoState();
  updateDemoState({
    agencyUpdates: {
      ...state.agencyUpdates,
      [agencyId]: {
        ...(state.agencyUpdates[agencyId] || {}),
        ...updates,
        updated_at: new Date().toISOString(),
      },
    },
  });
}

export function updateDemoDocument(documentId: string, updates: Partial<AgencyDocument>) {
  const state = getDemoState();
  updateDemoState({
    documentUpdates: {
      ...state.documentUpdates,
      [documentId]: {
        ...(state.documentUpdates[documentId] || {}),
        ...updates,
        updated_at: new Date().toISOString(),
      },
    },
  });
}
