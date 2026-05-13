import { demoAgencies, demoAgencyId } from "../data/demo/demoAgencies";
import { demoBailRequests } from "../data/demo/demoBailRequests";
import { demoDocuments } from "../data/demo/demoDocuments";
import { demoNotifications } from "../data/demo/demoNotifications";
import { demoOffers } from "../data/demo/demoOffers";
import {
  demoAttorneyAdPlaceholder,
  demoAttorneyProfile,
  demoConsumerProfile,
} from "../data/demo/demoProfiles";
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
import { isDemoModeEnabled } from "./demoMode";
import { getDemoState } from "./demoStore";

type DemoAgencyLead = BailRequest & { match_reason: string };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getDemoRequests(): BailRequest[] {
  const state = getDemoState();
  return clone(demoBailRequests).map((request) => ({
    ...request,
    ...(state.requestUpdates[request.id] || {}),
  }));
}

function getDemoAgenciesWithState(): Agency[] {
  const state = getDemoState();
  const agencies = clone(demoAgencies);
  return agencies.map((agency) =>
    agency.id === demoAgencyId
      ? { ...agency, ...state.agencyUpdates[agency.id], ...state.agencyProfileUpdates }
      : { ...agency, ...state.agencyUpdates[agency.id] },
  );
}

function getDemoOffersWithState(): AgencyOffer[] {
  const state = getDemoState();
  const offerMap = new Map<string, AgencyOffer>();

  clone(demoOffers).forEach((offer) => offerMap.set(offer.id, offer));
  state.offers.forEach((offer) => offerMap.set(offer.id, clone(offer)));

  return Array.from(offerMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function getDemoDocumentsWithState(): AgencyDocument[] {
  const state = getDemoState();
  return clone(demoDocuments).map((document) => ({
    ...document,
    ...(state.documentUpdates[document.id] || {}),
  }));
}

function getDemoNotificationEventsWithState(): NotificationEvent[] {
  const state = getDemoState();
  return clone(demoNotifications)
    .map((event) => ({
      ...event,
      ...(state.notificationUpdates[event.id] || {}),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function getDemoAdminNotes(): AdminNote[] {
  const state = getDemoState();
  const seededNotes: AdminNote[] = [
    {
      id: "demo-admin-note-request",
      entity_type: "bail_request",
      entity_id: "demo-request-active",
      note_type: "admin_note",
      message: "Demo audit note: request routed to matched agencies without sending real notifications.",
      created_by_profile_id: "demo-profile-admin",
      metadata: { demo: true },
      related_table: "bail_request",
      related_id: "demo-request-active",
      note: "Demo audit note: request routed to matched agencies without sending real notifications.",
      created_by: "demo-profile-admin",
      created_at: "2026-05-08T04:40:00.000Z",
      updated_at: "2026-05-08T04:40:00.000Z",
    },
    {
      id: "demo-admin-note-agency",
      entity_type: "agency",
      entity_id: demoAgencyId,
      note_type: "compliance_review",
      message: "Demo agency has approved seed status for walkthrough only.",
      created_by_profile_id: "demo-profile-admin",
      metadata: { demo: true },
      related_table: "agency",
      related_id: demoAgencyId,
      note: "Demo agency has approved seed status for walkthrough only.",
      created_by: "demo-profile-admin",
      created_at: "2026-05-02T18:25:00.000Z",
      updated_at: "2026-05-02T18:25:00.000Z",
    },
  ];

  return [...state.adminNotes, ...seededNotes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getDemoConsumerDashboardData() {
  const requests = getDemoRequests();
  const offers = getDemoOffersWithState();
  return {
    profile: demoConsumerProfile,
    bailRequests: requests,
    offerCounts: getOfferCounts(requests.map((request) => request.id)),
    selectedOffers: getSelectedOffers(requests.map((request) => request.id)),
    offers,
  };
}

export function getDemoConsumerRequests() {
  return getDemoRequests();
}

export function getDemoConsumerRequestDetail(id: string) {
  const offers = getDemoOffersWithState().filter((offer) => offer.bail_request_id === id);
  return {
    bailRequest: getDemoRequests().find((request) => request.id === id) || null,
    offers,
    tasks: getDemoState().requestTasks.filter((task) => task.bail_request_id === id),
    offerNotes: getDemoState().offerNotes.filter((note) => note.bail_request_id === id),
  };
}

export function getDemoAgencyDashboardData() {
  const agency = getDemoAgencyDetail();
  const documents = getDemoDocumentsWithState().filter((document) => document.agency_id === agency?.id);
  const offers = agency ? getDemoOffersWithState().filter((offer) => offer.agency_id === agency.id) : [];
  return {
    agency,
    documents,
    offers,
    leads: getDemoAgencyLeads(),
  };
}

export function getDemoAgencyLeads(): DemoAgencyLead[] {
  const agency = getDemoAgencyDetail();

  if (!agency || agency.verification_status !== "approved") {
    return [];
  }

  return getDemoRequests()
    .filter(
      (request) =>
        agency.service_counties.includes(request.jail_county || "") &&
        ["submitted", "providers_notified"].includes(request.status),
    )
    .map((request) => ({
      ...request,
      match_reason: `County match: ${request.jail_county || "Not listed"}`,
    }));
}

export function getDemoAgencyDetail() {
  return getDemoAgenciesWithState().find((agency) => agency.id === demoAgencyId) || null;
}

export function getDemoAdminDashboardData() {
  const requests = getDemoRequests();
  const agencies = getDemoAgenciesWithState();
  const offers = getDemoOffersWithState();
  const selectedOffers = offers
    .filter((offer) => offer.status === "selected")
    .map((offer) => ({
      ...offer,
      bail_requests: {
        defendant_name:
          requests.find((request) => request.id === offer.bail_request_id)?.defendant_name || null,
        requester_name:
          requests.find((request) => request.id === offer.bail_request_id)?.requester_name || null,
      },
    }));

  return {
    summary: {
      totalBailRequests: requests.length,
      openRequests: requests.filter((request) =>
        ["submitted", "providers_notified", "offers_received"].includes(request.status),
      ).length,
      offersSubmitted: offers.length,
      providerSelections: selectedOffers.length,
      pendingAgencies: agencies.filter((agency) => agency.verification_status === "pending").length,
      approvedAgencies: agencies.filter((agency) => agency.verification_status === "approved").length,
      reviewsPendingLater: 0,
    },
    recentRequests: requests,
    recentAgencies: agencies,
    selectedOffers,
    adminNotes: getDemoAdminNotes(),
    notifications: getDemoNotificationEventsWithState(),
  };
}

export function getDemoAdminBailRequests() {
  return getDemoRequests();
}

export function getDemoAdminBailRequestDetail(id: string) {
  return getDemoRequests().find((request) => request.id === id) || null;
}

export function getDemoAdminAgencies() {
  return getDemoAgenciesWithState();
}

export function getDemoAdminAgencyDetail(id: string) {
  return getDemoAgenciesWithState().find((agency) => agency.id === id) || null;
}

export function getDemoNotifications() {
  return getDemoNotificationEventsWithState();
}

export function getDemoAgencyDocuments(agencyId?: string) {
  const documents = getDemoDocumentsWithState();
  return agencyId ? documents.filter((document) => document.agency_id === agencyId) : documents;
}

export function getDemoOffersForRequest(requestId: string) {
  return getDemoOffersWithState().filter((offer) => offer.bail_request_id === requestId);
}

export function getDemoOffersForAgency(agencyId: string) {
  return getDemoOffersWithState().filter((offer) => offer.agency_id === agencyId);
}

export function getOfferCounts(requestIds: string[]) {
  return getDemoOffersWithState().reduce<Record<string, number>>((counts, offer) => {
    if (requestIds.includes(offer.bail_request_id)) {
      counts[offer.bail_request_id] = (counts[offer.bail_request_id] || 0) + 1;
    }
    return counts;
  }, {});
}

export function getSelectedOffers(requestIds: string[]) {
  return getDemoOffersWithState()
    .filter((offer) => requestIds.includes(offer.bail_request_id) && offer.status === "selected")
    .reduce<Record<string, AgencyOffer>>((selectedOffers, offer) => {
      selectedOffers[offer.bail_request_id] = offer;
      return selectedOffers;
    }, {});
}

export function getDemoAdminNotesForEntity(entityType: AdminNote["entity_type"], entityId: string) {
  return getDemoAdminNotes().filter(
    (note) => note.entity_type === entityType && note.entity_id === entityId,
  );
}

export function getDemoRequestTasks(requestId: string): CustomerRequestTask[] {
  return getDemoState().requestTasks.filter((task) => task.bail_request_id === requestId);
}

export function getDemoOfferNotes(requestId: string): CustomerOfferNote[] {
  return getDemoState().offerNotes.filter((note) => note.bail_request_id === requestId);
}

export function getDemoAttorneyData() {
  return {
    profile: demoAttorneyProfile,
    ad: demoAttorneyAdPlaceholder,
    complianceStatus: "placeholder review required",
  };
}

export function shouldUseDemoData() {
  return isDemoModeEnabled();
}
