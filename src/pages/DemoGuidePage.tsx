import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearDemoRole,
  demoModeChangedEvent,
  getDemoRole,
  getDemoUserLabel,
  isDemoModeEnabled,
  setDemoRole,
  type DemoRole,
} from "../lib/demoMode";
import {
  demoStateChangedEvent,
  getDemoDataStatus,
  getDemoLastResetAt,
  resetDemoState,
} from "../lib/demoStore";

const demoDestinations: Array<{
  role: DemoRole;
  title: string;
  path: string;
  subtitle: string;
  cta: string;
}> = [
  {
    role: "consumer",
    title: "Consumer Demo",
    path: "/consumer/dashboard",
    subtitle: "Submit and track a bail request, compare offers, and choose a provider.",
    cta: "Enter Consumer Demo",
  },
  {
    role: "agency",
    title: "Agency Demo",
    path: "/agency/dashboard",
    subtitle: "Review verification status, matched leads, and offer workflow.",
    cta: "Enter Agency Demo",
  },
  {
    role: "admin",
    title: "Admin Demo",
    path: "/admin/dashboard",
    subtitle: "Audit requests, agencies, documents, notifications, and marketplace activity.",
    cta: "Enter Admin Demo",
  },
  {
    role: "attorney",
    title: "Attorney Demo",
    path: "/attorney/dashboard",
    subtitle: "Preview future attorney advertising and compliance workflow.",
    cta: "Enter Attorney Demo",
  },
];

const storySteps: Array<{
  role: DemoRole;
  title: string;
  whatToClick: string;
  whyItMatters: string;
  path: string;
}> = [
  {
    role: "consumer",
    title: "Start as Customer",
    whatToClick: "Enter Consumer Demo",
    whyItMatters: "Shows the family-facing command center after intake.",
    path: "/consumer/dashboard",
  },
  {
    role: "consumer",
    title: "Review request packet progress",
    whatToClick: "Open the active request progress card.",
    whyItMatters: "Explains how BailX helps a customer organize missing request facts.",
    path: "/consumer/dashboard",
  },
  {
    role: "consumer",
    title: "Open a request with offers",
    whatToClick: "View Offers & Details for Sofia Demo.",
    whyItMatters: "Shows offer comparison, private notes, and provider selection context.",
    path: "/consumer/requests/demo-request-with-offers",
  },
  {
    role: "agency",
    title: "Switch to Agency",
    whatToClick: "Enter Agency Demo.",
    whyItMatters: "Moves from customer demand to provider-side marketplace operations.",
    path: "/agency/dashboard",
  },
  {
    role: "agency",
    title: "Review matched lead and offer standards",
    whatToClick: "Open Leads.",
    whyItMatters: "Shows county matching, collateral context, and responsible offer guidance.",
    path: "/agency/leads",
  },
  {
    role: "consumer",
    title: "Switch back to Customer",
    whatToClick: "Enter Consumer Demo.",
    whyItMatters: "Connects agency offer submission back to customer comparison.",
    path: "/consumer/dashboard",
  },
  {
    role: "consumer",
    title: "Compare offers and select provider",
    whatToClick: "Open the request with offers and choose an available provider.",
    whyItMatters: "Shows BailX as an organizing layer, not a bond issuer or guarantor.",
    path: "/consumer/requests/demo-request-with-offers",
  },
  {
    role: "admin",
    title: "Switch to Admin",
    whatToClick: "Enter Admin Demo.",
    whyItMatters: "Moves into the operational audit and marketplace safety layer.",
    path: "/admin/dashboard",
  },
  {
    role: "admin",
    title: "Audit request, agency file, documents, and notifications",
    whatToClick: "Open Bail Requests, Agencies, Agency Documents, and Notifications.",
    whyItMatters: "Shows how BailX monitors marketplace activity without browser-side integrations.",
    path: "/admin/dashboard",
  },
  {
    role: "attorney",
    title: "Switch to Attorney",
    whatToClick: "Enter Attorney Demo.",
    whyItMatters: "Shows the future advertising layer after urgent bail intake.",
    path: "/attorney/dashboard",
  },
  {
    role: "attorney",
    title: "Preview future attorney advertising layer",
    whatToClick: "Review targeting and compliance placeholders.",
    whyItMatters: "Frames attorney advertising as a future, reviewed workflow without legal matching.",
    path: "/attorney/dashboard",
  },
];

export function DemoGuidePage() {
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState<DemoRole>(getDemoRole());
  const [demoUserLabel, setDemoUserLabel] = useState(getDemoUserLabel());
  const [demoDataStatus, setDemoDataStatus] = useState(getDemoDataStatus());
  const [lastResetAt, setLastResetAt] = useState<string | null>(getDemoLastResetAt());

  useEffect(() => {
    function refreshDemoState() {
      setCurrentRole(getDemoRole());
      setDemoUserLabel(getDemoUserLabel());
      setDemoDataStatus(getDemoDataStatus());
      setLastResetAt(getDemoLastResetAt());
    }

    window.addEventListener(demoModeChangedEvent, refreshDemoState);
    window.addEventListener(demoStateChangedEvent, refreshDemoState);
    window.addEventListener("storage", refreshDemoState);

    return () => {
      window.removeEventListener(demoModeChangedEvent, refreshDemoState);
      window.removeEventListener(demoStateChangedEvent, refreshDemoState);
      window.removeEventListener("storage", refreshDemoState);
    };
  }, []);

  function enterDemo(role: DemoRole, path: string) {
    setDemoRole(role);
    setCurrentRole(role);
    setDemoUserLabel(getDemoUserLabel());
    navigate(path);
  }

  function handleResetDemoData() {
    resetDemoState();
    setDemoDataStatus(getDemoDataStatus());
    setLastResetAt(getDemoLastResetAt());
  }

  function handleResetSession() {
    clearDemoRole();
    resetDemoState();
    setCurrentRole(getDemoRole());
    setDemoUserLabel(getDemoUserLabel());
    setDemoDataStatus(getDemoDataStatus());
    setLastResetAt(getDemoLastResetAt());
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
          <h1>Explore BailX as a full emergency bail marketplace.</h1>
          <p>
            Demo Mode lets you move through BailX as a customer, agency, admin, and future
            attorney advertiser using seeded demo data only.
          </p>
        </div>
      </div>

      <div className="notice-card compliance-notice" role="note">
        No real requests are sent. No providers are contacted. No payments, SMS, email, crypto, or
        legal services are triggered.
      </div>

      <section className="dashboard-grid">
        {demoDestinations.map((destination) => (
          <article className="card agency-command-card" key={destination.role}>
            <p className="eyebrow">{destination.role} role</p>
            <h2>{destination.title}</h2>
            <p>{destination.subtitle}</p>
            <button
              className="button primary"
              type="button"
              onClick={() => enterDemo(destination.role, destination.path)}
            >
              {destination.cta}
            </button>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="card admin-list-card">
          <p className="eyebrow">Current demo state</p>
          <h2>Session controls</h2>
          <dl className="agency-detail-grid">
            <div>
              <dt>Current role</dt>
              <dd>{currentRole}</dd>
            </div>
            <div>
              <dt>Demo user</dt>
              <dd>{demoUserLabel}</dd>
            </div>
            <div>
              <dt>Demo mode</dt>
              <dd>{isDemoModeEnabled() ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt>Demo data</dt>
              <dd>{demoDataStatus}</dd>
            </div>
            <div>
              <dt>Last reset</dt>
              <dd>{lastResetAt ? new Date(lastResetAt).toLocaleString() : "Not reset in this browser"}</dd>
            </div>
          </dl>
          <div className="action-row">
            <button className="button secondary" type="button" onClick={handleResetDemoData}>
              Reset Demo Data
            </button>
            <button className="button secondary danger-button" type="button" onClick={handleResetSession}>
              Reset Demo Session
            </button>
          </div>
        </article>
        <article className="card admin-list-card">
          <p className="eyebrow">Marketplace story</p>
          <h2>What this demo proves</h2>
          <p>
            BailX connects a family request, provider offer workflow, operational review, and a
            future attorney advertising layer without pretending to issue bonds, provide legal
            advice, custody crypto, or send live communications from the browser.
          </p>
        </article>
      </section>

      <article className="card admin-list-card">
        <p className="eyebrow">Recommended Demo Story</p>
        <h2>Walk the full marketplace rhythm</h2>
        <div className="demo-story-list">
          {storySteps.map((step, index) => (
            <div className="demo-story-item" key={`${step.role}-${step.title}`}>
              <span className="soft-badge">Step {index + 1}</span>
              <div>
                <p className="eyebrow">{step.role}</p>
                <h3>{step.title}</h3>
                <dl className="agency-detail-grid">
                  <div>
                    <dt>What to click</dt>
                    <dd>{step.whatToClick}</dd>
                  </div>
                  <div>
                    <dt>Why it matters</dt>
                    <dd>{step.whyItMatters}</dd>
                  </div>
                </dl>
              </div>
              <button
                className="button secondary"
                type="button"
                onClick={() => enterDemo(step.role, step.path)}
              >
                Jump There
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
