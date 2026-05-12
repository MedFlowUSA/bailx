import { FormEvent, useState } from "react";
import { SubscriptionTierBadge } from "../components/SubscriptionTierBadge";
import { createAgencyApplication } from "../lib/agencies";
import {
  getAgencyDocumentsForAgency,
  uploadAgencyDocument,
  type AgencyDocumentType,
} from "../lib/agencyDocuments";
import type { AgencyDocument } from "../types";

function splitList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AgencyOnboardingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submittedAgencyId, setSubmittedAgencyId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDocuments(agencyId: string) {
    const result = await getAgencyDocumentsForAgency(agencyId);

    if (result.ok) {
      setDocuments(result.documents);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await createAgencyApplication({
      business_name: String(formData.get("businessName") || ""),
      contact_name: String(formData.get("contactName") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      license_number: String(formData.get("licenseNumber") || ""),
      service_counties: splitList(formData.get("serviceCounties")),
      languages: splitList(formData.get("languages")),
      collateral_accepted: splitList(formData.get("collateralAccepted")),
      subscription_tier: String(formData.get("subscriptionTier") || "starter"),
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setSuccessMessage(result.message);
    setSubmittedAgencyId(result.id);
    await loadDocuments(result.id);
    event.currentTarget.reset();
  }

  async function handleDocumentUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!submittedAgencyId) {
      setErrorMessage("Submit your agency application before uploading documents.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const file = formData.get("documentFile");
    const documentType = String(formData.get("documentType") || "bail_license") as AgencyDocumentType;

    setIsUploading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = await uploadAgencyDocument({
      agencyId: submittedAgencyId,
      documentType,
      file: file instanceof File ? file : null,
    });

    setIsUploading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setSuccessMessage(result.message);
    await loadDocuments(submittedAgencyId);
    event.currentTarget.reset();
  }

  return (
    <section className="page-section narrow">
      <p className="eyebrow">Provider onboarding</p>
      <h1>Join BailX as a Licensed Agency</h1>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Business name
            <input name="businessName" required />
          </label>
          <label>
            Contact name
            <input name="contactName" required />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            License number
            <input name="licenseNumber" required />
          </label>
          <label>
            Service counties
            <input name="serviceCounties" placeholder="Los Angeles, Orange..." />
          </label>
          <label>
            Languages
            <input name="languages" placeholder="English, Spanish..." />
          </label>
          <label>
            Collateral accepted
            <input name="collateralAccepted" placeholder="Cash, title, property..." />
          </label>
          <label>
            Subscription tier placeholder
            <select name="subscriptionTier" defaultValue="pro">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </div>
        <div className="tier-row">
          <SubscriptionTierBadge tier="Starter" />
          <SubscriptionTierBadge tier="Pro" />
          <SubscriptionTierBadge tier="Priority" />
        </div>
        {successMessage ? <p className="form-message success">{successMessage}</p> : null}
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        <p className="compliance-note">
          BailX reviews agency information for marketplace eligibility but does not
          independently guarantee legal compliance, bond issuance, or service outcomes.
        </p>
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Agency Application"}
        </button>
      </form>

      {submittedAgencyId ? (
        <section className="card form-card">
          <div>
            <p className="eyebrow">Verification documents</p>
            <h2>Upload agency documents</h2>
            <p>
              Add license and verification files for admin review. Documents are
              stored in the private agency-documents bucket.
            </p>
          </div>
          <form className="form-grid" onSubmit={handleDocumentUpload}>
            <label>
              Document type
              <select name="documentType" defaultValue="bail_license">
                <option value="bail_license">Bail license</option>
                <option value="business_registration">Business registration</option>
                <option value="insurance_bond">Insurance / bond documentation</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Document file
              <input name="documentFile" type="file" required />
            </label>
            <button className="button primary" type="submit" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>

          {documents.length > 0 ? (
            <div className="agency-review-list">
              {documents.map((document) => (
                <div className="agency-review-item" key={document.id}>
                  <div>
                    <h3>{document.file_name}</h3>
                    <p>
                      {document.document_type.replace(/_/g, " ")} |{" "}
                      {document.review_status.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No documents uploaded yet.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
