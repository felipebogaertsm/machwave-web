"use client";

import { useState } from "react";
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
import { useApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function SettingsPage() {
  const api = useApiClient();
  const { user } = useAuth();
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleClearAccount() {
    if (!user) return;
    if (
      !confirm("This will permanently clear your account data. Are you sure?")
    )
      return;
    setClearing(true);
    try {
      await api.clearAccount(user.uid);
    } finally {
      setClearing(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user?.email) return;
    const input = prompt(
      `This will permanently delete your account. Type your email to confirm:`,
    );
    if (input !== user.email) return;
    setDeleting(true);
    try {
      await api.deleteAccount(user.uid, user.email);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Account Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account preferences.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
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
                    {user.providerData[0].providerId.replace(".com", "")}
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-500">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
              onClick={handleClearAccount}
              disabled={clearing}
            >
              <TriangleAlert className="h-4 w-4 mr-2" />
              {clearing ? "Clearing..." : "Clear account"}
            </Button>
            <Button
              variant="outline"
              className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              onClick={handleDeleteAccount}
              disabled={deleting || !user?.email}
            >
              <TriangleAlert className="h-4 w-4 mr-2" />
              {deleting ? "Deleting..." : "Delete account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  );
}
