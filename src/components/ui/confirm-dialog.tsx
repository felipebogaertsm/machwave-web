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

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  runningLabel?: string;
  destructive?: boolean;
  running?: boolean;
  error?: string | null;
};

// Lightweight confirmation dialog for non-catastrophic actions (deleting a
// single motor, simulation, etc.). Bulk / account / admin operations should
// keep using CriticalConfirmDialog with its day-of-month gate.
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  runningLabel,
  destructive = false,
  running = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (running) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription asChild>
              <div>{description}</div>
            </DialogDescription>
          ) : null}
        </DialogHeader>

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
            disabled={running}
          >
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {running && runningLabel ? runningLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
