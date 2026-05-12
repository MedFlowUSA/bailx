import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "../lib/auth";

export function SignOutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function endSession() {
      await signOut();
      navigate("/");
    }

    void endSession();
  }, [navigate]);

  return <section className="page-section">Signing out...</section>;
}
