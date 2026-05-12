import type { User } from "@supabase/supabase-js";
import type { Profile } from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";

export type UserRole = "consumer" | "agency" | "admin" | "attorney";

export type AuthResult =
  | {
      ok: true;
      user?: User | null;
      profile?: Profile | null;
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

export type ProfileInput = {
  auth_user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
};

export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentProfile() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}

export async function createOrUpdateProfile(input: ProfileInput): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      profile: {
        id: `mock-profile-${Date.now()}`,
        auth_user_id: input.auth_user_id,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      message: "Profile captured locally. Configure Supabase to save real profiles.",
    };
  }

  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", input.auth_user_id)
    .maybeSingle();

  if (lookupError) {
    return {
      ok: false,
      error: lookupError.message || "Unable to find profile.",
    };
  }

  const query = existingProfile
    ? supabase.from("profiles").update(input).eq("id", existingProfile.id)
    : supabase.from("profiles").insert(input);

  const { data, error } = await query.select("*").single();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to save profile.",
    };
  }

  return {
    ok: true,
    profile: data as Profile,
  };
}

export async function signUp(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      user: null,
      profile: {
        id: `mock-profile-${Date.now()}`,
        auth_user_id: "mock-auth-user",
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      message: "Mock sign up complete. Configure Supabase for real authentication.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone,
        role: input.role,
      },
    },
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to sign up.",
    };
  }

  if (data.user) {
    const profileResult = await createOrUpdateProfile({
      auth_user_id: data.user.id,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      role: input.role,
    });

    if (!profileResult.ok) {
      return profileResult;
    }

    return {
      ok: true,
      user: data.user,
      profile: profileResult.profile,
    };
  }

  return {
    ok: true,
    user: data.user,
    profile: null,
  };
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      user: null,
      profile: {
        id: `mock-profile-${Date.now()}`,
        auth_user_id: "mock-auth-user",
        full_name: "Mock Consumer",
        email: input.email,
        phone: "",
        role: "consumer",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      message: "Mock sign in complete. Configure Supabase for real authentication.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword(input);

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to sign in.",
    };
  }

  const profile = await getCurrentProfile();

  return {
    ok: true,
    user: data.user,
    profile,
  };
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function requireRole(role: UserRole) {
  const profile = await getCurrentProfile();
  return profile?.role === role ? profile : null;
}

export function getDashboardPathForRole(role?: string | null) {
  switch (role) {
    case "agency":
      return "/agency/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "attorney":
      return "/attorneys";
    case "consumer":
    default:
      return "/consumer/dashboard";
  }
}
