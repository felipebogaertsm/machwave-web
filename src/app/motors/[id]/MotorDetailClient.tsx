"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useApiClient,
  type MotorDetail,
  type PropellantItem,
} from "@/lib/api";
import { mToMm, fractionToPercent } from "@/lib/units";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
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

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
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
  const [motor, setMotor] = useState<MotorDetail | null>(null);
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
      <div className="mx-auto max-w-7xl space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
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

            <p className="text-xs text-muted-foreground">
              Created {formatDate(motor.created_at)}
              {" · "}
              Updated {formatDate(motor.updated_at)}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Card className="lg:col-span-4 flex flex-col">
                <CardHeader>
                  <CardTitle>Propellant</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 items-center">
                  <Badge className="text-sm">{propellantName}</Badge>
                </CardContent>
              </Card>

              <Card className="lg:col-span-8 flex flex-col">
                <CardHeader>
                  <CardTitle>Mass & Geometry</CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 grid-cols-2 sm:grid-cols-3 gap-4 content-center">
                  <Field
                    label="Dry Mass"
                    value={`${motor.config.thrust_chamber.dry_mass.toFixed(3)} kg`}
                  />
                  <Field
                    label="Exit ↔ Port"
                    value={`${mToMm(motor.config.thrust_chamber.nozzle_exit_to_grain_port_distance).toFixed(1)} mm`}
                  />
                  <Field
                    label="Center of Gravity"
                    value={
                      motor.config.thrust_chamber.center_of_gravity_coordinate
                        ? `(${motor.config.thrust_chamber.center_of_gravity_coordinate
                            .map((c) => mToMm(c).toFixed(1))
                            .join(", ")}) mm`
                        : null
                    }
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-7 flex flex-col">
                <CardHeader>
                  <CardTitle>Nozzle</CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 grid-cols-2 sm:grid-cols-4 gap-4 content-between">
                  <Field
                    label="Inlet Ø"
                    value={`${mToMm(motor.config.thrust_chamber.nozzle.inlet_diameter).toFixed(1)} mm`}
                  />
                  <Field
                    label="Throat Ø"
                    value={`${mToMm(motor.config.thrust_chamber.nozzle.throat_diameter).toFixed(1)} mm`}
                  />
                  <Field
                    label="Expansion Ratio"
                    value={motor.config.thrust_chamber.nozzle.expansion_ratio}
                  />
                  <Field
                    label="Convergent Angle"
                    value={`${motor.config.thrust_chamber.nozzle.convergent_angle}°`}
                  />
                  <Field
                    label="Divergent Angle"
                    value={`${motor.config.thrust_chamber.nozzle.divergent_angle}°`}
                  />
                  <Field
                    label="Discharge Coeff. (C₁)"
                    value={motor.config.thrust_chamber.nozzle.c_1}
                  />
                  <Field
                    label="Thrust Coeff. Loss (C₂)"
                    value={motor.config.thrust_chamber.nozzle.c_2}
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-5 flex flex-col">
                <CardHeader>
                  <CardTitle>Combustion Chamber</CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 grid-cols-2 gap-4 content-between">
                  <Field
                    label="Casing Inner Ø"
                    value={`${mToMm(motor.config.thrust_chamber.combustion_chamber.casing_inner_diameter).toFixed(1)} mm`}
                  />
                  <Field
                    label="Casing Outer Ø"
                    value={`${mToMm(motor.config.thrust_chamber.combustion_chamber.casing_outer_diameter).toFixed(1)} mm`}
                  />
                  <Field
                    label="Internal Length"
                    value={`${mToMm(motor.config.thrust_chamber.combustion_chamber.internal_length).toFixed(1)} mm`}
                  />
                  <Field
                    label="Liner Thickness"
                    value={`${mToMm(motor.config.thrust_chamber.combustion_chamber.thermal_liner_thickness).toFixed(2)} mm`}
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-12">
                <CardHeader>
                  <CardTitle>Grain</CardTitle>
                  <CardDescription>
                    {motor.config.grain.segments.length} segment
                    {motor.config.grain.segments.length !== 1 ? "s" : ""}
                    {" · "}
                    Spacing {mToMm(motor.config.grain.spacing).toFixed(1)} mm
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2 text-left font-medium">#</th>
                          <th className="px-3 py-2 text-left font-medium">
                            Type
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Outer Ø
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Core Ø
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Length
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Density Ratio
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {motor.config.grain.segments.map((seg, i) => (
                          <tr
                            key={i}
                            className="border-b last:border-0 hover:bg-accent/40"
                          >
                            <td className="px-3 py-2 text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary">
                                {seg.type.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {mToMm(seg.outer_diameter).toFixed(1)} mm
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {mToMm(seg.core_diameter).toFixed(1)} mm
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {mToMm(seg.length).toFixed(1)} mm
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {fractionToPercent(seg.density_ratio).toFixed(1)}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
