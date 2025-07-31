import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

interface SessionTimeoutModalProps {
  timeRemaining: number | null;
  onExtendSession: () => void;
  onLogout: () => void;
  isVisible: boolean;
}

export default function SessionTimeoutModal({ 
  timeRemaining, 
  onExtendSession, 
  onLogout, 
  isVisible 
}: SessionTimeoutModalProps) {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    if (!timeRemaining || !isVisible) return;
    
    // Convert to minutes and seconds
    const mins = Math.floor(timeRemaining / 60000);
    const secs = Math.floor((timeRemaining % 60000) / 1000);
    
    setMinutes(mins);
    setSeconds(secs);
    
    const intervalId = setInterval(() => {
      setSeconds(prevSecs => {
        if (prevSecs === 0) {
          setMinutes(prevMins => {
            if (prevMins === 0) {
              clearInterval(intervalId);
              onLogout();
              return 0;
            }
            return prevMins - 1;
          });
          return 59;
        }
        return prevSecs - 1;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [timeRemaining, isVisible, onLogout]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background-default rounded-xl shadow-lg max-w-md w-full mx-4 p-6 animate-fade-down">
        <div className="text-center mb-6">
          <div className="flex justify-center">
            <div className="bg-warning-light p-3 rounded-full">
              <ShieldAlert className="h-10 w-10 text-warning" />
            </div>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-text-primary">Your session is about to expire</h2>
          <p className="mt-2 text-text-secondary">
            For your security, you'll be logged out in:
          </p>
          <div className="mt-4 text-3xl font-bold text-warning">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={onLogout}
            className="w-1/2 py-2 px-4 border border-border-default rounded-md shadow-sm text-sm font-medium text-text-primary bg-background-default hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Log out now
          </button>
          <button
            onClick={onExtendSession}
            className="w-1/2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  );
}