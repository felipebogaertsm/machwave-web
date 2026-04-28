"use client";

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Input } from "@/components/ui/input";

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  step?: string;
  id?: string;
  className?: string;
}

/**
 * Controlled <input type="number"> that plays nicely with react-hook-form.
 *
 * Why this exists: storing the raw `parseFloat()` result lets the form keep
 * a numeric type, but partial input like "." or an empty field both produce
 * NaN. React errors when NaN reaches the `value` attribute, so we render
 * an empty string in that case while still writing NaN to the form state
 * so Zod validation surfaces the missing value.
 */
export function NumberField<TForm extends FieldValues>({
  control,
  name,
  step = "any",
  id,
  className,
}: Props<TForm>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const display =
          typeof field.value === "number" && Number.isFinite(field.value)
            ? field.value
            : "";
        return (
          <Input
            id={id ?? name}
            type="number"
            step={step}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={display}
            onChange={(e) => {
              const raw = e.target.value;
              field.onChange(raw === "" ? NaN : parseFloat(raw));
            }}
            className={className}
          />
        );
      }}
    />
  );
}
