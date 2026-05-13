import { EmergencyIntakeForm } from "../components/EmergencyIntakeForm";
import { Link } from "react-router-dom";

export function GetHelpNowPage() {
  return (
    <section className="page-section narrow">
      <p className="urgent-label">Start now</p>
      <h1>Emergency Bail Request</h1>
      <p>
        Share the available details so licensed providers can evaluate the request
        and respond with next steps.
      </p>
      <p className="compliance-note">
        BailX is a technology marketplace, not a bail bond company or law firm.
        Review the <Link to="/consumer-disclosures">consumer disclosures</Link>{" "}
        before submitting sensitive request details.
      </p>
      <EmergencyIntakeForm />
    </section>
  );
}
