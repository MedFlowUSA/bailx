import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";

export function SignUpPage() {
  const navigate = useNavigate();

  return (
    <section className="page-section narrow">
      <p className="eyebrow">Create account</p>
      <h1>Sign Up</h1>
      <p>Consumers can still submit emergency requests first and create an account after.</p>
      <AuthForm mode="sign-up" onComplete={navigate} />
      <p>
        Already have an account? <Link to="/auth/sign-in">Sign in</Link>
      </p>
    </section>
  );
}
