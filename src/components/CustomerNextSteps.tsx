const nextSteps = [
  "Confirm the final bail bond premium and fees directly with the provider.",
  "Confirm required down payment.",
  "Confirm whether financing is available.",
  "Confirm any collateral requirements.",
  "Ask what documents or identification are needed.",
  "Confirm estimated release timing.",
  "Stay available by phone for provider follow-up.",
];

export function CustomerNextSteps() {
  return (
    <section className="card guidance-card">
      <p className="eyebrow">Next steps</p>
      <h2>Before moving forward</h2>
      <ul className="checklist">
        {nextSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
      <p className="compliance-note">
        This checklist is informational only and does not create legal, financial,
        or bail bond advice.
      </p>
    </section>
  );
}
