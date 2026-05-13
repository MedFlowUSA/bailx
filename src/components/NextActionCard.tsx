import type { ReactNode } from "react";

type NextActionCardProps = {
  title?: string;
  action: string;
  children?: ReactNode;
};

export function NextActionCard({ title = "Recommended next action", action, children }: NextActionCardProps) {
  return (
    <article className="card next-action-card">
      <p className="eyebrow">Next action</p>
      <h2>{title}</h2>
      <p>{action}</p>
      {children}
    </article>
  );
}
