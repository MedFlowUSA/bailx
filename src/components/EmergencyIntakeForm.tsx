import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { createBailRequest } from "../lib/bailRequests";
import { CollateralOptions } from "./CollateralOptions";

function parseBondAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function EmergencyIntakeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await createBailRequest({
      requester_name: String(formData.get("requesterName") || ""),
      requester_phone: String(formData.get("requesterPhone") || ""),
      requester_email: String(formData.get("requesterEmail") || ""),
      defendant_name: String(formData.get("defendantName") || ""),
      jail_location: String(formData.get("jailLocation") || ""),
      jail_city: String(formData.get("jailCity") || ""),
      jail_county: String(formData.get("jailCounty") || ""),
      jail_state: String(formData.get("jailState") || ""),
      jail_zip: String(formData.get("jailZip") || ""),
      bond_amount: parseBondAmount(formData.get("bondAmount")),
      charges: String(formData.get("charges") || ""),
      urgency_level: String(formData.get("urgencyLevel") || "urgent"),
      preferred_language: String(formData.get("preferredLanguage") || ""),
      collateral_available: formData.getAll("collateral").map(String),
      notes: String(formData.get("notes") || ""),
      consent_marketplace_share: formData.get("consentMarketplaceShare") === "on",
      consent_no_legal_advice: formData.get("consentNoLegalAdvice") === "on",
      consent_terms_privacy: formData.get("consentTermsPrivacy") === "on",
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setSuccessMessage(
      result.mocked
        ? `${result.message} Reference: ${result.id}`
        : `Request submitted successfully. Reference: ${result.id}`,
    );
    event.currentTarget.reset();
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit} aria-describedby="intake-disclosure">
      <div className="form-grid">
        <label>
          Requester name <span className="required-marker">Required</span>
          <input name="requesterName" placeholder="Your full name" required aria-required="true" />
        </label>
        <label>
          Requester phone <span className="required-marker">Required</span>
          <input
            name="requesterPhone"
            placeholder="(555) 000-0000"
            type="tel"
            required
            aria-required="true"
          />
        </label>
        <label>
          Requester email <span className="required-marker">Required</span>
          <input
            name="requesterEmail"
            placeholder="you@example.com"
            type="email"
            required
            aria-required="true"
          />
        </label>
        <label>
          Defendant name <span className="required-marker">Required</span>
          <input name="defendantName" placeholder="Person in custody" required aria-required="true" />
        </label>
        <label>
          Jail or detention location <span className="required-marker">Required</span>
          <input
            name="jailLocation"
            placeholder="County jail or city"
            required
            aria-required="true"
          />
        </label>
        <label>
          Jail city
          <input name="jailCity" placeholder="Los Angeles" />
        </label>
        <label>
          Jail county <span className="required-marker">Required</span>
          <input name="jailCounty" placeholder="Los Angeles" required aria-required="true" />
        </label>
        <label>
          Jail state
          <input name="jailState" placeholder="CA" maxLength={2} />
        </label>
        <label>
          Jail ZIP
          <input name="jailZip" placeholder="90012" inputMode="numeric" />
        </label>
        <label>
          Bond amount
          <input name="bondAmount" placeholder="$25,000" inputMode="decimal" />
        </label>
        <label className="span-2">
          Charges, optional
          <input name="charges" placeholder="Known charges or case details" />
        </label>
        <label>
          Urgency level
          <select name="urgencyLevel" defaultValue="urgent">
            <option value="standard">Standard</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          Preferred language
          <input name="preferredLanguage" placeholder="English, Spanish..." />
        </label>
      </div>
      <fieldset>
        <legend>Collateral available</legend>
        <CollateralOptions />
      </fieldset>
      <label>
        Notes
        <textarea name="notes" placeholder="Anything providers should know now" />
      </label>
      <div className="disclosure-box" id="intake-disclosure">
        <strong>Marketplace disclosure</strong>
        <p>
          By submitting this request, you understand that BailX is a technology
          marketplace and may share your request details with approved independent
          providers who may respond with offers. BailX is not a bail bond company,
          lender, law firm, or legal representative and does not guarantee release,
          pricing, approval, financing, or timing.
        </p>
        <label className="check-option">
          <input name="consentMarketplaceShare" type="checkbox" required />
          <span>I understand BailX may share this request with approved independent providers.</span>
        </label>
        <label className="check-option">
          <input name="consentNoLegalAdvice" type="checkbox" required />
          <span>I understand BailX does not provide legal advice or guarantee release.</span>
        </label>
        <label className="check-option">
          <input name="consentTermsPrivacy" type="checkbox" required />
          <span>
            I agree to the <Link to="/terms">Terms</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </span>
        </label>
      </div>
      {successMessage ? (
        <p className="form-message success" role="status" aria-live="polite">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="form-message error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Emergency Request"}
      </button>
    </form>
  );
}
