import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <section className="page-section legal-page">
      <p className="eyebrow">BailX trust center</p>
      <h1>Privacy Policy</h1>
      <p>
        BailX collects information needed to operate an emergency legal access
        marketplace. Bail request information may include sensitive personal,
        financial, family, and custody-related details.
      </p>

      <div className="legal-grid">
        <article className="card">
          <h2>Information We Collect</h2>
          <p>
            We may collect requester contact information, defendant and jail
            details, bond amount, language preference, collateral categories,
            provider offers, account profile information, uploaded agency
            documents, admin review notes, and platform activity records.
          </p>
        </article>
        <article className="card">
          <h2>Why We Collect It</h2>
          <p>
            BailX uses this information to route requests, support marketplace
            review, help approved providers evaluate whether they can respond,
            maintain consumer dashboards, support admin oversight, and protect
            platform integrity.
          </p>
        </article>
        <article className="card">
          <h2>Provider Sharing</h2>
          <p>
            Request details may be shared with approved independent providers
            whose service counties or marketplace eligibility match the request.
            Providers are independent third parties and are responsible for their
            own terms, communications, licensing, and compliance.
          </p>
        </article>
        <article className="card">
          <h2>Retention</h2>
          <p>
            BailX retains request, offer, review, and notification records for as
            long as reasonably needed for marketplace operations, compliance,
            dispute review, safety, and legal obligations. Retention settings may
            vary as the product matures.
          </p>
        </article>
        <article className="card">
          <h2>User Rights</h2>
          <p>
            Users may request access, correction, or deletion where legally
            available. Contact method placeholder: privacy@bailx.example.
          </p>
        </article>
        <article className="card">
          <h2>California Notice</h2>
          <p>
            California privacy notice placeholder: BailX will publish applicable
            category, purpose, retention, and rights disclosures before production
            traffic that requires a full California notice.
          </p>
        </article>
      </div>

      <p className="compliance-note">
        BailX does not guarantee release, pricing, financing, provider approval,
        legal representation, or provider service outcomes. See the{" "}
        <Link to="/terms">Terms</Link> and <Link to="/consumer-disclosures">Consumer Disclosures</Link>.
      </p>
    </section>
  );
}
