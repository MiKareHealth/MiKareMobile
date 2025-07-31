import React from 'react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { getEmoji } from '../utils/moodUtils';
import type { MoodEntry } from '../types/database';

interface MoodHistoryProps {
  entries: MoodEntry[];
  displayLimit?: number;
}

export default function MoodHistory({ entries, displayLimit = 7 }: MoodHistoryProps) {
  const { formatDate } = useUserPreferences();
  
  // Sort entries by date (most recent first) and limit to displayLimit
  const sortedEntries = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, displayLimit);
  
  if (entries.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-text-secondary">
        No mood entries yet. Start tracking your daily mood to see your history here.
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {/* Table header */}
      <div className="grid grid-cols-5 text-xs font-medium text-text-secondary border-b border-border-default pb-2">
        <div>Date</div>
        <div className="text-center">Body</div>
        <div className="text-center">Mind</div>
        <div className="text-center">Sleep</div>
        <div className="text-center">Mood</div>
      </div>
      
      {/* Table rows */}
      {sortedEntries.map((entry) => (
        <div 
          key={entry.id}
          className="grid grid-cols-5 py-2 text-sm border-b border-border-subtle hover:bg-background-subtle transition-colors duration-200"
        >
          <div className="font-medium text-text-primary">{formatDate(entry.date)}</div>
          <div className="flex justify-center">
            <span className="text-xl">{getEmoji(entry.body)}</span>
          </div>
          <div className="flex justify-center">
            <span className="text-xl">{getEmoji(entry.mind)}</span>
          </div>
          <div className="flex justify-center">
            <span className="text-xl">{getEmoji(entry.sleep)}</span>
          </div>
          <div className="flex justify-center">
            <span className="text-xl">{getEmoji(entry.mood)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}