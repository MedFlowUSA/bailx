import type { ProgressTone } from "../lib/customerProgress";

type ProgressSummaryCardProps = {
  eyebrow: string;
  title: string;
  completionPercent: number;
  statusLabel: string;
  statusTone: ProgressTone;
  completedCount: number;
  totalCount: number;
};

export function ProgressSummaryCard({
  eyebrow,
  title,
  completionPercent,
  statusLabel,
  statusTone,
  completedCount,
  totalCount,
}: ProgressSummaryCardProps) {
  return (
    <article className="card progress-summary-card">
      <div className="request-card-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{completedCount} of {totalCount} readiness items complete</p>
        </div>
        <span className={`status-pill ${statusTone}`}>{statusLabel}</span>
      </div>
      <div
        className="progress-meter"
        aria-label={`${title} completion ${completionPercent}%`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completionPercent}
      >
        <span style={{ width: `${completionPercent}%` }} />
      </div>
      <strong>{completionPercent}% complete</strong>
    </article>
  );
}
