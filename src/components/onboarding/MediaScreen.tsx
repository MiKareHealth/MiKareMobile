import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { ONBOARDING_MEDIA_IMAGE, ONBOARDING_MEDIA_VIDEO } from '../../config/branding';

interface MediaScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function MediaScreen({ onComplete, onBack }: MediaScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { state } = useOnboarding();

  // Video loading management
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (videoElement) {
      const handleLoadedData = () => {
        setVideoLoaded(true);
      };

      const handleError = () => {
        console.error('Error loading video');
        setVideoError(true);
      };

      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('error', handleError);
      
      // Start loading the video
      videoElement.load();
      
      // Clean up event listeners
      return () => {
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        videoElement.removeEventListener('error', handleError);
      };
    }
  }, []);

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Clear sessionStorage data since we're now completing
    try {
      sessionStorage.removeItem('mikare_onboarding_profiles');
      sessionStorage.removeItem('mikare_onboarding_settings');
      sessionStorage.removeItem('mikare_onboarding_account');
      sessionStorage.removeItem('onboardingState');
    } catch (e) {
      console.error('Failed to clean up sessionStorage:', e);
    }
    
    onComplete();
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 animate-fade-down">
      <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
        {/* Static background image */}
        <img 
          src={ONBOARDING_MEDIA_IMAGE}
          alt="Welcome to MiKare"
          className={`w-full aspect-video object-cover object-center rounded-lg ${videoLoaded ? 'hidden' : 'block'}`}
        />
        
        {/* Video overlay */}
        <video 
          ref={videoRef}
          src={ONBOARDING_MEDIA_VIDEO}
          muted
          playsInline
          loop
          autoPlay
          className={`w-full aspect-video object-cover object-center rounded-lg transition-opacity duration-500 ${
            videoLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
        />
      </div>
      
      <div className="p-8 text-center bg-white rounded-lg shadow-md mt-6">
        <h2 className="text-3xl font-semibold font-heading text-heading-h2 mb-4">
          You're All Set!
        </h2>
        
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Welcome to MiKare, your personal health companion. We're here to help you manage your health journey with ease and control.
        </p>

        {state.error && (
          <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.error}
            <button 
              className="ml-2 underline text-red-700 font-medium"
              onClick={handleComplete}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
