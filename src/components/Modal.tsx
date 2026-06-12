import React, { useEffect } from 'react';
import { Card } from './Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-bgMain/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card content */}
      <Card
        variant="elevated"
        className={`relative z-10 w-full max-w-lg bg-surface border border-borderCustom flex flex-col p-6 shadow-2xl animate-scaleUp ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-borderCustom mb-6">
          <h3 className="text-base font-bold text-textPrimary tracking-wide uppercase">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-textSecondary hover:text-goldAccent transition-colors duration-200 focus:outline-none"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 text-sm text-textSecondary font-medium leading-relaxed">
          {children}
        </div>
      </Card>
    </div>
  );
};
