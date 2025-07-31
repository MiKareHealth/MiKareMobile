import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { SplashPage } from '../components/FirstTimeSplash';

interface SplashContextType {
  showSplash: boolean;
  setShowSplash: (show: boolean) => void;
  isLoading: boolean;
  subscription: string | null;
  tutorialPages: SplashPage[];
}

// Create context with safe default values
const SplashContext = createContext<SplashContextType>({
  showSplash: true,
  setShowSplash: () => {},
  isLoading: true,
  subscription: null,
  tutorialPages: []
});

export const useSplash = () => {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error('useSplash must be used within a SplashProvider');
  }
  return context;
};

interface SplashProviderProps {
  children: ReactNode;
}

export const SplashProvider: React.FC<SplashProviderProps> = ({ children }) => {
  const [showSplash, setShowSplash] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<string | null>(null);

  // Define tutorial pages data
  const tutorialPagesData: SplashPage[] = [
    {
      mediaType: 'video',
      mediaUrl: 'https://mikare.health/wp-content/uploads/2025/06/Splash1.mp4',
      description: `
  First, add a profile for the person you're caring for. Enter their name, relationship, and date of birth so you have all their details in one place. You can always come back and update this information later.
      `.trim()
    },
    {
      mediaType: 'video',
      mediaUrl: 'https://mikare.health/wp-content/uploads/2025/06/Splash2.mp4',
      description: `
  Next, record any symptoms they experience. Set start and end dates, select how severe each symptom feels, and add notes to capture extra context. Over time, this helps you and your doctor see patterns and make informed decisions.
      `.trim()
    },
    {
      mediaType: 'video',
      mediaUrl: 'https://mikare.health/wp-content/uploads/2025/06/Splash3.mp4',
      description: `
  Your diary brings everything together in chronological order. Log appointments, jot down important notes, and view all events on a single timeline. This way you'll always have a clear, complete history at your fingertips.
      `.trim()
    },
    {
      mediaType: 'video',
      mediaUrl: 'https://mikare.health/wp-content/uploads/2025/06/Splash4.mp4',
      description: `
  Keep track of every medication they take with start and end dates, dosage details, and prescribing doctor. See which treatments are active or completed at a glance. Managing medications has never been this straightforward.
      `.trim()
    },
    {
      mediaType: 'video',
      mediaUrl: 'https://mikare.health/wp-content/uploads/2025/06/Splash5.mp4',
      description: `
  Finally, let our AI review all your entries and surface personalized insights. You'll receive suggested questions and next steps based on symptoms, diary logs, and medications. Get the most out of every appointment with tailored guidance.
      `.trim()
    }
  ];

  const value = {
    showSplash,
    setShowSplash,
    isLoading,
    subscription,
    tutorialPages: tutorialPagesData
  };

  return (
    <SplashContext.Provider value={value}>
      {children}
    </SplashContext.Provider>
  );
};