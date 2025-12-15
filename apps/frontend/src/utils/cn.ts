import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge class names conditionally.
 * Uses `tailwind-merge` to resolve conflicts efficiently.
 * Example: cn('px-2 py-1', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
