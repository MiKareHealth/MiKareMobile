import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
  variant?: 'default' | 'text' | 'button' | 'card' | 'avatar';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  rounded = 'rounded-md',
  variant = 'default'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'bg-gray-200 dark:bg-gray-700';
      case 'button':
        return 'bg-gray-300 dark:bg-gray-600';
      case 'card':
        return 'bg-gray-100 dark:bg-gray-800';
      case 'avatar':
        return 'bg-gray-200 dark:bg-gray-700';
      default:
        return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  return (
    <div
      className={`${getVariantClasses()} animate-pulse ${rounded} ${className}`}
      style={{ width, height }}
      aria-busy="true"
    />
  );
};

export default Skeleton; 