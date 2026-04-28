"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function currentDayOfMonth(): string {
  return String(new Date().getDate()).padStart(2, "0");
}

export type CriticalConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  running?: boolean;
  runningLabel?: string;
  error?: string | null;
  extraContent?: React.ReactNode;
  extraValid?: boolean;
};

export function CriticalConfirmDialog(props: CriticalConfirmDialogProps) {
  const { open, onOpenChange, running = false } = props;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (running) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      >
        <CriticalConfirmDialogBody {...props} />
      </DialogContent>
    </Dialog>
  );
}

function CriticalConfirmDialogBody({
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  running = false,
  runningLabel,
  error,
  extraContent,
  extraValid = true,
}: CriticalConfirmDialogProps) {
  const [day, setDay] = React.useState("");
  const dayValid = day === currentDayOfMonth();
  const canConfirm = !running && dayValid && extraValid;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        ) : null}
      </DialogHeader>

      {extraContent}

      <div className="space-y-2">
        <Label htmlFor="critical-confirm-day">
          Type today&rsquo;s day of the month (2 digits) to confirm.
        </Label>
        <Input
          id="critical-confirm-day"
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          value={day}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 2);
            setDay(next);
          }}
          placeholder="DD"
          disabled={running}
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" type="button" disabled={running}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          variant={destructive ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {running && runningLabel ? runningLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
