import type { BailRequest } from "../types";

export type RequestStatus = BailRequest["status"];

export const requestStatusSteps: Array<{
  status: Exclude<RequestStatus, "cancelled">;
  label: string;
}> = [
  { status: "submitted", label: "Request submitted" },
  { status: "providers_notified", label: "Providers notified" },
  { status: "offers_received", label: "Offers received" },
  { status: "provider_selected", label: "Provider selected" },
  { status: "closed", label: "Closed" },
];

export function getRequestStatusLabel(status: RequestStatus) {
  if (status === "cancelled") {
    return "Cancelled";
  }

  return requestStatusSteps.find((step) => step.status === status)?.label || "Request submitted";
}

export function getRequestStatusDescription(status: RequestStatus) {
  switch (status) {
    case "submitted":
      return "The request has been received and is ready for provider review.";
    case "providers_notified":
      return "Eligible providers have been notified or are being prepared for review.";
    case "offers_received":
      return "One or more providers have submitted offers for comparison.";
    case "provider_selected":
      return "A provider has been selected. Confirm all details directly with them.";
    case "closed":
      return "This request has been closed.";
    case "cancelled":
      return "This request was cancelled.";
    default:
      return "The request is being reviewed.";
  }
}

export function getRequestStatusProgress(status: RequestStatus) {
  if (status === "cancelled") {
    return 0;
  }

  const index = requestStatusSteps.findIndex((step) => step.status === status);
  return index >= 0 ? index : 0;
}
