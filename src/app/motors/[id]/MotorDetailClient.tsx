"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useApiClient,
  type MotorRecord,
  type PropellantItem,
} from "@/lib/api";
import { canEdit, useTeamScope } from "@/lib/team-scope";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { RunSimulationDialog } from "@/components/simulation/RunSimulationDialog";
import { useActiveSimulation } from "@/components/simulation/useActiveSimulation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { SolidMotorDetailBody } from "@/components/motor/SolidMotorDetailBody";
import { Activity, Loader2, Pencil, Trash2, Play } from "lucide-react";

export default function MotorDetailPage() {
  return (
    <ProtectedRoute>
      <MotorDetailContent />
    </ProtectedRoute>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function MotorDetailContent() {
  const params = useParams();
  const motorId = params.id as string;
  const api = useApiClient();
  const router = useRouter();
  const { role, teamId } = useTeamScope();
  const writable = canEdit(role);
  const { activeSim } = useActiveSimulation();
  const [motor, setMotor] = useState<MotorRecord | null>(null);
  const [propellants, setPropellants] = useState<PropellantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runOpen, setRunOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getMotor(motorId, teamId), api.listPropellants()])
      .then(([m, p]) => {
        if (cancelled) return;
        setMotor(m);
        setPropellants(p);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Motor not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, motorId, teamId]);


  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteMotor(motorId, teamId);
      router.replace("/dashboard");
    } catch {
      setDeleteError("Failed to delete motor");
      setDeleting(false);
    }
  }

  const propellantName = motor
    ? (propellants.find((p) => p.id === motor.config.propellant_id)?.name ??
      motor.config.propellant_id)
    : "";

  return (
    <AppLayout>
      <div className="space-y-6">
        {loading && <Spinner />}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {motor && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{motor.name}</h1>
                <p className="font-mono text-xs text-muted-foreground">
                  {motor.motor_id}
                </p>
              </div>
              {writable ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setError(null);
                      setRunOpen(true);
                    }}
                    disabled={activeSim !== null}
                    title={
                      activeSim
                        ? `Blocked — a simulation is already ${activeSim.status}`
                        : undefined
                    }
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Run Simulation
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/motors/${motorId}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteOpen(true);
                    }}
                    disabled={deleting}
                    aria-label="Delete motor"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  view only
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Created {formatDate(motor.created_at)}
              {" · "}
              Updated {formatDate(motor.updated_at)}
            </p>

            {activeSim && (
              <Card className="border-amber-500/40 bg-amber-500/5">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <Activity className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="flex-1 text-sm">
                    A simulation is{" "}
                    <span className="font-medium">{activeSim.status}</span>.
                    New runs are blocked until it finishes.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/simulations/${activeSim.simulation_id}`}>
                      View active run
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {motor.config.motor_type === "solid" && (
              <SolidMotorDetailBody
                motor={{ ...motor, config: motor.config }}
                propellantName={propellantName}
              />
            )}
          </>
        )}

        <RunSimulationDialog
          open={runOpen}
          onOpenChange={setRunOpen}
          request={{ motor_id: motorId }}
          motorName={motor?.name}
          teamId={teamId}
          onCreated={(res) => {
            setRunOpen(false);
            router.push(`/simulations/${res.simulation_id}`);
          }}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!deleting) {
              setDeleteOpen(open);
              if (!open) setDeleteError(null);
            }
          }}
          onConfirm={handleDelete}
          title="Delete motor?"
          description={
            motor
              ? `Permanently delete "${motor.name}". This cannot be undone.`
              : "Permanently delete this motor. This cannot be undone."
          }
          confirmLabel="Delete"
          runningLabel="Deleting..."
          destructive
          running={deleting}
          error={deleteError}
        />
      </div>
    </AppLayout>
  );
}
