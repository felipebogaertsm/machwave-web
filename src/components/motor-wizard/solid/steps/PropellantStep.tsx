"use client";

import { useEffect, useState } from "react";
import { Controller, type Control } from "react-hook-form";
import type { SolidMotorForm } from "@/lib/validations";
import { useApiClient } from "@/lib/api";
import type { PropellantItem } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  control: Control<SolidMotorForm>;
  errors: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function PropellantStep({ control, errors }: Props) {
  const api = useApiClient();
  const [propellants, setPropellants] = useState<PropellantItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPropellants()
      .then((items) => setPropellants(items.filter((p) => p.motor_type === "solid")))
      .catch(() => setLoadError("Failed to load propellants"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Motor name */}
      <div className="space-y-1">
        <Label>Motor Name</Label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input placeholder="e.g. Olympus K-500" {...field} />
          )}
        />
        {errors?.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Propellant selector */}
      <div className="space-y-2">
        <Label>Propellant</Label>
        {loadError && <p className="text-xs text-destructive">{loadError}</p>}
        <Controller
          name="config.propellant_id"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {propellants.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                    field.value === p.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={p.id}
                    checked={field.value === p.id}
                    onChange={() => field.onChange(p.id)}
                  />
                  <span className="text-sm font-medium">{p.name}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors?.config?.propellant_id && (
          <p className="text-xs text-destructive">
            {errors.config.propellant_id.message}
          </p>
        )}
      </div>
    </div>
  );
}
