import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, ApiClientError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, Field, Input } from "../../components/ui";
import { TermsAgreement } from "../../components/TermsAgreement";

export function MemberSignupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { user } = await authApi.signupMember({ ...form, agreedToTerms });
      setUser(user);
      navigate("/dashboard/member");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Create your member account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Already have an account? <Link to="/login/member" className="text-indigo-600 hover:underline">Log in</Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex gap-4">
          <Field label="First name" className="flex-1">
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </Field>
          <Field label="Last name" className="flex-1">
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
        </Field>

        <TermsAgreement checked={agreedToTerms} onChange={setAgreedToTerms} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </div>
  );
}
