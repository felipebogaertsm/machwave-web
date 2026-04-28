"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CriticalConfirmDialog } from "@/components/ui/critical-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuotaPanel } from "@/components/usage/QuotaPanel";
import { useApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function SettingsPage() {
  const api = useApiClient();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [clearOpen, setClearOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleClearAccount() {
    if (!user) return;
    setError(null);
    setClearing(true);
    try {
      await api.clearAccount(user.uid);
      setClearOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setClearing(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user?.email) return;
    if (emailConfirm.trim() !== user.email) return;
    setError(null);
    setDeleting(true);
    try {
      await api.deleteAccount(user.uid, user.email);
      await logout();
      router.replace("/login");
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            account settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your account preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your account details.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
              {user?.displayName && (
                <>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>{user.displayName}</dd>
                </>
              )}
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
              {user?.metadata?.creationTime && (
                <>
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd>
                    {new Date(user.metadata.creationTime).toLocaleDateString()}
                  </dd>
                </>
              )}
              {user?.providerData?.[0]?.providerId && (
                <>
                  <dt className="text-muted-foreground">Sign-in method</dt>
                  <dd className="capitalize">
                    {formatProvider(user.providerData[0].providerId)}
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        <QuotaPanel />

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DangerRow
              title="Clear account data"
              description="Delete every motor and simulation in your account. Your login stays active."
              action={
                <Button
                  variant="outline"
                  className="border-orange-500/60 text-orange-600 hover:bg-orange-500 hover:text-white dark:text-orange-400"
                  onClick={() => {
                    setError(null);
                    setClearOpen(true);
                  }}
                  disabled={!user}
                >
                  <TriangleAlert className="mr-2 h-4 w-4" />
                  Clear data
                </Button>
              }
            />
            <DangerRow
              title="Delete account"
              description="Permanently delete your account and all associated data. This cannot be undone."
              action={
                <Button
                  variant="destructive"
                  onClick={() => {
                    setError(null);
                    setEmailConfirm("");
                    setDeleteOpen(true);
                  }}
                  disabled={!user?.email}
                >
                  <TriangleAlert className="mr-2 h-4 w-4" />
                  Delete account
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>

      <CriticalConfirmDialog
        open={clearOpen}
        onOpenChange={(open) => {
          if (!clearing) setClearOpen(open);
        }}
        onConfirm={handleClearAccount}
        title="Clear account data?"
        description="This permanently deletes every motor and simulation in your account. You will stay signed in."
        confirmLabel="Clear data"
        runningLabel="Clearing..."
        destructive
        running={clearing}
        error={error}
      />

      <CriticalConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
        onConfirm={handleDeleteAccount}
        title="Delete your account?"
        description="This permanently deletes your account and all associated data. This action cannot be undone."
        confirmLabel="Delete account"
        runningLabel="Deleting..."
        destructive
        running={deleting}
        error={error}
        extraValid={emailConfirm.trim() === user?.email}
        extraContent={
          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              Type{" "}
              <span className="font-mono text-foreground">{user?.email}</span>{" "}
              to confirm.
            </Label>
            <Input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder={user?.email ?? ""}
              disabled={deleting}
            />
          </div>
        }
      />
    </AppLayout>
  );
}

function DangerRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function errorMessage(e: unknown): string {
  if (typeof e === "object" && e !== null && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Something went wrong. Please try again.";
}

function formatProvider(providerId: string): string {
  if (providerId === "password") return "Email & password";
  return providerId.replace(/\.com$/, "");
}

export default function Page() {
  return (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  );
}
