import type { Agency, AgencyDocument } from "../types";
import { countAgencyDocumentsByStatus } from "../lib/agencyProgress";

type AgencyVerificationChecklistProps = {
  agency: Agency | null;
  documents: AgencyDocument[];
  leadCount: number;
};

export function AgencyVerificationChecklist({
  agency,
  documents,
  leadCount,
}: AgencyVerificationChecklistProps) {
  const counts = countAgencyDocumentsByStatus(documents);
  const items = [
    { label: "Agency profile created", completed: Boolean(agency) },
    { label: "License information added", completed: Boolean(agency?.license_number) },
    {
      label: "Service counties added",
      completed: Boolean(agency?.service_counties && agency.service_counties.length > 0),
    },
    { label: "Languages added", completed: Boolean(agency?.languages && agency.languages.length > 0) },
    {
      label: "Collateral preferences added",
      completed: Boolean(agency?.collateral_accepted && agency.collateral_accepted.length > 0),
    },
    { label: "Verification documents uploaded", completed: documents.length > 0 },
    { label: "Documents approved", completed: counts.approved > 0 },
    { label: "Marketplace review approved", completed: agency?.verification_status === "approved" },
    {
      label: "Ready to receive leads",
      completed: agency?.verification_status === "approved",
      detail: agency?.verification_status === "approved" ? `${leadCount} matched leads currently visible` : undefined,
    },
  ];

  return (
    <article className="card agency-command-card">
      <p className="eyebrow">Verification checklist</p>
      <h2>Marketplace readiness checklist</h2>
      <div className="checklist-grid">
        {items.map((item) => (
          <div className="check-row" key={item.label}>
            <span className={item.completed ? "status-pill positive" : "soft-badge"}>
              {item.completed ? "Complete" : "Open"}
            </span>
            <span>
              {item.label}
              {item.detail ? <small>{item.detail}</small> : null}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
