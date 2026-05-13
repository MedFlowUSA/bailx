import { useEffect, useState } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import {
  getCurrentProfile,
  getCurrentUser,
  getDashboardPathForRole,
  type UserRole,
} from "../lib/auth";
import { getDemoProfile, isDemoModeEnabled } from "../lib/demoMode";
import { isSupabaseConfigured } from "../lib/supabase";
import type { Profile } from "../types";

type ProtectedRouteProps = {
  roles: UserRole[];
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  if (isDemoModeEnabled()) {
    const profile = getDemoProfile();

    if (profile && roles.includes(profile.role)) {
      return <Outlet />;
    }

    return (
      <section className="page-section narrow">
        <div className="card">
          <p className="eyebrow">Demo role required</p>
          <h1>Switch demo role</h1>
          <p>This route is not available for the current demo role.</p>
          <Link className="button primary" to={getDashboardPathForRole(profile?.role)}>
            Go to Current Demo Dashboard
          </Link>
        </div>
      </section>
    );
  }

  if (!isSupabaseConfigured) {
    return <Outlet />;
  }

  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const currentProfile = await getCurrentProfile();
        const currentUser = await getCurrentUser();
        setHasSession(Boolean(currentUser));
        setProfile(currentProfile);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load profile.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, []);

  if (isLoading) {
    return <section className="page-section">Checking access...</section>;
  }

  if (errorMessage) {
    return <section className="page-section form-message error">{errorMessage}</section>;
  }

  if (!profile) {
    if (hasSession) {
      return (
        <section className="page-section narrow">
          <div className="card">
            <p className="eyebrow">Missing profile</p>
            <h1>Profile setup is incomplete</h1>
            <p>This account is signed in, but no BailX profile is linked to it yet.</p>
            <Link className="button primary" to="/auth/sign-up">
              Create Profile
            </Link>
          </div>
        </section>
      );
    }

    return <Navigate replace to="/auth/sign-in" />;
  }

  if (!roles.includes(profile.role)) {
    return (
      <section className="page-section narrow">
        <div className="card">
          <p className="eyebrow">Unauthorized</p>
          <h1>Access not available</h1>
          <p>This dashboard is not available for your current BailX account type.</p>
          <Link className="button primary" to={getDashboardPathForRole(profile.role)}>
            Go to Dashboard
          </Link>
        </div>
      </section>
    );
  }

  return <Outlet />;
}
