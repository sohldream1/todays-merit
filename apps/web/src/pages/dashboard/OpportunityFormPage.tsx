import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { OpportunityCategory } from "@todays-merit/shared-types";
import { ApiClientError, opportunitiesApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Field, Input, Select, Textarea } from "../../components/ui";

const CATEGORIES: OpportunityCategory[] = ["volunteer", "race", "competition"];

const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  volunteer: "Volunteer opportunity",
  race: "Race",
  competition: "Competition",
};

const initialState = {
  title: "",
  description: "",
  location: "",
  isRemote: false,
  startDate: "",
  endDate: "",
  category: "volunteer" as OpportunityCategory,
};

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function OpportunityFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDirector = user?.role === "race_director";
  const categoryOptions = isDirector ? CATEGORIES.filter((c) => c !== "volunteer") : CATEGORIES;

  const [form, setForm] = useState(() => ({
    ...initialState,
    category: (isDirector ? "race" : "volunteer") as OpportunityCategory,
  }));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    opportunitiesApi
      .get(id)
      .then(({ opportunity }) =>
        setForm({
          title: opportunity.title,
          description: opportunity.description ?? "",
          location: opportunity.location ?? "",
          isRemote: opportunity.isRemote,
          startDate: toDateInputValue(opportunity.startDate),
          endDate: toDateInputValue(opportunity.endDate),
          category: opportunity.category,
        }),
      )
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        isRemote: form.isRemote,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        category: form.category,
      };

      if (isEditing && id) {
        await opportunitiesApi.update(id, payload);
      } else if (user?.organizationId) {
        await opportunitiesApi.create({ organizationId: user.organizationId, ...payload });
      }
      navigate("/dashboard/org/opportunities");
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
      <Link to="/dashboard/org/opportunities" className={buttonClasses("text")}>
        ← Back to {isDirector ? "races & competitions" : "opportunities"}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">
        {isEditing ? "Edit opportunity" : "New opportunity"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Type">
          <Select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as OpportunityCategory })}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>

        <Field label="Description">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        <Field label={form.category === "volunteer" ? "Location" : "Location / course"}>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isRemote}
            onChange={(e) => setForm({ ...form, isRemote: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-slate-700">
            {form.category === "volunteer" ? "This opportunity is remote" : "This is a virtual event"}
          </span>
        </label>

        <div className="flex gap-4">
          <Field label={form.category === "volunteer" ? "Start date" : "Date"} className="flex-1">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="End date (optional — ongoing if blank)" className="flex-1">
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={isSaving} className="mt-2">
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create opportunity"}
        </Button>
      </form>
    </div>
  );
}
