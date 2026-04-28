"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MOTOR_TYPES } from "./motor-types";

type Props = {
  /** Tailwind class shared with the sidebar's regular nav links. */
  itemClassName: string;
  /** Hook to close the mobile sheet after navigating. */
  onNavigate?: () => void;
};

/**
 * Sidebar accordion for the "New Motor" entry point.
 *
 * Click expands the panel inline below the trigger; sub-items list every
 * motor type from the shared `MOTOR_TYPES` registry. Coming-soon entries
 * render a yellow tag below the label and are not clickable.
 */
export function NewMotorAccordion({ itemClassName, onNavigate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(itemClassName, "w-full text-muted-foreground")}
      >
        <Plus className="h-4 w-4" />
        <span>New Motor</span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 opacity-70 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="ml-3 space-y-1 border-l border-border/60 pl-3">
          {MOTOR_TYPES.map((option) =>
            option.comingSoon ? (
              <div
                key={option.id}
                className={cn(
                  "flex flex-col gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/80 cursor-not-allowed",
                )}
              >
                <span>{option.label}</span>
                <Badge variant="warning" className="self-start text-[10px]">
                  Coming soon
                </Badge>
              </div>
            ) : (
              <Link
                key={option.id}
                href={option.href}
                onClick={onNavigate}
                className={cn(itemClassName, "text-muted-foreground")}
              >
                <span>{option.label}</span>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
