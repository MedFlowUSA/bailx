import { FormEvent, useState } from "react";
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
    <form className="card form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Requester name
          <input name="requesterName" placeholder="Your full name" required />
        </label>
        <label>
          Requester phone
          <input name="requesterPhone" placeholder="(555) 000-0000" type="tel" required />
        </label>
        <label>
          Requester email
          <input name="requesterEmail" placeholder="you@example.com" type="email" required />
        </label>
        <label>
          Defendant name
          <input name="defendantName" placeholder="Person in custody" required />
        </label>
        <label>
          Jail or detention location
          <input name="jailLocation" placeholder="County jail or city" required />
        </label>
        <label>
          Jail city
          <input name="jailCity" placeholder="Los Angeles" />
        </label>
        <label>
          Jail county
          <input name="jailCounty" placeholder="Los Angeles" required />
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
      {successMessage ? <p className="form-message success">{successMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Emergency Request"}
      </button>
    </form>
  );
}
