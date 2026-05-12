import type { UserRole } from "../lib/auth";

type RoleSelectorProps = {
  value: UserRole;
  onChange: (role: UserRole) => void;
};

const roles: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "consumer", label: "Consumer", description: "Request help and compare offers." },
  { value: "agency", label: "Agency", description: "Apply and manage provider leads." },
  { value: "attorney", label: "Attorney", description: "Advertising tools coming soon." },
];

// Admin accounts are not available through public sign-up. During development,
// provision an admin by creating a normal user and manually setting
// profiles.role = 'admin' in Supabase. Production should use a secure
// server-side admin provisioning flow.

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <fieldset>
      <legend>Account type</legend>
      <div className="role-grid">
        {roles.map((role) => (
          <label className="role-option" key={role.value}>
            <input
              checked={value === role.value}
              name="role"
              type="radio"
              value={role.value}
              onChange={() => onChange(role.value)}
            />
            <span>
              <strong>{role.label}</strong>
              <small>{role.description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
