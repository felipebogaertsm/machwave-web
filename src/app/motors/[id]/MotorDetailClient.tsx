"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useApiClient,
  type MotorRecord,
  type PropellantItem,
} from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SolidMotorDetailBody } from "@/components/motor/SolidMotorDetailBody";
import { Loader2, Pencil, Trash2, Play } from "lucide-react";

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
  const [motor, setMotor] = useState<MotorRecord | null>(null);
  const [propellants, setPropellants] = useState<PropellantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getMotor(motorId), api.listPropellants()])
      .then(([m, p]) => {
        setMotor(m);
        setPropellants(p);
      })
      .catch(() => setError("Motor not found"))
      .finally(() => setLoading(false));
  }, [motorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSimulate() {
    setSimulating(true);
    try {
      const { simulation_id } = await api.createSimulation({
        motor_id: motorId,
      });
      router.push(`/simulations/${simulation_id}`);
    } catch {
      setError("Failed to start simulation");
      setSimulating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this motor? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteMotor(motorId);
      router.replace("/dashboard");
    } catch {
      setError("Failed to delete motor");
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
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSimulate} disabled={simulating}>
                  {simulating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {simulating ? "Starting…" : "Run Simulation"}
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
                  onClick={handleDelete}
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
            </div>

            <p className="text-xs text-muted-foreground">
              Created {formatDate(motor.created_at)}
              {" · "}
              Updated {formatDate(motor.updated_at)}
            </p>

            {motor.config.motor_type === "solid" && (
              <SolidMotorDetailBody
                motor={{ ...motor, config: motor.config }}
                propellantName={propellantName}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
