import { Link } from "react-router-dom";

export function TermsPage() {
  return (
    <section className="page-section legal-page">
      <p className="eyebrow">BailX trust center</p>
      <h1>Terms of Use</h1>
      <p>
        BailX is a technology marketplace and advertising platform. BailX is not
        a bail bond company, bail broker, lender, law firm, attorney, or legal
        representative.
      </p>

      <div className="legal-grid">
        <article className="card">
          <h2>Marketplace Role</h2>
          <p>
            BailX helps consumers submit request information and compare responses
            from independent providers. BailX does not issue bail bonds,
            underwrite bonds, custody collateral, or set provider pricing.
          </p>
        </article>
        <article className="card">
          <h2>No Legal Advice</h2>
          <p>
            BailX does not provide legal advice, legal representation, case
            strategy, or court guidance. Consumers should consult a licensed
            attorney for legal questions.
          </p>
        </article>
        <article className="card">
          <h2>No Guarantees</h2>
          <p>
            BailX does not guarantee release, provider approval, pricing,
            premiums, financing, timelines, collateral acceptance, provider
            quality, or any legal or custody outcome.
          </p>
        </article>
        <article className="card">
          <h2>Independent Providers</h2>
          <p>
            Providers are independent third parties. Users are responsible for
            reviewing every provider term directly, asking questions, and getting
            all final terms in writing before agreeing.
          </p>
        </article>
      </div>

      <p className="compliance-note">
        These terms are product disclosures for the BailX marketplace experience.
        Review the <Link to="/privacy">Privacy Policy</Link>,{" "}
        <Link to="/compliance">Compliance</Link>, and{" "}
        <Link to="/consumer-disclosures">Consumer Disclosures</Link>.
      </p>
    </section>
  );
}
