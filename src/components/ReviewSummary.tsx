type ReviewSummaryProps = {
  rating: string;
  count: number;
};

export function ReviewSummary({ rating, count }: ReviewSummaryProps) {
  return (
    <div className="review-summary">
      <strong>{rating}</strong>
      <span>{count} verified reviews</span>
    </div>
  );
}
