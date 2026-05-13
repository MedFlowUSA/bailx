import { Link } from "react-router-dom";

const questions = [
  "Confirm the total amount due today.",
  "Ask whether the premium is refundable or non-refundable.",
  "Ask what collateral is required.",
  "Ask whether financing includes fees or interest.",
  "Ask who the main point of contact is.",
  "Ask what happens if the defendant misses court.",
  "Ask for all terms in writing.",
];

export function ConsumerDisclosuresPage() {
  return (
    <section className="page-section legal-page">
      <p className="eyebrow">BailX trust center</p>
      <h1>Consumer Disclosures</h1>
      <p>
        Bail and bond decisions are urgent, personal, and financially important.
        BailX helps organize marketplace responses, but consumers should confirm
        every provider term directly before agreeing.
      </p>

      <div className="legal-grid">
        <article className="card">
          <h2>Fees and Premiums</h2>
          <p>
            Bail bond premiums may be non-refundable. Additional provider fees,
            service charges, financing costs, or court-related costs may apply
            depending on the provider and jurisdiction.
          </p>
        </article>
        <article className="card">
          <h2>Collateral and Financing</h2>
          <p>
            Collateral requirements, accepted collateral categories, down
            payments, financing availability, fees, interest, and repayment terms
            vary by provider.
          </p>
        </article>
        <article className="card">
          <h2>Digital Asset / Crypto Collateral Disclosure</h2>
          <p>
            Crypto values can fluctuate, and stablecoins may have issuer, reserve,
            redemption, freeze, and regulatory risks. BailX does not custody,
            convert, hold, value, or transfer crypto and does not guarantee any
            provider will accept crypto-related collateral.
          </p>
          <p>
            Never share private keys, seed phrases, wallet passwords, or login
            credentials. Any collateral terms must be reviewed directly with the
            independent provider.
          </p>
        </article>
        <article className="card">
          <h2>Legal Support</h2>
          <p>
            BailX does not replace legal counsel. Public defenders, nonprofit bail
            resources, pretrial services, or community legal organizations may be
            available in some areas.
          </p>
        </article>
        <article className="card">
          <h2>Before You Agree</h2>
          <ul className="question-list">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </article>
      </div>

      <p className="compliance-note">
        BailX does not guarantee release, provider approval, pricing, financing,
        timelines, or legal outcomes. Review the <Link to="/terms">Terms</Link>{" "}
        and <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </section>
  );
}
