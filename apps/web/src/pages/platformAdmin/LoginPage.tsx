import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, ApiClientError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, Field, Input } from "../../components/ui";
import { dashboardPathForRole } from "../../lib/dashboardPath";

// No signup page here on purpose — platform admin accounts are provisioned
// by adding an email to PLATFORM_ADMIN_EMAILS server-side, not through a
// public form. Anyone can log in with any account here; the server decides
// whether that account actually resolves to the platform_admin role.
export function PlatformAdminLoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { user } = await authApi.login(form);
      setUser(user);
      navigate(dashboardPathForRole(user.role));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Platform admin log in</h1>
      <p className="mt-1 text-sm text-slate-500">Internal access for reviewing nonprofit verification submissions.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Email">
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
