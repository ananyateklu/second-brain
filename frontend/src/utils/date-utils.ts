/**
 * Date utilities using date-fns for timezone-safe date handling.
 * 
 * Key principles:
 * - Use `format(date, 'yyyy-MM-dd')` instead of `toISOString().split('T')[0]` to avoid UTC conversion
 * - Use `parse(dateStr, 'yyyy-MM-dd', new Date())` instead of `new Date(dateStr)` for date-only strings
 * - date-fns functions work in local time by default
 */

import {
  format,
  parse,
  startOfDay,
  endOfDay,
  differenceInDays,
  differenceInMinutes,
  differenceInHours,
  isToday,
  isYesterday,
  isSameYear,
  isValid,
  parseISO,
} from 'date-fns';

// ============================================
// Core Date Parsing & Formatting
// ============================================

/**
 * Format a Date object as yyyy-MM-dd in LOCAL time.
 * Use this instead of toISOString().split('T')[0] which converts to UTC.
 */
export function formatLocalDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a yyyy-MM-dd date string as LOCAL date at midnight.
 * Use this instead of new Date(dateStr) which may interpret as UTC for ISO format.
 */
export function parseLocalDate(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Parse any date string intelligently - handles both ISO datetime and date-only strings.
 * - For ISO datetime strings (with 'T'): uses parseISO which handles timezone correctly
 * - For date-only strings (yyyy-MM-dd): parses as local date to avoid UTC interpretation
 */
export function parseDate(dateString: string): Date {
  if (dateString.includes('T')) {
    return parseISO(dateString);
  }
  return parseLocalDate(dateString);
}

// ============================================
// Day Boundary Functions
// ============================================

/**
 * Get the start of day (midnight) for a given date in local time.
 */
export function getStartOfDay(date: Date): Date {
  return startOfDay(date);
}

/**
 * Get the end of day (23:59:59.999) for a given date in local time.
 */
export function getEndOfDay(date: Date): Date {
  return endOfDay(date);
}

/**
 * Get the date-only portion of a date for comparison.
 * Returns a new Date object set to midnight local time.
 */
export function getDateOnly(date: Date): Date {
  return startOfDay(date);
}

// ============================================
// Date Formatting Functions
// ============================================

/**
 * Format a date string for relative display (Today, Yesterday, X days ago, etc.)
 * Handles both ISO datetime strings and date-only strings correctly.
 */
export function formatRelativeDate(dateString: string): string {
  const date = parseDate(dateString);
  
  if (!isValid(date)) {
    return 'Invalid date';
  }
  
  const now = new Date();

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  
  const diffDays = differenceInDays(startOfDay(now), startOfDay(date));
  
  if (diffDays > 0 && diffDays < 7) {
    return `${diffDays} days ago`;
  }
  
  // Format with year if different year
  if (isSameYear(date, now)) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
}

/**
 * Format a date for conversation display in chat sidebar.
 * Shows relative time for recent dates, full date for older ones.
 */
export function formatConversationDate(dateString: string): string {
  const date = parseDate(dateString);
  
  if (!isValid(date)) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffMins = differenceInMinutes(now, date);
  const diffHours = differenceInHours(now, date);
  const diffDays = differenceInDays(now, date);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return format(date, 'MM/dd/yyyy');
}

/**
 * Format a date for chart labels (e.g., "Nov 30")
 */
export function formatChartDate(date: Date): string {
  return format(date, 'MMM d');
}

/**
 * Format a date for chart labels with year (e.g., "Nov 2025")
 */
export function formatChartDateWithYear(date: Date): string {
  return format(date, 'MMM yyyy');
}
