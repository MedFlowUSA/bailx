import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AgencyOfferCard } from "../components/AgencyOfferCard";
import { CustomerActionChecklist } from "../components/CustomerActionChecklist";
import { CustomerNextSteps } from "../components/CustomerNextSteps";
import { MissingItemsList } from "../components/MissingItemsList";
import { NextActionCard } from "../components/NextActionCard";
import { ProviderQuestions } from "../components/ProviderQuestions";
import { ProgressSummaryCard } from "../components/ProgressSummaryCard";
import { RequestStatusTimeline } from "../components/RequestStatusTimeline";
import { SelectedProviderPanel } from "../components/SelectedProviderPanel";
import { getOffersForBailRequest, selectAgencyOffer } from "../lib/agencyOffers";
import {
  getBailRequestById,
  updateCustomerBailRequestPacket,
} from "../lib/consumerRequests";
import {
  getCustomerOfferNotesForRequest,
  saveCustomerOfferNote,
} from "../lib/customerOfferNotes";
import { getCustomerRequestProgress } from "../lib/customerProgress";
import {
  getCustomerRequestTasks,
  setCustomerRequestTask,
  type CustomerTaskKey,
} from "../lib/customerRequestTasks";
import { getRequestStatusLabel } from "../lib/requestStatus";
import type { AgencyOffer, BailRequest, CustomerOfferNote, CustomerRequestTask } from "../types";

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not listed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatList(value?: string[] | null) {
  return value && value.length > 0 ? value.join(", ") : "Not listed";
}

function parseBondAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

const providerChoiceGuidance = [
  "Confirm the total amount due today.",
  "Ask whether the premium is refundable or non-refundable.",
  "Ask what collateral is required.",
  "Ask whether financing includes fees or interest.",
  "Ask who the main point of contact is.",
  "Ask what happens if the defendant misses court.",
  "Ask for all terms in writing.",
];

const collateralOptions = ["Cash", "Vehicle title", "Property", "Payment plan", "Co-signer"];
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
const missingItemTargets: Record<string, string> = {
  "Jail or booking location": "#request-packet-jail",
  "Jail county and state": "#request-packet-jail",
  "Charge information": "#request-packet-bond",
  "Bond amount": "#request-packet-bond",
  "Preferred language": "#request-packet-language",
  "Collateral information": "#request-packet-collateral",
  "Crypto collateral information": "#request-packet-crypto",
};

export function ConsumerRequestDetailPage() {
  const { id } = useParams();
  const [bailRequest, setBailRequest] = useState<BailRequest | null>(null);
  const [offers, setOffers] = useState<AgencyOffer[]>([]);
  const [tasks, setTasks] = useState<CustomerRequestTask[]>([]);
  const [offerNotes, setOfferNotes] = useState<CustomerOfferNote[]>([]);
  const [offerNoteDrafts, setOfferNoteDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectingOfferId, setSelectingOfferId] = useState<string | null>(null);
  const [isSavingPacket, setIsSavingPacket] = useState(false);
  const [updatingTaskKey, setUpdatingTaskKey] = useState<string | null>(null);
  const [savingOfferNoteId, setSavingOfferNoteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedOffer = offers.find((offer) => offer.status === "selected");
  const requestProgress = bailRequest
    ? getCustomerRequestProgress(bailRequest, {
        offerCount: offers.length,
        hasSelectedProvider: Boolean(selectedOffer),
      })
    : null;

  async function loadRequestAndOffers() {
    if (!id) {
      setErrorMessage("Missing request id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const requestResult = await getBailRequestById(id);

    if (!requestResult.ok) {
      setIsLoading(false);
      setErrorMessage(requestResult.error);
      return;
    }

    if (!requestResult.bailRequest) {
      setIsLoading(false);
      setBailRequest(null);
      setOffers([]);
      return;
    }

    const [offersResult, tasksResult, notesResult] = await Promise.all([
      getOffersForBailRequest(id),
      getCustomerRequestTasks(id),
      getCustomerOfferNotesForRequest(id),
    ]);
    setIsLoading(false);

    if (!offersResult.ok) {
      setErrorMessage(offersResult.error);
      return;
    }

    setBailRequest(requestResult.bailRequest);
    setOffers(offersResult.offers);
    if (tasksResult.ok) {
      setTasks(tasksResult.tasks);
    }
    if (notesResult.ok) {
      setOfferNotes(notesResult.notes);
      setOfferNoteDrafts(
        Object.fromEntries(notesResult.notes.map((note) => [note.offer_id, note.note || ""])),
      );
    }
    setStatusMessage(
      requestResult.mocked || offersResult.mocked
        ? "Showing mock comparison data until Supabase is configured."
        : null,
    );
  }

  useEffect(() => {
    void loadRequestAndOffers();
  }, [id]);

  async function handleSelectOffer(offer: AgencyOffer) {
    if (!bailRequest || selectedOffer) {
      return;
    }

    setSelectingOfferId(offer.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await selectAgencyOffer(offer.id, bailRequest.id);
    setSelectingOfferId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    await loadRequestAndOffers();
    setStatusMessage(result.message);
  }

  async function handlePacketSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bailRequest) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const hasCryptoCollateral = formData.get("hasCryptoCollateral") === "on";

    setIsSavingPacket(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateCustomerBailRequestPacket(bailRequest.id, {
      jail_location: String(formData.get("jailLocation") || ""),
      jail_city: String(formData.get("jailCity") || ""),
      jail_county: String(formData.get("jailCounty") || ""),
      jail_state: String(formData.get("jailState") || ""),
      jail_zip: String(formData.get("jailZip") || ""),
      bond_amount: parseBondAmount(formData.get("bondAmount")),
      charges: String(formData.get("charges") || ""),
      preferred_language: String(formData.get("preferredLanguage") || ""),
      collateral_available: formData.getAll("collateral").map(String),
      notes: String(formData.get("notes") || ""),
      has_crypto_collateral: hasCryptoCollateral,
      crypto_assets: hasCryptoCollateral ? formData.getAll("cryptoAssets").map(String) : [],
      estimated_crypto_value: hasCryptoCollateral
        ? String(formData.get("estimatedCryptoValue") || "")
        : "",
      crypto_wallet_type: hasCryptoCollateral ? String(formData.get("cryptoWalletType") || "") : "",
      willing_to_convert_to_stablecoin:
        hasCryptoCollateral && formData.get("willingToConvertToStablecoin") === "on",
      preferred_stablecoin: hasCryptoCollateral
        ? String(formData.get("preferredStablecoin") || "")
        : "",
      crypto_collateral_notes: hasCryptoCollateral
        ? String(formData.get("cryptoCollateralNotes") || "")
        : "",
      crypto_collateral_acknowledged:
        hasCryptoCollateral && formData.get("cryptoCollateralAcknowledged") === "on",
    });
    setIsSavingPacket(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setBailRequest(result.bailRequest);
    setStatusMessage(result.message);
  }

  async function handleToggleTask(taskKey: CustomerTaskKey, completed: boolean) {
    if (!bailRequest) {
      return;
    }

    setUpdatingTaskKey(taskKey);
    setErrorMessage(null);
    const result = await setCustomerRequestTask(bailRequest.id, taskKey, completed);
    setUpdatingTaskKey(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setTasks((current) => [
      ...current.filter((task) => task.task_key !== taskKey),
      result.task,
    ]);
  }

  async function handleSaveOfferNote(offer: AgencyOffer) {
    if (!bailRequest) {
      return;
    }

    setSavingOfferNoteId(offer.id);
    setErrorMessage(null);
    const result = await saveCustomerOfferNote({
      offerId: offer.id,
      bailRequestId: bailRequest.id,
      note: offerNoteDrafts[offer.id] || "",
    });
    setSavingOfferNoteId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setOfferNotes((current) => [
      ...current.filter((note) => note.offer_id !== offer.id),
      result.note,
    ]);
    setStatusMessage(result.message);
  }

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Consumer request</p>
          <h1>Request Command Center</h1>
          <p>
            Review each offer carefully and confirm all terms directly with the provider.
          </p>
        </div>
        <Link className="button secondary" to="/consumer/dashboard">
          Back to Requests
        </Link>
      </div>

      {isLoading ? <p>Loading request and offers...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

      {bailRequest ? (
        <article className="card request-summary-card">
          <div>
            <p className="eyebrow">Request status: {getRequestStatusLabel(bailRequest.status)}</p>
            <h2>{bailRequest.defendant_name || "Defendant not listed"}</h2>
            <p>
              {bailRequest.jail_location || "Jail not listed"} |{" "}
              {bailRequest.jail_county || "County not listed"}
            </p>
          </div>
          <strong>{formatMoney(bailRequest.bond_amount)}</strong>
        </article>
      ) : !isLoading ? (
        <p>No request found.</p>
      ) : null}

      {selectedOffer ? <SelectedProviderPanel offer={selectedOffer} /> : null}

      {bailRequest && requestProgress ? (
        <section className="dashboard-grid">
          <ProgressSummaryCard
            eyebrow="Request progress"
            title="Packet readiness"
            completionPercent={requestProgress.completionPercent}
            statusLabel={requestProgress.statusLabel}
            statusTone={requestProgress.statusTone}
            completedCount={requestProgress.completedItems.length}
            totalCount={requestProgress.completedItems.length + requestProgress.missingItems.length}
          />
          <MissingItemsList
            title="Missing items"
            items={requestProgress.missingItems}
            emptyMessage="The core request packet is complete."
            itemTargets={missingItemTargets}
          />
          <NextActionCard action={requestProgress.nextRecommendedAction}>
            <dl className="agency-detail-grid">
              <div>
                <dt>Offer count</dt>
                <dd>{offers.length}</dd>
              </div>
              <div>
                <dt>Provider selected</dt>
                <dd>{selectedOffer ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </NextActionCard>
        </section>
      ) : null}

      {bailRequest ? (
        <section className="dashboard-grid">
          <CustomerActionChecklist
            request={bailRequest}
            offers={offers}
            tasks={tasks}
            isUpdatingTask={updatingTaskKey}
            onToggleTask={handleToggleTask}
          />
          <article className="card agency-command-card">
            <p className="eyebrow">Documents & information</p>
            <h2>Documents & Information to Prepare</h2>
            <ul className="checklist">
              <li>Booking number if available</li>
              <li>Photo ID</li>
              <li>Proof of address</li>
              <li>Payment method</li>
              <li>Collateral documentation</li>
              <li>Court paperwork if available</li>
            </ul>
            <p>
              Use the checklist to mark documents and support information as prepared. BailX does
              not collect uploads in this section yet.
            </p>
          </article>
        </section>
      ) : null}

      {bailRequest ? (
        <section className="card form-card" id="improve-request-packet">
          <p className="eyebrow">Improve request packet</p>
          <h2>Update provider-review details</h2>
          <p>
            Update non-identity details that help approved providers evaluate the request. BailX
            does not guarantee release, pricing, financing, timing, or collateral acceptance.
          </p>
          <form className="form-grid" onSubmit={handlePacketSubmit}>
            <fieldset className="span-2" id="request-packet-jail">
              <legend>Jail location</legend>
              <div className="form-grid">
                <label>
                  Jail name/location
                  <input name="jailLocation" defaultValue={bailRequest.jail_location || ""} />
                </label>
                <label>
                  Jail city
                  <input name="jailCity" defaultValue={bailRequest.jail_city || ""} />
                </label>
                <label>
                  Jail county
                  <input name="jailCounty" defaultValue={bailRequest.jail_county || ""} />
                </label>
                <label>
                  Jail state
                  <input name="jailState" maxLength={2} defaultValue={bailRequest.jail_state || ""} />
                </label>
                <label>
                  Jail ZIP
                  <input name="jailZip" inputMode="numeric" defaultValue={bailRequest.jail_zip || ""} />
                </label>
              </div>
            </fieldset>
            <fieldset className="span-2" id="request-packet-bond">
              <legend>Bond and charges</legend>
              <div className="form-grid">
                <label>
                  Bond amount
                  <input
                    name="bondAmount"
                    inputMode="decimal"
                    defaultValue={bailRequest.bond_amount ?? ""}
                  />
                </label>
                <label>
                  Charge information
                  <input name="charges" defaultValue={bailRequest.charges || ""} />
                </label>
              </div>
            </fieldset>
            <label id="request-packet-language">
              Preferred language
              <input name="preferredLanguage" defaultValue={bailRequest.preferred_language || ""} />
            </label>
            <fieldset className="span-2" id="request-packet-collateral">
              <legend>Collateral available</legend>
              <div className="check-grid">
                {collateralOptions.map((option) => (
                  <label className="check-option" key={option}>
                    <input
                      name="collateral"
                      type="checkbox"
                      value={option}
                      defaultChecked={bailRequest.collateral_available?.includes(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="span-2" id="request-packet-crypto">
              <legend>Crypto collateral option</legend>
              <label className="check-option">
                <input
                  name="hasCryptoCollateral"
                  type="checkbox"
                  defaultChecked={Boolean(bailRequest.has_crypto_collateral)}
                />
                <span>Crypto collateral may be available for provider review.</span>
              </label>
              <div className="form-grid">
                <fieldset className="span-2">
                  <legend>Asset categories</legend>
                  <div className="check-grid">
                    {cryptoAssetOptions.map((asset) => (
                      <label className="check-option" key={asset}>
                        <input
                          name="cryptoAssets"
                          type="checkbox"
                          value={asset}
                          defaultChecked={bailRequest.crypto_assets?.includes(asset)}
                        />
                        <span>{asset}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label>
                  Estimated crypto value range
                  <select name="estimatedCryptoValue" defaultValue={bailRequest.estimated_crypto_value || ""}>
                    <option value="">Select a range</option>
                    {cryptoValueRanges.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Wallet/account type
                  <select name="cryptoWalletType" defaultValue={bailRequest.crypto_wallet_type || ""}>
                    <option value="">Select one</option>
                    {cryptoWalletTypes.map((walletType) => (
                      <option key={walletType} value={walletType}>
                        {walletType}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check-option">
                  <input
                    name="willingToConvertToStablecoin"
                    type="checkbox"
                    defaultChecked={Boolean(bailRequest.willing_to_convert_to_stablecoin)}
                  />
                  <span>Willing to discuss stablecoin conversion directly with provider.</span>
                </label>
                <label>
                  Preferred stablecoin
                  <select name="preferredStablecoin" defaultValue={bailRequest.preferred_stablecoin || ""}>
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
                    defaultValue={bailRequest.crypto_collateral_notes || ""}
                    placeholder="Do not include wallet addresses, seed phrases, private keys, passwords, screenshots, or login details."
                  />
                </label>
                <label className="check-option span-2">
                  <input
                    name="cryptoCollateralAcknowledged"
                    type="checkbox"
                    defaultChecked={Boolean(bailRequest.crypto_collateral_acknowledged)}
                  />
                  <span>
                    I understand BailX does not custody, convert, hold, value, guarantee, or
                    transfer crypto assets.
                  </span>
                </label>
              </div>
            </fieldset>
            <label className="span-2">
              Notes
              <textarea name="notes" defaultValue={bailRequest.notes || ""} />
            </label>
            <button className="button primary" type="submit" disabled={isSavingPacket}>
              {isSavingPacket ? "Saving..." : "Save Request Packet"}
            </button>
          </form>
        </section>
      ) : null}

      {bailRequest ? (
        <section className="section-grid customer-detail-grid">
          <article className="card">
            <p className="eyebrow">Request overview</p>
            <h2>Current status</h2>
            <RequestStatusTimeline status={bailRequest.status} />
          </article>
          <article className="card">
            <p className="eyebrow">Defendant and jail</p>
            <h2>{bailRequest.defendant_name || "Defendant not listed"}</h2>
            <dl className="agency-detail-grid">
              <div>
                <dt>Jail</dt>
                <dd>{bailRequest.jail_location || "Not listed"}</dd>
              </div>
              <div>
                <dt>County</dt>
                <dd>{bailRequest.jail_county || "Not listed"}</dd>
              </div>
              <div>
                <dt>City / State</dt>
                <dd>
                  {[bailRequest.jail_city, bailRequest.jail_state].filter(Boolean).join(", ") ||
                    "Not listed"}
                </dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{bailRequest.preferred_language || "Not listed"}</dd>
              </div>
            </dl>
          </article>
          <article className="card">
            <p className="eyebrow">Bail and bond</p>
            <h2>{formatMoney(bailRequest.bond_amount)}</h2>
            <dl className="agency-detail-grid">
              <div>
                <dt>Charges</dt>
                <dd>{bailRequest.charges || "Not listed"}</dd>
              </div>
              <div>
                <dt>Collateral available</dt>
                <dd>{bailRequest.collateral_available?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Urgency</dt>
                <dd>{bailRequest.urgency_level}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{new Date(bailRequest.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </article>
          <article className="card activity-log">
            <p className="eyebrow">Activity</p>
            <h2>Request timeline</h2>
            <ul>
              <li>Your request has been submitted.</li>
              <li>Approved providers may review your request and submit offers.</li>
              {offers.length > 0 ? <li>Offers are available for review.</li> : null}
              {selectedOffer ? <li>Provider selected. Contact them directly for next steps.</li> : null}
            </ul>
          </article>
          <article className="card guidance-card">
            <p className="eyebrow">Before you choose</p>
            <h2>Provider questions</h2>
            <ul className="question-list">
              {providerChoiceGuidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          {bailRequest.has_crypto_collateral ? (
            <article className="card guidance-card">
              <p className="eyebrow">Potential Crypto Collateral</p>
              <h2>Digital asset availability</h2>
              <dl className="agency-detail-grid">
                <div>
                  <dt>Asset categories</dt>
                  <dd>{formatList(bailRequest.crypto_assets)}</dd>
                </div>
                <div>
                  <dt>Estimated value range</dt>
                  <dd>{bailRequest.estimated_crypto_value || "Not listed"}</dd>
                </div>
                <div>
                  <dt>Stablecoin willingness</dt>
                  <dd>{bailRequest.willing_to_convert_to_stablecoin ? "Yes" : "Not indicated"}</dd>
                </div>
                <div>
                  <dt>Preferred stablecoin</dt>
                  <dd>{bailRequest.preferred_stablecoin || "Not listed"}</dd>
                </div>
                {bailRequest.crypto_collateral_notes ? (
                  <div className="agency-review-notes">
                    <dt>Notes</dt>
                    <dd>{bailRequest.crypto_collateral_notes}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="compliance-note">
                BailX only records your stated collateral availability. BailX does not custody,
                convert, value, or transfer crypto. Discuss all collateral terms directly with the
                selected provider.
              </p>
            </article>
          ) : null}
        </section>
      ) : null}

      {bailRequest ? (
        <section className="card">
          <p className="eyebrow">Agency offers</p>
          <h2>Compare provider responses</h2>
          <p>
            BailX does not issue bonds or guarantee release outcomes. Confirm
            pricing, collateral, documents, and timing directly with each provider.
          </p>
          <div className="offer-comparison-grid">
            {!isLoading && offers.length === 0 ? (
              <p>No offers have been submitted yet.</p>
            ) : null}
            {offers.map((offer) => (
              <div className="offer-review-stack" key={offer.id}>
                <AgencyOfferCard
                  offer={offer}
                  disabled={Boolean(selectedOffer)}
                  isSelecting={selectingOfferId === offer.id}
                  onSelect={handleSelectOffer}
                />
                <article className="card card-subsection">
                  <p className="eyebrow">Private comparison note</p>
                  <h3>Provider note</h3>
                  <label>
                    Save a private note
                    <textarea
                      value={offerNoteDrafts[offer.id] || ""}
                      onChange={(event) =>
                        setOfferNoteDrafts((current) => ({
                          ...current,
                          [offer.id]: event.target.value,
                        }))
                      }
                      placeholder="Example: Asked about total due today, financing terms, collateral requirements, and written terms."
                    />
                  </label>
                  <div className="action-row">
                    <button
                      className="button secondary"
                      type="button"
                      disabled={savingOfferNoteId === offer.id}
                      onClick={() => void handleSaveOfferNote(offer)}
                    >
                      {savingOfferNoteId === offer.id ? "Saving..." : "Save provider note"}
                    </button>
                    {offerNotes.find((note) => note.offer_id === offer.id)?.updated_at ? (
                      <span className="soft-badge">
                        Saved {new Date(
                          offerNotes.find((note) => note.offer_id === offer.id)?.updated_at || "",
                        ).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="compliance-note">
                    These notes are private to your account and are for organizing provider
                    comparison questions. BailX does not provide legal or financial advice.
                  </p>
                </article>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {bailRequest ? (
        <div className="section-grid customer-guidance-grid">
          <CustomerNextSteps />
          <ProviderQuestions />
        </div>
      ) : null}

      <p className="compliance-note">
        BailX is a technology marketplace and advertising platform. BailX does not
        provide legal advice, issue bail bonds, set provider terms, or guarantee
        release outcomes.
      </p>
    </section>
  );
}
