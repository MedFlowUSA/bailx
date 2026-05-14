import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearDemoRole,
  demoModeChangedEvent,
  getDemoRole,
  isDemoModeEnabled,
  setDemoRole,
  type DemoRole,
} from "../lib/demoMode";
import { resetDemoState } from "../lib/demoStore";

const roleOptions: Array<{ role: DemoRole; label: string; path: string }> = [
  { role: "consumer", label: "Consumer Demo", path: "/consumer/dashboard" },
  { role: "agency", label: "Agency Demo", path: "/agency/dashboard" },
  { role: "admin", label: "Admin Demo", path: "/admin/dashboard" },
  { role: "attorney", label: "Attorney Demo", path: "/attorney/dashboard" },
];

export function DemoModeBanner() {
  const navigate = useNavigate();
  const [role, setRole] = useState<DemoRole>(getDemoRole());

  useEffect(() => {
    function handleDemoModeChange() {
      setRole(getDemoRole());
    }

    window.addEventListener(demoModeChangedEvent, handleDemoModeChange);
    window.addEventListener("storage", handleDemoModeChange);

    return () => {
      window.removeEventListener(demoModeChangedEvent, handleDemoModeChange);
      window.removeEventListener("storage", handleDemoModeChange);
    };
  }, []);

  if (!isDemoModeEnabled()) {
    return null;
  }

  function switchRole(nextRole: DemoRole, path?: string) {
    setDemoRole(nextRole);
    setRole(nextRole);
    navigate(path || roleOptions.find((item) => item.role === nextRole)?.path || "/demo");
  }

  function handleResetDemoData() {
    resetDemoState();
    setRole(getDemoRole());
  }

  function handleResetSession() {
    clearDemoRole();
    resetDemoState();
    setRole(getDemoRole());
    navigate("/demo");
  }

  return (
    <aside className="demo-mode-banner" aria-label="Demo mode controls">
      <div>
        <strong>Demo Mode Active</strong>
        <span>Role: {roleOptions.find((item) => item.role === role)?.label || role}</span>
        <small>
          Demo flag enabled. Seeded data only; no real requests, providers, SMS, email, payment,
          crypto, or legal service is triggered.
        </small>
        {import.meta.env.PROD ? (
          <span className="demo-production-warning">Demo Mode is enabled in a production build.</span>
        ) : null}
      </div>
      <div className="demo-mode-controls">
        <button className="button secondary" type="button" onClick={() => navigate("/demo")}>
          Open Demo Guide
        </button>
        <select
          aria-label="Switch demo role"
          value={role}
          onChange={(event) => switchRole(event.target.value as DemoRole)}
        >
          {roleOptions.map((item) => (
            <option key={item.role} value={item.role}>
              {item.label}
            </option>
          ))}
        </select>
        {roleOptions.map((item) => (
          <button
            className={item.role === role ? "button primary" : "button secondary"}
            key={item.role}
            type="button"
            onClick={() => switchRole(item.role, item.path)}
          >
            {item.label}
          </button>
        ))}
        <button className="button secondary" type="button" onClick={handleResetDemoData}>
          Reset Demo Data
        </button>
        <button className="button secondary danger-button" type="button" onClick={handleResetSession}>
          Reset Demo Session
        </button>
      </div>
    </aside>
  );
}
