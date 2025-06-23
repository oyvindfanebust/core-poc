import { clsx, type ClassValue } from 'clsx';

/**
 * Utility function for conditionally joining class names
 * Uses clsx under the hood for flexible className handling
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
