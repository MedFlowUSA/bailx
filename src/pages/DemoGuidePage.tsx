import { useNavigate } from "react-router-dom";
import { isDemoModeEnabled, setDemoRole, type DemoRole } from "../lib/demoMode";

const demoDestinations: Array<{ role: DemoRole; title: string; path: string; description: string }> = [
  {
    role: "consumer",
    title: "Enter Consumer Demo",
    path: "/consumer/dashboard",
    description: "View requests, compare offers, select a provider, and update checklist items.",
  },
  {
    role: "agency",
    title: "Enter Agency Demo",
    path: "/agency/dashboard",
    description: "Review matched leads, agency documents, profile readiness, and submitted offers.",
  },
  {
    role: "admin",
    title: "Enter Admin Demo",
    path: "/admin/dashboard",
    description: "Audit requests, agencies, documents, notifications, and admin notes.",
  },
  {
    role: "attorney",
    title: "Enter Attorney Demo",
    path: "/attorney/dashboard",
    description: "Preview the future attorney advertising and compliance placeholder portal.",
  },
];

const demoFlow = [
  "Start as Consumer",
  "Submit or view emergency request",
  "Review offers",
  "Switch to Agency",
  "Review matched lead",
  "Submit or review offer",
  "Switch to Consumer",
  "Select provider",
  "Switch to Admin",
  "Audit request, agency, documents, and notifications",
  "Switch to Attorney",
  "View future advertising placeholder",
];

export function DemoGuidePage() {
  const navigate = useNavigate();

  function enterDemo(role: DemoRole, path: string) {
    setDemoRole(role);
    navigate(path);
  }

  if (!isDemoModeEnabled()) {
    return (
      <section className="page-section narrow">
        <article className="card empty-state-card">
          <p className="eyebrow">Demo mode unavailable</p>
          <h1>Demo Mode is disabled</h1>
          <p>Set VITE_BAILX_DEMO_MODE=true to use the internal role switcher and seeded demo data.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Internal demo guide</p>
          <h1>BailX Marketplace Walkthrough</h1>
          <p>
            Move through the product as a consumer, agency, admin, and future attorney portal
            without creating real accounts.
          </p>
        </div>
      </div>

      <div className="notice-card compliance-notice" role="note">
        Demo data only. No real requests are sent, no real providers are contacted, and no real
        SMS, email, payment, crypto, or legal service is triggered.
      </div>

      <section className="dashboard-grid">
        {demoDestinations.map((destination) => (
          <article className="card agency-command-card" key={destination.role}>
            <p className="eyebrow">{destination.role} role</p>
            <h2>{destination.title}</h2>
            <p>{destination.description}</p>
            <button
              className="button primary"
              type="button"
              onClick={() => enterDemo(destination.role, destination.path)}
            >
              {destination.title}
            </button>
          </article>
        ))}
      </section>

      <article className="card admin-list-card">
        <p className="eyebrow">Recommended demo flow</p>
        <h2>Full product rhythm</h2>
        <ol className="question-list">
          {demoFlow.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </article>
    </section>
  );
}
