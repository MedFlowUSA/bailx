import type { BailRequest } from "../types";
import { getRequestStatusLabel } from "./requestStatus";

export type ProgressTone = "neutral" | "positive" | "attention" | "urgent";

export type CustomerRequestProgressOptions = {
  offerCount?: number;
  hasSelectedProvider?: boolean;
};

export type CustomerRequestProgress = {
  completionPercent: number;
  completedItems: string[];
  missingItems: string[];
  nextRecommendedAction: string;
  statusLabel: string;
  statusTone: ProgressTone;
};

type PacketItem = {
  label: string;
  complete: boolean;
};

export function getCustomerRequestProgress(
  request: BailRequest,
  options: CustomerRequestProgressOptions = {},
): CustomerRequestProgress {
  const hasCryptoCollateral = Boolean(request.has_crypto_collateral);
  const defendantDob = getOptionalField(request, "defendant_dob");
  const packetItems: PacketItem[] = [
    { label: "Requester name", complete: hasValue(request.requester_name) },
    {
      label: "Requester phone or email",
      complete: hasValue(request.requester_phone) || hasValue(request.requester_email),
    },
    { label: "Defendant name", complete: hasValue(request.defendant_name) },
    ...(defendantDob !== undefined
      ? [{ label: "Defendant date of birth", complete: hasValue(defendantDob) }]
      : []),
    { label: "Jail or booking location", complete: hasValue(request.jail_location) },
    {
      label: "Jail county and state",
      complete: hasValue(request.jail_county) && hasValue(request.jail_state),
    },
    { label: "Charge information", complete: hasValue(request.charges) },
    { label: "Bond amount", complete: request.bond_amount !== null && request.bond_amount !== undefined },
    { label: "Urgency level", complete: hasValue(request.urgency_level) },
    { label: "Preferred language", complete: hasValue(request.preferred_language) },
    {
      label: "Collateral information",
      complete: Boolean(request.collateral_available && request.collateral_available.length > 0),
    },
    ...(hasCryptoCollateral
      ? [
          {
            label: "Crypto collateral information",
            complete:
              Boolean(request.crypto_assets && request.crypto_assets.length > 0) ||
              hasValue(request.estimated_crypto_value) ||
              hasValue(request.crypto_collateral_notes),
          },
        ]
      : []),
    {
      label: "Marketplace consent metadata",
      complete: Boolean(
        request.consent_marketplace_share &&
          request.consent_no_legal_advice &&
          request.consent_terms_privacy,
      ),
    },
  ];

  const completedItems = packetItems.filter((item) => item.complete).map((item) => item.label);
  const missingItems = packetItems.filter((item) => !item.complete).map((item) => item.label);
  const completionPercent = Math.round((completedItems.length / packetItems.length) * 100);

  return {
    completionPercent,
    completedItems,
    missingItems,
    nextRecommendedAction: getNextAction(request, missingItems, options),
    statusLabel: getRequestStatusLabel(request.status),
    statusTone: getStatusTone(request.status, completionPercent),
  };
}

function getNextAction(
  request: BailRequest,
  missingItems: string[],
  options: CustomerRequestProgressOptions,
) {
  if (missingItems.includes("Jail or booking location")) {
    return "Add jail or booking location details so providers can evaluate the request faster.";
  }

  if (missingItems.includes("Bond amount")) {
    return "Add the bond amount if available to help providers submit more accurate offers.";
  }

  if (missingItems.includes("Requester phone or email")) {
    return "Add reliable contact information so providers can follow up directly.";
  }

  if (options.hasSelectedProvider || request.status === "provider_selected") {
    return "Contact your selected provider directly and confirm all terms in writing.";
  }

  if ((options.offerCount || 0) > 0 || request.status === "offers_received") {
    return "Compare available offers and ask each provider key questions before choosing.";
  }

  return "Your request is active. Watch for provider offers and keep your contact information available.";
}

function getStatusTone(status: BailRequest["status"], completionPercent: number): ProgressTone {
  if (status === "provider_selected" || status === "closed") {
    return "positive";
  }

  if (completionPercent < 60) {
    return "urgent";
  }

  if (completionPercent < 85) {
    return "attention";
  }

  return "neutral";
}

function hasValue(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function getOptionalField(request: BailRequest, key: string): string | undefined {
  const value = (request as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
