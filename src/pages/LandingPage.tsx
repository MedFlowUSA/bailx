import { Link } from "react-router-dom";
import { TrustBadge } from "../components/TrustBadge";

export function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="urgent-label">Emergency bail marketplace</p>
          <h1>Find Freedom Fast</h1>
          <p>
            Start one secure intake and connect with independently licensed bail
            providers and legal service resources when every minute matters.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/get-help-now">
              Get Help Now
            </Link>
            <Link className="button ghost" to="/agency/apply">
              Agency Onboarding
            </Link>
          </div>
          <p className="hero-disclaimer">
            BailX is a technology marketplace and advertising platform, not a
            bail bond company, broker, lender, law firm, or legal representative.
            Review our <Link to="/consumer-disclosures">consumer disclosures</Link>.
          </p>
        </div>
        <aside className="hero-panel" aria-label="BailX request summary">
          <div className="hero-panel-header">
            <span className="status-dot" />
            Intake available now
          </div>
          <dl>
            <div>
              <dt>Request</dt>
              <dd>Emergency bail help</dd>
            </div>
            <div>
              <dt>Provider type</dt>
              <dd>Independently licensed agencies</dd>
            </div>
            <div>
              <dt>Next step</dt>
              <dd>Submit details for provider review</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="landing-section">
        <div>
          <p className="eyebrow">How BailX works</p>
          <h2>Clear steps in an urgent moment.</h2>
        </div>
        <div className="step-grid">
          <article className="step-item">
            <span>1</span>
            <h3>Submit the request</h3>
            <p>Share the defendant, jail, bond, language, and collateral details.</p>
          </article>
          <article className="step-item">
            <span>2</span>
            <h3>Providers review</h3>
            <p>Licensed agencies can evaluate the request and prepare next steps.</p>
          </article>
          <article className="step-item">
            <span>3</span>
            <h3>You choose who to contact</h3>
            <p>Families stay in control before continuing with any provider.</p>
          </article>
        </div>
      </section>

      <section className="section-grid compact-section">
        <article className="card">
          <p className="eyebrow">Trust and verification</p>
          <h2>Built for licensed provider discovery.</h2>
          <p>
            Agency profiles can be reviewed for license, service area, language,
            and collateral information before marketplace visibility.
          </p>
        </article>
        <article className="card attorney-card">
          <p className="eyebrow">Attorney advertising</p>
          <h2>Criminal defense and legal resource placements</h2>
          <p>
            Attorney advertisers will be able to publish jurisdiction-aware
            placements with clear advertising labels and contact details.
          </p>
        </article>
      </section>

      <section className="trust-section">
        <div className="trust-grid">
          <TrustBadge label="License checks" detail="Agency records can be reviewed before marketplace visibility." />
          <TrustBadge label="Transparent offers" detail="Premium, collateral, and response expectations are surfaced up front." />
          <TrustBadge label="Consumer control" detail="Families choose whether to continue with a provider or advertiser." />
        </div>
      </section>

    </>
  );
}
