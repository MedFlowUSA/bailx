import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";

export function SignInPage() {
  const navigate = useNavigate();

  return (
    <section className="page-section narrow">
      <p className="eyebrow">Account access</p>
      <h1>Sign In</h1>
      <p>Access your BailX dashboard. Emergency intake remains available without an account.</p>
      <AuthForm mode="sign-in" onComplete={navigate} />
      <p>
        Need an account? <Link to="/auth/sign-up">Sign up</Link>
      </p>
    </section>
  );
}
