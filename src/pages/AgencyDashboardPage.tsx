import { Link } from "react-router-dom";
import { AgencyCard } from "../components/AgencyCard";
import { ReviewSummary } from "../components/ReviewSummary";
import { SubscriptionTierBadge } from "../components/SubscriptionTierBadge";

export function AgencyDashboardPage() {
  return (
    <section className="page-section">
      <p className="eyebrow">Agency dashboard</p>
      <h1>Provider Command Center</h1>
      <div className="dashboard-grid">
        <AgencyCard name="North County Bail Services" counties="Serving 4 counties" status="Verified" />
        <article className="card">
          <h2>Subscription</h2>
          <SubscriptionTierBadge tier="Priority" />
          <p>Priority routing and featured placement placeholders.</p>
        </article>
        <Link className="card nav-card" to="/agency/leads">
          <h2>Lead Inbox</h2>
          <p>View eligible bail requests matched by approved service counties.</p>
        </Link>
        <article className="card">
          <h2>Reputation</h2>
          <ReviewSummary rating="4.8" count={42} />
        </article>
      </div>
    </section>
  );
}
