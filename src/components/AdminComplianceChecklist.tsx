const checklistItems = [
  "Review pending agency applications.",
  "Confirm license documentation before approval.",
  "Monitor high-urgency requests.",
  "Review selected provider outcomes.",
  "Keep temporary/test accounts separated from real providers.",
  "Do not approve agencies without manual verification.",
];

export function AdminComplianceChecklist() {
  return (
    <article className="card admin-compliance-card">
      <p className="eyebrow">Admin reminders</p>
      <h2>Compliance checklist</h2>
      <ul className="checklist">
        {checklistItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="compliance-note">
        BailX admin review is for marketplace eligibility only and does not
        guarantee provider licensing, legal compliance, service quality,
        pricing, or release outcome.
      </p>
    </article>
  );
}
