"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";
import type { MotorForm } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  control: Control<MotorForm>;
  errors: FieldErrors<MotorForm>;
}

const chamberFields = [
  {
    label: "Casing Inner Diameter (mm)",
    name: "casing_inner_diameter",
    step: "0.1",
  },
  {
    label: "Casing Outer Diameter (mm)",
    name: "casing_outer_diameter",
    step: "0.1",
  },
  { label: "Internal Length (mm)", name: "internal_length", step: "1" },
  {
    label: "Thermal Liner Thickness (mm)",
    name: "thermal_liner_thickness",
    step: "0.1",
  },
] as const;

export function ChamberStep({ control, errors }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Combustion Chamber</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{chamberFields.map(({ label, name, step }) => (
            <div key={name} className="space-y-1">
              <Label className="text-sm">{label}</Label>
              <Controller
                name={
                  `config.thrust_chamber.combustion_chamber.${name}` as FieldPath<MotorForm>
                }
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    step={step}
                    {...field}
                    value={typeof field.value === "number" ? field.value : ""}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                )}
              />
              {errors?.config?.thrust_chamber?.combustion_chamber?.[name] && (
                <p className="text-xs text-destructive">
                  {
                    errors.config.thrust_chamber.combustion_chamber[name]
                      .message
                  }
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Thrust Chamber</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> (kg)</Label>
            <Controller
              name="config.thrust_chamber.dry_mass"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Nozzle Exit → Grain Port (mm)</Label>
            <Controller
              name="config.thrust_chamber.nozzle_exit_to_grain_port_distance"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="1"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
