"use client";

import {
  useFieldArray,
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
import { Plus, Trash2 } from "lucide-react";

interface Props {
  control: Control<MotorForm>;
  errors: FieldErrors<MotorForm>;
}

const DEFAULT_SEGMENT = {
  type: "bates" as const,
  outer_diameter: 69,
  core_diameter: 25,
  length: 120,
  density_ratio: 100,
};

export function GrainStep({ control, errors }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "config.grain.segments",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Grain Segments</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(DEFAULT_SEGMENT)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Segment
        </Button>
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
          <CardContent className="grid grid-cols-2 gap-3 pt-0">
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
              className="max-w-[180px]"
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
            value={typeof field.value === "number" ? field.value : ""}
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
