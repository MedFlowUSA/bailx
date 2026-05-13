type MissingItemsListProps = {
  title: string;
  items: string[];
  emptyMessage: string;
  itemTargets?: Record<string, string>;
};

export function MissingItemsList({ title, items, emptyMessage, itemTargets = {} }: MissingItemsListProps) {
  return (
    <article className="card missing-items-card">
      <p className="eyebrow">Readiness</p>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ul className="checklist">
          {items.map((item) => (
            <li key={item}>
              {itemTargets[item] ? <a href={itemTargets[item]}>{item}</a> : item}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
