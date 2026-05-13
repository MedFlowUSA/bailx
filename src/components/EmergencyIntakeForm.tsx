import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { createBailRequest } from "../lib/bailRequests";
import { CollateralOptions } from "./CollateralOptions";

const cryptoAssetOptions = ["Bitcoin", "Ethereum", "Solana", "USDC", "USDT", "Other"];

const cryptoValueRanges = [
  "Under $1,000",
  "$1,000-$5,000",
  "$5,000-$10,000",
  "$10,000-$25,000",
  "$25,000+",
];

const cryptoWalletTypes = [
  "Coinbase",
  "Crypto.com",
  "Binance.US",
  "Self-custody wallet",
  "Other",
  "Prefer not to say",
];

const stablecoinOptions = ["USDC", "USDT", "Agency preference", "Not sure"];

function parseBondAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function EmergencyIntakeForm() {
  const [hasCryptoCollateral, setHasCryptoCollateral] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const cryptoSelected = formData.get("hasCryptoCollateral") === "on";
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
      has_crypto_collateral: cryptoSelected,
      crypto_assets: cryptoSelected ? formData.getAll("cryptoAssets").map(String) : [],
      estimated_crypto_value: cryptoSelected
        ? String(formData.get("estimatedCryptoValue") || "")
        : "",
      crypto_wallet_type: cryptoSelected ? String(formData.get("cryptoWalletType") || "") : "",
      willing_to_convert_to_stablecoin:
        cryptoSelected && formData.get("willingToConvertToStablecoin") === "on",
      preferred_stablecoin: cryptoSelected ? String(formData.get("preferredStablecoin") || "") : "",
      crypto_collateral_notes: cryptoSelected
        ? String(formData.get("cryptoCollateralNotes") || "")
        : "",
      crypto_collateral_acknowledged:
        cryptoSelected && formData.get("cryptoCollateralAcknowledged") === "on",
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
    setHasCryptoCollateral(false);
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
      <fieldset className="disclosure-box">
        <legend>Crypto Collateral Option</legend>
        <p>
          If you have digital assets that you may be willing to use as collateral,
          BailX can share that information with approved independent providers who
          may review it. BailX does not hold, convert, custody, value, transfer, or
          guarantee acceptance of crypto.
        </p>
        <label className="check-option">
          <input
            name="hasCryptoCollateral"
            type="checkbox"
            checked={hasCryptoCollateral}
            onChange={(event) => setHasCryptoCollateral(event.target.checked)}
          />
          <span>I may have crypto assets available as potential collateral.</span>
        </label>
        {hasCryptoCollateral ? (
          <div className="form-grid">
            <fieldset className="span-2">
              <legend>Asset categories</legend>
              <div className="check-grid">
                {cryptoAssetOptions.map((asset) => (
                  <label className="check-option" key={asset}>
                    <input name="cryptoAssets" type="checkbox" value={asset} />
                    <span>{asset}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Estimated crypto value range
              <select name="estimatedCryptoValue" defaultValue="">
                <option value="">Select a range</option>
                {cryptoValueRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Wallet or account type
              <select name="cryptoWalletType" defaultValue="">
                <option value="">Select one</option>
                {cryptoWalletTypes.map((walletType) => (
                  <option key={walletType} value={walletType}>
                    {walletType}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-option">
              <input name="willingToConvertToStablecoin" type="checkbox" />
              <span>Willing to discuss converting to a stablecoin with the provider.</span>
            </label>
            <label>
              Preferred stablecoin
              <select name="preferredStablecoin" defaultValue="">
                <option value="">Select one</option>
                {stablecoinOptions.map((stablecoin) => (
                  <option key={stablecoin} value={stablecoin}>
                    {stablecoin}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Crypto collateral notes
              <textarea
                name="cryptoCollateralNotes"
                placeholder="Optional asset context. Do not include wallet addresses, private keys, seed phrases, passwords, screenshots, or login details."
              />
            </label>
            <label className="check-option span-2">
              <input name="cryptoCollateralAcknowledged" type="checkbox" required />
              <span>
                I understand BailX does not custody, convert, hold, value, guarantee, or
                transfer crypto assets. Any crypto collateral arrangement must be reviewed
                directly with the independent provider and may be subject to legal,
                financial, tax, compliance, and volatility risks.
              </span>
            </label>
          </div>
        ) : null}
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
