import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminNote, getAdminNotesForEntity } from "../lib/adminNotes";
import { updateAgencyVerificationStatus } from "../lib/agencies";
import { getRecentAgencyApplications } from "../lib/adminDashboard";
import {
  getProviderSeeds,
  importProviderSeed,
  type ProviderDirectoryImportResult,
} from "../lib/providerDirectorySeeds";
import type { Agency } from "../types";
import type { AdminNote } from "../types";

function formatStatus(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "Not recorded";
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export function AdminProviderDirectoryPage() {
  const [providers, setProviders] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportingSeedId, setIsImportingSeedId] = useState<string | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notesByProviderId, setNotesByProviderId] = useState<Record<string, AdminNote[]>>({});
  const seedResult = getProviderSeeds();
  const seeds = seedResult.ok ? seedResult.seeds : [];

  async function loadDirectory(options: { preserveStatusMessage?: boolean } = {}) {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getRecentAgencyApplications(200);
    setIsLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    const directoryProviders = result.agencies.filter(
      (agency) =>
        agency.verification_status === "unclaimed_directory" ||
        Boolean(agency.source_type || agency.source_url),
    );
    setProviders(directoryProviders);
    await loadProviderNotes(directoryProviders);
    if (!options.preserveStatusMessage) {
      setStatusMessage(
        result.mocked ? "Showing mock provider directory data until Supabase is configured." : null,
      );
    }
  }

  useEffect(() => {
    void loadDirectory();
  }, []);

  async function loadProviderNotes(nextProviders: Agency[]) {
    const entries = await Promise.all(
      nextProviders.map(async (provider) => {
        const result = await getAdminNotesForEntity("agency", provider.id);
        return [provider.id, result.ok ? result.notes : []] as const;
      }),
    );

    setNotesByProviderId((current) => ({ ...current, ...Object.fromEntries(entries) }));
  }

  async function handleImportSeed(seedId: string) {
    setIsImportingSeedId(seedId);
    setErrorMessage(null);
    setStatusMessage(null);

    const result: ProviderDirectoryImportResult = await importProviderSeed(seedId);
    setIsImportingSeedId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setStatusMessage(result.message);
    await loadDirectory({ preserveStatusMessage: true });
  }

  async function handleDirectoryNote(
    agency: Agency,
    message: string,
    action: "outreach_started" | "claim_invited",
  ) {
    setIsUpdatingId(agency.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await createAdminNote({
      entityType: "agency",
      entityId: agency.id,
      noteType: "system_event",
      message,
      metadata: {
        action,
        verification_status: agency.verification_status,
        source_url: agency.source_url || null,
      },
    });
    setIsUpdatingId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setStatusMessage(message);
    await loadProviderNotes(providers.filter((provider) => provider.id === agency.id));
  }

  async function handleConvertToPending(agency: Agency) {
    const reviewNotes = window.prompt(
      "Only convert after the provider has contacted BailX. Add the contact method or internal note.",
    );

    if (!reviewNotes) {
      return;
    }

    setIsUpdatingId(agency.id);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await updateAgencyVerificationStatus(
      agency.id,
      "pending",
      `Provider contacted BailX. ${reviewNotes}`,
    );
    setIsUpdatingId(null);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    await createAdminNote({
      entityType: "agency",
      entityId: agency.id,
      noteType: "status_change",
      message: "Converted unclaimed directory listing to pending verification after provider contact.",
      metadata: {
        previous_status: agency.verification_status,
        new_status: "pending",
        review_notes: reviewNotes,
      },
    });

    setStatusMessage(result.message);
    await loadDirectory({ preserveStatusMessage: true });
  }

  return (
    <section className="page-section">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Admin directory</p>
          <h1>Provider Directory Seeds</h1>
          <p>
            Import and manage unclaimed provider listings for coverage mapping and outreach only.
          </p>
        </div>
        <div className="hero-actions">
          <button className="button secondary" type="button" onClick={() => void loadDirectory()}>
            Refresh
          </button>
          <Link className="button secondary" to="/admin/agencies">
            Agency Verification
          </Link>
        </div>
      </div>

      <p className="compliance-note">
        Unclaimed directory providers are not BailX verified, cannot receive live bail request
        details, cannot submit offers, and must not be described as partners or approved providers.
      </p>

      <article className="card admin-list-card">
        <div className="admin-list-header">
          <div>
            <p className="eyebrow">Available seeds</p>
            <h2>Public directory seed queue</h2>
          </div>
        </div>
        {seeds.map((seed) => (
          <div className="admin-compact-row" key={seed.id}>
            <span>
              <strong>{seed.providerName}</strong>
              <small>
                {seed.sourceType} | {seed.serviceCounties.join(", ")}
              </small>
              <small>{seed.publicListingDisclaimer}</small>
            </span>
            <button
              className="button primary"
              type="button"
              disabled={isImportingSeedId === seed.id}
              onClick={() => void handleImportSeed(seed.id)}
            >
              {isImportingSeedId === seed.id ? "Importing..." : "Import seed"}
            </button>
          </div>
        ))}
      </article>

      {isLoading ? <p>Loading provider directory...</p> : null}
      {statusMessage ? <p className="form-message success">{statusMessage}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      {!isLoading && providers.length === 0 ? <p>No unclaimed provider listings found.</p> : null}

      <div className="admin-card-list">
        {providers.map((provider) => (
          <article className="card admin-request-card" key={provider.id}>
            <div className="request-card-header">
              <div>
                <p className="eyebrow">{formatStatus(provider.verification_status)}</p>
                <h2>{provider.business_name || "Unnamed provider"}</h2>
                <p>{provider.public_listing_disclaimer || "Unclaimed public directory listing."}</p>
              </div>
              <span className="soft-badge">
                {provider.claimed_by_profile_id ? "Claim started" : "Unclaimed"}
              </span>
            </div>

            <dl className="agency-detail-grid">
              <div>
                <dt>Phone</dt>
                <dd>{provider.phone || "Not listed"}</dd>
              </div>
              <div>
                <dt>Website/source</dt>
                <dd>
                  {provider.source_url ? (
                    <a href={provider.source_url} target="_blank" rel="noreferrer">
                      {provider.source_url}
                    </a>
                  ) : (
                    "Not listed"
                  )}
                </dd>
              </div>
              <div>
                <dt>Source type</dt>
                <dd>{provider.source_type || "Not listed"}</dd>
              </div>
              <div>
                <dt>Service counties</dt>
                <dd>{provider.service_counties?.join(", ") || "Not listed"}</dd>
              </div>
              <div>
                <dt>Claimed at</dt>
                <dd>{formatDate(provider.claimed_at)}</dd>
              </div>
              <div>
                <dt>Claimed by profile</dt>
                <dd>{provider.claimed_by_profile_id || "Not claimed"}</dd>
              </div>
            </dl>

            {(notesByProviderId[provider.id] || []).length > 0 ? (
              <div className="admin-note-list">
                <p className="eyebrow">Admin notes</p>
                {(notesByProviderId[provider.id] || []).map((note) => (
                  <div className="admin-note-row" key={note.id}>
                    <span>{note.message || note.note}</span>
                    <small>{formatDate(note.created_at)}</small>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="action-row">
              <button
                className="button secondary"
                type="button"
                disabled={isUpdatingId === provider.id}
                onClick={() =>
                  void handleDirectoryNote(
                    provider,
                    "Admin marked outreach started for unclaimed provider listing.",
                    "outreach_started",
                  )
                }
              >
                Mark outreach started
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={isUpdatingId === provider.id}
                onClick={() =>
                  void handleDirectoryNote(
                    provider,
                    "Admin prepared invite for provider to claim unclaimed directory listing.",
                    "claim_invited",
                  )
                }
              >
                Invite provider to claim
              </button>
              <button
                className="button primary"
                type="button"
                disabled={
                  isUpdatingId === provider.id ||
                  provider.verification_status !== "unclaimed_directory"
                }
                onClick={() => void handleConvertToPending(provider)}
              >
                Convert to pending verification
              </button>
              <Link className="button secondary" to={`/admin/agencies/${provider.id}`}>
                View agency file
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
