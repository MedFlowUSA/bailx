import { getDemoAttorneyData } from "../lib/demoData";

export function AttorneyDashboardPage() {
  const { profile, ad, complianceStatus } = getDemoAttorneyData();

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Attorney portal placeholder</p>
          <h1>Attorney Advertising Marketplace</h1>
          <p>
            Future attorney advertising tools are visible for product planning only.
          </p>
        </div>
        <span className="status-pill">Coming soon</span>
      </div>

      <div className="notice-card compliance-notice" role="note">
        Attorney advertising features are not active yet. BailX does not provide legal advice or
        attorney-client matching in this demo.
      </div>

      <section className="dashboard-grid">
        <article className="card agency-command-card">
          <p className="eyebrow">Demo attorney profile</p>
          <h2>{profile.full_name}</h2>
          <dl className="agency-detail-grid">
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{profile.phone}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{complianceStatus}</dd>
            </div>
          </dl>
        </article>

        <article className="card agency-command-card">
          <p className="eyebrow">Advertising placeholder</p>
          <h2>{ad.advertiser_name}</h2>
          <dl className="agency-detail-grid">
            <div>
              <dt>Practice area targeting</dt>
              <dd>{ad.practice_areas.join(", ")}</dd>
            </div>
            <div>
              <dt>County targeting</dt>
              <dd>{ad.jurisdictions.join(", ")}</dd>
            </div>
            <div>
              <dt>Campaign status</dt>
              <dd>{ad.status}</dd>
            </div>
          </dl>
        </article>

        <article className="card agency-command-card">
          <p className="eyebrow">Compliance review</p>
          <h2>Not active</h2>
          <p>
            Future attorney ads will require jurisdiction, practice area, disclosure, and review
            controls before anything can be published.
          </p>
        </article>

        <article className="card agency-command-card">
          <p className="eyebrow">Lead/ad placement</p>
          <h2>Placeholder only</h2>
          <p>
            No legal lead sale, attorney-client matching, or ad purchase exists in this demo.
          </p>
        </article>
      </section>
    </section>
  );
}
