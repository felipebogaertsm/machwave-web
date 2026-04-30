"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CriticalConfirmDialog } from "@/components/ui/critical-confirm-dialog";
import { useApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { HealthCheckCard } from "@/components/admin/HealthCheckCard";

type RerunStatus =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; triggered: number }
  | { kind: "error"; message: string };

type ClearStatus =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; deleted: number }
  | { kind: "error"; message: string };

type ClearResource = "motors" | "simulations";

function AdminPage() {
  const { user } = useAuth();
  const api = useApiClient();

  const [rerunOpen, setRerunOpen] = useState(false);
  const [status, setStatus] = useState<RerunStatus>({ kind: "idle" });

  const [clearOpen, setClearOpen] = useState<ClearResource | null>(null);
  const [motorsStatus, setMotorsStatus] = useState<ClearStatus>({
    kind: "idle",
  });
  const [simsStatus, setSimsStatus] = useState<ClearStatus>({ kind: "idle" });

  async function handleRerunAll() {
    setStatus({ kind: "running" });
    try {
      const res = await api.rerunAllSimulations();
      setStatus({ kind: "success", triggered: res.triggered });
      setRerunOpen(false);
    } catch (e) {
      setStatus({ kind: "error", message: errorMessage(e) });
    }
  }

  async function handleClearMotors() {
    setMotorsStatus({ kind: "running" });
    try {
      const res = await api.adminClearAllMotors();
      setMotorsStatus({ kind: "success", deleted: res.deleted });
      setClearOpen(null);
    } catch (e) {
      setMotorsStatus({ kind: "error", message: errorMessage(e) });
    }
  }

  async function handleClearSimulations() {
    setSimsStatus({ kind: "running" });
    try {
      const res = await api.adminClearAllSimulations();
      setSimsStatus({ kind: "success", deleted: res.deleted });
      setClearOpen(null);
    } catch (e) {
      setSimsStatus({ kind: "error", message: errorMessage(e) });
    }
  }

  const activeStatus =
    clearOpen === "motors"
      ? motorsStatus
      : clearOpen === "simulations"
        ? simsStatus
        : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">admin</h1>
            <p className="text-sm text-muted-foreground">
              Restricted area for administrators.
            </p>
          </div>
        </div>

        <HealthCheckCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signed in as</CardTitle>
            <CardDescription>
              Your administrator account details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
              {user?.email && (
                <>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{user.email}</dd>
                </>
              )}
              {user?.uid && (
                <>
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="font-mono text-xs break-all">{user.uid}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Role</dt>
              <dd>Administrator</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Simulations</CardTitle>
            <CardDescription>
              Bulk operations across every simulation in the bucket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Rerun all simulations</p>
                <p className="text-sm text-muted-foreground">
                  Re-dispatch every simulation in the bucket. Existing results
                  will be overwritten when each run completes.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStatus({ kind: "idle" });
                  setRerunOpen(true);
                }}
                disabled={status.kind === "running"}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Rerun all
              </Button>
            </div>
            <RerunStatusBanner status={status} />

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Clear all simulations</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete every simulation across all users. This
                  cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  setSimsStatus({ kind: "idle" });
                  setClearOpen("simulations");
                }}
                disabled={simsStatus.kind === "running"}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear simulations
              </Button>
            </div>
            <ClearStatusBanner resource="simulations" status={simsStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Motors</CardTitle>
            <CardDescription>
              Bulk operations across every motor in the bucket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Clear all motors</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete every motor across all users. This cannot
                  be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  setMotorsStatus({ kind: "idle" });
                  setClearOpen("motors");
                }}
                disabled={motorsStatus.kind === "running"}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear motors
              </Button>
            </div>
            <ClearStatusBanner resource="motors" status={motorsStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </CardTitle>
            <CardDescription>
              Manage roles, status, per-user caps, and balances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Open the detailed users table.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/users">
                  Manage users
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Teams
            </CardTitle>
            <CardDescription>
              Override team caps and balances, or force-delete a team.
              Administrators are not team members — these endpoints are gated
              on the admin role, not on team ownership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Open the detailed teams table.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/teams">
                  Manage teams
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <CriticalConfirmDialog
        open={clearOpen !== null}
        onOpenChange={(open) => {
          if (!open && activeStatus?.kind !== "running") setClearOpen(null);
        }}
        onConfirm={
          clearOpen === "motors" ? handleClearMotors : handleClearSimulations
        }
        title={
          clearOpen === "motors"
            ? "Clear all motors?"
            : "Clear all simulations?"
        }
        description={
          clearOpen === "motors"
            ? "This permanently deletes every motor across all users. This cannot be undone."
            : "This permanently deletes every simulation across all users. This cannot be undone."
        }
        confirmLabel={
          clearOpen === "motors" ? "Clear motors" : "Clear simulations"
        }
        runningLabel="Clearing..."
        destructive
        running={activeStatus?.kind === "running"}
        error={
          activeStatus?.kind === "error" ? activeStatus.message : null
        }
      />

      <CriticalConfirmDialog
        open={rerunOpen}
        onOpenChange={(open) => {
          if (status.kind !== "running") setRerunOpen(open);
        }}
        onConfirm={handleRerunAll}
        title="Rerun all simulations?"
        description="This re-dispatches every simulation in the bucket. Existing results will be overwritten as each run finishes."
        confirmLabel="Rerun all"
        runningLabel="Triggering..."
        running={status.kind === "running"}
        error={status.kind === "error" ? status.message : null}
      />
    </AppLayout>
  );
}

function RerunStatusBanner({ status }: { status: RerunStatus }) {
  if (status.kind === "idle") return null;
  if (status.kind === "running") {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Triggering reruns...
      </div>
    );
  }
  if (status.kind === "success") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Triggered {status.triggered}{" "}
        {status.triggered === 1 ? "simulation" : "simulations"}.
      </div>
    );
  }
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {status.message}
    </p>
  );
}

function ClearStatusBanner({
  resource,
  status,
}: {
  resource: ClearResource;
  status: ClearStatus;
}) {
  if (status.kind === "idle") return null;
  const singular = resource === "motors" ? "motor" : "simulation";
  if (status.kind === "running") {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Clearing {resource}...
      </div>
    );
  }
  if (status.kind === "success") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Deleted {status.deleted}{" "}
        {status.deleted === 1 ? singular : resource}.
      </div>
    );
  }
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {status.message}
    </p>
  );
}

function errorMessage(e: unknown): string {
  if (typeof e === "object" && e !== null && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Something went wrong. Please try again.";
}

export default function Page() {
  return (
    <AdminRoute>
      <AdminPage />
    </AdminRoute>
  );
}
