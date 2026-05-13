import { Link } from "react-router-dom";

export function CompliancePage() {
  return (
    <section className="page-section legal-page">
      <p className="eyebrow">BailX trust center</p>
      <h1>Compliance Positioning</h1>
      <p>
        BailX is designed as emergency legal access infrastructure for routing,
        comparison, transparency, and admin oversight. The platform is not a
        replacement for provider licensing obligations or legal counsel.
      </p>

      <div className="legal-grid">
        <article className="card">
          <h2>Licensed Provider Intent</h2>
          <p>
            BailX intends to work with independently licensed bail providers.
            Agency verification is a marketplace eligibility review, not a legal
            guarantee of licensing, service quality, pricing, or outcome.
          </p>
        </article>
        <article className="card">
          <h2>Directory Listings</h2>
          <p>
            Some directory information may be based on publicly available business information and
            may not indicate a partnership, endorsement, marketplace approval, or verified status.
            Providers must complete BailX verification before receiving marketplace leads or
            submitting offers.
          </p>
        </article>
        <article className="card">
          <h2>Local Bail Rules</h2>
          <p>
            Bail laws, court processes, premiums, collateral requirements, and
            permissible provider practices vary by state, county, court, and
            individual case.
          </p>
        </article>
        <article className="card">
          <h2>Attorney Advertising</h2>
          <p>
            Attorney advertising features, when added later, will require clear
            advertising labels, jurisdiction-aware review, and professional
            responsibility checks before marketplace visibility.
          </p>
        </article>
        <article className="card">
          <h2>Future Monitoring Features</h2>
          <p>
            Electronic monitoring, geofencing, or compliance tracking features are
            future concepts only. Any such workflow would require clear consent,
            appropriate safeguards, and provider/legal compliance review.
          </p>
        </article>
      </div>

      <p className="compliance-note">
        BailX admin approval is a marketplace action only. See{" "}
        <Link to="/consumer-disclosures">Consumer Disclosures</Link> before
        comparing or accepting provider terms.
      </p>
    </section>
  );
}
