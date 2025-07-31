/**
 * Utility functions for date formatting and timezone handling
 */

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
    console.error('Error formatting date:', error);
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
    console.error('Error formatting datetime:', error);
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
    console.error('Error getting current date in timezone:', error);
    return new Date().toISOString().split('T')[0];
  }
}