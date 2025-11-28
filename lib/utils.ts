import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export all utilities
export * from './utils/id';
export * from './utils/date';
export * from './utils/db-mappers';
