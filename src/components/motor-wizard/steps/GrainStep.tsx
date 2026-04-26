"use client";

import {
  useFieldArray,
  useWatch,
  Controller,
  type Control,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";
import type { MotorForm } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Plus, Trash2 } from "lucide-react";

interface Props {
  control: Control<MotorForm>;
  errors: FieldErrors<MotorForm>;
}

export function GrainStep({ control, errors }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "config.grain.segments",
  });

  const segments = useWatch({ control, name: "config.grain.segments" });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Grain Segments</h3>

      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>Segment 1 is the closest to the nozzle.</p>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No segments yet. Add at least one BATES segment.
        </p>
      )}

      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Segment {index + 1}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
            <SegmentField
              label="Outer Diameter (mm)"
              name={
                `config.grain.segments.${index}.outer_diameter` as FieldPath<MotorForm>
              }
              error={errors?.config?.grain?.segments?.[index]?.outer_diameter}
              control={control}
              step="0.1"
            />
            <SegmentField
              label="Core Diameter (mm)"
              name={
                `config.grain.segments.${index}.core_diameter` as FieldPath<MotorForm>
              }
              error={errors?.config?.grain?.segments?.[index]?.core_diameter}
              control={control}
              step="0.1"
            />
            <SegmentField
              label="Length (mm)"
              name={
                `config.grain.segments.${index}.length` as FieldPath<MotorForm>
              }
              error={errors?.config?.grain?.segments?.[index]?.length}
              control={control}
              step="1"
            />
            <SegmentField
              label="Density Ratio (%)"
              name={
                `config.grain.segments.${index}.density_ratio` as FieldPath<MotorForm>
              }
              error={errors?.config?.grain?.segments?.[index]?.density_ratio}
              control={control}
              step="1"
            />
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const last = segments?.[segments.length - 1];
          append(
            last
              ? { ...last }
              : {
                  type: "bates",
                  outer_diameter: NaN,
                  core_diameter: NaN,
                  length: NaN,
                  density_ratio: NaN,
                },
          );
        }}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Segment
      </Button>

      {/* Spacing */}
      <div className="space-y-1">
        <Label htmlFor="spacing">Inter-segment Spacing (mm)</Label>
        <Controller
          name="config.grain.spacing"
          control={control}
          render={({ field }) => (
            <Input
              id="spacing"
              type="number"
              step="0.1"
              min="0"
              {...field}
              value={typeof field.value === "number" ? field.value : ""}
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
              className="w-full max-w-xs"
            />
          )}
        />
        {errors?.config?.grain?.spacing && (
          <p className="text-xs text-destructive">
            {errors.config.grain.spacing.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: controlled number input that works with react-hook-form Controller
// ---------------------------------------------------------------------------

function SegmentField({
  label,
  name,
  error,
  control,
  step = "any",
}: {
  label: string;
  name: FieldPath<MotorForm>;
  error?: { message?: string };
  control: Control<MotorForm>;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            id={name}
            type="number"
            step={step}
            {...field}
            value={
              typeof field.value === "number" && !isNaN(field.value as number)
                ? field.value
                : ""
            }
            onChange={(e) => field.onChange(parseFloat(e.target.value))}
            className="h-8 text-sm"
          />
        )}
      />
      {error?.message && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}
