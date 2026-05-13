import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { DemoModeBanner } from "./DemoModeBanner";
import { getCurrentProfile } from "../lib/auth";
import { demoModeChangedEvent, isDemoModeEnabled } from "../lib/demoMode";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Profile } from "../types";

const navItems = [
  { to: "/get-help-now", label: "Get Help" },
  { to: "/agency/apply", label: "Agencies" },
  { to: "/admin/dashboard", label: "Admin" },
];

const roleNavItems: Record<Profile["role"], Array<{ to: string; label: string }>> = {
  consumer: [
    { to: "/consumer/dashboard", label: "Dashboard" },
    { to: "/consumer/dashboard", label: "My Requests" },
    { to: "/get-help-now", label: "Start Request" },
    { to: "/consumer-disclosures", label: "Disclosures" },
  ],
  agency: [
    { to: "/agency/dashboard", label: "Dashboard" },
    { to: "/agency/leads", label: "Leads" },
    { to: "/agency/onboarding", label: "Documents" },
    { to: "/agency/onboarding", label: "Agency File" },
    { to: "/agency/apply", label: "Apply/Profile" },
    { to: "/agency/claim", label: "Claim Listing" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/bail-requests", label: "Bail Requests" },
    { to: "/admin/agencies", label: "Agencies" },
    { to: "/admin/agency-documents", label: "Agency Documents" },
    { to: "/admin/notifications", label: "Notifications" },
    { to: "/admin/provider-directory", label: "Directory" },
  ],
  attorney: [
    { to: "/attorney/dashboard", label: "Attorney Dashboard" },
    { to: "/attorney/advertising", label: "Advertising" },
    { to: "/attorney/compliance", label: "Compliance" },
  ],
};

export function AppLayout() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const currentProfile = await getCurrentProfile();
        if (isMounted) {
          setProfile(currentProfile);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    }

    void loadProfile();

    const subscription = supabase?.auth.onAuthStateChange(() => {
      void loadProfile();
    });
    const demoListener = () => void loadProfile();
    window.addEventListener(demoModeChangedEvent, demoListener);
    window.addEventListener("storage", demoListener);

    return () => {
      isMounted = false;
      subscription?.data.subscription.unsubscribe();
      window.removeEventListener(demoModeChangedEvent, demoListener);
      window.removeEventListener("storage", demoListener);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="BailX home">
          <img className="brand-logo" src="/bailx-logo-transparent.png" alt="" />
        </Link>
        <nav className="top-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
          {isDemoModeEnabled() ? <NavLink to="/demo">Demo Guide</NavLink> : null}
          {profile ? (
            <>
              {roleNavItems[profile.role].map((item) => (
                <NavLink key={`${item.to}-${item.label}`} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
              <NavLink to="/auth/sign-out">Sign Out</NavLink>
            </>
          ) : (
            <>
              {!isSupabaseConfigured ? (
                <NavLink to="/admin/notifications">Notifications</NavLink>
              ) : null}
              <NavLink to="/auth/sign-in">Sign In</NavLink>
              <NavLink to="/auth/sign-up">Sign Up</NavLink>
            </>
          )}
        </nav>
      </header>
      <DemoModeBanner />
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          <strong>BailX compliance notice:</strong> BailX is not a bail bond
          company, broker, lender, law firm, or legal representative. BailX is a
          technology marketplace and advertising platform that connects consumers
          with independently licensed providers.
        </p>
        <nav className="footer-links" aria-label="Legal and trust links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/compliance">Compliance</Link>
          <Link to="/consumer-disclosures">Consumer Disclosures</Link>
          <Link to="/agency/apply">Agency Apply</Link>
          <Link to="/agency/claim">Claim Listing</Link>
        </nav>
      </footer>
    </div>
  );
}
