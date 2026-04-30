import axios from "axios";

// Common shape of FastAPI error bodies: `{ detail: string | object[] }`.
// Pull the human-readable string when present; otherwise fall back to the
// axios message. Returns null only if there's nothing usable.
export function apiErrorDetail(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return null;
}

export function apiErrorStatus(err: unknown): number | null {
  if (axios.isAxiosError(err)) return err.response?.status ?? null;
  return null;
}
