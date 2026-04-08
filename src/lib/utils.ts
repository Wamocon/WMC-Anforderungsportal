import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Map a snake_case DB status to the correct i18n key under `common.`
 * e.g. "pending_review" → "pendingReview", "in_progress" → "inProgress"
 */
export function statusKey(status: string): string {
  return status.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
