import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CauseArea } from "@todays-merit/shared-types";
import { authApi, ApiClientError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, Field, Input, Select } from "../../components/ui";

const CAUSE_AREAS: CauseArea[] = [
  "community",
  "faith",
  "youth",
  "health",
  "environment",
  "arts_education",
  "other",
];

const initialState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  orgName: "",
  ein: "",
  missionStatement: "",
  websiteUrl: "",
  causeArea: "community" as CauseArea,
  city: "",
  state: "",
  country: "",
};

export function NonprofitSignupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof typeof initialState>(key: K, value: (typeof initialState)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { user } = await authApi.signupNonprofit({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        organization: {
          name: form.orgName,
          ein: form.ein,
          missionStatement: form.missionStatement || undefined,
          websiteUrl: form.websiteUrl || undefined,
          causeArea: form.causeArea,
          city: form.city,
          state: form.state,
          country: form.country,
        },
      });
      setUser(user);
      navigate("/dashboard/org");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Create your nonprofit account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Already registered? <Link to="/login/nonprofit" className="text-indigo-600 hover:underline">Log in</Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-medium text-slate-900">Your account</legend>
          <div className="flex gap-4">
            <Field label="First name" className="flex-1">
              <Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
            </Field>
            <Field label="Last name" className="flex-1">
              <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
            </Field>
          </div>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={8}
            />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-sm font-medium text-slate-900">Your organization</legend>
          <Field label="Organization name">
            <Input value={form.orgName} onChange={(e) => update("orgName", e.target.value)} required />
          </Field>
          <Field label="EIN (Tax ID)">
            <Input value={form.ein} onChange={(e) => update("ein", e.target.value)} required />
          </Field>
          <Field label="Mission statement">
            <Input value={form.missionStatement} onChange={(e) => update("missionStatement", e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} />
          </Field>

          <Field label="Cause area">
            <Select value={form.causeArea} onChange={(e) => update("causeArea", e.target.value as CauseArea)}>
              {CAUSE_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area.replace("_", " / ")}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex gap-4">
            <Field label="City" className="flex-1">
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} required />
            </Field>
            <Field label="State" className="flex-1">
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} required />
            </Field>
            <Field label="Country" className="flex-1">
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} required />
            </Field>
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </div>
  );
}
