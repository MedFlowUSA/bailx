import { Link } from "react-router-dom";

export function AgencyClaimPage() {
  return (
    <section className="page-section legal-page">
      <p className="eyebrow">Agency claim foundation</p>
      <h1>Claim a Provider Listing</h1>
      <p>
        Some providers may appear as public or internal directory listings based on public
        business information. These listings help BailX map market coverage and prepare outreach;
        they do not indicate partnership, endorsement, marketplace approval, or verified status.
      </p>

      <div className="legal-grid">
        <article className="card">
          <h2>Directory Listing Status</h2>
          <p>
            An unclaimed directory listing is not a BailX verified provider profile. Public facts
            such as a business name, phone number, website, or service area may be used for
            outreach planning only.
          </p>
        </article>
        <article className="card">
          <h2>Before Receiving Leads</h2>
          <p>
            To receive leads, submit offers, or appear as BailX verified, an agency must claim the
            profile, complete onboarding, provide requested documentation, and pass marketplace
            eligibility review.
          </p>
        </article>
        <article className="card">
          <h2>No Guarantee</h2>
          <p>
            BailX does not guarantee provider licensing status, pricing, financing, release timing,
            service outcome, or approval into the marketplace.
          </p>
        </article>
        <article className="card">
          <h2>Start a Claim</h2>
          <p>
            Sign in or create an agency account, then contact BailX with your business name,
            website, licensing information, and the listing you want to claim.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/auth/sign-up">
              Create Agency Account
            </Link>
            <Link className="button secondary" to="/auth/sign-in">
              Sign In
            </Link>
          </div>
        </article>
      </div>

      <p className="compliance-note">
        Providers must complete BailX verification before receiving marketplace leads or submitting
        offers. BailX is not a bail bond company, broker, lender, law firm, or provider guarantor.
      </p>
    </section>
  );
}
