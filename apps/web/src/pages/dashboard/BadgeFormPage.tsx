import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { BadgeCriteriaType, BadgeType } from "@todays-merit/shared-types";
import { ApiClientError, badgesApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Field, Input, Select, Textarea } from "../../components/ui";

const BADGE_TYPES: BadgeType[] = ["volunteer_milestone", "donation_milestone", "competition", "custom"];
const CRITERIA_TYPES: BadgeCriteriaType[] = ["hours", "donation_total", "manual"];

const CRITERIA_LABELS: Record<BadgeCriteriaType, string> = {
  hours: "Verified volunteer hours",
  donation_total: "Total donated (USD)",
  manual: "Manually awarded (e.g. competition winners)",
};

const initialState = {
  name: "",
  description: "",
  iconUrl: "",
  badgeType: "volunteer_milestone" as BadgeType,
  criteriaType: "hours" as BadgeCriteriaType,
  threshold: "",
};

export function BadgeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id || !user?.organizationId) return;
    badgesApi
      .listForOrganization(user.organizationId)
      .then(({ badges }) => {
        const badge = badges.find((b) => b.id === id);
        if (!badge) {
          setError("Badge not found");
          return;
        }
        setForm({
          name: badge.name,
          description: badge.description ?? "",
          iconUrl: badge.iconUrl ?? "",
          badgeType: badge.badgeType,
          criteriaType: badge.criteria.type,
          threshold: String(badge.criteria.threshold),
        });
      })
      .finally(() => setIsLoading(false));
  }, [id, user?.organizationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        iconUrl: form.iconUrl || undefined,
        badgeType: form.badgeType,
        criteria: { type: form.criteriaType, threshold: Number(form.threshold) },
      };

      if (isEditing && id) {
        await badgesApi.update(id, payload);
      } else if (user?.organizationId) {
        await badgesApi.create({ organizationId: user.organizationId, ...payload });
      }
      navigate("/dashboard/org/badges");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="mx-auto max-w-lg px-6 py-12 text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link to="/dashboard/org/badges" className={buttonClasses("text")}>
        ← Back to badges
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">{isEditing ? "Edit badge" : "New badge"}</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Name">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        <Field label="Description">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        <Field label="Icon URL">
          <Input value={form.iconUrl} onChange={(e) => setForm({ ...form, iconUrl: e.target.value })} />
        </Field>

        <Field label="Badge type">
          <Select
            value={form.badgeType}
            onChange={(e) => {
              const badgeType = e.target.value as BadgeType;
              // Competitions have no numeric threshold to auto-check — default
              // to manual award, though the admin can still change it back.
              const criteriaType = badgeType === "competition" ? "manual" : form.criteriaType;
              setForm({ ...form, badgeType, criteriaType });
            }}
          >
            {BADGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-md border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700">Award criteria</div>
          <p className="mt-1 text-xs text-slate-400">
            {form.criteriaType === "manual"
              ? "No automatic threshold — you'll grant this badge to specific members yourself from the badges list (competition winners, one-off recognition)."
              : "This badge is awarded automatically the moment a member crosses this threshold with your organization."}
          </p>
          <div className="mt-3 flex gap-4">
            <Field label="Based on" className="flex-1">
              <Select
                value={form.criteriaType}
                onChange={(e) => setForm({ ...form, criteriaType: e.target.value as BadgeCriteriaType })}
              >
                {CRITERIA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CRITERIA_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            {form.criteriaType !== "manual" && (
              <Field label="Threshold" className="flex-1">
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                />
              </Field>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={isSaving} className="mt-2">
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create badge"}
        </Button>
      </form>
    </div>
  );
}
