import {
  getRequestStatusDescription,
  getRequestStatusProgress,
  requestStatusSteps,
  type RequestStatus,
} from "../lib/requestStatus";

type RequestStatusTimelineProps = {
  status: RequestStatus;
  compact?: boolean;
};

export function RequestStatusTimeline({ status, compact = false }: RequestStatusTimelineProps) {
  const currentIndex = getRequestStatusProgress(status);
  const isCancelled = status === "cancelled";

  return (
    <div className={`status-timeline${compact ? " compact" : ""}${isCancelled ? " cancelled" : ""}`}>
      <div className="timeline-track" aria-hidden="true" />
      {requestStatusSteps.map((step, index) => {
        const isComplete = !isCancelled && index < currentIndex;
        const isCurrent = !isCancelled && index === currentIndex;

        return (
          <div
            className={`timeline-step${isComplete ? " complete" : ""}${isCurrent ? " current" : ""}`}
            key={step.status}
          >
            <span className="timeline-dot" />
            <div>
              <strong>{step.label}</strong>
              {!compact && isCurrent ? <p>{getRequestStatusDescription(status)}</p> : null}
            </div>
          </div>
        );
      })}
      {isCancelled ? (
        <p className="form-message error">{getRequestStatusDescription("cancelled")}</p>
      ) : null}
    </div>
  );
}
