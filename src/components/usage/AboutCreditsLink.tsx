import Link from "next/link";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small unobtrusive link to the credit-system explainer on /about.
 * Drop it next to anything that mentions tokens, caps, or balances.
 */
export function AboutCreditsLink({
  className,
  label = "About credits",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href="/about#credits"
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2",
        className,
      )}
    >
      <Info className="h-3 w-3" />
      {label}
    </Link>
  );
}
