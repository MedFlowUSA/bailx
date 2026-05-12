import { FormEvent, useEffect, useState } from "react";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import { getAgencyLeads, type AgencyLead } from "../lib/agencyLeads";
import { createAgencyOffer } from "../lib/agencyOffers";
import type { Agency } from "../types";

function formatMoney(value: number | null) {
  if (value === null) {
    return "Bond not listed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AgencyLeadsPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [leads, setLeads] = useState<AgencyLead[]>([]);
  const [openOfferLeadId, setOpenOfferLeadId] = useState<string | null>(null);
  const [submittedLeadIds, setSubmittedLeadIds] = useState<Set<string>>(new Set());
  const [submittingLeadId, setSubmittingLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadLeads() {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await getAgencyLeads();
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setAgency(result.agency);
    setLeads(result.leads);
    setStatusMessage(result.message || (result.mocked ? "Showing mock agency leads." : null));
  }

  useEffect(() => {
    void loadLeads();
  }, []);

  async function handleOfferSubmit(event: FormEvent<HTMLFormElement>, lead: AgencyLead) {
    event.preventDefault();

    if (!agency || submittedLeadIds.has(lead.id)) {
      return;
    }

    setSubmittingLeadId(lead.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const formData = new FormData(event.currentTarget);
    const downPaymentValue = String(formData.get("downPayment") || "");
    const downPayment = Number(downPaymentValue.replace(/[^0-9.]/g, ""));

    const result = await createAgencyOffer({
      bail_request_id: lead.id,
      agency_id: agency.id,
      down_payment: Number.isFinite(downPayment) ? downPayment : null,
      estimated_release_time: String(formData.get("estimatedReleaseTime") || ""),
      financing_available: String(formData.get("financingAvailable") || "false") === "true",
      collateral_notes: String(formData.get("collateralNotes") || ""),
      message: String(formData.get("message") || ""),
    });

    setSubmittingLeadId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setSubmittedLeadIds((current) => new Set(current).add(lead.id));
    setOpenOfferLeadId(null);
    setStatusMessage(result.message);
    event.currentTarget.reset();
  }

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Agency leads</p>
          <h1>Eligible Bail Requests</h1>
          <p>
            Matching uses your linked approved agency and compares its service
            counties to each request jail county.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={loadLeads}>
          Refresh
        </button>
      </div>

      {agency ? (
        <article className="card agency-command-card">
          <p className="eyebrow">Approved agency</p>
          <h2>{agency.business_name}</h2>
          <p>
            Counties: {agency.service_counties?.join(", ") || "Not listed"} | Languages:{" "}
            {agency.languages?.join(", ") || "Not listed"}
          </p>
          <p className="compliance-note">
            Submit offers only when your agency can responsibly follow up with the
            requester and confirm final terms directly.
          </p>
        </article>
      ) : null}

      <div className="lead-list">
        {isLoading ? <p>Loading eligible leads...</p> : null}
        {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        {!isLoading && leads.length === 0 ? (
          <article className="card empty-state-card">
            <h2>No eligible leads found</h2>
            <p>
              Leads appear after your agency is approved and a request matches one
              of your service counties.
            </p>
          </article>
        ) : null}

        {leads.map((lead) => (
          <article className="card lead-card" key={lead.id}>
            <div className="request-card-header">
              <div>
                <p className="eyebrow">{lead.match_reason}</p>
                <h2>{lead.defendant_name || "Defendant not listed"}</h2>
                <p>
                  {lead.jail_location || "Jail not listed"} |{" "}
                  {lead.jail_county || "County not listed"}
                </p>
              </div>
              <div className="lead-meta">
                <span className="status-pill urgent">{lead.urgency_level}</span>
                <strong>{formatMoney(lead.bond_amount)}</strong>
              </div>
            </div>
            <div className="offer-highlight-row">
              <div>
                <span>County match</span>
                <strong>{lead.jail_county || "Not listed"}</strong>
              </div>
              <div>
                <span>Bond amount</span>
                <strong>{formatMoney(lead.bond_amount)}</strong>
              </div>
            </div>
            <dl className="agency-detail-grid">
              <div>
                <dt>Requester</dt>
                <dd>{lead.requester_name}</dd>
              </div>
              <div>
                <dt>Requester contact</dt>
                <dd>{lead.requester_phone || lead.requester_email || "Not listed"}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{lead.preferred_language || "Not listed"}</dd>
              </div>
              <div>
                <dt>Collateral</dt>
                <dd>{lead.collateral_available?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Charges</dt>
                <dd>{lead.charges || "Not listed"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{lead.status}</dd>
              </div>
            </dl>
            {lead.notes ? (
              <div className="card-subsection">
                <strong>Requester notes</strong>
                <p>{lead.notes}</p>
              </div>
            ) : null}
            <RequestStatusTimeline status={lead.status} compact />
            <p className="compliance-note">
              Include only terms your licensed agency can discuss directly with the
              requester. BailX does not issue bonds or guarantee release timing.
            </p>
            <div className="lead-actions">
              <button
                className="button primary"
                type="button"
                disabled={!agency || submittedLeadIds.has(lead.id)}
                onClick={() => setOpenOfferLeadId(openOfferLeadId === lead.id ? null : lead.id)}
              >
                {submittedLeadIds.has(lead.id) ? "Offer Submitted" : "Submit Offer"}
              </button>
            </div>
            {openOfferLeadId === lead.id ? (
              <form className="offer-form" onSubmit={(event) => handleOfferSubmit(event, lead)}>
                <div className="form-grid">
                  <label>
                    Down payment
                    <input name="downPayment" placeholder="$2,500" inputMode="decimal" />
                  </label>
                  <label>
                    Estimated release time
                    <input name="estimatedReleaseTime" placeholder="2-6 hours after paperwork" />
                  </label>
                  <label>
                    Financing available
                    <select name="financingAvailable" defaultValue="true">
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                  <label>
                    Collateral notes
                    <input name="collateralNotes" placeholder="Cash, title, or property accepted" />
                  </label>
                  <label className="span-2">
                    Message to requester
                    <textarea name="message" placeholder="Explain next steps and documents needed" />
                  </label>
                </div>
                <button
                  className="button primary"
                  type="submit"
                  disabled={submittingLeadId === lead.id}
                >
                  {submittingLeadId === lead.id ? "Submitting..." : "Send Offer"}
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
