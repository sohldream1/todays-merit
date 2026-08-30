import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiClientError, campaignsApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Field, Input, Textarea } from "../../components/ui";

const initialState = {
  title: "",
  description: "",
  goalAmount: "",
  startDate: "",
  endDate: "",
};

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function CampaignFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    campaignsApi
      .get(id)
      .then(({ campaign }) =>
        setForm({
          title: campaign.title,
          description: campaign.description ?? "",
          goalAmount: String(campaign.goalAmount),
          startDate: toDateInputValue(campaign.startDate),
          endDate: toDateInputValue(campaign.endDate),
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
        goalAmount: Number(form.goalAmount),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };

      if (isEditing && id) {
        await campaignsApi.update(id, payload);
      } else if (user?.organizationId) {
        await campaignsApi.create({ organizationId: user.organizationId, ...payload });
      }
      navigate("/dashboard/org/campaigns");
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
      <Link to="/dashboard/org/campaigns" className={buttonClasses("text")}>
        ← Back to campaigns
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">
        {isEditing ? "Edit campaign" : "New campaign"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Title">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>

        <Field label="Description">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        <Field label="Goal amount (USD)">
          <Input
            type="number"
            min="1"
            step="0.01"
            required
            disabled={isEditing}
            value={form.goalAmount}
            onChange={(e) => setForm({ ...form, goalAmount: e.target.value })}
            className="disabled:bg-slate-50 disabled:text-slate-400"
          />
        </Field>

        <div className="flex gap-4">
          <Field label="Start date" className="flex-1">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="End date" className="flex-1">
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={isSaving} className="mt-2">
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create campaign"}
        </Button>

        {!isEditing && (
          <p className="text-xs text-slate-400">New campaigns start as drafts — activate them from the campaigns list once ready.</p>
        )}
      </form>
    </div>
  );
}
