import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { OrgInviteDetails } from "@todays-merit/shared-types";
import { ApiClientError, teamInvitesApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { dashboardPathForRole } from "../../lib/dashboardPath";
import { Button, Field, Input } from "../../components/ui";

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [invite, setInvite] = useState<OrgInviteDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    teamInvitesApi
      .get(token)
      .then(setInvite)
      .catch((err) => setLoadError(err instanceof ApiClientError ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const { user } = await teamInvitesApi.accept(token, { firstName, lastName, password });
      setUser(user);
      navigate(dashboardPathForRole(user.role));
    } catch (err) {
      setSubmitError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="mx-auto max-w-sm px-6 py-16 text-slate-500">Loading…</div>;
  }

  if (loadError || !invite) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">Invite not found</h1>
        <p className="mt-2 text-sm text-red-600">{loadError ?? "This invite link isn't valid."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Join {invite.organizationName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Create your account to accept this invite as <span className="font-medium">{invite.email}</span>.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex gap-4">
          <Field label="First name" className="flex-1">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label="Last name" className="flex-1">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Joining…" : "Join team"}
        </Button>
      </form>
    </div>
  );
}
