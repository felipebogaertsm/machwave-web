"use client";

import type { MotorRecord, SolidMotorConfig } from "@/lib/api";
import { mToMm, fractionToPercent } from "@/lib/units";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SolidMotor = MotorRecord & { config: SolidMotorConfig };

interface Props {
  motor: SolidMotor;
  propellantName: string;
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

export function SolidMotorDetailBody({ motor, propellantName }: Props) {
  const { config } = motor;

  return (
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
            value={`${config.thrust_chamber.dry_mass.toFixed(3)} kg`}
          />
          <Field
            label="Exit ↔ Port"
            value={`${mToMm(config.thrust_chamber.nozzle_exit_to_grain_port_distance).toFixed(1)} mm`}
          />
          <Field
            label="Center of Gravity"
            value={
              config.thrust_chamber.center_of_gravity_coordinate
                ? `(${config.thrust_chamber.center_of_gravity_coordinate
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
            value={`${mToMm(config.thrust_chamber.nozzle.inlet_diameter).toFixed(1)} mm`}
          />
          <Field
            label="Throat Ø"
            value={`${mToMm(config.thrust_chamber.nozzle.throat_diameter).toFixed(1)} mm`}
          />
          <Field
            label="Expansion Ratio"
            value={config.thrust_chamber.nozzle.expansion_ratio}
          />
          <Field
            label="Convergent Angle"
            value={`${config.thrust_chamber.nozzle.convergent_angle}°`}
          />
          <Field
            label="Divergent Angle"
            value={`${config.thrust_chamber.nozzle.divergent_angle}°`}
          />
          <Field
            label="Discharge Coeff. (C₁)"
            value={config.thrust_chamber.nozzle.c_1}
          />
          <Field
            label="Thrust Coeff. Loss (C₂)"
            value={config.thrust_chamber.nozzle.c_2}
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
            value={`${mToMm(config.thrust_chamber.combustion_chamber.casing_inner_diameter).toFixed(1)} mm`}
          />
          <Field
            label="Casing Outer Ø"
            value={`${mToMm(config.thrust_chamber.combustion_chamber.casing_outer_diameter).toFixed(1)} mm`}
          />
          <Field
            label="Internal Length"
            value={`${mToMm(config.thrust_chamber.combustion_chamber.internal_length).toFixed(1)} mm`}
          />
          <Field
            label="Liner Thickness"
            value={`${mToMm(config.thrust_chamber.combustion_chamber.thermal_liner_thickness).toFixed(2)} mm`}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-12">
        <CardHeader>
          <CardTitle>Grain</CardTitle>
          <CardDescription>
            {config.grain.segments.length} segment
            {config.grain.segments.length !== 1 ? "s" : ""}
            {" · "}
            Spacing {mToMm(config.grain.spacing).toFixed(1)} mm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Outer Ø</th>
                  <th className="px-3 py-2 text-right font-medium">Core Ø</th>
                  <th className="px-3 py-2 text-right font-medium">Length</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Density Ratio
                  </th>
                </tr>
              </thead>
              <tbody>
                {config.grain.segments.map((seg, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
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
                      {fractionToPercent(seg.density_ratio).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
