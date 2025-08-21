// Helper functions for mood-related operations

/**
 * Returns an emoji based on a mood value (1-5)
 */
export const getEmoji = (mood: number): string => {
  switch (mood) {
    case 1: return '😣'; // Very bad
    case 2: return '😔'; // Bad
    case 3: return '😐'; // Neutral
    case 4: return '😊'; // Good
    case 5: return '😄'; // Very good
    default: return '😊';
  }
};

/**
 * Returns a descriptive label for a mood value (1-5)
 */
export const getMoodLabel = (mood: number): string => {
  switch (mood) {
    case 1: return 'Very Poor';
    case 2: return 'Poor';
    case 3: return 'Neutral';
    case 4: return 'Good';
    case 5: return 'Excellent';
    default: return 'N/A';
  }
};

/**
 * Checks if a date is today
 */
export const isToday = (date: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return date === today;
};

/**
 * Returns a background color class for a mood value (1-5)
 * Used only in selection interface for better visual feedback
 */
export const getMoodColorClass = (mood: number): string => {
  switch (mood) {
    case 1: return 'bg-red-200';
    case 2: return 'bg-orange-200';
    case 3: return 'bg-yellow-200';
    case 4: return 'bg-lime-200';
    case 5: return 'bg-green-200'
    default: return 'bg-gray-100';
  }
};