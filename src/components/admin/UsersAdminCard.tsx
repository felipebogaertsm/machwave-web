"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useApiClient, type UserRole, type UserSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type ConfirmAction =
  | { kind: "role"; user: UserSummary; nextRole: UserRole }
  | { kind: "disabled"; user: UserSummary; nextDisabled: boolean }
  | { kind: "delete"; user: UserSummary };

const PAGE_SIZE = 50;

export function UsersAdminCard() {
  const api = useApiClient();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmRunning, setConfirmRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListUsers({ maxResults: PAGE_SIZE });
      setUsers(res.users);
      setNextPageToken(res.next_page_token);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  async function loadMore() {
    if (!nextPageToken) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await api.adminListUsers({
        maxResults: PAGE_SIZE,
        pageToken: nextPageToken,
      });
      setUsers((prev) => [...prev, ...res.users]);
      setNextPageToken(res.next_page_token);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  function applyUpdate(updated: UserSummary) {
    setUsers((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmRunning(true);
    setConfirmError(null);
    setPendingUid(confirm.user.uid);
    try {
      if (confirm.kind === "role") {
        const updated = await api.adminSetRole(
          confirm.user.uid,
          confirm.nextRole,
        );
        applyUpdate(updated);
      } else if (confirm.kind === "disabled") {
        const updated = await api.adminSetDisabled(
          confirm.user.uid,
          confirm.nextDisabled,
        );
        applyUpdate(updated);
      } else {
        await api.adminDeleteUser(confirm.user.uid);
        setUsers((prev) => prev.filter((u) => u.uid !== confirm.user.uid));
      }
      setConfirm(null);
    } catch (e) {
      setConfirmError(errorMessage(e));
    } finally {
      setConfirmRunning(false);
      setPendingUid(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </CardTitle>
            <CardDescription>
              Manage roles, enable/disable accounts, and delete users.
            </CardDescription>
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
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        {error && (
          <p className="mx-6 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && users.length === 0 ? (
          <div className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="w-px px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.uid === currentUser?.uid;
                  const busy = pendingUid === u.uid;
                  return (
                    <tr
                      key={u.uid}
                      className="border-b last:border-0 transition-colors hover:bg-accent/40"
                    >
                      <td className="px-3 py-3 align-middle">
                        <p className="truncate font-medium">
                          {u.email ?? u.display_name ?? u.uid}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {u.uid}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Badge
                          variant={
                            u.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Badge
                          variant={u.disabled ? "destructive" : "success"}
                        >
                          {u.disabled ? "disabled" : "active"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <UserActionsMenu
                          user={u}
                          isSelf={isSelf}
                          busy={busy}
                          onAction={(action) => {
                            setConfirmError(null);
                            setConfirm(action);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {nextPageToken && (
          <div className="flex justify-center px-6 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Load more
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        action={confirm}
        running={confirmRunning}
        error={confirmError}
        onCancel={() => {
          if (!confirmRunning) setConfirm(null);
        }}
        onConfirm={runConfirm}
      />
    </Card>
  );
}

function UserActionsMenu({
  user,
  isSelf,
  busy,
  onAction,
}: {
  user: UserSummary;
  isSelf: boolean;
  busy: boolean;
  onAction: (action: ConfirmAction) => void;
}) {
  const nextRole: UserRole = user.role === "admin" ? "member" : "admin";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() =>
            onAction({ kind: "role", user, nextRole })
          }
        >
          <ShieldCheck className="h-4 w-4" />
          {nextRole === "admin" ? "Promote to admin" : "Demote to member"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSelf}
          onSelect={() =>
            onAction({
              kind: "disabled",
              user,
              nextDisabled: !user.disabled,
            })
          }
        >
          {user.disabled ? (
            <>
              <UserCheck className="h-4 w-4" />
              Enable account
            </>
          ) : (
            <>
              <UserX className="h-4 w-4" />
              Disable account
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSelf}
          className="text-destructive focus:text-destructive"
          onSelect={() => onAction({ kind: "delete", user })}
        >
          <Trash2 className="h-4 w-4" />
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConfirmDialog({
  action,
  running,
  error,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction | null;
  running: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = action !== null;
  const copy = action ? confirmCopy(action) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy?.title ?? ""}</DialogTitle>
          <DialogDescription>{copy?.description ?? ""}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={running}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={copy?.destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={running}
          >
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {copy?.confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function confirmCopy(action: ConfirmAction): {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
} {
  const target = action.user.email ?? action.user.uid;
  if (action.kind === "role") {
    const promoting = action.nextRole === "admin";
    return {
      title: promoting ? "Promote to admin?" : "Demote to member?",
      description: promoting
        ? `Grant administrator privileges to ${target}. They must sign out and back in for the change to take effect.`
        : `Remove administrator privileges from ${target}. They must sign out and back in for the change to take effect.`,
      confirmLabel: promoting ? "Promote" : "Demote",
      destructive: false,
    };
  }
  if (action.kind === "disabled") {
    return action.nextDisabled
      ? {
          title: "Disable account?",
          description: `${target} will no longer be able to sign in or refresh tokens. Existing sessions remain valid until their token expires (≤1 hour).`,
          confirmLabel: "Disable",
          destructive: true,
        }
      : {
          title: "Enable account?",
          description: `Restore sign-in for ${target}.`,
          confirmLabel: "Enable",
          destructive: false,
        };
  }
  return {
    title: "Delete user?",
    description: `Permanently delete ${target}'s Firebase account and all of their stored data. This cannot be undone.`,
    confirmLabel: "Delete",
    destructive: true,
  };
}

function errorMessage(e: unknown): string {
  if (typeof e === "object" && e !== null) {
    const anyE = e as {
      response?: { data?: { detail?: unknown } };
      message?: unknown;
    };
    const detail = anyE.response?.data?.detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
    if (typeof anyE.message === "string" && anyE.message.length > 0) {
      return anyE.message;
    }
  }
  return "Something went wrong. Please try again.";
}
