import type { Agency, AgencyDocument } from "../types";
import type { ProgressTone } from "./customerProgress";

export type AgencyVerificationProgress = {
  completionPercent: number;
  completedItems: string[];
  missingItems: string[];
  pendingItems: string[];
  nextRecommendedAction: string;
  statusLabel: string;
  statusTone: ProgressTone;
};

type ReadinessItem = {
  label: string;
  complete: boolean;
  pending?: boolean;
};

export function getAgencyVerificationProgress(
  agency: Agency | null,
  documents: AgencyDocument[],
): AgencyVerificationProgress {
  const documentCounts = countDocumentsByStatus(documents);
  const readinessItems: ReadinessItem[] = [
    { label: "Agency profile", complete: Boolean(agency) },
    {
      label: "Owner or contact information",
      complete: Boolean(agency?.contact_name || agency?.phone || agency?.email),
    },
    { label: "License number", complete: hasValue(agency?.license_number) },
    {
      label: "Service counties",
      complete: Boolean(agency?.service_counties && agency.service_counties.length > 0),
    },
    { label: "Languages", complete: Boolean(agency?.languages && agency.languages.length > 0) },
    {
      label: "Collateral preferences",
      complete: Boolean(agency?.collateral_accepted && agency.collateral_accepted.length > 0),
    },
    { label: "Documents uploaded", complete: documents.length > 0 },
    {
      label: "Documents approved",
      complete: documentCounts.approved > 0,
      pending: documentCounts.pending > 0,
    },
    {
      label: "No rejected or more-info documents",
      complete: documentCounts.rejected === 0 && documentCounts.more_info_requested === 0,
    },
    { label: "Marketplace approved", complete: agency?.verification_status === "approved" },
  ];

  const completedItems = readinessItems.filter((item) => item.complete).map((item) => item.label);
  const missingItems = readinessItems
    .filter((item) => !item.complete && !item.pending)
    .map((item) => item.label);
  const pendingItems = readinessItems
    .filter((item) => item.pending || (!item.complete && item.label === "Marketplace approved"))
    .map((item) => item.label);
  const completionPercent = Math.round((completedItems.length / readinessItems.length) * 100);

  return {
    completionPercent,
    completedItems,
    missingItems,
    pendingItems,
    nextRecommendedAction: getNextAction(agency, documentCounts),
    statusLabel: agency ? formatStatus(agency.verification_status) : "No agency profile",
    statusTone: getStatusTone(agency, documentCounts, completionPercent),
  };
}

export function countAgencyDocumentsByStatus(documents: AgencyDocument[]) {
  return countDocumentsByStatus(documents);
}

function getNextAction(
  agency: Agency | null,
  documentCounts: ReturnType<typeof countDocumentsByStatus>,
) {
  if (!agency) {
    return "Complete agency onboarding so BailX can create your marketplace review file.";
  }

  if (agency.verification_status === "approved") {
    return "Review matched leads and submit complete, transparent offers.";
  }

  if (documentCounts.more_info_requested > 0 || agency.verification_status === "more_info_requested") {
    return "Review the requested updates and upload corrected documents.";
  }

  if (documentCounts.rejected > 0) {
    return "Review rejected document notes and upload corrected verification materials.";
  }

  if (documentCounts.pending > 0) {
    return "Your documents are pending review. Watch for admin updates.";
  }

  if (documentCounts.total === 0) {
    return "Upload verification documents so BailX can review your agency file.";
  }

  return "Keep your agency profile current while BailX reviews marketplace eligibility.";
}

function getStatusTone(
  agency: Agency | null,
  documentCounts: ReturnType<typeof countDocumentsByStatus>,
  completionPercent: number,
): ProgressTone {
  if (agency?.verification_status === "approved") {
    return "positive";
  }

  if (
    agency?.verification_status === "rejected" ||
    documentCounts.rejected > 0 ||
    documentCounts.more_info_requested > 0
  ) {
    return "urgent";
  }

  if (documentCounts.pending > 0 || completionPercent >= 70) {
    return "attention";
  }

  return "neutral";
}

function countDocumentsByStatus(documents: AgencyDocument[]) {
  return documents.reduce(
    (counts, document) => ({
      ...counts,
      total: counts.total + 1,
      [document.review_status]: counts[document.review_status] + 1,
    }),
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      more_info_requested: 0,
    },
  );
}

function hasValue(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}
