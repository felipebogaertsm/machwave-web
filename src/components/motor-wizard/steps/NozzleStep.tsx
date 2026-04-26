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

const fields: {
  label: string;
  name: keyof NonNullable<MotorForm["config"]["thrust_chamber"]["nozzle"]>;
  step?: string;
}[] = [
  { label: "Inlet Diameter (mm)", name: "inlet_diameter", step: "0.1" },
  { label: "Throat Diameter (mm)", name: "throat_diameter", step: "0.1" },
  { label: "Divergent Half-angle (°)", name: "divergent_angle", step: "0.1" },
  { label: "Convergent Half-angle (°)", name: "convergent_angle", step: "0.1" },
  { label: "Expansion Ratio (Ae/At)", name: "expansion_ratio", step: "0.01" },
  { label: "c₁ coefficient", name: "c_1", step: "0.0001" },
  { label: "c₂ coefficient", name: "c_2", step: "0.0001" },
];

export function NozzleStep({ control, errors }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Nozzle</h3>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(({ label, name, step }) => (
          <div key={name} className="space-y-1">
            <Label className="text-sm">{label}</Label>
            <Controller
              name={
                `config.thrust_chamber.nozzle.${name}` as FieldPath<MotorForm>
              }
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step={step ?? "any"}
                  {...field}
                  value={typeof field.value === "number" ? field.value : ""}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              )}
            />
            {errors?.config?.thrust_chamber?.nozzle?.[name] && (
              <p className="text-xs text-destructive">
                {errors.config.thrust_chamber.nozzle[name].message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
