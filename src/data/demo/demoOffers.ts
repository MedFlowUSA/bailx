import type { AgencyOffer } from "../../types";
import { demoAgencyId } from "./demoAgencies";

export const demoOffers: AgencyOffer[] = [
  {
    id: "demo-offer-1",
    agency_id: demoAgencyId,
    bail_request_id: "demo-request-with-offers",
    down_payment: 4200,
    estimated_release_time: "3-6 hours after paperwork and jail processing",
    financing_available: true,
    collateral_notes: "Vehicle title or co-signer can be reviewed directly with the agency.",
    message: "Demo offer. We can discuss payment options and required documents by phone.",
    status: "submitted",
    created_at: "2026-05-06T10:05:00.000Z",
    updated_at: "2026-05-06T10:05:00.000Z",
    agencies: {
      business_name: "Freedom Valley Bail Demo",
      phone: "555-0102",
      email: "provider.demo@example.com",
    },
  },
  {
    id: "demo-offer-2",
    agency_id: "demo-agency-more-info",
    bail_request_id: "demo-request-with-offers",
    down_payment: 5000,
    estimated_release_time: "4-8 hours after signed agreement",
    financing_available: false,
    collateral_notes: "Cash or vehicle collateral review required.",
    message: "Demo offer from another provider for comparison.",
    status: "viewed",
    created_at: "2026-05-06T10:20:00.000Z",
    updated_at: "2026-05-06T10:25:00.000Z",
    agencies: {
      business_name: "Harbor Light Bail Demo",
      phone: "555-0106",
      email: "moreinfo.agency@example.com",
    },
  },
  {
    id: "demo-offer-selected",
    agency_id: demoAgencyId,
    bail_request_id: "demo-request-selected-provider",
    down_payment: 1900,
    estimated_release_time: "2-4 hours after paperwork",
    financing_available: true,
    collateral_notes: "Vehicle title reviewed by provider. Demo only.",
    message: "Selected provider demo offer. Confirm all terms directly.",
    status: "selected",
    created_at: "2026-05-05T14:05:00.000Z",
    updated_at: "2026-05-05T14:40:00.000Z",
    agencies: {
      business_name: "Freedom Valley Bail Demo",
      phone: "555-0102",
      email: "provider.demo@example.com",
    },
  },
];
