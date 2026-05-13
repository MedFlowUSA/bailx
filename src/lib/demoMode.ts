import type { Profile } from "../types";
import type { UserRole } from "./auth";

export type DemoRole = Extract<UserRole, "consumer" | "agency" | "admin" | "attorney">;

const demoRoleKey = "bailx.demo.role";
export const demoModeChangedEvent = "bailx-demo-mode-changed";

const allowedDemoRoles: DemoRole[] = ["consumer", "agency", "admin", "attorney"];

const demoProfiles: Record<DemoRole, Profile> = {
  consumer: {
    id: "demo-profile-consumer",
    auth_user_id: "demo-auth-consumer",
    full_name: "Maria Demo Customer",
    phone: "555-0101",
    email: "maria.demo@example.com",
    role: "consumer",
    created_at: "2026-05-01T15:00:00.000Z",
    updated_at: "2026-05-01T15:00:00.000Z",
  },
  agency: {
    id: "demo-profile-agency",
    auth_user_id: "demo-auth-agency",
    full_name: "Elena Demo Provider",
    phone: "555-0102",
    email: "provider.demo@example.com",
    role: "agency",
    created_at: "2026-05-01T15:05:00.000Z",
    updated_at: "2026-05-01T15:05:00.000Z",
  },
  admin: {
    id: "demo-profile-admin",
    auth_user_id: "demo-auth-admin",
    full_name: "Admin Demo Operator",
    phone: "555-0103",
    email: "admin.demo@example.com",
    role: "admin",
    created_at: "2026-05-01T15:10:00.000Z",
    updated_at: "2026-05-01T15:10:00.000Z",
  },
  attorney: {
    id: "demo-profile-attorney",
    auth_user_id: "demo-auth-attorney",
    full_name: "Avery Demo Attorney",
    phone: "555-0104",
    email: "attorney.demo@example.com",
    role: "attorney",
    created_at: "2026-05-01T15:15:00.000Z",
    updated_at: "2026-05-01T15:15:00.000Z",
  },
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function emitDemoModeChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(demoModeChangedEvent));
  }
}

function normalizeRole(value: string | null): DemoRole {
  return allowedDemoRoles.includes(value as DemoRole) ? (value as DemoRole) : "consumer";
}

export function isDemoModeEnabled() {
  return import.meta.env.VITE_BAILX_DEMO_MODE === "true";
}

export function getDemoRole(): DemoRole {
  if (!isDemoModeEnabled() || !canUseStorage()) {
    return "consumer";
  }

  return normalizeRole(window.localStorage.getItem(demoRoleKey));
}

export function setDemoRole(role: DemoRole) {
  if (!isDemoModeEnabled() || !canUseStorage()) {
    return;
  }

  window.localStorage.setItem(demoRoleKey, role);
  emitDemoModeChanged();
}

export function clearDemoRole() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(demoRoleKey);
  emitDemoModeChanged();
}

export function getDemoProfile(): Profile | null {
  if (!isDemoModeEnabled()) {
    return null;
  }

  return demoProfiles[getDemoRole()];
}

export function getDemoUserLabel() {
  const profile = getDemoProfile();
  return profile ? `${profile.full_name} (${profile.role})` : "Demo user";
}
