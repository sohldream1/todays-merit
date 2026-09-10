import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { TeamOverview } from "@todays-merit/shared-types";
import { ApiClientError, teamApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Card, Field, Input } from "../../components/ui";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function TeamPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    if (!user?.organizationId) return;
    setIsLoading(true);
    teamApi
      .get(user.organizationId)
      .then(setOverview)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user?.organizationId]);

  const isOwner = overview?.currentUserRole === "owner";

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!user?.organizationId) return;
    setError(null);
    setInviteSent(null);
    setIsInviting(true);
    try {
      await teamApi.invite(user.organizationId, { email });
      setInviteSent(email);
      setEmail("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!user?.organizationId) return;
    setError(null);
    setBusyId(inviteId);
    try {
      await teamApi.revokeInvite(user.organizationId, inviteId);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(orgAdminId: string) {
    if (!user?.organizationId) return;
    setError(null);
    setBusyId(orgAdminId);
    try {
      await teamApi.removeMember(user.organizationId, orgAdminId);
      setConfirmingRemoveId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return <div className="mx-auto max-w-lg px-6 py-12 text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link to="/dashboard/org" className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Team</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everyone with a login on this organization's account. Invited teammates get full access to
        everything except managing the team — that stays with the owner.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-6">
        <h2 className="text-sm font-medium text-slate-900">Members</h2>
        <div className="mt-3 flex flex-col divide-y divide-slate-100">
          {overview?.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="font-medium text-slate-900">
                  {member.user.firstName} {member.user.lastName}
                  {member.user.id === user?.id && <span className="text-slate-400"> (you)</span>}
                </div>
                <div className="text-sm text-slate-500">{member.user.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {member.role}
                </span>
                {isOwner && member.role !== "owner" && (
                  confirmingRemoveId === member.id ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === member.id}
                        onClick={() => handleRemove(member.id)}
                      >
                        {busyId === member.id ? "Removing…" : "Confirm"}
                      </Button>
                      <Button variant="text" size="sm" onClick={() => setConfirmingRemoveId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="textDanger" size="sm" onClick={() => setConfirmingRemoveId(member.id)}>
                      Remove
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {overview && overview.invites.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-sm font-medium text-slate-900">Pending invites</h2>
          <div className="mt-3 flex flex-col divide-y divide-slate-100">
            {overview.invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">{invite.email}</div>
                  <div className="text-sm text-slate-500">
                    Invited {formatDate(invite.createdAt)} · expires {formatDate(invite.expiresAt)}
                  </div>
                </div>
                {isOwner && (
                  <Button
                    variant="textDanger"
                    size="sm"
                    disabled={busyId === invite.id}
                    onClick={() => handleRevoke(invite.id)}
                  >
                    {busyId === invite.id ? "Revoking…" : "Revoke"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {isOwner && (
        <Card className="mt-6">
          <h2 className="text-sm font-medium text-slate-900">Invite a teammate</h2>
          <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-3">
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" size="sm" disabled={isInviting} className="self-start">
              {isInviting ? "Sending…" : "Send invite"}
            </Button>
            {inviteSent && <p className="text-sm text-green-600">Invite sent to {inviteSent}.</p>}
          </form>
        </Card>
      )}
    </div>
  );
}
