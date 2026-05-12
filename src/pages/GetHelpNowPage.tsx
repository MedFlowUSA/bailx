import { EmergencyIntakeForm } from "../components/EmergencyIntakeForm";

export function GetHelpNowPage() {
  return (
    <section className="page-section narrow">
      <p className="urgent-label">Start now</p>
      <h1>Emergency Bail Request</h1>
      <p>
        Share the available details so licensed providers can evaluate the request
        and respond with next steps.
      </p>
      <EmergencyIntakeForm />
    </section>
  );
}
