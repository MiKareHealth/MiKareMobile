import React from 'react';
import { Smile, Brain, Moon, Activity } from 'lucide-react';
import { getEmoji } from '../utils/moodUtils';
import type { MoodEntry } from '../types/database';

interface MoodSummaryProps {
  entries: MoodEntry[];
  days?: number;
}

export default function MoodSummary({ entries, days = 7 }: MoodSummaryProps) {
  if (entries.length === 0) {
    return (
      <div className="text-sm text-text-secondary italic text-center">
        No mood entries yet. Start tracking your daily mood to see insights here.
      </div>
    );
  }

  // Sort entries by date (newest first)
  const sortedEntries = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, days);
  
  // Calculate average scores
  const avgBody = Math.round(sortedEntries.reduce((sum, entry) => sum + entry.body, 0) / sortedEntries.length);
  const avgMind = Math.round(sortedEntries.reduce((sum, entry) => sum + entry.mind, 0) / sortedEntries.length);
  const avgSleep = Math.round(sortedEntries.reduce((sum, entry) => sum + entry.sleep, 0) / sortedEntries.length);
  const avgMood = Math.round(sortedEntries.reduce((sum, entry) => sum + entry.mood, 0) / sortedEntries.length);
  
  // Calculate overall average
  const avgOverall = Math.round((avgBody + avgMind + avgSleep + avgMood) / 4);
  
  return (
    <div className="p-4 bg-gradient-to-r from-teal-50 to-white rounded-lg">
      <h3 className="text-sm font-medium text-text-primary mb-3">
        {sortedEntries.length > 1 
          ? `Last ${sortedEntries.length} Days Average` 
          : "Today's Mood"}
      </h3>
      
      {/* Overall score */}
      <div className="flex items-center justify-center mb-4">
        <div className="bg-background-subtle w-16 h-16 rounded-full flex items-center justify-center text-4xl">
          {getEmoji(avgOverall)}
        </div>
      </div>
      
      {/* Individual scores */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="bg-background-subtle w-10 h-10 mx-auto rounded-full flex items-center justify-center">
            <Activity className="h-5 w-5 text-text-secondary" />
          </div>
          <div className="text-xs font-medium text-text-primary mt-1">Body</div>
          <div className="text-sm">{getEmoji(avgBody)}</div>
        </div>
        
        <div>
          <div className="bg-background-subtle w-10 h-10 mx-auto rounded-full flex items-center justify-center">
            <Brain className="h-5 w-5 text-text-secondary" />
          </div>
          <div className="text-xs font-medium text-text-primary mt-1">Mind</div>
          <div className="text-sm">{getEmoji(avgMind)}</div>
        </div>
        
        <div>
          <div className="bg-background-subtle w-10 h-10 mx-auto rounded-full flex items-center justify-center">
            <Moon className="h-5 w-5 text-text-secondary" />
          </div>
          <div className="text-xs font-medium text-text-primary mt-1">Sleep</div>
          <div className="text-sm">{getEmoji(avgSleep)}</div>
        </div>
        
        <div>
          <div className="bg-background-subtle w-10 h-10 mx-auto rounded-full flex items-center justify-center">
            <Smile className="h-5 w-5 text-text-secondary" />
          </div>
          <div className="text-xs font-medium text-text-primary mt-1">Mood</div>
          <div className="text-sm">{getEmoji(avgMood)}</div>
        </div>
      </div>
    </div>
  );
}