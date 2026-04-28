"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  FlaskConical,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import {
  useApiClient,
  type AccountSnapshot,
  type UserRole,
  type UserSummary,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserAccountDialog } from "@/components/admin/UserAccountDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CriticalConfirmDialog } from "@/components/ui/critical-confirm-dialog";
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
  | { kind: "delete"; user: UserSummary }
  | { kind: "clearMotors"; user: UserSummary }
  | { kind: "clearSimulations"; user: UserSummary };

type AccountState =
  | { kind: "loading" }
  | { kind: "ok"; account: AccountSnapshot }
  | { kind: "error" };

const PAGE_SIZE = 50;

export default function Page() {
  return (
    <AdminRoute>
      <UsersAdminPage />
    </AdminRoute>
  );
}

function UsersAdminPage() {
  const api = useApiClient();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [accounts, setAccounts] = useState<Record<string, AccountState>>({});
  // tokenStack[i] is the token used to fetch page i. tokenStack[0] is null.
  const [tokenStack, setTokenStack] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const [accountUser, setAccountUser] = useState<UserSummary | null>(null);

  const fetchAccount = useCallback(
    async (uid: string) => {
      setAccounts((prev) =>
        prev[uid]?.kind === "ok" ? prev : { ...prev, [uid]: { kind: "loading" } },
      );
      try {
        const account = await api.adminGetAccount(uid);
        setAccounts((prev) => ({ ...prev, [uid]: { kind: "ok", account } }));
      } catch {
        setAccounts((prev) => ({ ...prev, [uid]: { kind: "error" } }));
      }
    },
    [api],
  );

  const fetchPage = useCallback(
    async (
      token: string | null,
      mode: "reset" | "advance" | "back",
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.adminListUsers({
          maxResults: PAGE_SIZE,
          pageToken: token ?? undefined,
        });
        setUsers(res.users);
        setHasMore(res.has_more);
        if (mode === "reset") {
          setTokenStack([null, res.next_page_token]);
          setPageIndex(0);
          setAccounts({});
        } else if (mode === "advance") {
          setTokenStack((stack) => {
            const next = [...stack];
            next[pageIndex + 2] = res.next_page_token;
            return next;
          });
          setPageIndex((p) => p + 1);
        } else {
          setPageIndex((p) => p - 1);
        }
        res.users.forEach((u) => fetchAccount(u.uid));
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [api, fetchAccount, pageIndex],
  );

  const load = useCallback(() => fetchPage(null, "reset"), [fetchPage]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  function nextPage() {
    if (!hasMore || loading) return;
    fetchPage(tokenStack[pageIndex + 1] ?? null, "advance");
  }

  function prevPage() {
    if (pageIndex === 0 || loading) return;
    fetchPage(tokenStack[pageIndex - 1] ?? null, "back");
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
      } else if (confirm.kind === "clearMotors") {
        await api.adminClearAllMotors(confirm.user.uid);
      } else if (confirm.kind === "clearSimulations") {
        await api.adminClearAllSimulations(confirm.user.uid);
      } else {
        await api.adminDeleteUser(confirm.user.uid);
        setUsers((prev) => prev.filter((u) => u.uid !== confirm.user.uid));
        setAccounts((prev) => {
          const next = { ...prev };
          delete next[confirm.user.uid];
          return next;
        });
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
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
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
              <Users className="h-5 w-5" />
              users
              {!loading && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({users.length})
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Roles, status, per-user caps, and balances. Account columns are
              fetched per row.
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
            {loading && users.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users…
              </div>
            ) : users.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No users found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">User</th>
                      <th className="px-3 py-2 text-left font-medium">Role</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Member since
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Last login
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Motor cap
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Sim cap
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Usage
                      </th>
                      <th className="w-px px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = u.uid === currentUser?.uid;
                      const busy = pendingUid === u.uid;
                      const acct = accounts[u.uid];
                      return (
                        <tr
                          key={u.uid}
                          className="border-b last:border-0 transition-colors hover:bg-accent/40"
                        >
                          <td className="px-3 py-3 align-middle">
                            <p className="font-medium">
                              {u.display_name ?? u.email ?? u.uid}
                              {isSelf && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            {u.email && u.display_name && (
                              <p className="truncate text-xs text-muted-foreground">
                                {u.email}
                              </p>
                            )}
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
                          <DateCell iso={u.created_at} />
                          <DateCell iso={u.last_sign_in_at} />
                          <AccountCell
                            state={acct}
                            render={(a) => (
                              <>
                                {a.motor_count?.toLocaleString() ?? "—"}
                                <span className="ml-1 text-muted-foreground">
                                  / {a.motor_limit?.toLocaleString() ?? "∞"}
                                </span>
                              </>
                            )}
                          />
                          <AccountCell
                            state={acct}
                            render={(a) => (
                              <>
                                {a.simulation_count?.toLocaleString() ?? "—"}
                                <span className="ml-1 text-muted-foreground">
                                  /{" "}
                                  {a.simulation_limit?.toLocaleString() ?? "∞"}
                                </span>
                              </>
                            )}
                          />
                          <AccountCell
                            state={acct}
                            render={(a) => (
                              <div className="space-y-0.5">
                                <p>
                                  {a.credits.tokens_used.toLocaleString()}
                                  <span className="ml-1 text-muted-foreground">
                                    /{" "}
                                    {a.credits.monthly_token_limit?.toLocaleString() ??
                                      "∞"}{" "}
                                    tokens
                                  </span>
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {a.credits.usage_period}
                                </p>
                              </div>
                            )}
                          />
                          <td className="px-3 py-3 align-middle text-right">
                            <UserActionsMenu
                              user={u}
                              isSelf={isSelf}
                              busy={busy}
                              onAction={(action) => {
                                setConfirmError(null);
                                setConfirm(action);
                              }}
                              onShowAccount={() => setAccountUser(u)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(pageIndex > 0 || hasMore) && (
              <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Page {pageIndex + 1}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={pageIndex === 0 || loading}
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={!hasMore || loading}
                  >
                    Next
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserActionConfirmDialog
        action={confirm}
        running={confirmRunning}
        error={confirmError}
        onCancel={() => {
          if (!confirmRunning) setConfirm(null);
        }}
        onConfirm={runConfirm}
      />

      <UserAccountDialog
        user={accountUser}
        open={accountUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            // Refresh the row's account snapshot in case limits changed
            if (accountUser) fetchAccount(accountUser.uid);
            setAccountUser(null);
          }
        }}
      />
    </AppLayout>
  );
}

function AccountCell({
  state,
  render,
}: {
  state: AccountState | undefined;
  render: (account: AccountSnapshot) => React.ReactNode;
}) {
  if (!state || state.kind === "loading") {
    return (
      <td className="px-3 py-3 align-middle text-right">
        <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </td>
    );
  }
  if (state.kind === "error") {
    return (
      <td className="px-3 py-3 align-middle text-right text-xs text-muted-foreground">
        —
      </td>
    );
  }
  return (
    <td className="px-3 py-3 align-middle text-right tabular-nums">
      {render(state.account)}
    </td>
  );
}

function DateCell({ iso }: { iso: string | null }) {
  if (!iso) {
    return (
      <td className="px-3 py-3 align-middle text-right text-xs text-muted-foreground">
        —
      </td>
    );
  }
  const d = new Date(iso);
  const date = d.toLocaleDateString();
  const full = d.toLocaleString();
  return (
    <td
      className="px-3 py-3 align-middle text-right tabular-nums"
      title={full}
    >
      <span className="text-xs">{date}</span>
    </td>
  );
}

function UserActionsMenu({
  user,
  isSelf,
  busy,
  onAction,
  onShowAccount,
}: {
  user: UserSummary;
  isSelf: boolean;
  busy: boolean;
  onAction: (action: ConfirmAction) => void;
  onShowAccount: () => void;
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
        <DropdownMenuItem onSelect={onShowAccount}>
          <Coins className="h-4 w-4" />
          Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onAction({ kind: "role", user, nextRole })}
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
          onSelect={() => onAction({ kind: "clearMotors", user })}
        >
          <Rocket className="h-4 w-4" />
          Clear all motors
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onAction({ kind: "clearSimulations", user })}
        >
          <FlaskConical className="h-4 w-4" />
          Clear all simulations
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

function UserActionConfirmDialog({
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
    <CriticalConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      onConfirm={onConfirm}
      title={copy?.title ?? ""}
      description={copy?.description ?? ""}
      confirmLabel={copy?.confirmLabel ?? "Confirm"}
      destructive={copy?.destructive ?? false}
      running={running}
      error={error}
    />
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
  if (action.kind === "clearMotors") {
    return {
      title: "Clear all motors?",
      description: `Permanently delete every motor belonging to ${target}. This cannot be undone.`,
      confirmLabel: "Clear motors",
      destructive: true,
    };
  }
  if (action.kind === "clearSimulations") {
    return {
      title: "Clear all simulations?",
      description: `Permanently delete every simulation belonging to ${target}. This cannot be undone.`,
      confirmLabel: "Clear simulations",
      destructive: true,
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
