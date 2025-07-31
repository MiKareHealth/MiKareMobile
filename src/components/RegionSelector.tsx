import React, { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { Region, getCurrentRegion, setUserRegion, getRegionDisplayName, getRegionFlag } from '../lib/regionDetection';

interface RegionSelectorProps {
  onRegionChange?: (region: Region) => void;
  className?: string;
  currentRegion?: Region;
}

export default function RegionSelector({ onRegionChange, className = '', currentRegion }: RegionSelectorProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region>('USA'); // Default fallback
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const regions: Region[] = ['AU', 'UK', 'USA'];

  // Initialize region only once on mount, or when currentRegion prop changes
  useEffect(() => {
    if (!isInitialized) {
      const detectedRegion = getCurrentRegion() || 'USA';
      setSelectedRegion(detectedRegion);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Sync with parent component's currentRegion prop
  useEffect(() => {
    if (currentRegion && currentRegion !== selectedRegion) {
      setSelectedRegion(currentRegion);
    }
  }, [currentRegion, selectedRegion]);

  const handleRegionSelect = (region: Region) => {
    // Only update local state and call the callback
    // Don't switch regions or modify localStorage here
    setSelectedRegion(region);
    setIsOpen(false);
    
    // Let parent component handle the actual region change
    if (onRegionChange) {
      onRegionChange(region);
    }
  };

  if (isDetecting) {
    return (
      <div className={`flex items-center text-sm text-text-secondary ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-text-secondary mr-2"></div>
        Detecting region...
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button" // Explicitly set button type to prevent form submission
        onClick={(e) => {
          e.preventDefault(); // Prevent form submission
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center justify-between space-x-2 px-4 py-3 text-base font-medium text-text-primary bg-background-default border-2 border-gray-300 rounded-md shadow-sm hover:bg-background-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
      >
        <div className="flex items-center">
          <Globe className="h-5 w-5 mr-2" />
          <span className="mr-1">{getRegionFlag(selectedRegion)}</span>
          <span>{getRegionDisplayName(selectedRegion)}</span>
        </div>
        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(false);
            }}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 right-0 mt-2 bg-background-default rounded-md shadow-lg border border-border-default z-20 animate-fade-down">
            <div className="py-1">
              {regions.map((region) => (
                <button
                  key={region}
                  type="button" // Explicitly set button type to prevent form submission
                  onClick={(e) => {
                    e.preventDefault(); // Prevent form submission
                    handleRegionSelect(region);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-text-primary hover:bg-background-subtle transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="mr-1">{getRegionFlag(region)}</span>
                    <span>{getRegionDisplayName(region)}</span>
                  </div>
                  {selectedRegion === region && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-border-default px-4 py-2">
              <p className="text-xs text-text-secondary">
                Your data will be stored in the selected region
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}