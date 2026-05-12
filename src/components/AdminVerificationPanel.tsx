export function AdminVerificationPanel() {
  return (
    <section className="card verification-panel">
      <div>
        <p className="eyebrow">Verification queue</p>
        <h2>Agency Review</h2>
        <p>License, service county, language, and document checks are staged here.</p>
      </div>
      <div className="admin-actions">
        <button className="button secondary" type="button">
          Request Info
        </button>
        <button className="button primary" type="button">
          Mark Verified
        </button>
      </div>
    </section>
  );
}
