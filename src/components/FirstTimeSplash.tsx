import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export type SplashPage = {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  description: string;
};

interface FirstTimeSplashProps {
  pages: SplashPage[];
  onClose: () => void;
}

export default function FirstTimeSplash({ pages, onClose }: FirstTimeSplashProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Handle case where pages is undefined or empty
  if (!pages || pages.length === 0) {
    return null;
  }

  const isFirstPage = currentIndex === 0;
  const isLastPage = currentIndex === pages.length - 1;

  const handleNext = useCallback(() => {
    if (isLastPage) {
      onClose();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLastPage, onClose]);

  const handleBack = useCallback(() => {
    if (!isFirstPage) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [isFirstPage]);

  // Handle keyboard events (Escape to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleNext, handleBack]);

  const currentPage = pages[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg max-w-5xl w-full mx-4 p-6 relative animate-fade-down">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="flex flex-col md:flex-row gap-6 mt-4">
          {/* Media section - increased size by 30% */}
          <div className="md:w-3/4">
            {currentPage.mediaType === 'image' ? (
              <img
                src={currentPage.mediaUrl}
                alt={`Tutorial step ${currentIndex + 1}`}
                className="w-full h-auto rounded-lg object-cover aspect-video"
              />
            ) : (
              <video
                src={currentPage.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-auto rounded-lg object-cover aspect-video"
              />
            )}
          </div>

          {/* Description section */}
          <div className="md:w-1/4 flex flex-col justify-between">
            <div className="prose">
              <p className="text-base text-gray-700">{currentPage.description}</p>
            </div>

            {/* Progress indicators */}
            <div className="flex justify-center mt-6 mb-4">
              {pages.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full mx-1 ${
                    index === currentIndex
                      ? 'bg-teal-700'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={isFirstPage}
            className={`px-4 py-2 rounded-md flex items-center ${
              isFirstPage
                ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </button>
          <button
            onClick={handleNext}
            className="bg-teal-700 hover:bg-teal-800 text-white rounded-md px-4 py-2 flex items-center"
          >
            {isLastPage ? 'Finish' : 'Next'}
            {!isLastPage && <ChevronRight className="h-5 w-5 ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}