import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { getCurrentProfile, getDashboardPathForRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

const navItems = [
  { to: "/get-help-now", label: "Get Help" },
  { to: "/agency/onboarding", label: "Agencies" },
  { to: "/admin/dashboard", label: "Admin" },
];

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

    return () => {
      isMounted = false;
      subscription?.data.subscription.unsubscribe();
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
          {profile ? (
            <>
              <NavLink to={getDashboardPathForRole(profile.role)}>Dashboard</NavLink>
              <NavLink to="/auth/sign-out">Sign Out</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/auth/sign-in">Sign In</NavLink>
              <NavLink to="/auth/sign-up">Sign Up</NavLink>
            </>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <strong>BailX compliance notice:</strong> BailX is not a bail bond company,
        broker, lender, law firm, or legal representative. BailX is a technology
        marketplace and advertising platform that connects consumers with
        independently licensed providers.
      </footer>
    </div>
  );
}
