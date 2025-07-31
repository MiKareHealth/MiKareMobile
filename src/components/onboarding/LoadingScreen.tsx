import React, { useEffect, useState } from 'react';
import { MIKARE_HEART_LOGO } from '../../config/branding';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export default function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Update progress from 0 to 100 over the span of 3 seconds
    const interval = 30; // 30ms intervals
    const step = 100 / (3000 / interval); // Calculate step size for smooth animation
    
    let currentProgress = 0;
    
    const timer = setInterval(() => {
      currentProgress += step;
      setProgress(Math.min(Math.round(currentProgress), 100));
      
      if (currentProgress >= 100) {
        clearInterval(timer);
        // Signal completion
        setTimeout(() => {
          onLoadingComplete();
        }, 500); // Short delay after reaching 100%
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-teal-500 to-teal-700 flex flex-col items-center justify-center p-4 animate-fade-down">
      <img 
        src={MIKARE_HEART_LOGO}
        alt="MiKare" 
        className="h-24 mb-8" 
      />
      
      <div className="w-full max-w-md bg-white/10 rounded-full h-4 mb-4">
        <div 
          className="bg-white h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="flex items-center justify-center">
        <div className="text-white text-lg font-medium">
          {progress < 30 && "Setting up your account..."}
          {progress >= 30 && progress < 60 && "Configuring your workspace..."}
          {progress >= 60 && progress < 90 && "Almost there..."}
          {progress >= 90 && "Ready to go!"}
        </div>
      </div>
    </div>
  );
}