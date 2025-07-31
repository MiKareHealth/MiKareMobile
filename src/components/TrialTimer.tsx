import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TrialTimerProps {
  trialStartedAt: string;
  trialDays: number;
  onTrialEnd?: () => void;
}

export default function TrialTimer({ trialStartedAt, trialDays, onTrialEnd }: TrialTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const trialStart = new Date(trialStartedAt);
      const trialEnd = new Date(trialStart.getTime() + (trialDays * 24 * 60 * 60 * 1000));
      const now = new Date();

      if (now >= trialEnd) {
        setIsExpired(true);
        setTimeLeft('Trial ended');
        onTrialEnd?.();
        return;
      }

      const distance = trialEnd.getTime() - now.getTime();
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} remaining`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`);
      } else {
        setTimeLeft(`${minutes} minute${minutes !== 1 ? 's' : ''} remaining`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [trialStartedAt, trialDays, onTrialEnd]);

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <div>
            <h4 className="font-medium text-red-800">Trial Period Ended</h4>
            <p className="text-sm text-red-600">Your trial has ended. Please upgrade to continue using premium features.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center">
        <Clock className="h-5 w-5 text-amber-600 mr-2" />
        <div>
          <h4 className="font-medium text-amber-800">Trial Period Active</h4>
          <p className="text-sm text-amber-700">{timeLeft}</p>
          <p className="text-xs text-amber-600 mt-1">
            Started {formatDistanceToNow(new Date(trialStartedAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
} 