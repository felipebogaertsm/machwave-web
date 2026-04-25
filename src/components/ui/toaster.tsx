// Minimal toast primitives compatible with shadcn/ui toaster pattern.
// Run `npx shadcn@latest add toast` after init for a full implementation.
"use client";

import * as React from "react";

export function Toaster() {
  return <div id="toaster-root" />;
}

export function useToast() {
  return {
    toast: ({
      title,
      description,
    }: {
      title?: string;
      description?: string;
    }) => {
      // Simple fallback — replace with shadcn toast after init
      console.info("[toast]", title, description);
    },
  };
}
