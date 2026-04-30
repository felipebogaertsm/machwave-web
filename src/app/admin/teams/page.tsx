"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Coins,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useApiClient, type TeamSummary } from "@/lib/api";
import { apiErrorDetail } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamAccountDialog } from "@/components/admin/TeamAccountDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SortKey = "name" | "role" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";

export default function Page() {
  return (
    <AdminRoute>
      <TeamsAdminPage />
    </AdminRoute>
  );
}

function TeamsAdminPage() {
  const api = useApiClient();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [accountTeam, setAccountTeam] = useState<TeamSummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeamSummary | null>(null);

  const load = useCallback(async () => {
    // Yield once so this can be triggered from a useEffect without violating
    // react-hooks/set-state-in-effect.
    await Promise.resolve();
    try {
      const list = await api.adminListTeams();
      setTeams(list);
      setError(null);
    } catch (e) {
      setError(apiErrorDetail(e) ?? "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "role" ? "asc" : "desc");
    }
  }

  const sorted = [...teams].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              teams
              {!loading && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({teams.length})
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Override team caps and balances, or force-delete a team.
              Administrators are not team members — these actions are gated on
              the admin claim, not on team ownership.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-3 w-3", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Card>
          <CardContent className="p-0">
            {loading && teams.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading teams…
              </div>
            ) : teams.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No teams found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <SortHeader
                        label="Team"
                        sortKey="name"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="left"
                      />
                      <SortHeader
                        label="Your role"
                        sortKey="role"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="left"
                      />
                      <SortHeader
                        label="Created"
                        sortKey="created_at"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <SortHeader
                        label="Updated"
                        sortKey="updated_at"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <th className="w-px px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((team) => (
                      <tr
                        key={team.team_id}
                        className="border-b last:border-0 transition-colors hover:bg-accent/40"
                      >
                        <td className="px-3 py-3 align-middle">
                          <p className="font-medium">{team.name}</p>
                          {team.description && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {team.description}
                            </p>
                          )}
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {team.team_id}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Badge variant="secondary" className="uppercase">
                            {team.role}
                          </Badge>
                        </td>
                        <DateCell iso={team.created_at} />
                        <DateCell iso={team.updated_at} />
                        <td className="px-3 py-3 align-middle text-right">
                          <TeamActionsMenu
                            onShowAccount={() => setAccountTeam(team)}
                            onDelete={() => setPendingDelete(team)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TeamAccountDialog
        team={accountTeam}
        open={accountTeam !== null}
        onOpenChange={(open) => {
          if (!open) {
            // Refresh after close — limit changes can shift the updated_at.
            setAccountTeam(null);
            load();
          }
        }}
      />

      <DeleteTeamDialog
        // Remount per-team so the confirm-text state resets without an effect.
        key={pendingDelete?.team_id ?? "none"}
        team={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onDeleted={async () => {
          const id = pendingDelete?.team_id;
          setPendingDelete(null);
          if (id) setTeams((prev) => prev.filter((t) => t.team_id !== id));
        }}
      />
    </AppLayout>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <th
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          isActive ? "text-foreground" : ""
        }`}
      >
        {label}
        {isActive && <span aria-hidden>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <td
      className="px-3 py-3 align-middle text-right tabular-nums"
      title={d.toLocaleString()}
    >
      <span className="text-xs">{d.toLocaleDateString()}</span>
    </td>
  );
}

function TeamActionsMenu({
  onShowAccount,
  onDelete,
}: {
  onShowAccount: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onShowAccount}>
          <Coins className="h-4 w-4" />
          Account &amp; limits
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Force delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteTeamDialog({
  team,
  onCancel,
  onDeleted,
}: {
  team: TeamSummary | null;
  onCancel: () => void;
  onDeleted: () => Promise<void>;
}) {
  const api = useApiClient();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = team !== null;
  const expected = team?.name ?? "";

  async function handleDelete() {
    if (!team) return;
    if (confirmText !== expected) {
      setError(`Type "${expected}" to confirm.`);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await api.adminDeleteTeam(team.team_id);
      await onDeleted();
    } catch (e) {
      setError(apiErrorDetail(e) ?? "Failed to delete team.");
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-destructive" />
            Force delete team?
          </DialogTitle>
          <DialogDescription>
            Permanently delete{" "}
            <span className="font-medium text-foreground">{expected}</span> and
            cascade to every team motor, simulation, invite, and membership.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="admin-confirm-team-name">
            Type{" "}
            <span className="font-mono text-foreground">{expected}</span> to
            confirm.
          </Label>
          <Input
            id="admin-confirm-team-name"
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
            disabled={deleting || confirmText !== expected}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleting ? "Deleting…" : "Force delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
