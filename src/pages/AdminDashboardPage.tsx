import { Link } from "react-router-dom";
import { AdminVerificationPanel } from "../components/AdminVerificationPanel";

export function AdminDashboardPage() {
  return (
    <section className="page-section">
      <p className="eyebrow">Admin dashboard</p>
      <h1>BailX Operations</h1>
      <div className="dashboard-grid">
        <AdminVerificationPanel />
        <Link className="card nav-card" to="/admin/agencies">
          <h2>Agencies</h2>
          <p>Review licensing, documents, counties, and marketplace visibility.</p>
        </Link>
        <Link className="card nav-card" to="/admin/bail-requests">
          <h2>Bail Requests</h2>
          <p>Monitor active request flow and provider offer activity.</p>
        </Link>
      </div>
    </section>
  );
}
