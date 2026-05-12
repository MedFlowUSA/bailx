type SubscriptionTierBadgeProps = {
  tier: "Starter" | "Pro" | "Priority";
};

export function SubscriptionTierBadge({ tier }: SubscriptionTierBadgeProps) {
  return <span className={`tier-badge tier-${tier.toLowerCase()}`}>{tier}</span>;
}
