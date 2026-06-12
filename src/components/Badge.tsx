import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const baseStyle =
    'inline-flex items-center px-2.5 py-1 rounded-[4px] text-xs font-semibold tracking-wider uppercase select-none';

  const variants = {
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-[#EAB308]/10 text-[#EAB308] border border-[#EAB308]/20', // Gold/Yellow indicator
    error: 'bg-danger/10 text-danger border border-danger/20',
    neutral: 'bg-borderCustom/30 text-textSecondary border border-borderCustom',
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
