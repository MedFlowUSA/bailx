import { Link } from "react-router-dom";

export function AgencyApplyPage() {
  return (
    <section className="page-section legal-page">
      <p className="eyebrow">Agency marketplace onboarding</p>
      <h1>Apply to Join BailX</h1>
      <p>
        BailX is for independently licensed bail providers that can responsibly
        review urgent requests, submit clear offers, and communicate final terms
        directly with consumers.
      </p>

      <div className="legal-grid">
        <article className="card">
          <h2>What Agencies Can Do</h2>
          <p>
            Approved agencies can view eligible requests matched by service
            county, submit offers, disclose financing and collateral details, and
            track provider activity from a dedicated command center.
          </p>
        </article>
        <article className="card">
          <h2>Documents We May Request</h2>
          <p>
            BailX may request license, business registration, insurance, bond, or
            other verification materials. Documents are reviewed for marketplace
            eligibility and stored through private document workflows.
          </p>
        </article>
        <article className="card">
          <h2>Matching and Offers</h2>
          <p>
            Matching starts with service counties and request context. Agencies
            should submit offers only when they can follow up promptly and confirm
            final terms directly with the requester.
          </p>
        </article>
        <article className="card">
          <h2>Marketplace Expectations</h2>
          <p>
            Agencies must use accurate information, avoid misleading claims,
            respect consumer privacy, and comply with applicable licensing,
            advertising, pricing, and communications rules.
          </p>
        </article>
        <article className="card">
          <h2>Crypto Collateral Marketplace Guidance</h2>
          <p>
            Agencies may choose whether they are willing to review crypto-related
            collateral. Agencies should never request private keys, seed phrases,
            passwords, or wallet login credentials, and must follow applicable
            laws and internal collateral procedures. BailX is not the custodian
            or converter.
          </p>
        </article>
        <article className="card">
          <h2>Subscription Placeholder</h2>
          <p>
            Subscription and placement controls may be added later. BailX does not
            enable payment processing in this build.
          </p>
        </article>
        <article className="card">
          <h2>Start the Review</h2>
          <p>
            Sign in or create an agency account, then complete onboarding and
            upload requested documents for admin review.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/auth/sign-up">
              Create Account
            </Link>
            <Link className="button secondary" to="/auth/sign-in">
              Sign In
            </Link>
          </div>
        </article>
      </div>

      <p className="compliance-note">
        BailX marketplace review status reflects internal platform eligibility
        review. BailX does not guarantee provider licensing status, pricing,
        financing, timing, release, or service outcome.
      </p>
    </section>
  );
}
