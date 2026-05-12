import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SubscriptionTierBadge } from "../components/SubscriptionTierBadge";
import { getCurrentAgencyApplication } from "../lib/agencies";
import { getAgencyDocumentsForAgency } from "../lib/agencyDocuments";
import { getAgencyLeads } from "../lib/agencyLeads";
import { getAgencyOffers } from "../lib/agencyOffers";
import type { Agency, AgencyDocument, AgencyOffer } from "../types";

function formatTierBadge(value?: string | null): "Starter" | "Pro" | "Priority" {
  switch (value?.toLowerCase()) {
    case "priority":
      return "Priority";
    case "pro":
      return "Pro";
    case "starter":
    default:
      return "Starter";
  }
}

export function AgencyDashboardPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [offers, setOffers] = useState<AgencyOffer[]>([]);
  const [leadCount, setLeadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const agencyResult = await getCurrentAgencyApplication();
    setIsLoading(false);

    if (!agencyResult.ok) {
      setErrorMessage(agencyResult.error);
      return;
    }

    setAgency(agencyResult.agency);
    setStatusMessage(agencyResult.message || (agencyResult.mocked ? "Showing mock agency data." : null));

    if (!agencyResult.agency) {
      return;
    }

    const [documentsResult, offersResult, leadsResult] = await Promise.all([
      getAgencyDocumentsForAgency(agencyResult.agency.id),
      getAgencyOffers(agencyResult.agency.id),
      getAgencyLeads(),
    ]);

    if (documentsResult.ok) {
      setDocuments(documentsResult.documents);
    }

    if (offersResult.ok) {
      setOffers(offersResult.offers);
    }

    if (leadsResult.ok) {
      setLeadCount(leadsResult.leads.length);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const approvedDocuments = documents.filter((document) => document.review_status === "approved").length;
  const pendingDocuments = documents.filter((document) => document.review_status === "pending").length;
  const moreInfoDocuments = documents.filter(
    (document) => document.review_status === "more_info_requested",
  ).length;
  const selectedOffers = offers.filter((offer) => offer.status === "selected").length;
  const isApproved = agency?.verification_status === "approved";

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Agency dashboard</p>
          <h1>Provider Command Center</h1>
          <p>
            Track your agency review status, document readiness, eligible leads,
            and submitted offers from one place.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {isLoading ? <p>Loading agency command center...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

      {!isLoading && !agency ? (
        <article className="card empty-state-card">
          <h2>Complete agency onboarding</h2>
          <p>
            Submit your agency application and verification documents before leads
            can be matched to your service counties.
          </p>
          <Link className="button primary" to="/agency/onboarding">
            Start Onboarding
          </Link>
        </article>
      ) : null}

      {agency ? (
        <div className="summary-grid">
          <article className="card summary-card">
            <span>Agency status</span>
            <strong>{agency.verification_status.replace(/_/g, " ")}</strong>
          </article>
          <article className="card summary-card">
            <span>Eligible leads</span>
            <strong>{isApproved ? leadCount : 0}</strong>
          </article>
          <article className="card summary-card">
            <span>Offers submitted</span>
            <strong>{offers.length}</strong>
          </article>
          <article className="card summary-card">
            <span>Selected offers</span>
            <strong>{selectedOffers}</strong>
          </article>
        </div>
      ) : null}

      <div className="dashboard-grid">
        {agency ? (
          <article className="card agency-command-card">
            <p className="eyebrow">Linked agency</p>
            <h2>{agency.business_name || "Agency application"}</h2>
            <dl className="agency-detail-grid">
              <div>
                <dt>Service counties</dt>
                <dd>{agency.service_counties?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Languages</dt>
                <dd>{agency.languages?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>License number</dt>
                <dd>{agency.license_number || "Not listed"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{agency.phone || agency.email || "Not listed"}</dd>
              </div>
            </dl>
          </article>
        ) : null}

        <article className="card agency-command-card">
          <p className="eyebrow">Documents</p>
          <h2>Verification readiness</h2>
          <dl className="agency-detail-grid">
            <div>
              <dt>Documents uploaded</dt>
              <dd>{documents.length}</dd>
            </div>
            <div>
              <dt>Pending review</dt>
              <dd>{pendingDocuments}</dd>
            </div>
            <div>
              <dt>Approved documents</dt>
              <dd>{approvedDocuments}</dd>
            </div>
            <div>
              <dt>More info requested</dt>
              <dd>{moreInfoDocuments}</dd>
            </div>
          </dl>
          <p>Upload license and verification documents after onboarding.</p>
          <Link className="button secondary" to="/agency/onboarding">
            Manage Documents
          </Link>
        </article>

        <article className="card agency-command-card">
          <p className="eyebrow">Subscription</p>
          <h2>{agency?.subscription_tier || "Not selected"}</h2>
          <SubscriptionTierBadge tier={formatTierBadge(agency?.subscription_tier)} />
          <p>Marketplace placement and routing controls will use this tier later.</p>
        </article>

        <Link className="card nav-card agency-command-card" to="/agency/leads">
          <p className="eyebrow">Lead inbox</p>
          <h2>{isApproved ? "View matched leads" : "Awaiting approval"}</h2>
          <p>
            {isApproved
              ? "Review eligible bail requests matched by approved service counties."
              : "Approved agencies can view matched leads after admin review."}
          </p>
        </Link>
      </div>
    </section>
  );
}
