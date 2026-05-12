import { FormEvent, useState } from "react";
import {
  getDashboardPathForRole,
  signIn,
  signUp,
  type UserRole,
} from "../lib/auth";
import { RoleSelector } from "./RoleSelector";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  onComplete: (path: string) => void;
};

export function AuthForm({ mode, onComplete }: AuthFormProps) {
  const [role, setRole] = useState<UserRole>("consumer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const result =
      mode === "sign-up"
        ? await signUp({
            fullName: String(formData.get("fullName") || ""),
            email,
            phone: String(formData.get("phone") || ""),
            password,
            role,
          })
        : await signIn({ email, password });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    if (!result.profile) {
      setErrorMessage(
        mode === "sign-in"
          ? "Signed in, but no BailX profile was found for this account."
          : "Account created, but the BailX profile was not created. Please try signing in.",
      );
      return;
    }

    if (mode === "sign-up" && role === "agency") {
      onComplete("/agency/onboarding");
      return;
    }

    onComplete(getDashboardPathForRole(result.profile?.role || role));
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      {mode === "sign-up" ? (
        <>
          <label>
            Full name
            <input name="fullName" required />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" />
          </label>
          <RoleSelector value={role} onChange={setRole} />
        </>
      ) : null}
      <label>
        Email
        <input name="email" required type="email" />
      </label>
      <label>
        Password
        <input name="password" minLength={6} required type="password" />
      </label>
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
      <button className="button primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Working..." : mode === "sign-up" ? "Create Account" : "Sign In"}
      </button>
    </form>
  );
}
