import React from 'react';
import { Brain, Moon, Activity, Smile } from 'lucide-react';
import { getEmoji } from '../utils/moodUtils';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import type { MoodEntry } from '../types/database';

interface MoodCardProps {
  entry: MoodEntry;
  onClick?: () => void;
}

export default function MoodCard({ entry, onClick }: MoodCardProps) {
  const { formatDate } = useUserPreferences();
  
  return (
    <div 
      onClick={onClick}
      className="bg-background-default rounded-lg shadow-sm p-4 border border-border-default hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-text-primary">
          {formatDate(entry.date)}
        </h3>
        <div className="text-2xl">
          {getEmoji(entry.mood)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <Activity className="h-4 w-4 text-text-secondary" />
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">Body:</span> {getEmoji(entry.body)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <Brain className="h-4 w-4 text-text-secondary" />
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">Mind:</span> {getEmoji(entry.mind)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <Moon className="h-4 w-4 text-text-secondary" />
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">Sleep:</span> {getEmoji(entry.sleep)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <Smile className="h-4 w-4 text-text-secondary" />
          </div>
          <div className="text-sm">
            <span className="text-text-secondary">Mood:</span> {getEmoji(entry.mood)}
          </div>
        </div>
      </div>
      
      {entry.notes && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <p className="text-sm text-text-secondary line-clamp-2">{entry.notes}</p>
        </div>
      )}
    </div>
  );
}