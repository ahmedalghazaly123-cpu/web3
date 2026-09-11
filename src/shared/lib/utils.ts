import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes, resolving conflicts intelligently.
 * Usage: cn('px-2', condition && 'px-4')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration in minutes to a human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format a number as a progress percentage.
 */
export function formatProgress(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Get greeting based on time of day.
 */
export function getTimeBasedGreeting(hour?: number): 'morning' | 'afternoon' | 'evening' {
  const h = hour ?? new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Get initials from a name.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Check if a route path is active.
 */
export function isActivePath(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname.startsWith(path);
}

/**
 * Generate a random streak number (for demo).
 */
export function generateStreak(): number {
  return Math.floor(Math.random() * 30) + 1;
}
