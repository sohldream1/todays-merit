import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CauseArea, Organization, VerificationStatus } from "@todays-merit/shared-types";
import { ApiClientError, organizationsApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Field, Input, Select } from "../../components/ui";

const CAUSE_AREAS: CauseArea[] = [
  "community",
  "faith",
  "youth",
  "health",
  "environment",
  "arts_education",
  "other",
];

const VERIFICATION_STATUSES: VerificationStatus[] = ["unverified", "pending", "verified", "rejected"];

export function OrgProfileEditPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.organizationId) return;
    organizationsApi
      .get(user.organizationId)
      .then(({ organization }) => setOrganization(organization))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
  }, [user?.organizationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!organization || !user?.organizationId) return;

    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);
    try {
      const { organization: updated } = await organizationsApi.update(user.organizationId, {
        name: organization.name,
        missionStatement: organization.missionStatement || undefined,
        websiteUrl: organization.websiteUrl || undefined,
        logoUrl: organization.logoUrl || undefined,
        causeArea: organization.causeArea,
        city: organization.city || undefined,
        state: organization.state || undefined,
        country: organization.country || undefined,
        verificationStatus: organization.verificationStatus,
      });
      setOrganization(updated);
      setSuccessMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  function update<K extends keyof Organization>(key: K, value: Organization[K]) {
    setOrganization((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (isLoading) {
    return <div className="mx-auto max-w-lg px-6 py-12 text-slate-500">Loading…</div>;
  }

  if (!organization) {
    return <div className="mx-auto max-w-lg px-6 py-12 text-red-600">{error ?? "Organization not found"}</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link to="/dashboard/org" className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Edit organization profile</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Organization name">
          <Input required value={organization.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label="Mission statement">
          <Input value={organization.missionStatement ?? ""} onChange={(e) => update("missionStatement", e.target.value)} />
        </Field>
        <Field label="Website">
          <Input value={organization.websiteUrl ?? ""} onChange={(e) => update("websiteUrl", e.target.value)} />
        </Field>
        <Field label="Logo URL">
          <Input value={organization.logoUrl ?? ""} onChange={(e) => update("logoUrl", e.target.value)} />
        </Field>

        <Field label="Cause area">
          <Select value={organization.causeArea} onChange={(e) => update("causeArea", e.target.value as CauseArea)}>
            {CAUSE_AREAS.map((area) => (
              <option key={area} value={area}>
                {area.replace("_", " / ")}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex gap-4">
          <Field label="City" className="flex-1">
            <Input value={organization.city ?? ""} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="State" className="flex-1">
            <Input value={organization.state ?? ""} onChange={(e) => update("state", e.target.value)} />
          </Field>
          <Field label="Country" className="flex-1">
            <Input value={organization.country ?? ""} onChange={(e) => update("country", e.target.value)} />
          </Field>
        </div>

        <Field label="Verification status">
          <Select
            value={organization.verificationStatus}
            onChange={(e) => update("verificationStatus", e.target.value as VerificationStatus)}
          >
            {VERIFICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <span className="-mt-2 text-xs text-slate-400">
          Placeholder for the full vetting workflow — set manually for now.
        </span>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

        <Button type="submit" disabled={isSaving} className="mt-2">
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
