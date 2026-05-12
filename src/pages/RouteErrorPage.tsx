import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export function RouteErrorPage() {
  const error = useRouteError();
  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";
  const message = isRouteErrorResponse(error)
    ? error.data || "This route could not be loaded."
    : "BailX could not load this page. Please return home and try again.";

  return (
    <section className="page-section narrow">
      <article className="card empty-state-card">
        <p className="eyebrow">Route error</p>
        <h1>{title}</h1>
        <p>{String(message)}</p>
        <div className="hero-actions">
          <Link className="button primary" to="/">
            Go Home
          </Link>
          <Link className="button secondary" to="/get-help-now">
            Get Help Now
          </Link>
        </div>
      </article>
    </section>
  );
}
