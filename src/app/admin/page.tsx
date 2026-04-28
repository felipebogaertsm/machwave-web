"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { HealthCheckCard } from "@/components/admin/HealthCheckCard";

type RerunStatus =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; triggered: number }
  | { kind: "error"; message: string };

function AdminPage() {
  const { user } = useAuth();
  const api = useApiClient();

  const [rerunOpen, setRerunOpen] = useState(false);
  const [status, setStatus] = useState<RerunStatus>({ kind: "idle" });

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
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={rerunOpen}
        onOpenChange={(open) => {
          if (status.kind !== "running") setRerunOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rerun all simulations?</DialogTitle>
            <DialogDescription>
              This re-dispatches every simulation in the bucket. Existing
              results will be overwritten as each run finishes.
            </DialogDescription>
          </DialogHeader>
          {status.kind === "error" && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {status.message}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={status.kind === "running"}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleRerunAll}
              disabled={status.kind === "running"}
            >
              {status.kind === "running" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {status.kind === "running" ? "Triggering..." : "Rerun all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
