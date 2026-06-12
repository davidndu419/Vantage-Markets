import React from 'react';

interface LoaderProps {
  variant?: 'full-screen' | 'inline' | 'skeleton';
  count?: number;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  variant = 'inline',
  count = 3,
  className = '',
}) => {
  if (variant === 'full-screen') {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-bgMain/90 backdrop-blur-sm ${className}`}>
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-borderCustom border-t-goldAccent"></div>
          <span className="absolute text-xs font-bold tracking-widest text-goldAccent">VM</span>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wider text-textSecondary uppercase animate-pulse">
          Securing Connection...
        </p>
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={`flex flex-col gap-4 w-full ${className}`}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="w-full h-12 rounded-[8px] bg-surface border border-borderCustom flex items-center px-4 animate-pulse">
            <div className="h-4 bg-borderCustom rounded w-1/4 mr-4"></div>
            <div className="h-4 bg-borderCustom rounded w-1/6 mr-auto"></div>
            <div className="h-4 bg-borderCustom rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 py-4 ${className}`}>
      <svg
        className="animate-spin h-6 w-6 text-goldAccent"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span className="text-sm font-semibold tracking-wide text-textSecondary">Loading...</span>
    </div>
  );
};
