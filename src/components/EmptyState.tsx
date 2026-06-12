import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <Card
      variant="standard"
      className={`flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-borderCustom bg-surface/30 ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-borderCustom/20 flex items-center justify-center mb-5 text-goldAccent border border-borderCustom">
        {/* Modern clean abstract folder icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-7 h-7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
      <h3 className="text-base font-bold text-textPrimary tracking-wide uppercase mb-1 select-none">
        {title}
      </h3>
      <p className="text-sm font-medium text-textSecondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Card>
  );
};
