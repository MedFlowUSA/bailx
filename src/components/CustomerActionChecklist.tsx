import type { AgencyOffer, BailRequest, CustomerRequestTask } from "../types";
import { getCustomerRequestProgress } from "../lib/customerProgress";
import type { CustomerTaskKey } from "../lib/customerRequestTasks";

type CustomerActionChecklistProps = {
  request: BailRequest;
  offers: AgencyOffer[];
  tasks: CustomerRequestTask[];
  isUpdatingTask?: string | null;
  onToggleTask: (taskKey: CustomerTaskKey, completed: boolean) => void;
};

const manualTasks: Array<{ key: CustomerTaskKey; label: string }> = [
  { key: "documents_ready", label: "Documents and collateral information prepared" },
  { key: "family_notified", label: "Family or support person notified" },
  { key: "provider_contacted", label: "Selected provider contacted manually" },
  { key: "terms_confirmed", label: "Provider terms confirmed in writing" },
];

export function CustomerActionChecklist({
  request,
  offers,
  tasks,
  isUpdatingTask,
  onToggleTask,
}: CustomerActionChecklistProps) {
  const selectedProvider = offers.some((offer) => offer.status === "selected");
  const progress = getCustomerRequestProgress(request, {
    offerCount: offers.length,
    hasSelectedProvider: selectedProvider,
  });
  const taskMap = Object.fromEntries(tasks.map((task) => [task.task_key, task]));
  const automaticItems = [
    { label: "Request submitted", completed: Boolean(request.created_at) },
    {
      label: "Contact information complete",
      completed: Boolean(request.requester_phone || request.requester_email),
    },
    { label: "Jail/location details complete", completed: !progress.missingItems.includes("Jail or booking location") },
    {
      label: "Bond/charge information complete",
      completed:
        !progress.missingItems.includes("Bond amount") &&
        !progress.missingItems.includes("Charge information"),
    },
    {
      label: "Collateral information added",
      completed: !progress.missingItems.includes("Collateral information"),
    },
    { label: "Offers received", completed: offers.length > 0 },
    { label: "Provider selected", completed: selectedProvider },
  ];

  return (
    <article className="card agency-command-card">
      <p className="eyebrow">Customer checklist</p>
      <h2>Action checklist</h2>
      <div className="checklist-grid">
        {automaticItems.map((item) => (
          <div className="check-row" key={item.label}>
            <span className={item.completed ? "status-pill positive" : "soft-badge"}>
              {item.completed ? "Complete" : "Open"}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
        {manualTasks.map((item) => {
          const task = taskMap[item.key];
          const completed = Boolean(task?.completed);

          return (
            <label className="check-option" key={item.key}>
              <input
                type="checkbox"
                checked={completed}
                disabled={isUpdatingTask === item.key}
                onChange={(event) => onToggleTask(item.key, event.target.checked)}
              />
              <span>{item.label}</span>
            </label>
          );
        })}
      </div>
    </article>
  );
}
