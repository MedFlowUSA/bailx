import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MissingItemsList } from "../components/MissingItemsList";
import { NextActionCard } from "../components/NextActionCard";
import { ProgressSummaryCard } from "../components/ProgressSummaryCard";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import {
  getOfferCountsForBailRequests,
  getSelectedOffersForBailRequests,
} from "../lib/agencyOffers";
import { getRequestStatusLabel } from "../lib/requestStatus";
import { getRecentConsumerBailRequests } from "../lib/consumerRequests";
import { getCustomerRequestProgress } from "../lib/customerProgress";
import type { AgencyOffer, BailRequest } from "../types";

const activeStatuses = new Set(["submitted", "providers_notified", "offers_received", "provider_selected"]);

const consumerWorkflow = [
  "Submit a request with defendant, jail, bond, language, and collateral details.",
  "Approved independent providers may review the request if it matches their service area.",
  "Compare offers by down payment, timing estimate, financing availability, collateral notes, and provider message.",
  "Choose whether to contact a provider directly and get all terms in writing.",
];

const emergencyPacket = [
  "Defendant full legal name and date of birth if available.",
  "Jail, city, county, booking number, or case number if known.",
  "Bond amount and charges if they have been posted.",
  "Requester phone, email, preferred language, and best callback window.",
  "Collateral categories available, such as cash, vehicle title, or property.",
];

const providerQuestions = [
  "What is the total amount due today?",
  "Is the premium refundable or non-refundable?",
  "What collateral is required and when is it released?",
  "Does financing include fees or interest?",
  "Who is the main point of contact after paperwork starts?",
];

export function ConsumerDashboardPage() {
  const [bailRequests, setBailRequests] = useState<BailRequest[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [selectedOffers, setSelectedOffers] = useState<Record<string, AgencyOffer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadRequests() {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getRecentConsumerBailRequests();
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setBailRequests(result.bailRequests);
    setStatusMessage(
      result.mocked ? "Showing mock requests until Supabase is configured." : null,
    );

    const countsResult = await getOfferCountsForBailRequests(
      result.bailRequests.map((request) => request.id),
    );

    if (countsResult.ok) {
      setOfferCounts(countsResult.counts);
    }

    const selectedResult = await getSelectedOffersForBailRequests(
      result.bailRequests.map((request) => request.id),
    );

    if (selectedResult.ok) {
      setSelectedOffers(selectedResult.selectedOffers);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  const summary = {
    active: bailRequests.filter((request) => activeStatuses.has(request.status)).length,
    offers: Object.values(offerCounts).reduce((total, count) => total + count, 0),
    selected: bailRequests.filter((request) => request.status === "provider_selected").length,
    closed: bailRequests.filter((request) => ["closed", "cancelled"].includes(request.status)).length,
  };
  const activeRequest =
    bailRequests.find((request) => activeStatuses.has(request.status)) || bailRequests[0] || null;
  const activeRequestProgress = activeRequest
    ? getCustomerRequestProgress(activeRequest, {
        offerCount: offerCounts[activeRequest.id] || 0,
        hasSelectedProvider: Boolean(selectedOffers[activeRequest.id]),
      })
    : null;

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Consumer dashboard</p>
          <h1>Request Command Center</h1>
          <p>
            Your request has been submitted. Approved providers may review your
            request and submit offers.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" to="/get-help-now">
            Submit New Request
          </Link>
          <button className="button secondary" type="button" onClick={loadRequests}>
            Refresh
          </button>
        </div>
      </div>

      {!isLoading && bailRequests.length === 0 ? (
        <section className="dashboard-grid">
          <article className="card empty-state-card">
            <p className="eyebrow">Start here</p>
            <h2>Start your first emergency bail request</h2>
            <p>Start a request to begin comparing provider responses.</p>
            <Link className="button primary" to="/get-help-now">
              Start Emergency Request
            </Link>
          </article>
          <article className="card guidance-card">
            <p className="eyebrow">What you'll need</p>
            <h2>Request packet basics</h2>
            <ul className="checklist">
              {emergencyPacket.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card guidance-card">
            <p className="eyebrow">How BailX works</p>
            <h2>Marketplace routing</h2>
            <ol className="question-list">
              {consumerWorkflow.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
          <Link className="card nav-card guidance-card" to="/consumer-disclosures">
            <p className="eyebrow">Before submitting</p>
            <h2>Disclosures before submitting</h2>
            <p>
              Review BailX marketplace limits, provider terms, collateral, premiums, financing,
              and legal-support disclosures.
            </p>
          </Link>
        </section>
      ) : null}

      {activeRequest && activeRequestProgress ? (
        <section className="dashboard-grid">
          <ProgressSummaryCard
            eyebrow="Active request progress"
            title="Request Packet Completion"
            completionPercent={activeRequestProgress.completionPercent}
            statusLabel={activeRequestProgress.statusLabel}
            statusTone={activeRequestProgress.statusTone}
            completedCount={activeRequestProgress.completedItems.length}
            totalCount={
              activeRequestProgress.completedItems.length + activeRequestProgress.missingItems.length
            }
          />
          <MissingItemsList
            title="Missing Information"
            items={activeRequestProgress.missingItems}
            emptyMessage="The core request packet is complete. Keep contact information available for provider follow-up."
          />
          <NextActionCard action={activeRequestProgress.nextRecommendedAction}>
            <div className="hero-actions">
              <Link className="button primary" to={`/consumer/requests/${activeRequest.id}`}>
                Open Request
              </Link>
              <Link className="button secondary" to="/get-help-now">
                Start Another Request
              </Link>
            </div>
          </NextActionCard>
        </section>
      ) : null}

      <div className="summary-grid">
        <article className="card summary-card">
          <span>Active requests</span>
          <strong>{summary.active}</strong>
        </article>
        <article className="card summary-card">
          <span>Offers received</span>
          <strong>{summary.offers}</strong>
        </article>
        <article className="card summary-card">
          <span>Provider selected</span>
          <strong>{summary.selected}</strong>
        </article>
        <article className="card summary-card">
          <span>Selected provider status</span>
          <strong>{Object.keys(selectedOffers).length > 0 ? "Selected" : "None"}</strong>
        </article>
      </div>

      <div className="summary-grid">
        <article className="card summary-card">
          <span>Offer status</span>
          <strong>{summary.offers > 0 ? `${summary.offers} offers` : "Watching"}</strong>
        </article>
        <article className="card summary-card">
          <span>Customer tools</span>
          <strong>{bailRequests.length > 0 ? "Ready" : "Start"}</strong>
        </article>
      </div>

      <section className="dashboard-grid">
        <Link className="card nav-card agency-command-card" to="/get-help-now">
          <p className="eyebrow">Start here</p>
          <h2>Submit an emergency request</h2>
          <p>
            Share defendant, jail, bond, language, and collateral details so
            approved independent providers can review the request.
          </p>
        </Link>
        <Link className="card nav-card agency-command-card" to="/consumer-disclosures">
          <p className="eyebrow">Before you choose</p>
          <h2>Review consumer disclosures</h2>
          <p>
            Understand premiums, collateral, financing, provider terms, and why
            BailX does not replace legal counsel.
          </p>
        </Link>
        <article className="card agency-command-card">
          <p className="eyebrow">Offer comparison</p>
          <h2>Compare provider responses</h2>
          <p>
            Once offers arrive, open a request detail page to compare down
            payment, timing estimates, financing, collateral notes, and messages.
          </p>
        </article>
        <article className="card agency-command-card">
          <p className="eyebrow">Family command center</p>
          <h2>Track status and selected provider</h2>
          <p>
            Signed-in consumers can see request status, offer counts, selected
            provider details, and next-step guidance in one place.
          </p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card guidance-card">
          <p className="eyebrow">What happens here</p>
          <h2>Customer workflow</h2>
          <ol className="question-list">
            {consumerWorkflow.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
        <article className="card guidance-card">
          <p className="eyebrow">Prepare before submitting</p>
          <h2>Emergency request packet</h2>
          <ul className="checklist">
            {emergencyPacket.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card guidance-card">
          <p className="eyebrow">Offer review</p>
          <h2>Questions to ask providers</h2>
          <ul className="question-list">
            {providerQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card guidance-card">
          <p className="eyebrow">Available customer features</p>
          <h2>Portal tools</h2>
          <dl className="agency-detail-grid">
            <div>
              <dt>Request tracking</dt>
              <dd>View submitted, provider notified, offers received, and selected provider states.</dd>
            </div>
            <div>
              <dt>Offer comparison</dt>
              <dd>Review offer details without BailX ranking, scoring, or guaranteeing any provider.</dd>
            </div>
            <div>
              <dt>Selected provider panel</dt>
              <dd>After selection, contact details appear so terms can be confirmed directly.</dd>
            </div>
            <div>
              <dt>Disclosure center</dt>
              <dd>Read consumer disclosures, terms, privacy, and marketplace limitations.</dd>
            </div>
          </dl>
        </article>
      </section>

      <div className="dashboard-grid">
        {isLoading ? <p>Loading requests...</p> : null}
        {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        {bailRequests.map((request) => (
          <article className="card request-portal-card" key={request.id}>
            {(() => {
              const progress = getCustomerRequestProgress(request, {
                offerCount: offerCounts[request.id] || 0,
                hasSelectedProvider: Boolean(selectedOffers[request.id]),
              });

              return (
                <div className="badge-row">
                  <span className="soft-badge">{progress.completionPercent}% packet complete</span>
                  <span className={`status-pill ${progress.statusTone}`}>{progress.statusLabel}</span>
                </div>
              );
            })()}
            <div className="request-card-header">
              <div>
                <p className="eyebrow">{getRequestStatusLabel(request.status)}</p>
                <h2>{request.defendant_name || "Defendant not listed"}</h2>
                <p>
                  {request.jail_location || "Jail not listed"} |{" "}
                  {request.jail_county || "County not listed"}
                </p>
              </div>
              <span className="status-pill">{offerCounts[request.id] || 0} offers</span>
            </div>
            <RequestStatusTimeline status={request.status} compact />
            {selectedOffers[request.id] ? (
              <p className="form-message success">
                Selected provider:{" "}
                {selectedOffers[request.id].agencies?.business_name || "Licensed provider"}
              </p>
            ) : (
              <p>
                {getCustomerRequestProgress(request, {
                  offerCount: offerCounts[request.id] || 0,
                  hasSelectedProvider: false,
                }).nextRecommendedAction}
              </p>
            )}
            <Link className="button primary" to={`/consumer/requests/${request.id}`}>
              View Offers & Details
            </Link>
          </article>
        ))}
      </div>
      <p className="compliance-note">
        BailX helps organize provider responses but does not guarantee release, price, financing,
        collateral acceptance, or timing.
      </p>
    </section>
  );
}
