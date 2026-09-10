import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Organization } from "@todays-merit/shared-types";
import { authApi, organizationsApi, ApiClientError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, Field, Input } from "../../components/ui";
import { TermsAgreement } from "../../components/TermsAgreement";
import { dashboardPathForRole } from "../../lib/dashboardPath";

export function RaceDirectorSignupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [orgQuery, setOrgQuery] = useState("");
  const [orgResults, setOrgResults] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedOrg || orgQuery.trim().length < 2) {
      setOrgResults([]);
      return;
    }
    setError(null);
    const timeout = setTimeout(() => {
      organizationsApi.list({ q: orgQuery }).then(({ organizations }) => setOrgResults(organizations.slice(0, 8)));
    }, 250);
    return () => clearTimeout(timeout);
  }, [orgQuery, selectedOrg]);

  function chooseOrg(org: Organization) {
    setSelectedOrg(org);
    setOrgQuery(org.name);
    setOrgResults([]);
  }

  function clearOrg() {
    setSelectedOrg(null);
    setOrgQuery("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedOrg) {
      setError("Select the organization you're directing a race or competition for.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { user } = await authApi.signupRaceDirector({
        firstName,
        lastName,
        email,
        password,
        organizationId: selectedOrg.id,
        agreedToTerms,
      });
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
      <h1 className="text-2xl font-semibold text-slate-900">Sign up as a Race/Competition Director</h1>
      <p className="mt-1 text-sm text-slate-500">
        Already registered? <Link to="/login/race-director" className="text-indigo-600 hover:underline">Log in</Link>
      </p>
      <p className="mt-3 text-sm text-slate-500">
        For someone running a race or competition on behalf of an existing nonprofit — not registering a
        new organization. Don't see your org listed?{" "}
        <Link to="/signup/nonprofit" className="text-indigo-600 hover:underline">
          Register it first
        </Link>
        .
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
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </Field>

        <Field label="Organization">
          {selectedOrg ? (
            <div className="flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm">
              <span>{selectedOrg.name}</span>
              <button type="button" onClick={clearOrg} className="text-xs font-medium text-indigo-600 hover:underline">
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search by organization name…"
                value={orgQuery}
                onChange={(e) => setOrgQuery(e.target.value)}
              />
              {orgResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-md">
                  {orgResults.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => chooseOrg(org)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">{org.name}</div>
                      {org.city && <div className="text-xs text-slate-500">{org.city}{org.state ? `, ${org.state}` : ""}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        <TermsAgreement checked={agreedToTerms} onChange={setAgreedToTerms} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </div>
  );
}
