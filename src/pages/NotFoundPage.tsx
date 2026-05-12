import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page-section narrow">
      <article className="card empty-state-card">
        <p className="eyebrow">Page not found</p>
        <h1>This BailX page is not available</h1>
        <p>
          The link may be outdated, or the page may require a different account
          type. You can return to the homepage or submit an emergency request.
        </p>
        <div className="hero-actions">
          <Link className="button primary" to="/get-help-now">
            Get Help Now
          </Link>
          <Link className="button secondary" to="/">
            Go Home
          </Link>
        </div>
      </article>
    </section>
  );
}
