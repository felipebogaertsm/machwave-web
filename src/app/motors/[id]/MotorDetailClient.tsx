"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiClient, type MotorDetail } from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, Play } from "lucide-react";

export default function MotorDetailPage() {
  return (
    <ProtectedRoute>
      <MotorDetailContent />
    </ProtectedRoute>
  );
}

function MotorDetailContent() {
  const params = useParams();
  const motorId = params.id as string;
  const api = useApiClient();
  const router = useRouter();
  const [motor, setMotor] = useState<MotorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMotor(motorId)
      .then(setMotor)
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

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {motor && (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{motor.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {motor.motor_id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSimulate} disabled={simulating}>
                    <Play className="mr-2 h-4 w-4" />
                    {simulating ? "Starting…" : "Run Simulation"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Propellant</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge>{motor.config.propellant_id}</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grain</CardTitle>
                  <CardDescription>
                    {motor.config.grain.segments.length} segments
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y">
                  {motor.config.grain.segments.map((seg, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-4 gap-4 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">#{i + 1}</span>
                      <span>
                        OD: {(seg.outer_diameter * 1000).toFixed(1)} mm
                      </span>
                      <span>
                        Core: {(seg.core_diameter * 1000).toFixed(1)} mm
                      </span>
                      <span>L: {(seg.length * 1000).toFixed(1)} mm</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nozzle</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Throat Ø</p>
                    <p>
                      {(
                        motor.config.thrust_chamber.nozzle.throat_diameter *
                        1000
                      ).toFixed(1)}{" "}
                      mm
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Expansion Ratio
                    </p>
                    <p>{motor.config.thrust_chamber.nozzle.expansion_ratio}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Divergent Angle
                    </p>
                    <p>{motor.config.thrust_chamber.nozzle.divergent_angle}°</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
