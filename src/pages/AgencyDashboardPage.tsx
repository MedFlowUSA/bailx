import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AgencyVerificationChecklist } from "../components/AgencyVerificationChecklist";
import { MissingItemsList } from "../components/MissingItemsList";
import { NextActionCard } from "../components/NextActionCard";
import { ProgressSummaryCard } from "../components/ProgressSummaryCard";
import { SubscriptionTierBadge } from "../components/SubscriptionTierBadge";
import { getCurrentAgencyApplication } from "../lib/agencies";
import { getAgencyDocumentsForAgency } from "../lib/agencyDocuments";
import { getAgencyLeads } from "../lib/agencyLeads";
import { getAgencyOffers } from "../lib/agencyOffers";
import { updateAgencyProfile } from "../lib/agencyProfile";
import {
  countAgencyDocumentsByStatus,
  getAgencyVerificationProgress,
} from "../lib/agencyProgress";
import { isDemoModeEnabled } from "../lib/demoMode";
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

function splitList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const agencyWorkflow = [
  "Create or update the agency application with contact, license, county, language, and collateral details.",
  "Upload verification documents for admin review.",
  "Wait for marketplace eligibility approval before matched leads unlock.",
  "Review eligible requests by service county and submit responsible offer terms.",
  "Track submitted and selected offers from the agency dashboard.",
];

const documentChecklist = [
  "Bail license or agency authorization document.",
  "Business registration or ownership information.",
  "Insurance, bond, or other verification documents when requested.",
  "Current service counties and language coverage.",
  "Clear collateral categories accepted by the agency.",
];

const offerStandards = [
  "Include only terms your agency can discuss directly with the requester.",
  "Provide a realistic release timing estimate, not a guarantee.",
  "Disclose financing availability without hiding fees or conditions.",
  "Explain collateral requirements clearly.",
  "Avoid legal advice, outcome promises, or misleading urgency claims.",
];

const agencyMissingItemTargets: Record<string, string> = {
  "Owner or contact information": "#agency-profile-editor",
  "License number": "#agency-profile-editor",
  "Service counties": "#agency-profile-editor",
  Languages: "#agency-profile-editor",
  "Collateral preferences": "#agency-profile-editor",
  "Documents uploaded": "#agency-document-action-center",
  "Documents approved": "#agency-document-action-center",
  "Marketplace approved": "#agency-marketplace-status",
};

export function AgencyDashboardPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [offers, setOffers] = useState<AgencyOffer[]>([]);
  const [leadCount, setLeadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!agency) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSavingProfile(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateAgencyProfile({
      agencyId: agency.id,
      business_name: String(formData.get("businessName") || ""),
      contact_name: String(formData.get("contactName") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      service_counties: splitList(formData.get("serviceCounties")),
      languages: splitList(formData.get("languages")),
      collateral_accepted: splitList(formData.get("collateralAccepted")),
      subscription_tier: String(formData.get("subscriptionTier") || agency.subscription_tier || "starter"),
    });
    setIsSavingProfile(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setAgency(result.agency);
    setStatusMessage(result.message);
  }

  const documentCounts = countAgencyDocumentsByStatus(documents);
  const agencyProgress = getAgencyVerificationProgress(agency, documents);
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

      {isDemoModeEnabled() ? (
        <article className="notice-card compliance-notice" role="note">
          Demo suggestion: review matched leads and marketplace offer standards, then switch to
          customer to see how offers appear.
        </article>
      ) : null}

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
        <section className="dashboard-grid">
          <ProgressSummaryCard
            eyebrow="Agency verification progress"
            title="Marketplace readiness"
            completionPercent={agencyProgress.completionPercent}
            statusLabel={agencyProgress.statusLabel}
            statusTone={agencyProgress.statusTone}
            completedCount={agencyProgress.completedItems.length}
            totalCount={
              agencyProgress.completedItems.length +
              agencyProgress.missingItems.length +
              agencyProgress.pendingItems.length
            }
          />
          <MissingItemsList
            title="Missing verification items"
            items={agencyProgress.missingItems}
            emptyMessage="No core profile gaps are currently detected."
            itemTargets={agencyMissingItemTargets}
          />
          <NextActionCard action={agencyProgress.nextRecommendedAction}>
            <div className="hero-actions">
              <Link className="button primary" to={isApproved ? "/agency/leads" : "/agency/onboarding"}>
                {isApproved ? "Open Leads" : "Update Verification File"}
              </Link>
              <Link className="button secondary" to="/agency/apply">
                Review Requirements
              </Link>
            </div>
          </NextActionCard>
        </section>
      ) : null}

      {agency ? (
        <section className="dashboard-grid">
          <AgencyVerificationChecklist agency={agency} documents={documents} leadCount={leadCount} />
          <article className="card agency-command-card" id="agency-marketplace-status">
            <p className="eyebrow">Marketplace status</p>
            <h2>{isApproved ? "Approved for lead access" : "Verification required before lead access"}</h2>
            <p>
              {isApproved
                ? "You can review matched leads and submit transparent offers."
                : "Complete verification before lead access. Your dashboard will update as documents and profile details are reviewed."}
            </p>
          </article>
        </section>
      ) : null}

      {agency ? (
        <section className="card form-card" id="agency-profile-editor">
          <p className="eyebrow">Agency profile editor</p>
          <h2>Complete agency profile</h2>
          <p>
            Update profile details used for marketplace review. Agencies cannot self-approve
            verification status or edit admin review notes.
          </p>
          <form className="form-grid" onSubmit={handleProfileSubmit}>
            <label>
              Business name
              <input name="businessName" defaultValue={agency.business_name || ""} />
            </label>
            <label>
              Contact name
              <input name="contactName" defaultValue={agency.contact_name || ""} />
            </label>
            <label>
              Phone
              <input name="phone" type="tel" defaultValue={agency.phone || ""} />
            </label>
            <label>
              Email
              <input name="email" type="email" defaultValue={agency.email || ""} />
            </label>
            <label>
              Service counties
              <input
                name="serviceCounties"
                defaultValue={agency.service_counties?.join(", ") || ""}
              />
            </label>
            <label>
              Languages
              <input name="languages" defaultValue={agency.languages?.join(", ") || ""} />
            </label>
            <label>
              Collateral accepted
              <input
                name="collateralAccepted"
                defaultValue={agency.collateral_accepted?.join(", ") || ""}
              />
            </label>
            <label>
              Subscription tier placeholder
              <select name="subscriptionTier" defaultValue={agency.subscription_tier || "starter"}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="priority">Priority</option>
                <option value="directory">Directory</option>
              </select>
            </label>
            <button className="button primary" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save Agency Profile"}
            </button>
          </form>
        </section>
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

      {agency ? (
        <section className="dashboard-grid">
          <article className="card agency-command-card" id="agency-document-action-center">
            <p className="eyebrow">Document readiness</p>
            <h2>{documents.length > 0 ? `${documents.length} uploaded` : "No documents uploaded"}</h2>
            <dl className="agency-detail-grid">
              <div>
                <dt>Uploaded</dt>
                <dd>{documentCounts.total}</dd>
              </div>
              <div>
                <dt>Pending</dt>
                <dd>{documentCounts.pending}</dd>
              </div>
              <div>
                <dt>Approved</dt>
                <dd>{documentCounts.approved}</dd>
              </div>
              <div>
                <dt>More info requested</dt>
                <dd>{documentCounts.more_info_requested}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{documentCounts.rejected}</dd>
              </div>
            </dl>
            {documents.length === 0 ? (
              <p>Upload verification documents to begin marketplace review.</p>
            ) : null}
          </article>
          <article className="card agency-command-card">
            <p className="eyebrow">Lead access status</p>
            <h2>{isApproved ? "Lead access active" : "Lead access limited"}</h2>
            <p>
              {isApproved
                ? leadCount > 0
                  ? `${leadCount} matched leads are currently available.`
                  : "No matched leads are available yet."
                : "Lead access begins after marketplace verification."}
            </p>
          </article>
          <article className="card agency-command-card">
            <p className="eyebrow">Offer workflow</p>
            <h2>{offers.length} offers submitted</h2>
            <p>
              Submit clear, accurate offers. All provider terms are handled directly between the
              provider and consumer.
            </p>
          </article>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <Link className="card nav-card agency-command-card" to="/agency/onboarding">
          <p className="eyebrow">Verification</p>
          <h2>Complete agency onboarding</h2>
          <p>
            Submit agency profile details and upload requested verification
            documents for BailX marketplace eligibility review.
          </p>
        </Link>
        <Link className="card nav-card agency-command-card" to="/agency/leads">
          <p className="eyebrow">Lead inbox</p>
          <h2>{isApproved ? "Review matched requests" : "Leads unlock after approval"}</h2>
          <p>
            Approved agencies can review eligible requests matched by service
            county and submit clear offer terms for consumer comparison.
          </p>
        </Link>
        <article className="card agency-command-card">
          <p className="eyebrow">Offer workflow</p>
          <h2>Submit transparent offers</h2>
          <p>
            Offers capture down payment, estimated release timing, financing
            availability, collateral notes, and provider messages.
          </p>
        </article>
        <Link className="card nav-card agency-command-card" to="/agency/apply">
          <p className="eyebrow">Marketplace expectations</p>
          <h2>Review agency requirements</h2>
          <p>
            See how BailX positions agency participation, document review,
            service county matching, and compliance expectations.
          </p>
        </Link>
      </section>

      <section className="dashboard-grid">
        <article className="card guidance-card">
          <p className="eyebrow">What happens here</p>
          <h2>Agency workflow</h2>
          <ol className="question-list">
            {agencyWorkflow.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
        <article className="card guidance-card">
          <p className="eyebrow">Verification file</p>
          <h2>Document readiness checklist</h2>
          <ul className="checklist">
            {documentChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card guidance-card">
          <p className="eyebrow">Offer quality</p>
          <h2>Marketplace offer standards</h2>
          <ul className="question-list">
            {offerStandards.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card guidance-card">
          <p className="eyebrow">Available agency features</p>
          <h2>Portal tools</h2>
          <dl className="agency-detail-grid">
            <div>
              <dt>Onboarding</dt>
              <dd>Submit agency profile, service counties, languages, license, and collateral coverage.</dd>
            </div>
            <div>
              <dt>Document upload</dt>
              <dd>Upload private verification files for admin review through the onboarding flow.</dd>
            </div>
            <div>
              <dt>Lead inbox</dt>
              <dd>Approved agencies can review eligible requests matched by county.</dd>
            </div>
            <div>
              <dt>Offer tracking</dt>
              <dd>Track submitted offers and selected outcomes without paid placement logic.</dd>
            </div>
          </dl>
        </article>
      </section>

      <div className="dashboard-grid">
        {agency ? (
          <article className="card agency-command-card">
            <p className="eyebrow">Linked agency</p>
            <h2>{agency.business_name || "Agency application"}</h2>
            <div className="badge-row" aria-label="Agency marketplace trust signals">
              <span className="soft-badge">
                Marketplace review: {agency.verification_status.replace(/_/g, " ")}
              </span>
              <span className="soft-badge">Documents submitted: {documents.length}</span>
              <span className="soft-badge">Offers submitted: {offers.length}</span>
              <span className="soft-badge">Selected offers: {selectedOffers}</span>
            </div>
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
              <div>
                <dt>Collateral categories</dt>
                <dd>{agency.collateral_accepted?.join(", ") || "Not listed"}</dd>
              </div>
            </dl>
            <p className="compliance-note">
              BailX marketplace review status reflects internal platform eligibility
              review. BailX does not guarantee provider licensing status, pricing,
              financing, timing, release, or service outcome.
            </p>
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
              <dd>{documentCounts.pending}</dd>
            </div>
            <div>
              <dt>Approved documents</dt>
              <dd>{documentCounts.approved}</dd>
            </div>
            <div>
              <dt>More info requested</dt>
              <dd>{documentCounts.more_info_requested}</dd>
            </div>
            <div>
              <dt>Rejected</dt>
              <dd>{documentCounts.rejected}</dd>
            </div>
          </dl>
          <p>
            {documents.length === 0
              ? "Upload verification documents to begin marketplace review."
              : "Monitor document review status and respond to admin requests."}
          </p>
          <Link className="button secondary" to="/agency/onboarding">
            Manage Documents
          </Link>
          <div className="admin-note-list">
            {documents
              .filter((document) =>
                ["rejected", "more_info_requested", "pending"].includes(document.review_status),
              )
              .map((document) => (
                <div className="admin-note-row" key={document.id}>
                  <span>
                    {document.file_name}
                    <small>
                      {document.review_status.replace(/_/g, " ")}
                      {document.admin_notes ? ` | ${document.admin_notes}` : ""}
                    </small>
                  </span>
                </div>
              ))}
          </div>
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
