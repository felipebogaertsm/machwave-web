import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Optional accessible label; defaults to "Loading". */
  label?: string;
  className?: string;
  /**
   * "block" centers the spinner with a label inline beneath the
   * caller; "inline" renders just the icon (use inside buttons).
   */
  variant?: "block" | "inline";
}

export function Spinner({
  label = "Loading",
  className,
  variant = "block",
}: Props) {
  if (variant === "inline") {
    return (
      <Loader2
        className={cn("h-4 w-4 animate-spin", className)}
        aria-label={label}
        role="status"
      />
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className={cn("h-4 w-4 animate-spin", className)} />
      <span>{label}…</span>
    </div>
  );
}
