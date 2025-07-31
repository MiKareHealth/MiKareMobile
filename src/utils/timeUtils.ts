/**
 * Utility functions for date formatting and timezone handling
 */

import { error as logError } from './logger';

/**
 * Format a date using the user's preferred timezone and format
 * @param date The date to format
 * @param timezone User's preferred timezone
 * @param format '12h' or '24h'
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, timezone = 'UTC', format: '12h' | '24h' = '12h'): string {
  if (!date) return '';
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    return new Date(date).toLocaleDateString(undefined, options);
  } catch (error) {
    logError('Error formatting date:', error);
    return new Date(date).toLocaleDateString();
  }
}

/**
 * Format a date with time using the user's preferred timezone and format
 * @param date The date to format
 * @param timezone User's preferred timezone
 * @param format '12h' or '24h'
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date, timezone = 'UTC', format: '12h' | '24h' = '12h'): string {
  if (!date) return '';
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: format === '12h',
    };
    
    return new Date(date).toLocaleString(undefined, options);
  } catch (error) {
    logError('Error formatting datetime:', error);
    return new Date(date).toLocaleString();
  }
}

/**
 * Get the current date in the user's timezone
 * @param timezone User's preferred timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentDateInTimezone(timezone = 'UTC'): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    
    const dateParts = new Intl.DateTimeFormat('en-CA', options).formatToParts(new Date());
    const year = dateParts.find(part => part.type === 'year')?.value;
    const month = dateParts.find(part => part.type === 'month')?.value;
    const day = dateParts.find(part => part.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    logError('Error getting current date in timezone:', error);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Check if a date is today in the user's timezone
 * @param date The date to check
 * @param timezone User's preferred timezone
 * @returns true if the date is today
 */
export function isToday(date: string | Date, timezone = 'UTC'): boolean {
  try {
    const today = getCurrentDateInTimezone(timezone);
    const checkDate = typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0];
    return today === checkDate;
  } catch (error) {
    logError('Error checking if date is today:', error);
    // Fallback to simpler method
    const today = new Date().toISOString().split('T')[0];
    const checkDate = typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0];
    return today === checkDate;
  }
}