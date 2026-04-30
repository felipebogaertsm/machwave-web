"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Check,
  Coins,
  Copy,
  Flame,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import {
  useApiClient,
  type CreateInviteRequest,
  type TeamInvite,
  type TeamMemberSummary,
  type TeamRole,
  type TeamSummary,
  type TeamUsageSnapshot,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTeamScope } from "@/lib/team-scope";
import { apiErrorDetail, apiErrorStatus } from "@/lib/api-errors";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <TeamContent />
    </ProtectedRoute>
  );
}

function TeamContent() {
  const params = useParams();
  const teamId = params.tid as string;
  const api = useApiClient();
  const router = useRouter();
  const { user } = useAuth();
  const {
    scope,
    refresh: refreshScope,
    selectTeam,
    selectPersonal,
  } = useTeamScope();

  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [members, setMembers] = useState<TeamMemberSummary[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [usage, setUsage] = useState<TeamUsageSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = team?.role === "owner";
  const isActive = scope.kind === "team" && scope.team.team_id === teamId;

  const reload = useCallback(async () => {
    // Yield a microtask so this can be triggered from inside a useEffect
    // without violating react-hooks/set-state-in-effect.
    await Promise.resolve();
    try {
      // Members + usage are viewer+; invites is owner-only — skip when not
      // owner so non-owners don't get a 403 toast.
      const summary = await api.getTeam(teamId);
      setTeam(summary);
      const [m, u] = await Promise.all([
        api.listTeamMembers(teamId),
        api.getTeamUsage(teamId),
      ]);
      setMembers(m);
      setUsage(u);
      if (summary.role === "owner") {
        const inv = await api.listTeamInvites(teamId);
        setInvites(inv);
      } else {
        setInvites([]);
      }
      setLoadError(null);
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      if (status === 404) {
        setLoadError(
          "Team not found, or you no longer have access. The team may have been deleted.",
        );
      } else {
        setLoadError(apiErrorDetail(err) ?? "Failed to load team.");
      }
    } finally {
      setLoading(false);
    }
  }, [api, teamId]);

  useEffect(() => {
    // reload() yields a microtask before any setState so this is safe;
    // the linter can't trace the deferral through the async callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading team…
          </div>
        )}

        {loadError && !loading && (
          <Card className="border-destructive/40">
            <CardContent className="space-y-3 py-6">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" onClick={() => router.push("/teams")}>
                Back to teams
              </Button>
            </CardContent>
          </Card>
        )}

        {team && (
          <>
            <header className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">
                      {team.name}
                    </h1>
                    <Badge variant="secondary" className="uppercase">
                      {team.role}
                    </Badge>
                  </div>
                  {team.description && (
                    <p className="text-sm text-muted-foreground">
                      {team.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectTeam(teamId)}
                    >
                      <ArrowLeftRight className="mr-2 h-3.5 w-3.5" />
                      Switch to this team
                    </Button>
                  )}
                </div>
              </div>
            </header>

            {usage && <TeamUsageCard usage={usage} />}

            <MembersCard
              teamId={teamId}
              members={members}
              currentUserId={user?.uid}
              isOwner={!!isOwner}
              onChanged={async () => {
                await reload();
                await refreshScope();
              }}
              onSelfLeft={async () => {
                // After leaving, drop the scope back to personal if the
                // active team was this one and bounce to /teams.
                if (isActive) selectPersonal();
                await refreshScope();
                router.push("/teams");
              }}
            />

            {isOwner && (
              <InvitesCard
                teamId={teamId}
                invites={invites}
                onChanged={reload}
              />
            )}

            {isOwner && (
              <SettingsCard
                // Remount on update so the form's local state re-initializes
                // from the freshly-saved props instead of needing a sync
                // effect.
                key={`${team.team_id}:${team.updated_at}`}
                team={team}
                onSaved={async (updated) => {
                  setTeam(updated);
                  await refreshScope();
                }}
              />
            )}

            <DangerZoneCard
              team={team}
              isOwner={!!isOwner}
              onDeleted={async () => {
                if (isActive) selectPersonal();
                await refreshScope();
                router.push("/teams");
              }}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Usage card
// ---------------------------------------------------------------------------

function TeamUsageCard({ usage }: { usage: TeamUsageSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-4 w-4" />
          Team usage
        </CardTitle>
        <CardDescription>
          Team motors, simulations, and tokens are billed against this pool —
          separately from your personal credits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <UsageTile
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            label="Motors"
            count={usage.motor_count}
            limit={usage.motor_limit}
          />
          <UsageTile
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            label="Simulations"
            count={usage.simulation_count}
            limit={usage.simulation_limit}
          />
          <TokenTile
            used={usage.credits.tokens_used}
            limit={usage.credits.monthly_token_limit}
            remaining={usage.credits.tokens_remaining}
            period={usage.credits.usage_period}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function UsageTile({
  icon,
  label,
  count,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  limit: number | null;
}) {
  const unlimited = limit == null;
  const pct =
    !unlimited && limit! > 0
      ? Math.min(100, Math.round((count / limit!) * 100))
      : null;
  const atCap = !unlimited && count >= limit!;
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </span>
        {atCap && (
          <Badge variant="destructive" className="text-[10px]">
            at limit
          </Badge>
        )}
      </div>
      <p className="text-lg font-semibold tabular-nums">
        {count.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          / {unlimited ? "∞" : limit!.toLocaleString()}
        </span>
      </p>
      {pct != null && (
        <div className="h-1 w-full overflow-hidden rounded bg-muted">
          <div
            className={`h-full ${atCap ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function TokenTile({
  used,
  limit,
  remaining,
  period,
}: {
  used: number;
  limit: number | null;
  remaining: number | null;
  period: string;
}) {
  const unlimited = limit == null;
  const pct =
    !unlimited && limit! > 0
      ? Math.min(100, Math.round((used / limit!) * 100))
      : null;
  const atCap = !unlimited && remaining != null && remaining <= 0;
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Tokens used</p>
        {atCap && (
          <Badge variant="destructive" className="text-[10px]">
            at limit
          </Badge>
        )}
      </div>
      <p className="text-lg font-semibold tabular-nums">
        {used.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          / {unlimited ? "∞" : limit!.toLocaleString()} tokens
        </span>
      </p>
      {pct != null && (
        <div className="h-1 w-full overflow-hidden rounded bg-muted">
          <div
            className={`h-full ${atCap ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Usage for <span className="font-mono">{period}</span> · resets monthly
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members card
// ---------------------------------------------------------------------------

const ROLES: TeamRole[] = ["owner", "editor", "viewer"];

function MembersCard({
  teamId,
  members,
  currentUserId,
  isOwner,
  onChanged,
  onSelfLeft,
}: {
  teamId: string;
  members: TeamMemberSummary[];
  currentUserId: string | undefined;
  isOwner: boolean;
  onChanged: () => Promise<void>;
  onSelfLeft: () => Promise<void>;
}) {
  const api = useApiClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pendingRemove, setPendingRemove] =
    useState<TeamMemberSummary | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  async function changeRole(member: TeamMemberSummary, role: TeamRole) {
    if (member.role === role) return;
    setBusyId(member.user_id);
    setActionError(null);
    try {
      await api.changeTeamMemberRole(teamId, member.user_id, role);
      await onChanged();
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      const detail = apiErrorDetail(err);
      if (status === 409) {
        setActionError(
          detail ?? "Promote another member to owner before changing this role.",
        );
      } else {
        setActionError(detail ?? "Failed to change role.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await api.removeTeamMember(teamId, pendingRemove.user_id);
      setPendingRemove(null);
      await onChanged();
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      const detail = apiErrorDetail(err);
      if (status === 409) {
        setRemoveError(
          detail ?? "Promote another member to owner before removing this one.",
        );
      } else {
        setRemoveError(detail ?? "Failed to remove member.");
      }
    } finally {
      setRemoving(false);
    }
  }

  async function leaveTeam() {
    if (!currentUserId) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      await api.removeTeamMember(teamId, currentUserId);
      setConfirmLeave(false);
      await onSelfLeft();
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      const detail = apiErrorDetail(err);
      if (status === 409) {
        setLeaveError(
          detail ??
            "You're the last owner. Promote another member to owner before leaving.",
        );
      } else {
        setLeaveError(detail ?? "Failed to leave team.");
      }
      setLeaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4" />
          Members
          <span className="text-sm font-normal text-muted-foreground">
            ({members.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actionError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        )}

        <ul className="divide-y rounded-md border">
          {members.map((m) => {
            const isMe = m.user_id === currentUserId;
            const busy = busyId === m.user_id;
            return (
              <li
                key={m.user_id}
                className="flex flex-wrap items-center gap-3 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.email ?? m.user_id}
                    {isMe && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Joined {new Date(m.joined_at).toLocaleDateString()}
                  </p>
                </div>

                {isOwner ? (
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-xs disabled:opacity-50"
                    value={m.role}
                    disabled={busy}
                    onChange={(e) => changeRole(m, e.target.value as TeamRole)}
                    aria-label={`Change role for ${m.email ?? m.user_id}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant="secondary" className="uppercase">
                    {m.role}
                  </Badge>
                )}

                {isMe ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLeaveError(null);
                      setConfirmLeave(true);
                    }}
                    title="Leave this team"
                  >
                    <LogOut className="mr-1 h-3.5 w-3.5" />
                    Leave
                  </Button>
                ) : isOwner ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Remove ${m.email ?? m.user_id}`}
                    title="Remove member"
                    disabled={busy}
                    onClick={() => {
                      setRemoveError(null);
                      setPendingRemove(m);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open && !removing) {
            setPendingRemove(null);
            setRemoveError(null);
          }
        }}
        onConfirm={confirmRemove}
        title="Remove member?"
        description={
          pendingRemove
            ? `Remove ${pendingRemove.email ?? pendingRemove.user_id} from the team. They lose access immediately.`
            : ""
        }
        confirmLabel="Remove"
        runningLabel="Removing..."
        destructive
        running={removing}
        error={removeError}
      />

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={(open) => {
          if (!open && !leaving) {
            setConfirmLeave(false);
            setLeaveError(null);
          }
        }}
        onConfirm={leaveTeam}
        title="Leave this team?"
        description="You'll lose access to the team's motors, simulations, and credits. Re-joining requires a new invite."
        confirmLabel="Leave team"
        runningLabel="Leaving..."
        destructive
        running={leaving}
        error={leaveError}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Invites card (owner-only)
// ---------------------------------------------------------------------------

function InvitesCard({
  teamId,
  invites,
  onChanged,
}: {
  teamId: string;
  invites: TeamInvite[];
  onChanged: () => Promise<void>;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  // Pending first, then accepted/revoked. The API already orders by created_at
  // desc; we just bucket on the rendered side.
  const pending = invites.filter(
    (i) => !i.revoked && !i.accepted_by && new Date(i.expires_at) > new Date(),
  );
  const consumed = invites.filter(
    (i) => i.revoked || i.accepted_by || new Date(i.expires_at) <= new Date(),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-4 w-4" />
            Invites
          </CardTitle>
          <CardDescription>
            Tokens are single-use and expire after 7 days. Share the link
            out-of-band.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Create invite
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pending ({pending.length})
          </h3>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending invites.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {pending.map((inv) => (
                <InviteRow
                  key={inv.token}
                  teamId={teamId}
                  invite={inv}
                  onRevoked={onChanged}
                />
              ))}
            </ul>
          )}
        </div>

        {consumed.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </h3>
            <ul className="divide-y rounded-md border opacity-70">
              {consumed.map((inv) => (
                <ConsumedInviteRow key={inv.token} invite={inv} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CreateInviteDialog
        teamId={teamId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onChanged}
      />
    </Card>
  );
}

function InviteRow({
  teamId,
  invite,
  onRevoked,
}: {
  teamId: string;
  invite: TeamInvite;
  onRevoked: () => Promise<void>;
}) {
  const api = useApiClient();
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use window.location at click-time so SSR-rendered HTML doesn't bake in
  // a wrong origin if invites are server-rendered later.
  function inviteUrl() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/invite/${invite.token}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — leave as-is */
    }
  }

  async function revoke() {
    setRevoking(true);
    setError(null);
    try {
      await api.revokeTeamInvite(teamId, invite.token);
      await onRevoked();
    } catch (err: unknown) {
      setError(apiErrorDetail(err) ?? "Failed to revoke.");
      setRevoking(false);
    }
  }

  return (
    <li className="space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="uppercase">
          {invite.role}
        </Badge>
        {invite.invitee_email && (
          <span className="text-sm">{invite.invitee_email}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Expires {new Date(invite.expires_at).toLocaleDateString()}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-2 py-1 font-mono text-[11px]">
          {inviteUrl()}
        </code>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <Check className="mr-1 h-3.5 w-3.5" />
          ) : (
            <Copy className="mr-1 h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label="Revoke invite"
          title="Revoke"
          disabled={revoking}
          onClick={revoke}
        >
          {revoking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </li>
  );
}

function ConsumedInviteRow({ invite }: { invite: TeamInvite }) {
  let label: string;
  let variant: "secondary" | "success" | "destructive" | "warning" =
    "secondary";
  if (invite.accepted_by) {
    label = "Accepted";
    variant = "success";
  } else if (invite.revoked) {
    label = "Revoked";
    variant = "destructive";
  } else {
    label = "Expired";
    variant = "warning";
  }
  return (
    <li className="flex flex-wrap items-center gap-2 p-3">
      <Badge variant={variant}>{label}</Badge>
      <Badge variant="secondary" className="uppercase">
        {invite.role}
      </Badge>
      {invite.invitee_email && (
        <span className="text-sm text-muted-foreground">
          {invite.invitee_email}
        </span>
      )}
      <span className="ml-auto text-xs text-muted-foreground">
        {invite.accepted_at
          ? `Accepted ${new Date(invite.accepted_at).toLocaleDateString()}`
          : `Created ${new Date(invite.created_at).toLocaleDateString()}`}
      </span>
    </li>
  );
}

function CreateInviteDialog({
  teamId,
  open,
  onOpenChange,
  onCreated,
}: {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const api = useApiClient();
  const [role, setRole] = useState<CreateInviteRequest["role"]>("editor");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRole("editor");
    setEmail("");
    setError(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.createTeamInvite(teamId, {
        role,
        invitee_email: email.trim() ? email.trim() : null,
      });
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (err: unknown) {
      setError(apiErrorDetail(err) ?? "Failed to create invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create invite</DialogTitle>
          <DialogDescription>
            The token expires in 7 days. Owners can&apos;t be invited — only
            editors and viewers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={role}
              disabled={submitting}
              onChange={(e) =>
                setRole(e.target.value as CreateInviteRequest["role"])
              }
            >
              <option value="editor">editor — can manage motors and sims</option>
              <option value="viewer">viewer — read-only</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-email">Invitee email (optional)</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground">
              Used as a hint on the invite preview. The token works for any
              signed-in user — share carefully.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Creating…" : "Create invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Settings card (owner-only)
// ---------------------------------------------------------------------------

function SettingsCard({
  team,
  onSaved,
}: {
  team: TeamSummary;
  onSaved: (updated: TeamSummary) => Promise<void>;
}) {
  const api = useApiClient();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  const dirty =
    name.trim() !== team.name ||
    description.trim() !== (team.description ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateTeam(team.team_id, {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
      });
      await onSaved(updated);
      setSavedTick((n) => n + 1);
    } catch (err: unknown) {
      setError(apiErrorDetail(err) ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pencil className="h-4 w-4" />
          Settings
        </CardTitle>
        <CardDescription>Owner-only: rename and describe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="settings-name">Name</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="settings-description">Description</Label>
          <Input
            id="settings-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            disabled={saving}
          />
        </div>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {savedTick > 0 && !dirty && !saving && (
            <span className="text-xs text-muted-foreground">Saved.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Danger zone
// ---------------------------------------------------------------------------

function DangerZoneCard({
  team,
  isOwner,
  onDeleted,
}: {
  team: TeamSummary;
  isOwner: boolean;
  onDeleted: () => Promise<void>;
}) {
  const api = useApiClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  async function handleDelete() {
    if (confirmText !== team.name) {
      setError(`Type "${team.name}" to confirm.`);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await api.deleteTeam(team.team_id);
      await onDeleted();
    } catch (err: unknown) {
      setError(apiErrorDetail(err) ?? "Failed to delete team.");
      setDeleting(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <TriangleAlert className="h-4 w-4" />
          Danger zone
        </CardTitle>
        <CardDescription>
          Deleting the team removes every team motor, simulation, invite, and
          membership. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => {
            setError(null);
            setConfirmText("");
            setOpen(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete team
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (deleting) return;
          if (!next) {
            setConfirmText("");
            setError(null);
          }
          setOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-destructive" />
              Delete team?
            </DialogTitle>
            <DialogDescription>
              All motors, simulations, invites, and memberships will be deleted.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-team-name">
              Type{" "}
              <span className="font-mono text-foreground">{team.name}</span> to
              confirm.
            </Label>
            <Input
              id="confirm-team-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={deleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirmText !== team.name}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? "Deleting…" : "Delete team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
